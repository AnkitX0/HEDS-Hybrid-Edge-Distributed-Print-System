from typing import Optional, Any, Dict
from fastapi import HTTPException, status


class HEDSException(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class NotFoundException(HEDSException):
    def __init__(self, message: str = "Resource not found", code: str = "NOT_FOUND"):
        super().__init__(code=code, message=message, status_code=status.HTTP_404_NOT_FOUND)


class UnauthorizedException(HEDSException):
    def __init__(self, message: str = "Unauthorized", code: str = "UNAUTHORIZED"):
        super().__init__(code=code, message=message, status_code=status.HTTP_401_UNAUTHORIZED)


class ForbiddenException(HEDSException):
    def __init__(self, message: str = "Forbidden", code: str = "FORBIDDEN"):
        super().__init__(code=code, message=message, status_code=status.HTTP_403_FORBIDDEN)


class InvalidStateTransitionException(HEDSException):
    def __init__(
        self,
        from_state: str,
        to_state: str,
        message: Optional[str] = None,
    ):
        msg = message or f"Illegal state transition from {from_state} to {to_state}."
        super().__init__(
            code="INVALID_STATE_TRANSITION",
            message=msg,
            status_code=status.HTTP_409_CONFLICT,
            details={"from_state": from_state, "to_state": to_state},
        )


class IdempotencyConflictException(HEDSException):
    def __init__(self, message: str = "Concurrent or conflicting request with same idempotency key"):
        super().__init__(
            code="IDEMPOTENCY_CONFLICT",
            message=message,
            status_code=status.HTTP_409_CONFLICT,
        )


class PrinterOfflineException(HEDSException):
    def __init__(self, message: str = "Target printer is offline or unavailable"):
        super().__init__(
            code="PRINTER_OFFLINE",
            message=message,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
