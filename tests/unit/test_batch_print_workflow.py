import io
import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from pypdf import PdfWriter

from app.main import app
from app.core.database import AsyncSessionLocal
from app.modules.tenants.models import Shop
from app.modules.agents.models import Agent
from app.modules.orders.models import Order, OrderDocument, PrintSpecification, ColorMode, Orientation, Scaling
from app.modules.pricing.models import PricingRule
from app.modules.pricing.service import pricing_engine
from app.modules.queue.models import PrintJob, JobStatus


def create_test_pdf(num_pages: int = 1) -> bytes:
    writer = PdfWriter()
    for _ in range(num_pages):
        writer.add_blank_page(width=72, height=72)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


@pytest.mark.asyncio
async def test_multiple_file_pricing():
    rule = PricingRule(
        bw_per_page_cents=100,      # ₹1.00
        color_per_page_cents=1000,  # ₹10.00
        duplex_discount_cents=20,   # ₹0.20 per saved sheet
        minimum_order_cents=100,
    )
    # Doc A: 5 pages, 2 copies, BW, duplex
    spec_a = PrintSpecification(
        copies=2,
        color_mode=ColorMode.BW,
        duplex=True,
        paper_size="A4",
        page_range="all",
        orientation=Orientation.PORTRAIT,
        scaling=Scaling.FIT,
    )
    # Doc B: 4 pages, 1 copy, Color, single
    spec_b = PrintSpecification(
        copies=1,
        color_mode=ColorMode.COLOR,
        duplex=False,
        paper_size="A4",
        page_range="all",
        orientation=Orientation.PORTRAIT,
        scaling=Scaling.FIT,
    )
    items = [
        {"document_id": uuid.uuid4(), "document_name": "A.pdf", "page_count": 5, "spec": spec_a},
        {"document_id": uuid.uuid4(), "document_name": "B.docx", "page_count": 4, "spec": spec_b},
    ]

    breakdown = pricing_engine.calculate_batch_price(items=items, rule=rule)

    assert breakdown["total_documents"] == 2
    assert breakdown["total_pages"] == 9
    # Doc A: 5 pages * 100 * 2 = 1000 cents raw. Duplex saved sheets = 5 - ceil(5/2) = 2 sheets * 20 * 2 = 80 cents. Subtotal = 920 cents.
    assert breakdown["items"][0]["raw_total_cents"] == 1000
    assert breakdown["items"][0]["duplex_discount_cents"] == 80
    assert breakdown["items"][0]["final_amount_cents"] == 920

    # Doc B: 4 pages * 1000 * 1 = 4000 cents.
    assert breakdown["items"][1]["raw_total_cents"] == 4000
    assert breakdown["items"][1]["duplex_discount_cents"] == 0
    assert breakdown["items"][1]["final_amount_cents"] == 4000

    # Total = 920 + 4000 = 4920 cents
    assert breakdown["final_amount_cents"] == 4920


@pytest.mark.asyncio
async def test_page_range_and_different_copies():
    rule = PricingRule(
        bw_per_page_cents=100,
        color_per_page_cents=500,
        duplex_discount_cents=0,
        minimum_order_cents=50,
    )
    # Doc 1: 10 pages total, page range "1-3,5" -> 4 active pages, 3 copies
    spec = PrintSpecification(
        copies=3,
        color_mode=ColorMode.BW,
        duplex=False,
        paper_size="A4",
        page_range="1-3,5",
    )
    items = [
        {"document_id": uuid.uuid4(), "document_name": "Range.pdf", "page_count": 10, "spec": spec}
    ]
    breakdown = pricing_engine.calculate_batch_price(items=items, rule=rule)
    assert breakdown["items"][0]["active_pages"] == 4
    # 4 active pages * 100 * 3 copies = 1200 cents
    assert breakdown["final_amount_cents"] == 1200


@pytest.mark.asyncio
async def test_multiple_file_upload_and_partial_failure():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        pdf_1 = create_test_pdf(3)
        pdf_2 = create_test_pdf(2)
        corrupted = b"NOT_A_VALID_PDF_HEADER_OR_IMAGE"

        files = [
            ("files", ("valid1.pdf", pdf_1, "application/pdf")),
            ("files", ("corrupted.pdf", corrupted, "application/pdf")),
            ("files", ("valid2.pdf", pdf_2, "application/pdf")),
        ]

        res = await client.post("/api/v1/shops/campus-xerox/documents/upload-multiple", files=files)
        assert res.status_code == 200
        data = res.json()

        assert len(data["documents"]) == 3
        assert data["documents"][0]["filename"] == "valid1.pdf"
        assert data["documents"][0]["status"] == "READY"
        assert data["documents"][0]["document_id"] is not None
        assert data["documents"][0]["page_count"] == 3

        assert data["documents"][1]["filename"] == "corrupted.pdf"
        assert data["documents"][1]["status"] == "ERROR"
        assert data["documents"][1]["document_id"] is None
        assert "valid" in data["documents"][1]["error"].lower() or "pdf" in data["documents"][1]["error"].lower()

        assert data["documents"][2]["filename"] == "valid2.pdf"
        assert data["documents"][2]["status"] == "READY"
        assert data["documents"][2]["document_id"] is not None
        assert data["documents"][2]["page_count"] == 2


@pytest.mark.asyncio
async def test_multiple_document_order_full_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Upload 3 documents
        doc1_bytes = create_test_pdf(5)
        doc2_bytes = create_test_pdf(4)
        doc3_bytes = create_test_pdf(3)

        up1 = await client.post(
            "/api/v1/shops/campus-xerox/documents/upload",
            files={"file": ("Assignment.pdf", doc1_bytes, "application/pdf")},
        )
        assert up1.status_code == 200
        id1 = up1.json()["document_id"]

        up2 = await client.post(
            "/api/v1/shops/campus-xerox/documents/upload",
            files={"file": ("Notes.pdf", doc2_bytes, "application/pdf")},
        )
        assert up2.status_code == 200
        id2 = up2.json()["document_id"]

        up3 = await client.post(
            "/api/v1/shops/campus-xerox/documents/upload",
            files={"file": ("Diagram.pdf", doc3_bytes, "application/pdf")},
        )
        assert up3.status_code == 200
        id3 = up3.json()["document_id"]

        # Step 2: Query Pricing Quote with Batch Items
        quote_payload = {
            "items": [
                {
                    "document_id": id1,
                    "copies": 2,
                    "color_mode": "BW",
                    "duplex": True,
                    "paper_size": "A4",
                    "page_range": "1-5",
                    "orientation": "PORTRAIT",
                    "scaling": "FIT",
                },
                {
                    "document_id": id2,
                    "copies": 1,
                    "color_mode": "COLOR",
                    "duplex": False,
                    "paper_size": "A4",
                    "page_range": "all",
                    "orientation": "PORTRAIT",
                    "scaling": "FIT",
                },
                {
                    "document_id": id3,
                    "copies": 1,
                    "color_mode": "COLOR",
                    "duplex": False,
                    "paper_size": "A4",
                    "page_range": "all",
                    "orientation": "LANDSCAPE",
                    "scaling": "FIT",
                },
            ]
        }
        quote_res = await client.post("/api/v1/shops/campus-xerox/pricing/quote", json=quote_payload)
        assert quote_res.status_code == 200
        q_data = quote_res.json()
        assert q_data["total_documents"] == 3
        assert len(q_data["items"]) == 3
        assert q_data["final_amount_cents"] > 0

        # Step 3: Create Batch Order via dedicated JSON batch endpoint
        batch_order_res = await client.post("/api/v1/shops/campus-xerox/orders/batch", json=quote_payload)
        assert batch_order_res.status_code == 200
        order_data = batch_order_res.json()
        order_id = order_data["id"]
        guest_token = order_data["guest_access_token"]

        assert len(order_data["documents"]) == 3
        assert order_data["documents"][0]["filename"] == "Assignment.pdf"
        assert order_data["documents"][0]["copies"] == 2
        assert order_data["documents"][0]["color_mode"] == "BW"
        assert order_data["documents"][0]["duplex"] is True

        assert order_data["documents"][1]["filename"] == "Notes.pdf"
        assert order_data["documents"][1]["copies"] == 1
        assert order_data["documents"][1]["color_mode"] == "COLOR"

        assert order_data["documents"][2]["filename"] == "Diagram.pdf"

        # Step 4: Verify Order Documents and sequence in Database
        async with AsyncSessionLocal() as session:
            ods = (
                await session.execute(
                    select(OrderDocument)
                    .where(OrderDocument.order_id == uuid.UUID(order_id))
                    .order_by(OrderDocument.sequence.asc())
                )
            ).scalars().all()
            assert len(ods) == 3
            assert [od.sequence for od in ods] == [1, 2, 3]

        # Step 5: Pay for order
        pay_res = await client.post(
            f"/api/v1/orders/{guest_token}/payment",
            json={"simulate_status": "success"},
        )
        assert pay_res.status_code == 200
        assert pay_res.json()["status"] == "SUCCESS"

        # Step 6: Verify multiple PrintJobs created preserving sequence
        async with AsyncSessionLocal() as session:
            jobs = (
                await session.execute(
                    select(PrintJob)
                    .where(PrintJob.order_id == uuid.UUID(order_id))
                    .order_by(PrintJob.sequence.asc())
                )
            ).scalars().all()
            assert len(jobs) == 3
            assert [j.sequence for j in jobs] == [1, 2, 3]
            assert all(j.status == JobStatus.QUEUED for j in jobs)

        # Step 7: Edge agent polls jobs and verifies per-document specifications
        async with AsyncSessionLocal() as session:
            agent = (await session.execute(select(Agent).where(Agent.name == "campus-agent-01"))).scalar_one()
            agent_id = str(agent.id)

        headers = {"X-Agent-ID": agent_id, "X-Agent-Key": "agent-dev-key-12345"}

        # Boost priority of all 3 jobs to 1
        async with AsyncSessionLocal() as session:
            jobs_to_boost = (
                await session.execute(select(PrintJob).where(PrintJob.order_id == uuid.UUID(order_id)))
            ).scalars().all()
            for j in jobs_to_boost:
                j.priority = 1
            await session.commit()

        # Job 1 poll
        poll1 = await client.post("/api/v1/agents/jobs/poll", headers=headers)
        assert poll1.status_code == 200
        j1_data = poll1.json()
        assert j1_data is not None
        assert j1_data["order_id"] == order_id
        assert j1_data["print_specification"]["color_mode"] == "BW"
        assert j1_data["print_specification"]["duplex"] is True
        assert j1_data["print_specification"]["copies"] == 2

        # Acknowledge, print and complete Job 1
        await client.post(f"/api/v1/agents/jobs/{j1_data['job_id']}/ack", headers=headers)
        await client.post(f"/api/v1/agents/jobs/{j1_data['job_id']}/status", json={"status": "PRINTING"}, headers=headers)
        await client.post(f"/api/v1/agents/jobs/{j1_data['job_id']}/status", json={"status": "COMPLETED"}, headers=headers)

        # Check order tracking: Order should still be in PRINTING / DISPATCHED because Jobs 2 & 3 are not done yet!
        track_mid = await client.get(f"/api/v1/orders/{guest_token}")
        assert track_mid.status_code == 200
        assert track_mid.json()["status"] in ["PRINTING", "DISPATCHED"]

        # Job 2 poll
        poll2 = await client.post("/api/v1/agents/jobs/poll", headers=headers)
        assert poll2.status_code == 200
        j2_data = poll2.json()
        assert j2_data is not None
        assert j2_data["print_specification"]["color_mode"] == "COLOR"
        assert j2_data["print_specification"]["copies"] == 1
        await client.post(f"/api/v1/agents/jobs/{j2_data['job_id']}/status", json={"status": "COMPLETED"}, headers=headers)

        # Job 3 poll
        poll3 = await client.post("/api/v1/agents/jobs/poll", headers=headers)
        assert poll3.status_code == 200
        j3_data = poll3.json()
        assert j3_data is not None
        assert j3_data["print_specification"]["orientation"] == "LANDSCAPE"
        await client.post(f"/api/v1/agents/jobs/{j3_data['job_id']}/status", json={"status": "COMPLETED"}, headers=headers)

        # Now that ALL jobs are complete, Order transitions to PICKUP_READY!
        track_final = await client.get(f"/api/v1/orders/{guest_token}")
        assert track_final.status_code == 200
        assert track_final.json()["status"] == "PICKUP_READY"

        # Step 8: Receipt contains all documents
        receipt_res = await client.get(f"/api/v1/orders/{guest_token}/receipt")
        assert receipt_res.status_code == 200
        r_json = receipt_res.json()
        assert "documents" in r_json
        assert len(r_json["documents"]) == 3
        assert r_json["documents"][0]["filename"] == "Assignment.pdf"
        assert r_json["documents"][1]["filename"] == "Notes.pdf"
        assert r_json["documents"][2]["filename"] == "Diagram.pdf"

        # Step 9: PDF Receipt renders successfully
        pdf_receipt_res = await client.get(f"/api/v1/orders/{guest_token}/receipt.pdf")
        assert pdf_receipt_res.status_code == 200
        assert pdf_receipt_res.headers["content-type"] == "application/pdf"
        assert len(pdf_receipt_res.content) > 1000
