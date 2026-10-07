import time
import httpx
from typing import Dict, Any, List, Optional
from heds_agent.config import agent_settings


class CloudClient:
    def __init__(self):
        self.base_url = agent_settings.HEDS_CLOUD_URL.rstrip("/")
        self.agent_id = agent_settings.HEDS_AGENT_ID
        self.agent_key = agent_settings.HEDS_AGENT_KEY
        self.shop_id = agent_settings.HEDS_SHOP_ID
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "X-Agent-ID": self.agent_id,
                "X-Agent-Key": self.agent_key,
            },
            timeout=15.0,
        )

    async def close(self):
        await self._client.aclose()

    async def register_agent(
        self,
        name: str = "campus-agent-01",
        hostname: str = "localhost",
        os_info: str = "Linux",
    ) -> bool:
        """
        Dynamically registers or re-enrolls the agent with the cloud and updates headers.
        """
        try:
            resp = await self._client.post(
                "/api/v1/agents/register",
                json={
                    "shop_id": self.shop_id,
                    "name": name,
                    "token": self.agent_key,
                    "hostname": hostname,
                    "os_info": os_info,
                    "version": "0.1.0",
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                self.agent_id = data["agent_id"]
                self._client.headers["X-Agent-ID"] = self.agent_id
                return True
            return False
        except Exception:
            return False

    async def send_heartbeat(
        self,
        printers: List[Dict[str, Any]],
        local_queue_length: int = 0,
        uptime_seconds: float = 0.0,
    ) -> bool:
        try:
            resp = await self._client.post(
                "/api/v1/agents/heartbeat",
                json={
                    "agent_id": self.agent_id,
                    "local_queue_length": local_queue_length,
                    "uptime_seconds": uptime_seconds,
                    "printers": printers,
                },
            )
            if resp.status_code == 401:
                # Attempt automatic re-enrollment / registration
                enrolled = await self.register_agent()
                if enrolled:
                    retry_resp = await self._client.post(
                        "/api/v1/agents/heartbeat",
                        json={
                            "agent_id": self.agent_id,
                            "local_queue_length": local_queue_length,
                            "uptime_seconds": uptime_seconds,
                            "printers": printers,
                        },
                    )
                    return retry_resp.status_code == 200
            return resp.status_code == 200
        except Exception:
            return False

    async def poll_next_job(self) -> Optional[Dict[str, Any]]:
        try:
            resp = await self._client.post("/api/v1/agents/jobs/poll")
            if resp.status_code == 200 and resp.text:
                data = resp.json()
                return data if data else None
            return None
        except Exception:
            return None

    async def acknowledge_job(self, job_id: str) -> bool:
        try:
            resp = await self._client.post(f"/api/v1/agents/jobs/{job_id}/ack")
            return resp.status_code == 200
        except Exception:
            return False

    async def download_document(self, job_id: str) -> Optional[bytes]:
        try:
            resp = await self._client.get(f"/api/v1/agents/jobs/{job_id}/document")
            if resp.status_code == 200:
                return resp.content
            return None
        except Exception:
            return None

    async def report_job_status(
        self,
        job_id: str,
        status: str,
        progress_page: Optional[int] = None,
        error_message: Optional[str] = None,
        native_job_id: Optional[str] = None,
    ) -> bool:
        try:
            payload: Dict[str, Any] = {
                "status": status,
                "progress_page": progress_page,
                "error_message": error_message,
            }
            if native_job_id:
                payload["native_job_id"] = native_job_id
            resp = await self._client.post(
                f"/api/v1/agents/jobs/{job_id}/status",
                json=payload,
            )
            return resp.status_code == 200
        except Exception:
            return False

    async def reconcile_local_jobs(self, pending_jobs: List[Dict[str, Any]]) -> bool:
        try:
            resp = await self._client.post(
                "/api/v1/agents/reconcile",
                json={"jobs": pending_jobs},
            )
            return resp.status_code == 200
        except Exception:
            return False
