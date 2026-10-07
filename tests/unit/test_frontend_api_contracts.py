import pytest
import uuid
import app.models  # Required for SQLAlchemy relationship registry
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import AsyncSessionLocal
from app.models import Shop, User, UserRole, ShopMember, ShopMemberRole, Tenant, TenantStatus
from app.core.security import hash_password, create_access_token


@pytest.mark.asyncio
async def test_student_valid_shop_lookup():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/shops/campus-xerox")
        assert res.status_code == 200
        assert res.headers["content-type"].startswith("application/json")
        data = res.json()
        assert data["slug"] == "campus-xerox"
        assert "pricing" in data
        assert data["pricing"]["bw_per_page_cents"] > 0


@pytest.mark.asyncio
async def test_student_invalid_shop_lookup_returns_clean_json_error():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/shops/nonexistent-shop-slug-999")
        assert res.status_code == 404
        assert res.headers["content-type"].startswith("application/json")
        data = res.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()


@pytest.mark.asyncio
async def test_operator_login_success():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/auth/login",
            json={"email": "operator@campus-xerox.local", "password": "operator123"},
        )
        assert res.status_code == 200
        assert res.headers["content-type"].startswith("application/json")
        data = res.json()
        assert "access_token" in data
        assert data["role"] in ["SHOP_OPERATOR", "ADMIN"]


@pytest.mark.asyncio
async def test_operator_login_invalid_credentials_returns_clean_json_401():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/auth/login",
            json={"email": "operator@campus-xerox.local", "password": "wrong-password-xyz"},
        )
        assert res.status_code == 401
        assert res.headers["content-type"].startswith("application/json")
        data = res.json()
        assert "detail" in data
        assert "incorrect" in data["detail"].lower()


@pytest.mark.asyncio
async def test_anonymous_student_order_creation_no_auth_header():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create anonymous order with real valid PDF upload
        with open("apps/student-web/public/sample-print.pdf", "rb") as f:
            pdf_bytes = f.read()

        files = {"file": ("sample-print.pdf", pdf_bytes, "application/pdf")}
        data = {
            "copies": "2",
            "color_mode": "BW",
            "duplex": "false",
            "paper_size": "A4",
            "page_range": "all",
        }
        res = await client.post("/api/v1/shops/campus-xerox/orders", data=data, files=files)
        assert res.status_code == 200
        order = res.json()
        assert "guest_access_token" in order
        assert order["status"] == "CREATED"
        assert order["total_amount_cents"] > 0

        guest_token = order["guest_access_token"]

        # Track order as anonymous guest
        track_res = await client.get(f"/api/v1/orders/{guest_token}")
        assert track_res.status_code == 200
        track_data = track_res.json()
        assert track_data["id"] == order["id"]
        assert track_data["guest_access_token"] == guest_token


@pytest.mark.asyncio
async def test_unauthorized_shop_access_rejected_for_operator():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Log in as operator
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "operator@campus-xerox.local", "password": "operator123"},
        )
        token = login_res.json()["access_token"]

        # Attempt to access an unauthorized random shop
        fake_shop_id = str(uuid.uuid4())
        res = await client.get(
            "/api/v1/shop/dashboard",
            headers={"Authorization": f"Bearer {token}", "X-Shop-ID": fake_shop_id},
        )
        assert res.status_code in [403, 404]
