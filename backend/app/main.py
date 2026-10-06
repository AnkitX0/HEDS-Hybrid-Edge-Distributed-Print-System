import time
import uuid
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import logger
from app.core.exceptions import HEDSException
from app.core.database import AsyncSessionLocal
from app.modules.queue.service import queue_service

# Routers
from app.api.v1.auth import router as auth_router
from app.api.v1.shops import router as shops_router
from app.api.v1.orders import router as orders_router
from app.api.v1.payments import router as payments_router
from app.api.v1.agents import router as agents_router
from app.api.v1.queue import router as queue_router
from app.api.v1.pickups import router as pickups_router
from app.api.v1.printers_admin import router as printers_admin_router


async def background_reconciliation_worker():
    """Periodic worker reconciling expired leases"""
    while True:
        try:
            async with AsyncSessionLocal() as session:
                reconciled = await queue_service.reconcile_expired_leases(session)
                if reconciled > 0:
                    logger.info(f"[WORKER] Reconciled {reconciled} expired print job leases.")
        except Exception as e:
            logger.error(f"[WORKER] Error during lease reconciliation: {e}")
        await asyncio.sleep(15)  # Reconcile check every 15 seconds


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting HEDS Backend Service...")
    worker_task = asyncio.create_task(background_reconciliation_worker())
    yield
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass
    logger.info("HEDS Backend Service shutdown complete.")


app = FastAPI(
    title="HEDS — Hybrid Edge Distributed Print System API",
    version="1.0.0",
    description="Cloud print orchestration platform with edge agent execution and reliable queue leasing.",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def logging_and_request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id
    start_time = time.time()

    response = await call_next(request)

    duration_ms = round((time.time() - start_time) * 1000, 2)
    response.headers["X-Request-ID"] = request_id

    # Don't log spammy healthchecks at info level
    if not request.url.path.endswith("/health"):
        logger.info(
            f"{request.method} {request.url.path} -> {response.status_code} ({duration_ms}ms)",
            extra={"request_id": request_id, "duration_ms": duration_ms},
        )
    return response


@app.exception_handler(HEDSException)
async def heds_exception_handler(request: Request, exc: HEDSException):
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "request_id": req_id,
                "details": exc.details,
            }
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An internal server error occurred.",
                "request_id": req_id,
            }
        },
    )


@app.get("/health", tags=["Health"])
@app.get("/api/v1/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "heds-backend",
        "timestamp": time.time(),
        "environment": settings.APP_ENV,
    }


# Include Routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(shops_router, prefix="/api/v1")
app.include_router(orders_router, prefix="/api/v1")
app.include_router(payments_router, prefix="/api/v1")
app.include_router(agents_router, prefix="/api/v1")
app.include_router(queue_router, prefix="/api/v1")
app.include_router(pickups_router, prefix="/api/v1")
app.include_router(printers_admin_router, prefix="/api/v1")
