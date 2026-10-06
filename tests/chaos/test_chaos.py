import pytest
import uuid
import secrets
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_chaos_invalid_payloads_and_headers():
    """
    CHAOS TEST SUITE:
    Verifies that the backend handles malformed payloads, invalid tokens,
    and missing agent credentials predictably without crashing.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Unauthenticated agent polling
        resp = await client.post("/api/v1/agents/jobs/poll")
        assert resp.status_code == 401

        # 2. Corrupted agent headers
        resp = await client.post(
            "/api/v1/agents/jobs/poll",
            headers={"X-Agent-ID": "not-a-uuid", "X-Agent-Key": "bad-key"},
        )
        assert resp.status_code == 401

        # 3. Nonexistent order access token
        resp = await client.get("/api/v1/orders/nonexistent_token_12345")
        assert resp.status_code == 404

        # 4. Empty or malformed webhook payload
        resp = await client.post("/api/v1/payments/webhook", json={})
        assert resp.status_code == 400

        # 5. Invalid pickup confirmation with nonexistent order
        resp = await client.post(
            "/api/v1/pickups/confirm",
            json={"order_id": str(uuid.uuid4()), "otp": "999999"},
        )
        assert resp.status_code == 401  # Requires operator authentication
