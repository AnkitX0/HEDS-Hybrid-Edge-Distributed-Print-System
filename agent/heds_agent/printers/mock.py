import asyncio
import logging
from typing import Dict, Any, List, Optional
from heds_agent.printers.base import PrinterAdapter, AdapterStatus

logger = logging.getLogger("heds.mock_printer")


class MockPrinterAdapter(PrinterAdapter):
    def __init__(
        self,
        name: str = "Mock Printer 01",
        pages_per_sec: float = 2.0,
        failure_rate: float = 0.0,
    ):
        self.name = name
        self.pages_per_sec = pages_per_sec
        self.failure_rate = failure_rate
        self.status = AdapterStatus.ONLINE
        self.active_job_id: Optional[str] = None

    def discover(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": self.name,
                "adapter": "mock",
                "status": self.status.value,
                "capabilities": {
                    "color": True,
                    "duplex": True,
                    "paper_sizes": ["A4", "A3", "Letter"],
                },
            }
        ]

    def get_status(self, printer_name: str) -> AdapterStatus:
        return self.status

    def get_capabilities(self, printer_name: str) -> Dict[str, Any]:
        return {
            "color": True,
            "duplex": True,
            "paper_sizes": ["A4", "A3", "Letter"],
            "max_dpi": 1200,
        }

    async def submit_job(
        self,
        printer_name: str,
        job_id: str,
        document_bytes: bytes,
        print_spec: Dict[str, Any],
        progress_callback=None,
    ) -> bool:
        self.status = AdapterStatus.BUSY
        self.active_job_id = job_id

        copies = print_spec.get("copies", 1)
        pages = print_spec.get("page_count", 2)
        total_pages_to_print = pages * copies

        print(f"\n[PRINTER] >>> Starting physical spool on '{self.name}' for Job {job_id}")
        print(f"[PRINT] Processing {total_pages_to_print} pages (Copies: {copies}, Color: {print_spec.get('color_mode', 'BW')}, Duplex: {print_spec.get('duplex', False)})")

        page_delay = 1.0 / max(0.1, self.pages_per_sec)

        for page in range(1, total_pages_to_print + 1):
            await asyncio.sleep(page_delay)
            print(f"[PRINT] Page {page}/{total_pages_to_print} completed.")

            if progress_callback:
                await progress_callback(job_id, page, total_pages_to_print)

            # Simulated hardware error injection if requested
            if self.failure_rate > 0 and page == 2:
                self.status = AdapterStatus.ERROR
                print(f"[PRINTER] !!! HARDWARE ERROR on '{self.name}': Paper Jam in Tray 1 !!!")
                return False

        self.status = AdapterStatus.ONLINE
        self.active_job_id = None
        print(f"[PRINT] <<< Completed physical print for Job {job_id}\n")
        return True

    def cancel_job(self, job_id: str) -> bool:
        if self.active_job_id == job_id:
            print(f"[PRINTER] Job {job_id} cancelled.")
            self.status = AdapterStatus.ONLINE
            self.active_job_id = None
            return True
        return False
