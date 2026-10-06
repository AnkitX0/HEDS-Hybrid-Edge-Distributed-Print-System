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
