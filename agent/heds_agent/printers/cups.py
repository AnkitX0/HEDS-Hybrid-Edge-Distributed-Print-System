import os
import re
import shutil
import tempfile
import asyncio
import subprocess
import logging
from typing import Dict, Any, List, Optional
from heds_agent.printers.base import PrinterAdapter, AdapterStatus, SubmitResult

logger = logging.getLogger("heds.cups_printer")


class CUPSPrinterAdapter(PrinterAdapter):
    """
    Robust hardware printer adapter for Linux CUPS / IPP printing.
    Supports native pycups bindings when compiled, with automatic fallback
    to standard Linux CUPS CLI utilities (/usr/bin/lp, lpstat, lpoptions, cancel).
    """

    def __init__(self):
        self._has_pycups = False
        self._cups = None
        self._conn = None

        # Check for pycups
        try:
            import cups
            self._cups = cups
            self._conn = cups.Connection()
            self._has_pycups = True
            logger.info("Connected to local Linux CUPS daemon via pycups.")
        except Exception as e:
            logger.info(f"pycups unavailable ({e}); utilizing native Linux CUPS CLI pipeline.")

        # Detect CLI executables
        self.lp_bin = shutil.which("lp") or "/usr/bin/lp"
        self.lpstat_bin = shutil.which("lpstat") or "/usr/bin/lpstat"
        self.lpoptions_bin = shutil.which("lpoptions") or "/usr/bin/lpoptions"
        self.cancel_bin = shutil.which("cancel") or "/usr/bin/cancel"
        self.cupsenable_bin = shutil.which("cupsenable") or "/usr/sbin/cupsenable"
        self.cupsdisable_bin = shutil.which("cupsdisable") or "/usr/sbin/cupsdisable"

        # Local job tracking
        self._active_jobs: Dict[str, str] = {}  # heds_job_id -> cups_job_id
        self._completed_jobs: set = set()

    def _run_cmd(self, cmd: List[str], timeout: float = 8.0) -> subprocess.CompletedProcess:
        """Run CUPS CLI command safely with timeout"""
        return subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=timeout,
            check=False,
        )

    def discover(self) -> List[Dict[str, Any]]:
        """
        Discovers local and networked CUPS queues, query status, and inspect capabilities.
        """
        # Try pycups first if available
        if self._has_pycups and self._conn:
            try:
                printers = self._conn.getPrinters()
                result = []
                for name, details in printers.items():
                    state = details.get("printer-state", 3)
                    status = (
                        AdapterStatus.ONLINE
                        if state == 3
                        else AdapterStatus.BUSY
                        if state == 4
                        else AdapterStatus.ERROR
                    )
                    caps = self.get_capabilities(name)
                    result.append({
                        "name": name,
                        "adapter": "cups",
                        "status": status.value,
                        "capabilities": caps,
                    })
                return result
            except Exception as e:
                logger.error(f"pycups discovery error: {e}. Falling back to CLI.")

        # Fallback to standard lpstat
        if not os.path.exists(self.lpstat_bin):
            logger.warning("lpstat binary not found on system.")
            return []

        try:
            proc = self._run_cmd([self.lpstat_bin, "-p"])
            if proc.returncode != 0:
                logger.debug(f"lpstat -p returned code {proc.returncode}: {proc.stderr}")
                return []

            printers = []
            for line in proc.stdout.splitlines():
                line = line.strip()
                if not line.startswith("printer "):
                    continue

                # Format: "printer Test_Office_Printer is idle.  enabled since..."
                match = re.match(r"^printer\s+([^\s]+)\s+(is\s+([a-zA-Z]+))?", line)
                if match:
                    name = match.group(1)
                    raw_state = (match.group(3) or "idle").lower()
                    if "idle" in raw_state:
                        status = AdapterStatus.ONLINE
                    elif "processing" in raw_state or "printing" in raw_state:
                        status = AdapterStatus.BUSY
                    elif "disabled" in raw_state or "stopped" in raw_state:
                        status = AdapterStatus.ERROR
                    else:
                        status = AdapterStatus.ONLINE

                    caps = self.get_capabilities(name)
                    printers.append({
                        "name": name,
                        "adapter": "cups",
                        "status": status.value,
                        "capabilities": caps,
                    })

            return printers
        except Exception as e:
            logger.error(f"Error querying CUPS printers via CLI: {e}")
            return []

    def get_status(self, printer_name: str) -> AdapterStatus:
        discovered = self.discover()
        for p in discovered:
            if p["name"] == printer_name:
                return AdapterStatus(p["status"])
        return AdapterStatus.OFFLINE

    def get_capabilities(self, printer_name: str) -> Dict[str, Any]:
        """
        Dynamically extracts paper sizes, color support, and duplex capability
        from CUPS PPD or lpoptions.
        """
        caps: Dict[str, Any] = {
            "paper_sizes": ["A4", "Letter"],
            "color": False,
            "duplex": False,
            "copies": True,
            "max_dpi": 600,
        }

        # Attempt lpoptions -l query
        if os.path.exists(self.lpoptions_bin):
            try:
                proc = self._run_cmd([self.lpoptions_bin, "-p", printer_name, "-l"])
                if proc.returncode == 0:
                    output = proc.stdout

                    # Detect Paper Sizes
                    page_sizes = []
                    for line in output.splitlines():
                        if line.startswith("PageSize/") or line.startswith("media/"):
                            # Format: PageSize/Media Size: *A4 A3 Letter Legal ...
                            opts = line.split(":", 1)[-1]
                            for token in opts.split():
                                clean_token = token.lstrip("*").strip()
                                if clean_token and clean_token not in page_sizes:
                                    page_sizes.append(clean_token)

                    if page_sizes:
                        caps["paper_sizes"] = page_sizes

                    # Detect Duplex
                    if "Duplex/" in output or "sides/" in output:
                        if "DuplexNoTumble" in output or "two-sided" in output:
                            caps["duplex"] = True

                    # Detect Color
                    if "ColorModel/" in output or "BRColorModel/" in output or "Color" in output:
                        if re.search(r"ColorModel/.*(RGB|CMYK|Color)", output, re.IGNORECASE):
                            caps["color"] = True
            except Exception as e:
                logger.debug(f"Could not query lpoptions for {printer_name}: {e}")

        # Check printer name heuristic if generic raw
        name_lower = printer_name.lower()
        if "color" in name_lower:
            caps["color"] = True
        if "duplex" in name_lower or "laser" in name_lower:
            caps["duplex"] = True

        return caps

    def translate_spec_to_options(self, print_spec: Dict[str, Any]) -> List[str]:
        """
        Translates canonical HEDS print specification into CUPS command-line options.
        """
        options: List[str] = []

        # 1. Copies
        copies = print_spec.get("copies", 1)
        if copies > 1:
            options.extend(["-o", f"copies={copies}"])

        # 2. Duplex / Sides
        if print_spec.get("duplex"):
            options.extend(["-o", "sides=two-sided-long-edge", "-o", "Duplex=DuplexNoTumble"])
        else:
            options.extend(["-o", "sides=one-sided", "-o", "Duplex=None"])

        # 3. Color Mode
        color_mode = str(print_spec.get("color_mode", "BW")).upper()
        if color_mode == "BW":
            options.extend([
                "-o", "ColorModel=Gray",
                "-o", "BRColorModel=Mono",
                "-o", "print-color-mode=monochrome",
            ])
        else:
            options.extend([
                "-o", "ColorModel=RGB",
                "-o", "BRColorModel=Color",
                "-o", "print-color-mode=color",
            ])

        # 4. Paper Size / Media
        paper_size = str(print_spec.get("paper_size", "A4")).upper()
        options.extend(["-o", f"PageSize={paper_size}", "-o", f"media={paper_size}"])

        # 5. Page Range
        page_range = str(print_spec.get("page_range", "all")).strip()
        if page_range and page_range.lower() != "all":
            options.extend(["-o", f"page-ranges={page_range}"])

        # 6. Orientation
        orientation = str(print_spec.get("orientation", "PORTRAIT")).upper()
        if orientation == "LANDSCAPE":
            options.extend(["-o", "orientation-requested=4"])
        elif orientation == "PORTRAIT":
            options.extend(["-o", "orientation-requested=3"])

        # 7. Scaling
        scaling = str(print_spec.get("scaling", "FIT")).upper()
        if scaling == "FIT":
            options.extend(["-o", "fit-to-page"])

        return options

    async def submit_job(
        self,
        printer_name: str,
        job_id: str,
        document_bytes: bytes,
        print_spec: Dict[str, Any],
        progress_callback=None,
    ) -> SubmitResult:
        """
        Submits physical document to CUPS via lp CLI or pycups.
        Captures native CUPS Job ID and ensures secure temporary document isolation.
        """
        if not os.path.exists(self.lp_bin) and not self._has_pycups:
            logger.error("Neither lp binary nor pycups is available on the agent system.")
            return SubmitResult(
                success=False,
                native_job_id=None,
                error="CUPS print subsystem unavailable",
            )

        # Write to secure temporary file
        temp_fd, temp_path = tempfile.mkstemp(prefix="heds_spool_", suffix=".pdf")
        try:
            with os.fdopen(temp_fd, "wb") as f:
                f.write(document_bytes)

            options = self.translate_spec_to_options(print_spec)
            cmd = [
                self.lp_bin,
                "-d", printer_name,
                "-t", f"HEDS-{job_id}",
            ]
            cmd.extend(options)
            cmd.append(temp_path)

            logger.info(f"Submitting CUPS physical job: {' '.join(cmd)}")

            proc = await asyncio.to_thread(self._run_cmd, cmd, timeout=12.0)

            if proc.returncode != 0:
                err_msg = proc.stderr.strip() or f"lp exit code {proc.returncode}"
                logger.error(f"CUPS submission failed: {err_msg}")
                return SubmitResult(
                    success=False,
                    native_job_id=None,
                    error=err_msg,
                )

            # Parse stdout for native job id:
            # Example: "request id is Test_Office_Printer-3 (1 file(s))"
            match = re.search(r"request id is ([^\s]+)", proc.stdout)
            cups_job_id = match.group(1) if match else f"{printer_name}-native"

            self._active_jobs[job_id] = cups_job_id
            logger.info(f"Successfully enqueued CUPS job {cups_job_id} for HEDS {job_id}")

            if progress_callback:
                total_pages = print_spec.get("page_count", 1) * print_spec.get("copies", 1)
                await progress_callback(job_id, total_pages, total_pages)

            self._completed_jobs.add(job_id)
            return SubmitResult(
                success=True,
                native_job_id=cups_job_id,
                error=None,
            )

        except Exception as e:
            logger.error(f"Unexpected error submitting CUPS print job: {e}")
            return SubmitResult(
                success=False,
                native_job_id=None,
                error=str(e),
            )
        finally:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except OSError:
                    pass

    def cancel_job(self, job_id: str, native_job_id: Optional[str] = None) -> bool:
        target_id = native_job_id or self._active_jobs.get(job_id)
        if not target_id:
            logger.warning(f"No native CUPS job ID tracked for HEDS job {job_id}")
            return False

        if os.path.exists(self.cancel_bin):
            proc = self._run_cmd([self.cancel_bin, target_id])
            if proc.returncode == 0:
                logger.info(f"Successfully cancelled CUPS job {target_id}")
                self._active_jobs.pop(job_id, None)
                return True

        if self._has_pycups and self._conn:
            try:
                # pycups expects integer job ID
                numeric_id = int(re.search(r"\d+", target_id).group())
                self._conn.cancelJob(numeric_id)
                self._active_jobs.pop(job_id, None)
                return True
            except Exception as e:
                logger.error(f"Failed to cancel pycups job: {e}")

        return False

    def pause(self, printer_name: str) -> bool:
        if os.path.exists(self.cupsdisable_bin):
            proc = self._run_cmd([self.cupsdisable_bin, printer_name])
            return proc.returncode == 0
        return False

    def resume(self, printer_name: str) -> bool:
        if os.path.exists(self.cupsenable_bin):
            proc = self._run_cmd([self.cupsenable_bin, printer_name])
            return proc.returncode == 0
        return False

    def get_job_status(self, job_id: str, native_job_id: Optional[str] = None) -> str:
        target_id = native_job_id or self._active_jobs.get(job_id)
        if not target_id:
            if job_id in self._completed_jobs:
                return "COMPLETED"
            return "UNKNOWN"

        if os.path.exists(self.lpstat_bin):
            proc = self._run_cmd([self.lpstat_bin, "-W", "completed", "-o", target_id])
            if proc.returncode == 0 and target_id in proc.stdout:
                return "COMPLETED"

            proc_active = self._run_cmd([self.lpstat_bin, "-W", "not-completed", "-o", target_id])
            if proc_active.returncode == 0 and target_id in proc_active.stdout:
                return "PRINTING"

        return "UNKNOWN"
