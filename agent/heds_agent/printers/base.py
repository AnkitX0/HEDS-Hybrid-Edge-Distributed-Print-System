from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from enum import Enum


class AdapterStatus(str, Enum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    BUSY = "BUSY"
    ERROR = "ERROR"
    UNKNOWN = "UNKNOWN"


class SubmitResult(dict):
    """
    Subclass of dict with boolean evaluation for backward compatibility:
    `if result:` evaluates to `result.get('success', False)`.
    """
    def __init__(
        self,
        success: bool = True,
        native_job_id: Optional[str] = None,
        error: Optional[str] = None,
        **kwargs,
    ):
        super().__init__(
            success=success,
            native_job_id=native_job_id,
            error=error,
            **kwargs,
        )

    @property
    def success(self) -> bool:
        return bool(self.get("success", False))

    @property
    def native_job_id(self) -> Optional[str]:
        return self.get("native_job_id")

    @property
    def error(self) -> Optional[str]:
        return self.get("error")

    def __bool__(self) -> bool:
        return self.success


class PrinterAdapter(ABC):
    @abstractmethod
    def discover(self) -> List[Dict[str, Any]]:
        """Discover connected physical or simulated printers"""
        pass

    @abstractmethod
    def get_status(self, printer_name: str) -> AdapterStatus:
        """Get operational status of a printer"""
        pass

    @abstractmethod
    def get_capabilities(self, printer_name: str) -> Dict[str, Any]:
        """Query capabilities (color, duplex, paper sizes)"""
        pass

    @abstractmethod
    async def submit_job(
        self,
        printer_name: str,
        job_id: str,
        document_bytes: bytes,
        print_spec: Dict[str, Any],
        progress_callback=None,
    ) -> SubmitResult:
        """Execute physical or simulated printing with page progress callbacks"""
        pass

    @abstractmethod
    def cancel_job(self, job_id: str, native_job_id: Optional[str] = None) -> bool:
        """Abort physical print spooling"""
        pass

    @abstractmethod
    def pause(self, printer_name: str) -> bool:
        """Temporarily pause printer intake queue"""
        pass

    @abstractmethod
    def resume(self, printer_name: str) -> bool:
        """Resume printer intake queue"""
        pass

    @abstractmethod
    def get_job_status(self, job_id: str, native_job_id: Optional[str] = None) -> str:
        """Query native hardware or adapter job status"""
        pass
