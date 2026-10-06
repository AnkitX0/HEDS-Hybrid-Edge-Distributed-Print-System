import logging
from typing import Dict, Any, List, Optional
from heds_agent.printers.base import PrinterAdapter, AdapterStatus

logger = logging.getLogger("heds.cups_printer")


class CUPSPrinterAdapter(PrinterAdapter):
    """
    Adapter boundary for real Linux CUPS / IPP printer daemon.
    """
    def __init__(self):
        self._cups = None
        self._conn = None
        try:
            import cups
            self._cups = cups
            self._conn = cups.Connection()
            logger.info("Connected to local Linux CUPS daemon.")
        except ImportError:
            logger.warning("pycups is not installed. CUPS adapter will run in boundary fallback mode.")
        except Exception as e:
            logger.warning(f"Failed to connect to local CUPS daemon: {e}. Running in boundary fallback mode.")

    def discover(self) -> List[Dict[str, Any]]:
        if not self._conn:
            return []
        try:
            printers = self._conn.getPrinters()
            result = []
            for name, details in printers.items():
                state = details.get("printer-state", 3)
                status = AdapterStatus.ONLINE if state == 3 else AdapterStatus.BUSY if state == 4 else AdapterStatus.ERROR
                result.append({
                    "name": name,
                    "adapter": "cups",
                    "status": status.value,
                    "capabilities": {
                        "color": "color" in details.get("printer-make-and-model", "").lower(),
                        "duplex": True,
                        "paper_sizes": ["A4", "Letter"],
                    },
                })
            return result
        except Exception as e:
            logger.error(f"Error querying CUPS printers: {e}")
            return []

    def get_status(self, printer_name: str) -> AdapterStatus:
        if not self._conn:
            return AdapterStatus.OFFLINE
        try:
            printers = self._conn.getPrinters()
            if printer_name in printers:
                state = printers[printer_name].get("printer-state", 3)
                return AdapterStatus.ONLINE if state == 3 else AdapterStatus.BUSY if state == 4 else AdapterStatus.ERROR
            return AdapterStatus.OFFLINE
        except Exception:
            return AdapterStatus.ERROR

    def get_capabilities(self, printer_name: str) -> Dict[str, Any]:
        return {
            "color": False,
            "duplex": True,
            "paper_sizes": ["A4", "Letter"],
        }

    async def submit_job(
        self,
        printer_name: str,
        job_id: str,
        document_bytes: bytes,
        print_spec: Dict[str, Any],
        progress_callback=None,
    ) -> bool:
        if not self._conn:
            logger.error("Cannot submit CUPS job: CUPS daemon not available.")
            return False
        # Save temporary file and invoke cups printFile
        import tempfile
        import os
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(document_bytes)
            tmp_path = tmp.name

        try:
            options = {
                "copies": str(print_spec.get("copies", 1)),
            }
            if print_spec.get("duplex"):
                options["sides"] = "two-sided-long-edge"
            cups_job_id = self._conn.printFile(printer_name, tmp_path, f"HEDS-{job_id}", options)
            logger.info(f"Submitted CUPS job {cups_job_id} for {job_id}")
            return True
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def cancel_job(self, job_id: str) -> bool:
        return False
