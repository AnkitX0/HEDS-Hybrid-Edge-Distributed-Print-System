import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.logging import logger
from app.core.database import AsyncSessionLocal
from app.modules.documents.models import Document
from app.modules.documents.storage import storage_service
from app.modules.orders.models import Order, OrderState
from app.modules.audit.models import AuditLog

TERMINAL_STATES = {
    OrderState.COMPLETED,
    OrderState.CANCELLED,
    OrderState.EXPIRED,
    OrderState.VALIDATION_FAILED,
    OrderState.REFUNDED,
}


class DocumentCleanupWorker:
    """
    Automated document retention cleanup worker:
    Identifies expired student documents whose orders have reached terminal states
    or whose expiration timestamp has passed, purges the physical/S3 binaries
    from storage to protect student privacy and conserve disk space,
    while preserving immutable document metadata for accounting and audit integrity.
    """

    @staticmethod
    async def purge_expired_documents(
        session: AsyncSession,
        retention_hours: Optional[int] = None,
        now: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Idempotently scans for eligible expired documents and purges storage binaries.
        """
        current_time = now or datetime.now(timezone.utc)
        effective_hours = retention_hours if retention_hours is not None else settings.DOCUMENT_RETENTION_HOURS
        cutoff_time = current_time - timedelta(hours=effective_hours)

        # Find candidates: storage_path not already purged
        stmt = (
            select(Document)
            .options(selectinload(Document.orders))
            .where(
                Document.storage_path != "PURGED",
                or_(
                    Document.expires_at <= current_time,
                    and_(
                        Document.expires_at.is_(None),
                        Document.created_at <= cutoff_time,
                    ),
                ),
            )
            .limit(100)
        )
        res = await session.execute(stmt)
        candidates = res.scalars().all()

        purged_count = 0
        skipped_count = 0
        reclaimed_bytes = 0
        errors: List[str] = []

        for doc in candidates:
            # Check if any associated order is still actively printing/queued
            active_orders = [o for o in doc.orders if o.status not in TERMINAL_STATES]
            if active_orders:
                # Do NOT purge active in-flight documents
                skipped_count += 1
                continue

            old_storage_path = doc.storage_path
            try:
                # Idempotent storage binary deletion
                deleted = storage_service.delete_file(old_storage_path)
                reclaimed_bytes += doc.file_size_bytes
                doc.storage_path = "PURGED"
                doc.expires_at = current_time

                audit_entry = AuditLog(
                    shop_id=doc.shop_id,
                    actor_type="SYSTEM",
                    actor_id="DOCUMENT_RETENTION_WORKER",
                    action="DOCUMENT_BINARY_PURGED",
                    resource_type="Document",
                    resource_id=str(doc.id),
                    metadata_json={
                        "filename": doc.sanitized_filename,
                        "file_size_bytes": doc.file_size_bytes,
                        "pages": doc.page_count,
                        "reason": f"Retention window of {effective_hours}h expired",
                    },
                )
                session.add(audit_entry)
                purged_count += 1
                logger.info(
                    f"[CLEANUP] Purged binary for document {doc.id} ({doc.sanitized_filename}, {doc.file_size_bytes}B)"
                )
            except Exception as e:
                err_msg = f"Failed to delete {old_storage_path} for doc {doc.id}: {str(e)}"
                logger.error(f"[CLEANUP] {err_msg}")
                errors.append(err_msg)

        if purged_count > 0:
            await session.commit()

        return {
            "purged_count": purged_count,
            "skipped_active_count": skipped_count,
            "reclaimed_bytes": reclaimed_bytes,
            "errors": errors,
        }

    @staticmethod
    async def run_periodic_cleanup_loop(interval_seconds: int = 3600):
        """
        Continuous background asyncio loop. Defaults to hourly execution.
        """
        logger.info(f"[CLEANUP WORKER] Document retention worker loop initialized ({interval_seconds}s interval).")
        while True:
            try:
                await asyncio.sleep(interval_seconds)
                async with AsyncSessionLocal() as session:
                    res = await DocumentCleanupWorker.purge_expired_documents(session)
                    if res["purged_count"] > 0:
                        logger.info(
                            f"[CLEANUP WORKER] Completed sweep: purged {res['purged_count']} files, "
                            f"reclaimed {res['reclaimed_bytes']} bytes."
                        )
            except asyncio.CancelledError:
                logger.info("[CLEANUP WORKER] Retention cleanup loop cancelled.")
                break
            except Exception as e:
                logger.error(f"[CLEANUP WORKER] Unexpected error in cleanup loop: {e}", exc_info=True)


cleanup_worker = DocumentCleanupWorker()
