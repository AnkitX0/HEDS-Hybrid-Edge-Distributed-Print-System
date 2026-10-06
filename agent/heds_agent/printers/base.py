from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from enum import Enum


class AdapterStatus(str, Enum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    BUSY = "BUSY"
    ERROR = "ERROR"


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
    ) -> bool:
        """Execute physical or simulated printing with page progress callbacks"""
        pass

    @abstractmethod
    def cancel_job(self, job_id: str) -> bool:
        """Abort physical print spooling"""
        pass
