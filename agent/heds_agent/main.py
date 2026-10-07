import asyncio
import signal
import sys
import time
import logging
from datetime import datetime, timezone
from typing import Optional

from heds_agent.config import agent_settings
from heds_agent.queue.local_queue import LocalQueue
from heds_agent.cloud.client import CloudClient
from heds_agent.printers.mock import MockPrinterAdapter
from heds_agent.printers.cups import CUPSPrinterAdapter

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("heds.agent")


class HEDSAgent:
    def __init__(self):
        self.settings = agent_settings
        self.local_queue = LocalQueue(self.settings.SQLITE_PATH)
        self.cloud = CloudClient()
        self.start_time = time.time()
        self.running = True

        # Initialize printer adapter based on configuration
        if self.settings.HEDS_PRINTER_ADAPTER.lower() == "cups":
            self.adapter = CUPSPrinterAdapter()
        else:
            self.adapter = MockPrinterAdapter(
                name="Mock Printer 01",
                pages_per_sec=self.settings.MOCK_PRINTER_PAGES_PER_SECOND,
                failure_rate=self.settings.MOCK_PRINTER_FAILURE_RATE,
            )

    def _resolve_target_printer(self, requested_name: Optional[str] = None) -> str:
        """Deterministically selects target hardware queue"""
        if requested_name:
            return requested_name

        discovered = self.adapter.discover()
        online_printers = [p for p in discovered if p.get("status") == "ONLINE"]
        if online_printers:
            return online_printers[0]["name"]
        if discovered:
            return discovered[0]["name"]
        return "default"

    async def heartbeat_loop(self):
        """Sends telemetry, printer status, and queue depth periodically to cloud"""
        while self.running:
            try:
                printers = self.adapter.discover()
                queue_depth = self.local_queue.get_queue_depth()
                uptime = time.time() - self.start_time
                success = await self.cloud.send_heartbeat(
                    printers=printers,
                    local_queue_length=queue_depth,
                    uptime_seconds=uptime,
                )
                if success:
                    # Sync any offline completed jobs
                    unsynced = self.local_queue.get_pending_unsynced_jobs()
                    if unsynced:
                        reconciled = await self.cloud.reconcile_local_jobs(unsynced)
                        if reconciled:
                            for j in unsynced:
                                self.local_queue.update_status(j["job_id"], j["status"], synced=True)
            except Exception as e:
                logger.warning(f"Heartbeat loop exception: {e}")
            await asyncio.sleep(self.settings.HEARTBEAT_INTERVAL_SECONDS)

    async def process_job(self, job_data: dict):
        job_id = job_data["job_id"]
        order_number = job_data["order_number"]
        order_id = job_data["order_id"]
        spec = job_data.get("print_specification", {})
        pages = job_data.get("page_count", 1)
        spec["page_count"] = pages

        target_printer = self._resolve_target_printer(job_data.get("printer_name"))
        start_ts = time.time()

        logger.info(
            f"event=job_received job_id={job_id} order={order_number} "
            f"printer={target_printer} pages={pages} copies={spec.get('copies', 1)}"
        )

        # 1. Persist to local durable SQLite queue immediately
        self.local_queue.save_job(
            job_id=job_id,
            order_id=order_id,
            order_number=order_number,
            lease_id=job_data["lease_id"],
            lease_expires_at=job_data["lease_expires_at"],
            document_id=job_data["document_id"],
            document_filename=job_data["document_filename"],
            page_count=pages,
            print_spec=spec,
            printer_name=target_printer,
        )

        # 2. Acknowledge receipt to Cloud
        await self.cloud.acknowledge_job(job_id)

        # 3. Download document binary
        doc_bytes = await self.cloud.download_document(job_id)
        if not doc_bytes:
            logger.error(f"event=download_failed job_id={job_id} order={order_number}")
            self.local_queue.update_status(job_id, "FAILED")
            await self.cloud.report_job_status(job_id, "FAILED", error_message="Could not download document")
            return

        # 4. Spool to printer adapter
        self.local_queue.update_status(job_id, "PRINTING")
        await self.cloud.report_job_status(job_id, "PRINTING", progress_page=1)

        async def progress_cb(jid, curr, total):
            await self.cloud.report_job_status(jid, "PRINTING", progress_page=curr)

        result = await self.adapter.submit_job(
            printer_name=target_printer,
            job_id=job_id,
            document_bytes=doc_bytes,
            print_spec=spec,
            progress_callback=progress_cb,
        )

        duration = time.time() - start_ts

        # 5. Report completion or failure with native CUPS Job ID
        if result:
            native_id = getattr(result, "native_job_id", None) or result.get("native_job_id")
            self.local_queue.update_status(job_id, "COMPLETED", synced=True, native_job_id=native_id)
            await self.cloud.report_job_status(job_id, "COMPLETED", native_job_id=native_id)
            logger.info(
                f"event=job_completed job_id={job_id} order={order_number} "
                f"printer={target_printer} native_id={native_id} duration={duration:.2f}s"
            )
        else:
            err = getattr(result, "error", None) or result.get("error") or "Hardware adapter reported failure"
            self.local_queue.update_status(job_id, "FAILED", synced=True)
            await self.cloud.report_job_status(job_id, "FAILED", error_message=err)
            logger.error(
                f"event=job_failed job_id={job_id} order={order_number} "
                f"printer={target_printer} error='{err}' duration={duration:.2f}s"
            )

    async def run(self):
        logger.info("=" * 60)
        logger.info(" [HEDS] Hybrid Edge Distributed Print Agent Initializing")
        logger.info(f" Cloud URL: {self.settings.HEDS_CLOUD_URL}")
        logger.info(f" Agent ID:  {self.settings.HEDS_AGENT_ID}")
        logger.info(f" Adapter:   {self.settings.HEDS_PRINTER_ADAPTER.upper()}")
        logger.info("=" * 60)

        # Start background heartbeat
        heartbeat_task = asyncio.create_task(self.heartbeat_loop())

        try:
            while self.running:
                job_data = await self.cloud.poll_next_job()
                if job_data:
                    await self.process_job(job_data)
                else:
                    await asyncio.sleep(self.settings.POLL_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            pass
        finally:
            heartbeat_task.cancel()
            await self.cloud.close()
            logger.info("[AGENT] Daemon shutdown complete.")


def main():
    agent = HEDSAgent()

    def handle_sig(sig, frame):
        logger.info("Termination signal received. Shutting down agent daemon...")
        agent.running = False

    signal.signal(signal.SIGINT, handle_sig)
    signal.signal(signal.SIGTERM, handle_sig)

    asyncio.run(agent.run())


if __name__ == "__main__":
    main()
