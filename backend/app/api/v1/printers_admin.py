import uuid
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.modules.printers.models import Printer, PrinterStatus, PrinterAdapterType
from app.modules.agents.models import Agent, AgentStatus
from app.modules.pricing.models import PricingRule
from app.modules.audit.models import AuditLog
from app.modules.tenants.models import Shop
from app.api.deps import require_shop_operator, require_shop_admin

router = APIRouter(tags=["Shop Administration"])


@router.get("/shop/printers")
async def list_shop_printers(
    current_user=Depends(require_shop_operator),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Printer).options(selectinload(Printer.agent)).order_by(Printer.created_at.desc())
    res = await db.execute(stmt)
    printers = res.scalars().all()

    return [
        {
            "id": str(p.id),
            "name": p.name,
            "adapter_type": p.adapter_type.value,
            "status": p.status.value,
            "capabilities": p.capabilities_json,
            "current_job_id": str(p.current_job_id) if p.current_job_id else None,
            "agent_id": str(p.agent_id) if p.agent_id else None,
            "agent_name": p.agent.name if p.agent else None,
            "last_error": p.last_error,
        }
        for p in printers
    ]


@router.get("/shop/agents")
async def list_shop_agents(
    current_user=Depends(require_shop_operator),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Agent).options(selectinload(Agent.printers)).order_by(Agent.created_at.desc())
    res = await db.execute(stmt)
    agents = res.scalars().all()

    from app.modules.agents.service import AgentService

    return [
        {
            "id": str(a.id),
            "name": a.name,
            "hostname": a.hostname,
            "os_info": a.os_info,
            "version": a.version,
            "status": AgentService.compute_agent_health(a).value,
            "last_heartbeat_at": a.last_heartbeat_at,
            "printer_count": len(a.printers),
        }
        for a in agents
    ]


@router.get("/shop/audit-logs")
async def get_audit_logs(
    current_user=Depends(require_shop_operator),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(100)
    res = await db.execute(stmt)
    logs = res.scalars().all()

    return [
        {
            "id": str(l.id),
            "actor_type": l.actor_type,
            "actor_id": l.actor_id,
            "action": l.action,
            "resource_type": l.resource_type,
            "resource_id": l.resource_id,
            "metadata": l.metadata_json,
            "created_at": l.created_at,
        }
        for l in logs
    ]


@router.get("/shop/pricing")
async def get_pricing_rules(
    current_user=Depends(require_shop_operator),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(PricingRule).order_by(PricingRule.created_at.desc())
    res = await db.execute(stmt)
    rules = res.scalars().all()

    return [
        {
            "id": str(r.id),
            "name": r.name,
            "paper_size": r.paper_size,
            "bw_per_page_cents": r.bw_per_page_cents,
            "color_per_page_cents": r.color_per_page_cents,
            "duplex_discount_cents": r.duplex_discount_cents,
            "minimum_order_cents": r.minimum_order_cents,
            "is_active": r.is_active,
        }
        for r in rules
    ]


@router.put("/shop/pricing/{rule_id}")
async def update_pricing_rule(
    rule_id: str,
    payload: Dict[str, Any],
    current_user=Depends(require_shop_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(PricingRule).where(PricingRule.id == uuid.UUID(rule_id)))
    rule = res.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Pricing rule not found")

    if "bw_per_page_cents" in payload:
        rule.bw_per_page_cents = payload["bw_per_page_cents"]
    if "color_per_page_cents" in payload:
        rule.color_per_page_cents = payload["color_per_page_cents"]
    if "duplex_discount_cents" in payload:
        rule.duplex_discount_cents = payload["duplex_discount_cents"]
    if "minimum_order_cents" in payload:
        rule.minimum_order_cents = payload["minimum_order_cents"]

    await db.commit()
    return {"status": "SUCCESS", "message": "Pricing rule updated"}
