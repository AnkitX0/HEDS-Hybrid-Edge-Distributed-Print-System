import uuid
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.modules.tenants.models import Shop, ShopMember
from app.modules.pricing.models import PricingRule
from app.modules.queue.models import PrintJob, JobStatus
from app.modules.orders.models import Order, OrderState
from app.modules.printers.models import Printer, PrinterStatus
from app.modules.agents.models import Agent, AgentStatus
from app.modules.users.models import User, UserRole
from app.api.v1.schemas import ShopPublicInfo
from app.api.deps import require_shop_operator, get_authorized_shop

router = APIRouter(tags=["Shops"])


@router.get("/operator/shops")
async def list_operator_shops(
    current_user: User = Depends(require_shop_operator),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all print shops the authenticated operator/admin has authorized access to.
    """
    if current_user.role == UserRole.PLATFORM_ADMIN:
        stmt = select(Shop).where(Shop.is_active == True).order_by(Shop.name)
        res = await db.execute(stmt)
        shops = res.scalars().all()
        return [
            {
                "id": str(s.id),
                "name": s.name,
                "slug": s.slug,
                "is_active": s.is_active,
                "is_queue_paused": s.is_queue_paused,
                "role": "PLATFORM_ADMIN",
            }
            for s in shops
        ]

    stmt = (
        select(ShopMember)
        .options(selectinload(ShopMember.shop))
        .where(ShopMember.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    memberships = res.scalars().all()

    return [
        {
            "id": str(m.shop.id),
            "name": m.shop.name,
            "slug": m.shop.slug,
            "is_active": m.shop.is_active,
            "is_queue_paused": m.shop.is_queue_paused,
            "role": m.role.value if hasattr(m.role, "value") else str(m.role),
        }
        for m in memberships
        if m.shop and m.shop.is_active
    ]


@router.get("/shops/{shop_slug}", response_model=ShopPublicInfo)
async def get_shop_by_slug(shop_slug: str, db: AsyncSession = Depends(get_db)):
    """
    Public shop landing endpoint accessed when a student scans the QR:
    https://heds.local/s/{shop_slug}
    """
    stmt = (
        select(Shop)
        .options(selectinload(Shop.pricing_rules))
        .where(Shop.slug == shop_slug, Shop.is_active == True)
    )
    res = await db.execute(stmt)
    shop = res.scalar_one_or_none()

    if not shop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Print shop '{shop_slug}' not found or inactive",
        )

    # Calculate active queue depth
    queue_count_stmt = select(func.count(PrintJob.id)).where(
        PrintJob.shop_id == shop.id,
        PrintJob.status.in_([JobStatus.QUEUED, JobStatus.DISPATCHED, JobStatus.PRINTING]),
    )
    q_res = await db.execute(queue_count_stmt)
    queue_length = q_res.scalar_one() or 0

    # Estimated waiting time: ~1.5 minutes per waiting job
    estimated_wait_minutes = max(1, queue_length * 2)

    # Active pricing rules
    pricing_info = {}
    if shop.pricing_rules:
        active_rule = next((r for r in shop.pricing_rules if r.is_active), shop.pricing_rules[0])
        pricing_info = {
            "bw_per_page_cents": active_rule.bw_per_page_cents,
            "color_per_page_cents": active_rule.color_per_page_cents,
            "duplex_discount_cents": active_rule.duplex_discount_cents,
            "minimum_order_cents": active_rule.minimum_order_cents,
            "paper_size": active_rule.paper_size,
        }

    return ShopPublicInfo(
        id=str(shop.id),
        name=shop.name,
        slug=shop.slug,
        is_active=shop.is_active,
        is_queue_paused=shop.is_queue_paused,
        queue_length=queue_length,
        estimated_wait_minutes=estimated_wait_minutes,
        pricing=pricing_info,
    )


@router.get("/shop/dashboard")
async def get_shop_dashboard(
    shop: Shop = Depends(get_authorized_shop),
    db: AsyncSession = Depends(get_db),
):
    """
    Operational summary metrics for the shop dashboard, authoritatively scoped to authorized shop.
    """


    # Queue counts
    active_jobs_res = await db.execute(
        select(func.count(PrintJob.id)).where(
            PrintJob.shop_id == shop.id,
            PrintJob.status.in_([JobStatus.DISPATCHED, JobStatus.PRINTING]),
        )
    )
    active_jobs = active_jobs_res.scalar_one() or 0

    waiting_jobs_res = await db.execute(
        select(func.count(PrintJob.id)).where(
            PrintJob.shop_id == shop.id,
            PrintJob.status == JobStatus.QUEUED,
        )
    )
    waiting_jobs = waiting_jobs_res.scalar_one() or 0

    completed_jobs_res = await db.execute(
        select(func.count(PrintJob.id)).where(
            PrintJob.shop_id == shop.id,
            PrintJob.status == JobStatus.COMPLETED,
        )
    )
    completed_jobs = completed_jobs_res.scalar_one() or 0

    failed_jobs_res = await db.execute(
        select(func.count(PrintJob.id)).where(
            PrintJob.shop_id == shop.id,
            PrintJob.status.in_([JobStatus.FAILED, JobStatus.RECONCILING]),
        )
    )
    failed_jobs = failed_jobs_res.scalar_one() or 0

    # Revenue
    revenue_res = await db.execute(
        select(func.sum(Order.total_amount_cents)).where(
            Order.shop_id == shop.id,
            Order.status.in_([OrderState.PAID, OrderState.QUEUED, OrderState.DISPATCHED, OrderState.PRINTING, OrderState.PRINT_COMPLETED, OrderState.PICKUP_READY, OrderState.COMPLETED]),
        )
    )
    revenue_cents = revenue_res.scalar_one() or 0

    # Printers & Agents
    printers_res = await db.execute(select(Printer).where(Printer.shop_id == shop.id))
    printers = printers_res.scalars().all()
    online_printers = sum(
        1 for p in printers if p.status in [PrinterStatus.ONLINE, PrinterStatus.BUSY]
    )

    agents_res = await db.execute(select(Agent).where(Agent.shop_id == shop.id))
    agents = agents_res.scalars().all()

    return {
        "shop": {
            "id": str(shop.id),
            "name": shop.name,
            "slug": shop.slug,
            "is_queue_paused": shop.is_queue_paused,
        },
        "stats": {
            "active_jobs": active_jobs,
            "waiting_jobs": waiting_jobs,
            "completed_today": completed_jobs,
            "failed_jobs": failed_jobs,
            "revenue_cents": revenue_cents,
            "revenue_formatted": f"₹{revenue_cents / 100:.2f}",
            "online_printers": online_printers,
            "total_printers": len(printers),
            "total_agents": len(agents),
        },
    }


from fastapi import Query


@router.get("/shop/analytics")
async def get_shop_analytics(
    time_range: str = Query("today", alias="range"),
    shop: Shop = Depends(get_authorized_shop),
    db: AsyncSession = Depends(get_db),
):
    """
    Authoritative operational analytics derived strictly from PostgreSQL records.
    Provides KPIs, peak print hours, print mix, printer utilization, and order status counts.
    """
    from datetime import datetime, timedelta, timezone
    from app.modules.orders.models import ColorMode
    from app.modules.documents.models import Document

    now = datetime.now(timezone.utc)
    target_range = (time_range or "today").lower()
    if target_range == "7d":
        start_time = now - timedelta(days=7)
    elif target_range == "30d":
        start_time = now - timedelta(days=30)
    else:  # "today"
        start_time = now.replace(hour=0, minute=0, second=0, microsecond=0)



    # Query all orders in range
    orders_stmt = (
        select(Order)
        .options(
            selectinload(Order.document),
            selectinload(Order.print_specifications),
        )
        .where(Order.shop_id == shop.id, Order.created_at >= start_time)
        .order_by(Order.created_at.asc())
    )
    orders_res = await db.execute(orders_stmt)
    orders = orders_res.scalars().all()

    orders_count = len(orders)
    completed_orders = [o for o in orders if o.status == OrderState.COMPLETED]
    pages_printed = sum(
        (o.document.page_count * (o.print_specification.copies if o.print_specification else 1))
        for o in orders
        if o.status in [OrderState.PRINT_COMPLETED, OrderState.PICKUP_READY, OrderState.COMPLETED] and o.document
    )
    revenue_cents = sum(
        o.total_amount_cents
        for o in orders
        if o.status not in [OrderState.CREATED, OrderState.PAYMENT_PENDING, OrderState.PAYMENT_FAILED, OrderState.CANCELLED]
    )
    avg_order_cents = revenue_cents // orders_count if orders_count > 0 else 0

    # Failed & completed jobs
    jobs_stmt = (
        select(PrintJob)
        .where(PrintJob.shop_id == shop.id, PrintJob.created_at >= start_time)
    )
    jobs_res = await db.execute(jobs_stmt)
    jobs = jobs_res.scalars().all()

    completed_jobs_count = sum(1 for j in jobs if j.status == JobStatus.COMPLETED)
    failed_jobs_count = sum(1 for j in jobs if j.status in [JobStatus.FAILED, JobStatus.RECONCILING])
    total_finished = completed_jobs_count + failed_jobs_count
    success_rate = round((completed_jobs_count / total_finished * 100), 1) if total_finished > 0 else 100.0

    # Peak Print Hours (8 AM to 8 PM or hours with activity)
    hourly_pages: Dict[int, int] = {h: 0 for h in range(8, 21)}
    for o in orders:
        if o.created_at and o.document:
            h = o.created_at.hour
            pages = o.document.page_count * (o.print_specification.copies if o.print_specification else 1)
            hourly_pages[h] = hourly_pages.get(h, 0) + pages

    peak_hours = [
        {"hour": f"{h:02d}:00", "pages": pages}
        for h, pages in sorted(hourly_pages.items())
    ]

    # Print Mix
    bw_count = sum(1 for o in orders if o.print_specification and o.print_specification.color_mode == ColorMode.BW)
    color_count = sum(1 for o in orders if o.print_specification and o.print_specification.color_mode == ColorMode.COLOR)
    simplex_count = sum(1 for o in orders if o.print_specification and not o.print_specification.duplex)
    duplex_count = sum(1 for o in orders if o.print_specification and o.print_specification.duplex)

    # Printer Utilization
    printers_stmt = select(Printer).where(Printer.shop_id == shop.id)
    printers = (await db.execute(printers_stmt)).scalars().all()
    printer_map: Dict[str, int] = {p.name: 0 for p in printers}

    for j in jobs:
        if j.printer_id:
            for p in printers:
                if p.id == j.printer_id:
                    printer_map[p.name] = printer_map.get(p.name, 0) + 1

    total_printer_jobs = sum(printer_map.values())
    printer_utilization = [
        {
            "name": name,
            "jobs": count,
            "percentage": round((count / total_printer_jobs * 100), 1) if total_printer_jobs > 0 else 0,
        }
        for name, count in printer_map.items()
    ]

    # Order Status Distribution
    status_counts = {
        "COMPLETED": sum(1 for o in orders if o.status == OrderState.COMPLETED),
        "PRINTING": sum(1 for o in orders if o.status == OrderState.PRINTING),
        "QUEUED": sum(1 for o in orders if o.status in [OrderState.QUEUED, OrderState.DISPATCHED]),
        "FAILED": sum(1 for o in orders if o.status in [OrderState.PRINT_FAILED, OrderState.PAYMENT_FAILED]),
        "PICKUP_READY": sum(1 for o in orders if o.status in [OrderState.PICKUP_READY, OrderState.PRINT_COMPLETED]),
    }

    return {
        "range": target_range,
        "has_data": orders_count > 0 or len(jobs) > 0,

        "kpis": {
            "orders_today": orders_count,
            "pages_printed": pages_printed,
            "revenue_cents": revenue_cents,
            "revenue_formatted": f"₹{revenue_cents / 100:.2f}",
            "average_order_formatted": f"₹{avg_order_cents / 100:.2f}",
            "failed_jobs": failed_jobs_count,
            "print_success_rate": f"{success_rate}%",
        },
        "peak_hours": peak_hours,
        "print_mix": {
            "bw": bw_count,
            "color": color_count,
            "single_sided": simplex_count,
            "duplex": duplex_count,
        },
        "printer_utilization": printer_utilization,
        "order_status": status_counts,
    }

