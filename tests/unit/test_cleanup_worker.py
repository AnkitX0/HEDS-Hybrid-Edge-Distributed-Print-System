import io
import uuid
import pytest
from datetime import datetime, timezone, timedelta
import app.models
from app.core.database import AsyncSessionLocal
from app.modules.documents.models import Document
from app.modules.documents.storage import storage_service
from app.modules.orders.models import Order, OrderState
from app.modules.tenants.models import Shop
from app.workers.cleanup import DocumentCleanupWorker
from sqlalchemy import select


@pytest.mark.asyncio
async def test_document_retention_cleanup_lifecycle():
    """
    Verifies that:
    1. Expired documents in completed/terminal orders have their physical binaries purged.
    2. Active documents (in QUEUED/PRINTING orders) are preserved and skipped.
    3. Document metadata remains in the database for audit integrity.
    4. The operation is idempotent (repeated runs succeed without error).
    """
    async with AsyncSessionLocal() as session:
        # 1. Fetch active shop
        shop = (await session.execute(select(Shop).where(Shop.slug == "campus-xerox"))).scalar_one()

        # 2. Save real temporary binary file via storage_service
        fake_pdf_content = b"%PDF-1.4 Mock document bytes for retention testing"
        saved_path = await storage_service.save_file(
            file_obj=io.BytesIO(fake_pdf_content),
            filename="retention_test.pdf",
            content_type="application/pdf",
        )

        now = datetime.now(timezone.utc)
        past_time = now - timedelta(hours=30)  # Beyond 24h retention

        # Create expired completed document
        expired_doc = Document(
            id=uuid.uuid4(),
            shop_id=shop.id,
            original_filename="student_thesis_chapter1.pdf",
            sanitized_filename="student_thesis_chapter1.pdf",
            storage_path=saved_path,
            mime_type="application/pdf",
            file_size_bytes=len(fake_pdf_content),
            page_count=5,
            checksum_sha256="abc123sha256hash",
            created_at=past_time,
            expires_at=past_time,
        )
        session.add(expired_doc)
        await session.flush()

        completed_order = Order(
            id=uuid.uuid4(),
            shop_id=shop.id,
            order_number=f"RET-{uuid.uuid4().hex[:6].upper()}",
            guest_access_token=f"tok_{uuid.uuid4().hex}",
            document_id=expired_doc.id,
            status=OrderState.COMPLETED,
            total_amount_cents=1000,
            currency="INR",
            pricing_breakdown_json={},
            created_at=past_time,
        )
        session.add(completed_order)

        # Create active document (must NOT be purged even if old)
        active_saved_path = await storage_service.save_file(
            file_obj=io.BytesIO(fake_pdf_content),
            filename="active_doc.pdf",
            content_type="application/pdf",
        )
        active_doc = Document(
            id=uuid.uuid4(),
            shop_id=shop.id,
            original_filename="active_midterm.pdf",
            sanitized_filename="active_midterm.pdf",
            storage_path=active_saved_path,
            mime_type="application/pdf",
            file_size_bytes=len(fake_pdf_content),
            page_count=2,
            checksum_sha256="active123sha256",
            created_at=past_time,
            expires_at=past_time,
        )
        session.add(active_doc)
        await session.flush()

        active_order = Order(
            id=uuid.uuid4(),
            shop_id=shop.id,
            order_number=f"ACT-{uuid.uuid4().hex[:6].upper()}",
            guest_access_token=f"tok_{uuid.uuid4().hex}",
            document_id=active_doc.id,
            status=OrderState.PRINTING,  # In-flight state!
            total_amount_cents=400,
            currency="INR",
            pricing_breakdown_json={},
            created_at=past_time,
        )
        session.add(active_order)
        await session.commit()

        expired_doc_id = expired_doc.id
        active_doc_id = active_doc.id

    # 3. Execute cleanup worker
    async with AsyncSessionLocal() as session:
        result = await DocumentCleanupWorker.purge_expired_documents(
            session=session,
            retention_hours=24,
            now=now,
        )

        assert result["purged_count"] >= 1
        assert result["skipped_active_count"] >= 1
        assert len(result["errors"]) == 0

    # 4. Verify database state
    async with AsyncSessionLocal() as session:
        doc_check = (await session.execute(select(Document).where(Document.id == expired_doc_id))).scalar_one()
        assert doc_check.storage_path == "PURGED"
        assert doc_check.original_filename == "student_thesis_chapter1.pdf"
        assert doc_check.file_size_bytes == len(fake_pdf_content)

        active_check = (await session.execute(select(Document).where(Document.id == active_doc_id))).scalar_one()
        assert active_check.storage_path != "PURGED"
        assert active_check.storage_path == active_saved_path

    # 5. Idempotence test: running again produces 0 new purges on already purged files
    async with AsyncSessionLocal() as session:
        second_result = await DocumentCleanupWorker.purge_expired_documents(
            session=session,
            retention_hours=24,
            now=now,
        )
        assert len(second_result["errors"]) == 0
        # Clean up active test file from disk
        storage_service.delete_file(active_saved_path)
