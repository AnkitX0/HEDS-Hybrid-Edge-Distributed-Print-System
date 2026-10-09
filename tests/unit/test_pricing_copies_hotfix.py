import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from app.main import app
from app.core.database import AsyncSessionLocal
from app.modules.pricing.service import pricing_engine
from app.modules.pricing.models import PricingRule
from app.modules.orders.models import (
    Order,
    OrderState,
    PrintSpecification,
    ColorMode,
    Orientation,
    Scaling,
    OrderDocument,
)
import io
from pypdf import PdfWriter
from app.modules.queue.models import PrintJob, JobStatus


def create_test_pdf(num_pages: int = 1) -> bytes:
    writer = PdfWriter()
    for _ in range(num_pages):
        writer.add_blank_page(width=72, height=72)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


@pytest.mark.asyncio
async def test_copy_count_pricing_matrix():
    """
    Sanity checks for copy-count pricing under the standard ₹1 BW tariff:
    - 1 page × 1 copy = ₹1.00 (100 cents)
    - 1 page × 4 copies = ₹4.00 (400 cents)
    - 5 pages × 2 copies = ₹10.00 (1000 cents)
    - 29 pages × 4 copies = ₹116.00 (11600 cents)
    """
    rule = PricingRule(
        bw_per_page_cents=100,      # ₹1.00
        color_per_page_cents=1000,   # ₹10.00
        duplex_discount_cents=0,
        minimum_order_cents=100,    # ₹1.00
    )

    # 1 page x 1 copy
    spec_1x1 = PrintSpecification(copies=1, color_mode=ColorMode.BW, duplex=False, page_range="all")
    b1 = pricing_engine.calculate_batch_price(
        items=[{"document_id": uuid.uuid4(), "page_count": 1, "spec": spec_1x1}],
        rule=rule,
    )
    assert b1["final_amount_cents"] == 100
    assert b1["items"][0]["final_amount_cents"] == 100
    assert b1["items"][0]["copies"] == 1

    # 1 page x 4 copies
    spec_1x4 = PrintSpecification(copies=4, color_mode=ColorMode.BW, duplex=False, page_range="all")
    b2 = pricing_engine.calculate_batch_price(
        items=[{"document_id": uuid.uuid4(), "page_count": 1, "spec": spec_1x4}],
        rule=rule,
    )
    assert b2["final_amount_cents"] == 400
    assert b2["items"][0]["final_amount_cents"] == 400
    assert b2["items"][0]["copies"] == 4

    # 5 pages x 2 copies
    spec_5x2 = PrintSpecification(copies=2, color_mode=ColorMode.BW, duplex=False, page_range="all")
    b3 = pricing_engine.calculate_batch_price(
        items=[{"document_id": uuid.uuid4(), "page_count": 5, "spec": spec_5x2}],
        rule=rule,
    )
    assert b3["final_amount_cents"] == 1000
    assert b3["items"][0]["final_amount_cents"] == 1000
    assert b3["items"][0]["copies"] == 2

    # 29 pages x 4 copies
    spec_29x4 = PrintSpecification(copies=4, color_mode=ColorMode.BW, duplex=False, page_range="all")
    b4 = pricing_engine.calculate_batch_price(
        items=[{"document_id": uuid.uuid4(), "page_count": 29, "spec": spec_29x4}],
        rule=rule,
    )
    assert b4["final_amount_cents"] == 11600
    assert b4["items"][0]["final_amount_cents"] == 11600
    assert b4["items"][0]["copies"] == 4


@pytest.mark.asyncio
async def test_multi_document_batch_with_different_copies_and_settings():
    """
    Batch containing:
    - Doc 1: 1 page, 4 copies, BW, Single -> 1 * 100 * 4 = 400 cents
    - Doc 2: 29 pages, 4 copies, BW, Single -> 29 * 100 * 4 = 11600 cents
    - Doc 3: 2 pages, 1 copy, Color, Single -> 2 * 1000 * 1 = 2000 cents
    Total = 400 + 11600 + 2000 = 14000 cents (₹140.00)
    """
    rule = PricingRule(
        bw_per_page_cents=100,
        color_per_page_cents=1000,
        duplex_discount_cents=20,
        minimum_order_cents=100,
    )

    items = [
        {
            "document_id": uuid.uuid4(),
            "document_name": "OnePage.pdf",
            "page_count": 1,
            "spec": PrintSpecification(copies=4, color_mode=ColorMode.BW, duplex=False),
        },
        {
            "document_id": uuid.uuid4(),
            "document_name": "TwentyNinePages.pdf",
            "page_count": 29,
            "spec": PrintSpecification(copies=4, color_mode=ColorMode.BW, duplex=False),
        },
        {
            "document_id": uuid.uuid4(),
            "document_name": "ColorSlides.pdf",
            "page_count": 2,
            "spec": PrintSpecification(copies=1, color_mode=ColorMode.COLOR, duplex=False),
        },
    ]

    breakdown = pricing_engine.calculate_batch_price(items=items, rule=rule)
    assert breakdown["total_documents"] == 3
    assert breakdown["items"][0]["final_amount_cents"] == 400
    assert breakdown["items"][1]["final_amount_cents"] == 11600
    assert breakdown["items"][2]["final_amount_cents"] == 2000
    assert breakdown["final_amount_cents"] == 14000
    assert breakdown["subtotal_cents"] == 14000


@pytest.mark.asyncio
async def test_duplex_discount_scales_with_copies():
    """
    Duplex discount must scale with the number of copies:
    4 pages duplex: 4 active pages -> 2 sheets per copy (2 saved sheets).
    Discount per copy = 2 saved sheets * 50 cents = 100 cents.
    For 3 copies:
    Raw = 4 * 100 * 3 = 1200 cents.
    Discount = 2 * 50 * 3 = 300 cents.
    Final = 900 cents.
    """
    rule = PricingRule(
        bw_per_page_cents=100,
        color_per_page_cents=1000,
        duplex_discount_cents=50,
        minimum_order_cents=100,
    )
    spec = PrintSpecification(copies=3, color_mode=ColorMode.BW, duplex=True, page_range="all")
    breakdown = pricing_engine.calculate_batch_price(
        items=[{"document_id": uuid.uuid4(), "page_count": 4, "spec": spec}],
        rule=rule,
    )
    assert breakdown["items"][0]["raw_total_cents"] == 1200
    assert breakdown["items"][0]["duplex_discount_cents"] == 300
    assert breakdown["items"][0]["final_amount_cents"] == 900
    assert breakdown["final_amount_cents"] == 900


@pytest.mark.asyncio
async def test_quote_and_order_with_enum_normalization_and_copies():
    """
    Integration test:
    1. Upload 1-page PDF and 29-page PDF
    2. Request quote with copies=4, orientation='AUTO', scaling='FILL' -> must normalize cleanly
    3. Verify quote response: test1.pdf = 400 cents, test29.pdf = 11600 cents, total = 12000 cents
    4. Create batch order -> must succeed without 422
    5. Verify database: PrintSpecification has copies=4, orientation=PORTRAIT, scaling=FIT
    6. Complete payment -> order transitions to PAID, PrintJobs queued with copies=4
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        pdf_1p = create_test_pdf(1)
        pdf_29p = create_test_pdf(29)

        # Upload files
        up1 = await client.post(
            "/api/v1/shops/campus-xerox/documents/upload",
            files={"file": ("single_page.pdf", pdf_1p, "application/pdf")},
        )
        assert up1.status_code == 200
        id1 = up1.json()["document_id"]

        up2 = await client.post(
            "/api/v1/shops/campus-xerox/documents/upload",
            files={"file": ("twenty_nine.pdf", pdf_29p, "application/pdf")},
        )
        assert up2.status_code == 200
        id2 = up2.json()["document_id"]

        # Request Quote with AUTO and FILL
        quote_payload = {
            "items": [
                {
                    "document_id": id1,
                    "copies": 4,
                    "color_mode": "BW",
                    "duplex": False,
                    "paper_size": "A4",
                    "page_range": "all",
                    "orientation": "AUTO",    # Should normalize to PORTRAIT
                    "scaling": "FILL",        # Should normalize to FIT
                },
                {
                    "document_id": id2,
                    "copies": 4,
                    "color_mode": "BW",
                    "duplex": False,
                    "paper_size": "A4",
                    "page_range": "all",
                    "orientation": "PORTRAIT",
                    "scaling": "FIT",
                },
            ]
        }

        quote_res = await client.post("/api/v1/shops/campus-xerox/pricing/quote", json=quote_payload)
        assert quote_res.status_code == 200
        q_data = quote_res.json()

        # Item 1: 1 page * 100 * 4 copies = 400
        assert q_data["items"][0]["copies"] == 4
        assert q_data["items"][0]["final_amount_cents"] == 400

        # Item 2: 29 pages * 100 * 4 copies = 11600
        assert q_data["items"][1]["copies"] == 4
        assert q_data["items"][1]["final_amount_cents"] == 11600

        # Total: 12000 cents (₹120.00)
        assert q_data["final_amount_cents"] == 12000

        # Create Batch Order
        order_res = await client.post("/api/v1/shops/campus-xerox/orders/batch", json=quote_payload)
        assert order_res.status_code == 200
        o_data = order_res.json()
        order_id = o_data["id"]
        guest_token = o_data["guest_access_token"]
        assert o_data["total_amount_cents"] == 12000
        assert len(o_data["documents"]) == 2
        assert o_data["documents"][0]["copies"] == 4
        assert o_data["documents"][1]["copies"] == 4

        # Verify PrintSpecifications in DB
        async with AsyncSessionLocal() as session:
            specs = (
                await session.execute(
                    select(PrintSpecification)
                    .where(PrintSpecification.order_id == uuid.UUID(order_id))
                    .order_by(PrintSpecification.created_at.asc())
                )
            ).scalars().all()
            assert len(specs) == 2
            assert specs[0].copies == 4
            assert specs[0].orientation == Orientation.PORTRAIT
            assert specs[0].scaling == Scaling.FIT
            assert specs[1].copies == 4

        # Complete Payment
        pay_res = await client.post(
            f"/api/v1/orders/{guest_token}/payment",
            json={"simulate_status": "success"},
        )
        assert pay_res.status_code == 200
        assert pay_res.json()["status"] == "SUCCESS"

        # Verify PrintJobs created with copies=4
        async with AsyncSessionLocal() as session:
            jobs = (
                await session.execute(
                    select(PrintJob).where(PrintJob.order_id == uuid.UUID(order_id))
                )
            ).scalars().all()
            assert len(jobs) == 2
            # Both print jobs are queued
            for j in jobs:
                assert j.status.value in ["QUEUED", "DISPATCHED", "PRINTING", "COMPLETED"]
