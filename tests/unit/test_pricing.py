import pytest
from app.modules.pricing.service import pricing_engine, parse_page_range
from app.modules.pricing.models import PricingRule
from app.modules.orders.models import PrintSpecification, ColorMode, Orientation, Scaling


def test_parse_page_range():
    assert parse_page_range("all", 10) == 10
    assert parse_page_range("1-5", 10) == 5
    assert parse_page_range("1, 3, 5", 10) == 3
    assert parse_page_range("2-4, 7-8", 10) == 5
    # Clamped to bounds
    assert parse_page_range("8-15", 10) == 3


def test_pricing_calculation_black_and_white():
    rule = PricingRule(
        bw_per_page_cents=200,      # ₹2.00
        color_per_page_cents=1000,  # ₹10.00
        duplex_discount_cents=50,   # ₹0.50
        minimum_order_cents=200,
    )
    spec = PrintSpecification(
        copies=1,
        color_mode=ColorMode.BW,
        duplex=False,
        paper_size="A4",
        page_range="all",
        orientation=Orientation.PORTRAIT,
        scaling=Scaling.FIT,
    )

    # 10 pages simplex B/W = 10 * 200 = 2000 cents (₹20.00)
    breakdown = pricing_engine.calculate_price(10, spec, rule)
    assert breakdown["final_amount_cents"] == 2000
    assert breakdown["active_pages"] == 10
    assert breakdown["copies"] == 1
    assert breakdown["duplex_discount_cents"] == 0
    assert breakdown["formatted_total"] == "₹20.00"


def test_pricing_calculation_color_duplex_with_discount():
    rule = PricingRule(
        bw_per_page_cents=200,
        color_per_page_cents=1000,  # ₹10.00/pg
        duplex_discount_cents=50,   # ₹0.50 saved per duplex sheet
        minimum_order_cents=200,
    )
    spec = PrintSpecification(
        copies=2,
        color_mode=ColorMode.COLOR,
        duplex=True,
        paper_size="A4",
        page_range="all",
        orientation=Orientation.PORTRAIT,
        scaling=Scaling.FIT,
    )

    # 4 pages color = 4 * 1000 * 2 copies = 8000 cents
    # Duplex: 4 pages = 2 sheets. Saved sheets per copy = 4 - 2 = 2.
    # Total saved sheets = 2 * 2 copies = 4 sheets * 50 cents = 200 cents discount
    # Subtotal = 8000 - 200 = 7800 cents (₹78.00)
    breakdown = pricing_engine.calculate_price(4, spec, rule)
    assert breakdown["raw_total_cents"] == 8000
    assert breakdown["duplex_discount_cents"] == 200
    assert breakdown["final_amount_cents"] == 7800
    assert breakdown["formatted_total"] == "₹78.00"


def test_one_rupee_base_pricing_matrix():
    """
    Standard base policy: ₹1.00 per PDF page (100 cents/paise).
    Verifies Dry Runs A through G:
      - 1 page = ₹1.00 (100 cents)
      - 3 pages = ₹3.00 (300 cents)
      - 11 pages = ₹11.00 (1100 cents)
      - 60 pages = ₹60.00 (6000 cents)
      - 5 pages x 2 copies = ₹10.00 (1000 cents)
      - 10 pages duplex = ₹10.00 (1000 cents)
    """
    rule = PricingRule(
        bw_per_page_cents=100,      # ₹1.00
        color_per_page_cents=1000,  # ₹10.00
        duplex_discount_cents=0,    # standard policy
        minimum_order_cents=100,    # ₹1.00 minimum
    )

    # 1 page
    spec1 = PrintSpecification(copies=1, color_mode=ColorMode.BW, duplex=False, page_range="all", paper_size="A4", orientation=Orientation.PORTRAIT, scaling=Scaling.FIT)
    b1 = pricing_engine.calculate_price(1, spec1, rule)
    assert b1["final_amount_cents"] == 100
    assert b1["formatted_total"] == "₹1.00"

    # 3 pages (previously miscalculated as ₹6.00)
    b3 = pricing_engine.calculate_price(3, spec1, rule)
    assert b3["final_amount_cents"] == 300
    assert b3["formatted_total"] == "₹3.00"

    # 11 pages
    b11 = pricing_engine.calculate_price(11, spec1, rule)
    assert b11["final_amount_cents"] == 1100
    assert b11["formatted_total"] == "₹11.00"

    # 60 pages (large document test)
    b60 = pricing_engine.calculate_price(60, spec1, rule)
    assert b60["final_amount_cents"] == 6000
    assert b60["formatted_total"] == "₹60.00"

    # 5 pages x 2 copies
    spec_copies = PrintSpecification(copies=2, color_mode=ColorMode.BW, duplex=False, page_range="all", paper_size="A4", orientation=Orientation.PORTRAIT, scaling=Scaling.FIT)
    b_copies = pricing_engine.calculate_price(5, spec_copies, rule)
    assert b_copies["final_amount_cents"] == 1000
    assert b_copies["formatted_total"] == "₹10.00"

    # 10 pages duplex: 10 pages remain ₹10.00 billable
    spec_duplex = PrintSpecification(copies=1, color_mode=ColorMode.BW, duplex=True, page_range="all", paper_size="A4", orientation=Orientation.PORTRAIT, scaling=Scaling.FIT)
    b_duplex = pricing_engine.calculate_price(10, spec_duplex, rule)
    assert b_duplex["final_amount_cents"] == 1000
    assert b_duplex["sheets_count"] == 5
    assert b_duplex["formatted_total"] == "₹10.00"


def test_page_range_pricing():
    """
    20-page document with range '1-5' = 5 active pages.
    Price = 5 x ₹1.00 = ₹5.00.
    """
    rule = PricingRule(
        bw_per_page_cents=100,
        color_per_page_cents=1000,
        duplex_discount_cents=0,
        minimum_order_cents=100,
    )
    spec_range = PrintSpecification(copies=1, color_mode=ColorMode.BW, duplex=False, page_range="1-5", paper_size="A4", orientation=Orientation.PORTRAIT, scaling=Scaling.FIT)
    b = pricing_engine.calculate_price(20, spec_range, rule)
    assert b["active_pages"] == 5
    assert b["final_amount_cents"] == 500
    assert b["formatted_total"] == "₹5.00"

