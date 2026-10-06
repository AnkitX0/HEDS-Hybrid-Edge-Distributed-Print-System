import uuid
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import logger
from app.modules.agents.models import Agent, AgentStatus
from app.modules.printers.models import Printer, PrinterStatus, PrinterAdapterType


class AgentService:
    @staticmethod
    def hash_agent_token(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    @staticmethod
    async def register_agent(
        session: AsyncSession,
        shop_id: uuid.UUID,
        name: str,
        token: str,
        hostname: str = "localhost",
        os_info: str = "Linux",
        version: str = "0.1.0",
    ) -> Agent:
        token_hash = AgentService.hash_agent_token(token)

        # Check existing agent
        res = await session.execute(
            select(Agent).where(Agent.shop_id == shop_id, Agent.name == name)
        )
        agent = res.scalar_one_or_none()

        if agent:
            agent.agent_token_hash = token_hash
            agent.hostname = hostname
            agent.os_info = os_info
            agent.version = version
            agent.status = AgentStatus.ONLINE
            agent.last_heartbeat_at = datetime.now(timezone.utc)
        else:
            agent = Agent(
                shop_id=shop_id,
                name=name,
                agent_token_hash=token_hash,
                hostname=hostname,
                os_info=os_info,
                version=version,
                status=AgentStatus.ONLINE,
                last_heartbeat_at=datetime.now(timezone.utc),
            )
            session.add(agent)

        await session.commit()
        await session.refresh(agent)
        return agent

    @staticmethod
    async def process_heartbeat(
        session: AsyncSession,
        agent_id: uuid.UUID,
        printers_payload: Optional[List[Dict[str, Any]]] = None,
        local_queue_length: int = 0,
    ) -> Agent:
        res = await session.execute(select(Agent).where(Agent.id == agent_id))
        agent = res.scalar_one_or_none()
        if not agent:
            raise ValueError(f"Agent {agent_id} not found")

        now = datetime.now(timezone.utc)
        agent.last_heartbeat_at = now
        agent.status = AgentStatus.ONLINE

        # Sync reported printers
        if printers_payload:
            for p_info in printers_payload:
                p_name = p_info.get("name", "Default Printer")
                p_res = await session.execute(
                    select(Printer).where(
                        Printer.agent_id == agent.id,
                        Printer.name == p_name,
                    )
                )
                printer = p_res.scalar_one_or_none()
                if not printer:
                    printer = Printer(
                        shop_id=agent.shop_id,
                        agent_id=agent.id,
                        name=p_name,
                        adapter_type=PrinterAdapterType.MOCK if p_info.get("adapter") == "mock" else PrinterAdapterType.CUPS,
                        status=PrinterStatus(p_info.get("status", "ONLINE")),
                        capabilities_json=p_info.get("capabilities", {}),
                    )
                    session.add(printer)
                else:
                    printer.status = PrinterStatus(p_info.get("status", printer.status.value))
                    printer.capabilities_json = p_info.get("capabilities", printer.capabilities_json)

        await session.commit()
        await session.refresh(agent)
        return agent

    @staticmethod
    def compute_agent_health(agent: Agent) -> AgentStatus:
        if not agent.last_heartbeat_at:
            return AgentStatus.OFFLINE
        age_seconds = (datetime.now(timezone.utc) - agent.last_heartbeat_at).total_seconds()
        if age_seconds < settings.AGENT_HEARTBEAT_TIMEOUT_SECONDS:
            return AgentStatus.ONLINE
        elif age_seconds < settings.AGENT_HEARTBEAT_TIMEOUT_SECONDS * 2:
            return AgentStatus.DEGRADED
        return AgentStatus.OFFLINE


agent_service = AgentService()
