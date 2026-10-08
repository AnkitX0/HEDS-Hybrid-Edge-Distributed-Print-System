import io
from datetime import datetime
from typing import Dict, Any, Optional
from reportlab.lib.pagesizes import A5
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


def generate_order_receipt_pdf(
    shop_name: str,
    order_number: str,
    guest_token: str,
    document_name: str,
    page_count: int,
    copies: int,
    color_mode: str,
    duplex: bool,
    paper_size: str,
    total_amount_cents: int,
    created_at: datetime,
    pricing_breakdown: Optional[Dict[str, Any]] = None,
    payment_method: str = "UPI / Razorpay Sandbox",
    gateway_id: Optional[str] = None,
) -> bytes:
    """
    Generates an authoritative, clean PDF receipt for an order.
    Formatted cleanly for mobile and counter printing.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A5,
        rightMargin=24,
        leftMargin=24,
        topMargin=24,
        bottomMargin=24,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReceiptTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#0f172a"),
    )
    subtitle_style = ParagraphStyle(
        "ReceiptSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#64748b"),
    )
    token_label_style = ParagraphStyle(
        "TokenLabel",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#64748b"),
    )
    token_number_style = ParagraphStyle(
        "TokenNumber",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=24,
        leading=28,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#2563eb"),
    )
    cell_label_style = ParagraphStyle(
        "CellLabel",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#475569"),
    )
    cell_val_style = ParagraphStyle(
        "CellVal",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=13,
        alignment=TA_RIGHT,
        textColor=colors.HexColor("#0f172a"),
    )
    total_label_style = ParagraphStyle(
        "TotalLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#0f172a"),
    )
    total_val_style = ParagraphStyle(
        "TotalVal",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        alignment=TA_RIGHT,
        textColor=colors.HexColor("#059669"),
    )
    footer_style = ParagraphStyle(
        "ReceiptFooter",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#94a3b8"),
    )

    story = []

    # Header
    story.append(Paragraph("HEDS", title_style))
    story.append(Paragraph("Hybrid Edge Distributed Print System", subtitle_style))
    story.append(Paragraph(shop_name, subtitle_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0"), spaceAfter=12))

    # Token Block
    token_display = f"#{order_number.split('-')[-1]}" if "-" in order_number else f"#{order_number}"
    story.append(Paragraph("PRINT TOKEN", token_label_style))
    story.append(Spacer(1, 2))
    story.append(Paragraph(token_display, token_number_style))
    story.append(Spacer(1, 10))

    # Details Table
    formatted_date = created_at.strftime("%d %b %Y, %I:%M %p") if isinstance(created_at, datetime) else str(created_at)
    amount_str = f"Rs. {(total_amount_cents / 100):.2f}"

    table_data = [
        [Paragraph("Order Reference", cell_label_style), Paragraph(order_number, cell_val_style)],
        [Paragraph("Date & Time", cell_label_style), Paragraph(formatted_date, cell_val_style)],
        [Paragraph("Document", cell_label_style), Paragraph(document_name, cell_val_style)],
        [Paragraph("Total Pages", cell_label_style), Paragraph(f"{page_count} pages", cell_val_style)],
        [Paragraph("Copies", cell_label_style), Paragraph(str(copies), cell_val_style)],
        [Paragraph("Color Mode", cell_label_style), Paragraph("Color" if color_mode.upper() == "COLOR" else "Black & White", cell_val_style)],
        [Paragraph("Sides", cell_label_style), Paragraph("Double-sided" if duplex else "Single-sided", cell_val_style)],
        [Paragraph("Paper Size", cell_label_style), Paragraph(paper_size.upper(), cell_val_style)],
        [Paragraph("Payment Status", cell_label_style), Paragraph("PAID", cell_val_style)],
        [Paragraph("Payment Method", cell_label_style), Paragraph(payment_method, cell_val_style)],
    ]

    if gateway_id:
        table_data.append([Paragraph("Gateway Ref", cell_label_style), Paragraph(gateway_id, cell_val_style)])

    table = Table(table_data, colWidths=[150, 190])
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#f1f5f9")),
    ]))
    story.append(table)

    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0f172a"), spaceAfter=8))

    # Total Row
    total_table = Table(
        [[Paragraph("TOTAL AMOUNT PAID", total_label_style), Paragraph(amount_str, total_val_style)]],
        colWidths=[150, 190]
    )
    total_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(total_table)

    story.append(Spacer(1, 16))
    story.append(Paragraph(f"Please collect your documents at the counter using Token <b>{token_display}</b>.", subtitle_style))
    story.append(Spacer(1, 12))
    story.append(Paragraph("Thank you for using HEDS automated print service.", footer_style))

    doc.build(story)
    return buffer.getvalue()
