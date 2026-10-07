import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import AsyncSessionLocal
from app.models import Shop, Agent, AgentStatus
from sqlalchemy import select


@pytest.mark.asyncio
async def test_edge_agent_fresh_registration_and_heartbeat():
    """
    Verifies that a fresh or newly provisioned Edge Agent can:
    1. Register itself using shop_id and agent enrollment key.
    2. Receive authoritative persistent agent_id.
    3. Successfully send telemetry heartbeats with that identity.
    4. Successfully poll for jobs using authenticated headers.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fetch active shop
        async with AsyncSessionLocal() as session:
            shop = (await session.execute(select(Shop).where(Shop.slug == "campus-xerox"))).scalar_one()
            shop_id = str(shop.id)

        # 2. Register fresh agent
        new_agent_name = f"new-counter-agent-{uuid.uuid4().hex[:6]}"
        enrollment_key = "agent-dev-key-12345"

        reg_resp = await client.post(
            "/api/v1/agents/register",
            json={
                "shop_id": shop_id,
                "name": new_agent_name,
                "token": enrollment_key,
                "hostname": "pos-station-04",
                "os_info": "Linux Debian 12 (bookworm)",
                "version": "1.0.0",
            },
        )
        assert reg_resp.status_code == 200, reg_resp.text
        reg_data = reg_resp.json()
        agent_id = reg_data["agent_id"]
        assert agent_id is not None
        assert reg_data["status"] == "ONLINE"

        # 3. Send Heartbeat with the new agent identity
        headers = {
            "X-Agent-ID": agent_id,
            "X-Agent-Key": enrollment_key,
        }
        heartbeat_resp = await client.post(
            "/api/v1/agents/heartbeat",
            headers=headers,
            json={
                "agent_id": agent_id,
                "local_queue_length": 0,
                "uptime_seconds": 120.5,
                "printers": [
                    {
                        "name": "Receipt-Printer-USB",
                        "status": "ONLINE",
                        "capabilities": {"color": False, "duplex": False, "paper_sizes": ["A4"]},
                    }
                ],
            },
        )
        assert heartbeat_resp.status_code == 200, heartbeat_resp.text
        assert heartbeat_resp.json()["status"] == "OK"

        # 4. Authenticated Job Poll
        poll_resp = await client.post("/api/v1/agents/jobs/poll", headers=headers)
        # Should succeed (200 with leased job or 200 with null if no jobs waiting for this printer)
        assert poll_resp.status_code == 200

        # 5. Invalid Key rejection
        bad_headers = {
            "X-Agent-ID": agent_id,
            "X-Agent-Key": "wrong-secret-key",
        }
        bad_poll = await client.post("/api/v1/agents/jobs/poll", headers=bad_headers)
        assert bad_poll.status_code == 401
