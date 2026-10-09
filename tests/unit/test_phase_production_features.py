import pytest
import io
from PIL import Image
from pypdf import PdfWriter
import app.models
from httpx import AsyncClient, ASGITransport
from app.main import app as fastapi_app
from app.core.database import AsyncSessionLocal
from sqlalchemy import select






def create_dummy_pdf(pages: int = 1) -> bytes:
    writer = PdfWriter()
    for _ in range(pages):
        writer.add_blank_page(width=595, height=842)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def create_dummy_image() -> bytes:
    img = Image.new("RGB", (200, 200), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@pytest.mark.asyncio
async def test_multi_file_upload_and_normalization():
    """
    Tests multi-file upload with a 2-page PDF, a 1-page PDF, and a 1-page image.
    Authoritative page count should equal 2 + 1 + 1 = 4 pages.
    """
    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        pdf1 = create_dummy_pdf(2)
        pdf2 = create_dummy_pdf(1)
        img1 = create_dummy_image()

        files = [
            ("files", ("assignment_p1.pdf", pdf1, "application/pdf")),
            ("files", ("assignment_p2.pdf", pdf2, "application/pdf")),
            ("files", ("diagram.png", img1, "image/png")),
        ]

        res = await client.post("/api/v1/shops/campus-xerox/documents/upload-multiple", files=files)
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["total_pages"] == 4
        assert len(data["documents"]) == 3
        assert data["documents"][0]["filename"] == "assignment_p1.pdf"
        assert data["documents"][0]["page_count"] == 2
        assert data["documents"][1]["filename"] == "assignment_p2.pdf"
        assert data["documents"][1]["page_count"] == 1
        assert data["documents"][2]["filename"] == "diagram.png"
        assert data["documents"][2]["page_count"] == 1
        assert "document_id" in data


@pytest.mark.asyncio
async def test_receipt_pdf_and_json_endpoints():
    """
    Creates an order, pays for it, and verifies both /receipt.pdf and /receipt endpoints.
    """
    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        pdf_bytes = create_dummy_pdf(3)
        files = {"file": ("receipt_test.pdf", pdf_bytes, "application/pdf")}
        up_res = await client.post("/api/v1/shops/campus-xerox/documents/upload", files=files)
        assert up_res.status_code == 200
        doc_id = up_res.json()["document_id"]

        # Create Order
        ord_res = await client.post(
            "/api/v1/shops/campus-xerox/orders",
            data={
                "document_id": doc_id,
                "copies": "1",
                "color_mode": "BW",
                "duplex": "false",
                "paper_size": "A4",
                "page_range": "all",
            },
        )
        assert ord_res.status_code == 200
        order_data = ord_res.json()
        guest_token = order_data["guest_access_token"]

        # Sandbox Payment
        pay_res = await client.post(
            f"/api/v1/orders/{guest_token}/payment",
            json={"simulate_status": "success"},
        )
        assert pay_res.status_code == 200

        # Receipt JSON
        r_json_res = await client.get(f"/api/v1/orders/{guest_token}/receipt")
        assert r_json_res.status_code == 200
        r_json = r_json_res.json()
        assert r_json["order_number"] == order_data["order_number"]
        assert r_json["page_count"] == 3
        assert r_json["pdf_url"] == f"/api/v1/orders/{guest_token}/receipt.pdf"
        assert r_json["token_display"].startswith("#")

        # Receipt PDF download
        r_pdf_res = await client.get(f"/api/v1/orders/{guest_token}/receipt.pdf")
        assert r_pdf_res.status_code == 200
        assert r_pdf_res.headers["content-type"] == "application/pdf"
        assert r_pdf_res.content.startswith(b"%PDF-")
        assert len(r_pdf_res.content) > 500


@pytest.mark.asyncio
async def test_pickup_token_flow_and_idempotency():
    """
    Verifies that an operator can mark an order collected using the token number
    without an OTP, and that repeating the call is fully idempotent.
    """
    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "operator@campus-xerox.local", "password": "operator123"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create student order
        pdf_bytes = create_dummy_pdf(1)
        up_res = await client.post("/api/v1/shops/campus-xerox/documents/upload", files={"file": ("token_test.pdf", pdf_bytes, "application/pdf")})
        assert up_res.status_code == 200
        doc_id = up_res.json()["document_id"]

        ord_res = await client.post(
            "/api/v1/shops/campus-xerox/orders",
            data={"document_id": doc_id, "copies": "1", "color_mode": "BW", "duplex": "false", "paper_size": "A4", "page_range": "all"},
        )
        assert ord_res.status_code == 200
        order = ord_res.json()
        guest_token = order["guest_access_token"]
        order_number = order["order_number"]

        # Pay
        await client.post(f"/api/v1/orders/{guest_token}/payment", json={"simulate_status": "success"})

        # Advance order to PICKUP_READY using OrderStateMachine
        from app.core.database import AsyncSessionLocal
        from app.modules.orders.models import Order, OrderState
        from app.modules.orders.state_machine import OrderStateMachine
        from app.modules.pickups.service import pickup_service
        from sqlalchemy import select

        async with AsyncSessionLocal() as session:
            stmt = select(Order).where(Order.order_number == order_number)
            ord_obj = (await session.execute(stmt)).scalar_one()
            await OrderStateMachine.transition(
                session=session,
                order=ord_obj,
                target_state=OrderState.DISPATCHED,
                actor_type="SYSTEM",
                reason="Dispatched to print queue",
            )
            await OrderStateMachine.transition(
                session=session,
                order=ord_obj,
                target_state=OrderState.PRINTING,
                actor_type="AGENT",
                reason="Printing started",
            )
            await OrderStateMachine.transition(
                session=session,
                order=ord_obj,
                target_state=OrderState.PRINT_COMPLETED,
                actor_type="AGENT",
                reason="Printing completed",
            )
            await pickup_service.create_privacy_hold(session=session, order=ord_obj)
            from app.modules.queue.models import PrintJob, JobStatus
            job_stmt = select(PrintJob).where(PrintJob.order_id == ord_obj.id)
            job_obj = (await session.execute(job_stmt)).scalar_one_or_none()
            if job_obj:
                job_obj.status = JobStatus.COMPLETED
            await session.commit()

        # Operator confirms pickup with token number (no OTP required)
        confirm_res = await client.post(
            "/api/v1/pickups/confirm",
            json={"order_number": order_number},
            headers=headers,
        )
        assert confirm_res.status_code == 200
        assert confirm_res.json()["status"] == "COMPLETED"

        # IDEMPOTENCY TEST: Calling confirm again on COMPLETED order MUST return 200 successfully
        retry_confirm = await client.post(
            "/api/v1/pickups/confirm",
            json={"order_number": order_number},
            headers=headers,
        )
        assert retry_confirm.status_code == 200
        assert retry_confirm.json()["status"] == "COMPLETED"


@pytest.mark.asyncio
async def test_shop_analytics_endpoint():
    """
    Verifies that /api/v1/shop/analytics returns authoritative data aggregates for today, 7d, and 30d.
    """
    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "operator@campus-xerox.local", "password": "operator123"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        res = await client.get("/api/v1/shop/analytics?range=today", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "kpis" in data
        assert "peak_hours" in data
        assert "print_mix" in data
        assert "printer_utilization" in data
        assert "order_status" in data
        assert data["range"] == "today"


@pytest.mark.asyncio
async def test_printer_admin_crud_and_safety():
    """
    Verifies adding a printer, triggering a test page print, and safety delete validation.
    """
    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@campus-xerox.local", "password": "admin123"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Add printer
        payload = {
            "name": "Epson WorkForce Pro",
            "adapter_type": "MOCK",
            "color_supported": True,
            "duplex_supported": True,
            "paper_sizes": ["A4", "A3"],
            "model": "WF-C5790",
            "manufacturer": "Epson",
        }
        add_res = await client.post("/api/v1/shop/printers", json=payload, headers=headers)
        assert add_res.status_code == 200
        p_data = add_res.json()
        printer_id = p_data["id"]

        # Trigger test page print
        test_res = await client.post(f"/api/v1/shop/printers/{printer_id}/test-print", headers=headers)
        assert test_res.status_code == 200
        assert test_res.json()["status"] == "QUEUED"
        test_job_id = test_res.json()["job_id"]

        # Mark test job completed so queue remains clean
        import uuid
        from app.modules.queue.models import PrintJob, JobStatus
        async with AsyncSessionLocal() as session:
            test_job = (await session.execute(select(PrintJob).where(PrintJob.id == uuid.UUID(test_job_id)))).scalar_one_or_none()
            if test_job:
                test_job.status = JobStatus.COMPLETED
                await session.commit()

        # Reconnect printer
        rec_res = await client.post(f"/api/v1/shop/printers/{printer_id}/reconnect", headers=headers)
        assert rec_res.status_code == 200
        assert rec_res.json()["status"] == "ONLINE"

        # Update printer
        upd_res = await client.put(f"/api/v1/shop/printers/{printer_id}", json={"name": "Epson WorkForce Pro (Updated)"}, headers=headers)
        assert upd_res.status_code == 200

        # Delete printer
        del_res = await client.delete(f"/api/v1/shop/printers/{printer_id}?force=true", headers=headers)
        assert del_res.status_code == 200



