import os
import re
import hashlib
import io
from datetime import datetime, timedelta, timezone
from typing import BinaryIO, Tuple
from pypdf import PdfReader
from PIL import Image

from app.core.config import settings
from app.core.exceptions import HEDSException
from app.core.logging import logger
from app.modules.documents.storage import storage_service

# Allowed file specifications
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
}
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent directory traversal and special chars"""
    base = os.path.basename(filename)
    clean = re.sub(r"[^a-zA-Z0-9_.-]", "_", base)
    return clean or "document"


def calculate_sha256(file_bytes: bytes) -> str:
    """Calculate SHA-256 checksum"""
    return hashlib.sha256(file_bytes).hexdigest()


def inspect_and_count_pages(file_bytes: bytes, extension: str) -> int:
    """
    Count actual pages for PDF or image document authoritatively.
    Validates PDF header, encryption status, and corrupted file states.
    """
    ext = extension.lower()
    if ext == ".pdf":
        # Check standard PDF magic bytes header
        if not file_bytes.startswith(b"%PDF-"):
            raise HEDSException(
                code="INVALID_DOCUMENT",
                message="File does not have a valid PDF header (%PDF-). Corrupted or invalid file.",
            )
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            if reader.is_encrypted:
                try:
                    decrypted = reader.decrypt("")
                except Exception:
                    decrypted = 0
                if reader.is_encrypted and not decrypted:
                    raise HEDSException(
                        code="DOCUMENT_ENCRYPTED",
                        message="This PDF is password-protected. Please upload an unprotected PDF.",
                    )
            count = len(reader.pages)
            if count <= 0:
                raise HEDSException(code="INVALID_DOCUMENT", message="PDF has no valid pages.")
            return count
        except HEDSException:
            raise
        except Exception as e:
            logger.error(f"Failed to inspect PDF: {e}")
            raise HEDSException(code="INVALID_DOCUMENT", message=f"Corrupted or invalid PDF file: {str(e)}")
    elif ext in {".png", ".jpg", ".jpeg"}:
        try:
            with Image.open(io.BytesIO(file_bytes)) as img:
                img.verify()
            return 1  # Standard image is 1 page
        except Exception as e:
            logger.error(f"Failed to inspect image: {e}")
            raise HEDSException(code="INVALID_DOCUMENT", message="Corrupted or invalid image file.")
    else:
        raise HEDSException(code="UNSUPPORTED_FORMAT", message=f"Unsupported file format: {ext}")


class DocumentService:
    @staticmethod
    async def process_upload(
        file_obj: BinaryIO,
        original_filename: str,
        declared_mime_type: str,
    ) -> Tuple[str, str, int, str, int]:
        """
        Validates, sanitizes, inspects page count, and stores the file.
        Returns (sanitized_name, storage_path, file_size, checksum, page_count).
        """
        sanitized_name = sanitize_filename(original_filename)
        ext = os.path.splitext(sanitized_name)[1].lower()

        if ext not in ALLOWED_EXTENSIONS:
            raise HEDSException(
                code="UNSUPPORTED_EXTENSION",
                message=f"File extension '{ext}' is not supported. Allowed: PDF, PNG, JPG.",
            )

        file_bytes = file_obj.read()
        file_size = len(file_bytes)

        if file_size > MAX_FILE_SIZE_BYTES:
            raise HEDSException(
                code="FILE_TOO_LARGE",
                message=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB",
            )

        if file_size == 0:
            raise HEDSException(code="EMPTY_FILE", message="Uploaded file is empty.")

        # Page inspection
        page_count = inspect_and_count_pages(file_bytes, ext)
        checksum = calculate_sha256(file_bytes)

        # Store privately
        storage_path = await storage_service.save_file(
            file_obj=io.BytesIO(file_bytes),
            filename=sanitized_name,
            content_type=declared_mime_type,
        )

        return sanitized_name, storage_path, file_size, checksum, page_count


document_service = DocumentService()
