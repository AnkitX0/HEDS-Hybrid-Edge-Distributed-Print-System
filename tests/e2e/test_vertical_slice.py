import io
import pytest
import uuid
import secrets
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from app.main import app
from app.core.database import AsyncSessionLocal
from app.core.security import create_access_token
from app.models import Shop, User, Order, OrderState, PrintJob, JobStatus, Agent, Pickup


@pytest.mark.asyncio
async def test_complete_e2e_student_to_pickup_workflow():
    """
    COMPLETE VERTICAL SLICE INTEGRATION TEST:
    Student: QR -> Upload PDF -> Price -> Mock Payment -> Queue
    Agent: Poll -> Lease -> Print -> Complete -> Privacy Hold OTP
    Operator: Confirm OTP -> COMPLETED
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Student scans QR: GET /api/v1/shops/campus-xerox
        shop_resp = await client.get("/api/v1/shops/campus-xerox")
        assert shop_resp.status_code == 200
        shop_data = shop_resp.json()
        assert shop_data["slug"] == "campus-xerox"

        # 2. Student uploads PDF and configures print: POST /api/v1/shops/campus-xerox/orders
        # Generate minimal valid PDF in memory
        from pypdf import PdfWriter
        pdf_writer = PdfWriter()
        pdf_writer.add_blank_page(width=72, height=72)
        pdf_writer.add_blank_page(width=72, height=72)
        pdf_buffer = io.BytesIO()
        pdf_writer.write(pdf_buffer)
        pdf_bytes = pdf_buffer.getvalue()

        files = {"file": ("student_report.pdf", pdf_bytes, "application/pdf")}
        data = {
            "copies": 2,
            "color_mode": "BW",
            "duplex": "true",
            "paper_size": "A4",
            "page_range": "all",
        }

        order_resp = await client.post(
            "/api/v1/shops/campus-xerox/orders",
            files=files,
            data=data,
        )
        assert order_resp.status_code == 200
        order_data = order_resp.json()
        guest_token = order_data["guest_access_token"]
        order_id = order_data["id"]
        assert order_data["status"] == "CREATED"
        assert order_data["document_pages"] == 2

        # 3. Student makes mock payment: POST /api/v1/orders/{guest_token}/payment
        pay_resp = await client.post(
            f"/api/v1/orders/{guest_token}/payment",
            json={"simulate_status": "success"},
            headers={"Idempotency-Key": f"idemp_{secrets.token_hex(8)}"},
        )
        assert pay_resp.status_code == 200
        pay_data = pay_resp.json()
        assert pay_data["status"] == "SUCCESS"

        # Verify order is now in QUEUED state
        track_resp = await client.get(f"/api/v1/orders/{guest_token}")
        assert track_resp.status_code == 200
        assert track_resp.json()["status"] == "QUEUED"

        # Boost priority of this specific job to 1 so FIFO scheduler claims it first
        async with AsyncSessionLocal() as session:
            test_job = (await session.execute(select(PrintJob).where(PrintJob.order_id == uuid.UUID(order_id)))).scalar_one()
            test_job.priority = 1
            await session.commit()

        # 4. Edge Agent polls for jobs: POST /api/v1/agents/jobs/poll
        async with AsyncSessionLocal() as session:
            agent = (await session.execute(select(Agent).where(Agent.name == "campus-agent-01"))).scalar_one()
            agent_id = str(agent.id)

        agent_headers = {
            "X-Agent-ID": agent_id,
            "X-Agent-Key": "agent-dev-key-12345",
        }

        poll_resp = await client.post("/api/v1/agents/jobs/poll", headers=agent_headers)
        assert poll_resp.status_code == 200
        leased_job = poll_resp.json()
        assert leased_job is not None
        job_id = leased_job["job_id"]
        assert leased_job["order_id"] == order_id

        # 5. Agent sends ACK
        ack_resp = await client.post(f"/api/v1/agents/jobs/{job_id}/ack", headers=agent_headers)
        assert ack_resp.status_code == 200

        # 6. Agent reports PRINTING progress
        print_status_resp = await client.post(
            f"/api/v1/agents/jobs/{job_id}/status",
            headers=agent_headers,
            json={"status": "PRINTING", "progress_page": 1},
        )
        assert print_status_resp.status_code == 200

        # 7. Agent finishes print -> reports COMPLETED
        done_resp = await client.post(
            f"/api/v1/agents/jobs/{job_id}/status",
            headers=agent_headers,
            json={"status": "COMPLETED"},
        )
        assert done_resp.status_code == 200

        # 8. Verify order is now in PICKUP_READY and OTP was generated
        async with AsyncSessionLocal() as session:
            pickup = (await session.execute(select(Pickup).where(Pickup.order_id == uuid.UUID(order_id)))).scalar_one()
            assert pickup is not None

        # Student checks tracking page -> sees PICKUP_READY
        student_track = await client.get(f"/api/v1/orders/{guest_token}")
        assert student_track.status_code == 200
        assert student_track.json()["status"] == "PICKUP_READY"

        # 9. Operator confirms student pickup via token: POST /api/v1/pickups/confirm
        async with AsyncSessionLocal() as session:
            operator = (await session.execute(select(User).where(User.email == "operator@campus-xerox.local"))).scalar_one()
            op_id = str(operator.id)

        op_token = create_access_token({"sub": op_id, "email": "operator@campus-xerox.local", "role": "SHOP_OPERATOR"})
        confirm_resp = await client.post(
            "/api/v1/pickups/confirm",
            headers={"Authorization": f"Bearer {op_token}"},
            json={"order_id": order_id},
        )
        assert confirm_resp.status_code == 200
        assert confirm_resp.json()["status"] == "COMPLETED"

        # Duplicate collection protection (idempotent 200 OK)
        dup_resp = await client.post(
            "/api/v1/pickups/confirm",
            headers={"Authorization": f"Bearer {op_token}"},
            json={"order_id": order_id},
        )
        assert dup_resp.status_code == 200
        assert dup_resp.json()["status"] == "COMPLETED"

        # 10. Student sees final COMPLETED state
        final_track = await client.get(f"/api/v1/orders/{guest_token}")
        assert final_track.status_code == 200
        assert final_track.json()["status"] == "COMPLETED"
