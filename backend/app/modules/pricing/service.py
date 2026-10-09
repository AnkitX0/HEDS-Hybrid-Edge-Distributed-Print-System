import math
from typing import Dict, Any, List
from app.modules.pricing.models import PricingRule
from app.modules.orders.models import PrintSpecification, ColorMode


def parse_page_range(page_range_str: str, max_pages: int) -> int:
    """
    Parse a page range expression like 'all', '1-5', '1,3,5', '2-4, 7'
    and return the total count of valid pages to print.
    """
    if not page_range_str or page_range_str.strip().lower() == "all":
        return max_pages

    pages_set = set()
    parts = [p.strip() for p in page_range_str.split(",") if p.strip()]

    for part in parts:
        if "-" in part:
            bounds = part.split("-")
            if len(bounds) == 2:
                try:
                    start = int(bounds[0].strip())
                    end = int(bounds[1].strip())
                    for p in range(start, end + 1):
                        if 1 <= p <= max_pages:
                            pages_set.add(p)
                except ValueError:
                    continue
        else:
            try:
                p = int(part)
                if 1 <= p <= max_pages:
                    pages_set.add(p)
            except ValueError:
                continue

    return len(pages_set) if pages_set else max_pages


class PricingEngine:
    @staticmethod
    def calculate_price(
        document_page_count: int,
        spec: PrintSpecification,
        rule: PricingRule,
    ) -> Dict[str, Any]:
        """
        Calculate authoritative print pricing in integer minor units (paise).
        """
        active_pages = parse_page_range(spec.page_range, document_page_count)
        copies = max(1, spec.copies)

        # Rate per page
        is_color = spec.color_mode == ColorMode.COLOR
        rate_per_page = rule.color_per_page_cents if is_color else rule.bw_per_page_cents

        raw_page_total = rate_per_page * active_pages * copies

        # Duplex calculation: duplex halves the number of physical paper sheets
        sheets_per_copy = math.ceil(active_pages / 2) if spec.duplex else active_pages
        total_sheets = sheets_per_copy * copies

        discount_amount = 0
        if spec.duplex and active_pages > 1:
            # Shop can give a discount for duplex per duplex sheet saved
            saved_sheets_per_copy = active_pages - sheets_per_copy
            discount_amount = saved_sheets_per_copy * rule.duplex_discount_cents * copies

        subtotal_cents = max(0, raw_page_total - discount_amount)
        final_cents = max(subtotal_cents, rule.minimum_order_cents)

        breakdown = {
            "document_page_count": document_page_count,
            "active_pages": active_pages,
            "copies": copies,
            "color_mode": spec.color_mode.value,
            "duplex": spec.duplex,
            "paper_size": spec.paper_size,
            "sheets_count": total_sheets,
            "rate_per_page_cents": rate_per_page,
            "raw_total_cents": raw_page_total,
            "duplex_discount_cents": discount_amount,
            "subtotal_cents": subtotal_cents,
            "minimum_order_cents": rule.minimum_order_cents,
            "final_amount_cents": final_cents,
            "currency": "INR",
            "formatted_total": f"₹{final_cents / 100:.2f}",
        }
        return breakdown

    @staticmethod
    def calculate_batch_price(
        items: List[Dict[str, Any]],
        rule: PricingRule,
    ) -> Dict[str, Any]:
        """
        Calculates authoritative print pricing for a batch of multiple documents,
        each with its own independent PrintSpecification.
        """
        item_breakdowns = []
        raw_total_cents = 0
        total_duplex_discount_cents = 0
        total_pages = 0
        total_active_pages = 0
        total_sheets = 0

        for idx, item in enumerate(items):
            doc_pages = max(1, item.get("page_count", 1))
            spec: PrintSpecification = item["spec"]
            doc_id = item.get("document_id")
            doc_name = item.get("document_name") or f"Document {idx + 1}"

            active_pages = parse_page_range(spec.page_range, doc_pages)
            copies = max(1, spec.copies)
            is_color = spec.color_mode == ColorMode.COLOR
            rate_per_page = rule.color_per_page_cents if is_color else rule.bw_per_page_cents
            raw_item_total = rate_per_page * active_pages * copies

            sheets_per_copy = math.ceil(active_pages / 2) if spec.duplex else active_pages
            item_sheets = sheets_per_copy * copies

            item_discount = 0
            if spec.duplex and active_pages > 1:
                saved_sheets = active_pages - sheets_per_copy
                item_discount = saved_sheets * rule.duplex_discount_cents * copies

            item_subtotal = max(0, raw_item_total - item_discount)

            total_pages += doc_pages
            total_active_pages += active_pages
            total_sheets += item_sheets
            raw_total_cents += raw_item_total
            total_duplex_discount_cents += item_discount

            item_breakdowns.append({
                "sequence": idx + 1,
                "document_id": str(doc_id) if doc_id else None,
                "document_name": doc_name,
                "document_page_count": doc_pages,
                "active_pages": active_pages,
                "copies": copies,
                "color_mode": spec.color_mode.value if hasattr(spec.color_mode, "value") else str(spec.color_mode),
                "duplex": spec.duplex,
                "paper_size": spec.paper_size,
                "page_range": spec.page_range,
                "orientation": spec.orientation.value if hasattr(spec.orientation, "value") else str(spec.orientation),
                "scaling": spec.scaling.value if hasattr(spec.scaling, "value") else str(spec.scaling),
                "sheets_count": item_sheets,
                "rate_per_page_cents": rate_per_page,
                "raw_total_cents": raw_item_total,
                "duplex_discount_cents": item_discount,
                "subtotal_cents": item_subtotal,
                "final_amount_cents": item_subtotal,
                "formatted_item_price": f"₹{item_subtotal / 100:.2f}",
            })

        batch_subtotal = max(0, raw_total_cents - total_duplex_discount_cents)
        final_cents = max(batch_subtotal, rule.minimum_order_cents)

        breakdown = {
            "total_documents": len(items),
            "total_pages": total_pages,
            "total_active_pages": total_active_pages,
            "total_sheets": total_sheets,
            "raw_total_cents": raw_total_cents,
            "duplex_discount_cents": total_duplex_discount_cents,
            "subtotal_cents": batch_subtotal,
            "minimum_order_cents": rule.minimum_order_cents,
            "final_amount_cents": final_cents,
            "currency": "INR",
            "formatted_total": f"₹{final_cents / 100:.2f}",
            "items": item_breakdowns,
        }

        if len(items) == 1:
            first = item_breakdowns[0]
            breakdown.update({
                "document_page_count": first["document_page_count"],
                "active_pages": first["active_pages"],
                "copies": first["copies"],
                "color_mode": first["color_mode"],
                "duplex": first["duplex"],
                "paper_size": first["paper_size"],
                "sheets_count": first["sheets_count"],
                "rate_per_page_cents": first["rate_per_page_cents"],
            })

        return breakdown


pricing_engine = PricingEngine()
