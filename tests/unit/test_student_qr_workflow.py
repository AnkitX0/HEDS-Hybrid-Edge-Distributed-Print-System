import pytest
import uuid
import app.models  # Required for SQLAlchemy relationship registry
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_student_qr_end_to_end_workflow():
    """
    Validates the exact mobile student QR customer journey:
    1. Scan & Storefront lookup (/api/v1/shops/campus-xerox)
    2. Document Upload & Authoritative Page Counting (11 pages extracted)
    3. Authoritative Pricing Quote Calculation (11 * 100 = 1100 cents)
    4. Order Creation
    5. Payment Checkout Execution
    6. Live Order Tracking (Token, Queue Status, No OTP required)
    7. Official Receipt Generation
    8. Double-Click / Idempotent Payment Protection
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Scan / Storefront lookup
        shop_res = await client.get("/api/v1/shops/campus-xerox")
        assert shop_res.status_code == 200
        shop_data = shop_res.json()
        assert shop_data["slug"] == "campus-xerox"
        assert shop_data["is_active"] is True
        assert "pricing" in shop_data

        # Step 2: Upload 11-page test PDF
        with open("tests/fixtures/heds-test-11-page.pdf", "rb") as f:
            pdf_bytes = f.read()

        files = {"file": ("student-assignment.pdf", pdf_bytes, "application/pdf")}
        up_res = await client.post("/api/v1/shops/campus-xerox/documents/upload", files=files)
        assert up_res.status_code == 200
        up_data = up_res.json()
        assert up_data["page_count"] == 11
        document_id = up_data["document_id"]

        # Step 3: Authoritative Pricing Quote
        quote_payload = {
          "document_id": document_id,
          "copies": 1,
          "color_mode": "BW",
          "duplex": False,
          "paper_size": "A4",
          "page_range": "all",
        }
        quote_res = await client.post("/api/v1/shops/campus-xerox/pricing/quote", json=quote_payload)
        assert quote_res.status_code == 200
        quote_data = quote_res.json()
        assert quote_data["document_page_count"] == 11
        assert quote_data["active_pages"] == 11
        assert quote_data["final_amount_cents"] == 1100
        assert quote_data["formatted_total"] == "₹11.00"

        # Step 4: Create Order
        order_form = {
          "document_id": document_id,
          "copies": "1",
          "color_mode": "BW",
          "duplex": "false",
          "paper_size": "A4",
          "page_range": "all",
        }
        ord_res = await client.post("/api/v1/shops/campus-xerox/orders", data=order_form)
        assert ord_res.status_code == 200
        ord_data = ord_res.json()
        guest_token = ord_data["guest_access_token"]
        assert guest_token is not None
        assert ord_data["total_amount_cents"] == 1100

        # Step 5: Execute Sandbox Payment
        pay_res = await client.post(
            f"/api/v1/orders/{guest_token}/payment",
            json={"simulate_status": "success"},
        )
        assert pay_res.status_code == 200
        pay_data = pay_res.json()
        assert pay_data["status"] == "SUCCESS"

        # Step 6: Query Live Order Tracking
        track_res = await client.get(f"/api/v1/orders/{guest_token}")
        assert track_res.status_code == 200
        track_data = track_res.json()
        assert track_data["status"] in ["QUEUED", "DISPATCHED", "PRINTING", "PRINT_COMPLETED", "PICKUP_READY"]
        assert track_data["document_pages"] == 11
        assert track_data["order_number"].startswith("ORD-") or track_data["order_number"].startswith("HDS-")
        # Ensure no plaintext OTP is leaked in public student response
        assert "plain_otp" not in track_data

        # Step 7: Official Receipt Information Verification
        assert track_data["order_number"] is not None
        assert track_data["total_amount_cents"] == 1100
        assert track_data["pricing_breakdown"] is not None
        assert track_data["pricing_breakdown"]["active_pages"] == 11

        # Step 8: Double-Click / Idempotent Payment Protection
        pay_retry_res = await client.post(
            f"/api/v1/orders/{guest_token}/payment",
            json={"simulate_status": "success"},
        )
        assert pay_retry_res.status_code == 200
        retry_data = pay_retry_res.json()
        assert retry_data["status"] == "SUCCESS"
        assert "already processed" in retry_data["message"].lower()
