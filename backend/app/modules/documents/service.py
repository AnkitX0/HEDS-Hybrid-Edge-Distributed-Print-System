import os
import re
import hashlib
import io
import subprocess
import tempfile
from datetime import datetime, timedelta, timezone
from typing import BinaryIO, Tuple, List, Dict, Any
from pypdf import PdfReader, PdfWriter
from PIL import Image

from app.core.config import settings
from app.core.exceptions import HEDSException
from app.core.logging import logger
from app.modules.documents.storage import storage_service

# Allowed file specifications
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".doc", ".docx"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
MAX_FILES_COUNT = 10
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB
MAX_COMBINED_SIZE_BYTES = 100 * 1024 * 1024  # 100 MB


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent directory traversal and special chars"""
    base = os.path.basename(filename)
    clean = re.sub(r"[^a-zA-Z0-9_.-]", "_", base)
    return clean or "document"


def calculate_sha256(file_bytes: bytes) -> str:
    """Calculate SHA-256 checksum"""
    return hashlib.sha256(file_bytes).hexdigest()


def convert_and_inspect_document(
    file_bytes: bytes,
    extension: str,
    original_filename: str,
) -> Tuple[bytes, int]:
    """
    Normalizes any supported document (PDF, Image, Word DOC/DOCX) into canonical PDF bytes
    and extracts the authoritative page count.
    """
    ext = extension.lower()

    if ext == ".pdf":
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
            return file_bytes, count
        except HEDSException:
            raise
        except Exception as e:
            logger.error(f"Failed to inspect PDF: {e}")
            raise HEDSException(code="INVALID_DOCUMENT", message=f"Corrupted or invalid PDF file: {str(e)}")

    elif ext in {".png", ".jpg", ".jpeg", ".webp"}:
        try:
            img = Image.open(io.BytesIO(file_bytes))
            if img.mode in ("RGBA", "LA", "P"):
                # Convert transparency to clean white background for printing
                background = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode == "P":
                    img = img.convert("RGBA")
                background.paste(img, mask=img.split()[3] if len(img.split()) == 4 else None)
                img = background
            elif img.mode != "RGB":
                img = img.convert("RGB")

            pdf_buf = io.BytesIO()
            img.save(pdf_buf, format="PDF", resolution=150.0)
            pdf_bytes = pdf_buf.getvalue()
            return pdf_bytes, 1
        except Exception as e:
            logger.error(f"Failed to normalize image to PDF: {e}")
            raise HEDSException(code="INVALID_DOCUMENT", message=f"Corrupted or invalid image file: {str(e)}")

    elif ext in {".doc", ".docx"}:
        import shutil
        if not shutil.which("soffice"):
            raise HEDSException(
                code="UNSUPPORTED_FORMAT",
                message="Server is configured for PDF and image printing. Please convert your Word document to PDF before uploading.",
            )
        # Convert using LibreOffice headless
        with tempfile.TemporaryDirectory() as tmpdir:
            input_path = os.path.join(tmpdir, sanitize_filename(original_filename))
            with open(input_path, "wb") as f:
                f.write(file_bytes)

            try:
                cmd = ["soffice", "--headless", "--convert-to", "pdf", "--outdir", tmpdir, input_path]
                res = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                if res.returncode != 0:
                    logger.error(f"LibreOffice conversion failed: {res.stderr}")
                    raise HEDSException(
                        code="CONVERSION_FAILED",
                        message=f"Failed to convert Word document to printable PDF: {res.stderr}",
                    )

                base_name = os.path.splitext(os.path.basename(input_path))[0]
                converted_pdf_path = os.path.join(tmpdir, f"{base_name}.pdf")
                if not os.path.exists(converted_pdf_path):
                    # Try finding any generated pdf
                    pdf_files = [f for f in os.listdir(tmpdir) if f.endswith(".pdf")]
                    if pdf_files:
                        converted_pdf_path = os.path.join(tmpdir, pdf_files[0])
                    else:
                        raise HEDSException(
                            code="CONVERSION_FAILED",
                            message="Document conversion produced no output file.",
                        )

                with open(converted_pdf_path, "rb") as f_pdf:
                    converted_pdf_bytes = f_pdf.read()

                reader = PdfReader(io.BytesIO(converted_pdf_bytes))
                page_count = len(reader.pages)
                if page_count <= 0:
                    raise HEDSException(code="INVALID_DOCUMENT", message="Converted document has no printable pages.")
                return converted_pdf_bytes, page_count

            except subprocess.TimeoutExpired:
                raise HEDSException(
                    code="CONVERSION_TIMEOUT",
                    message="Document conversion timed out. Please convert your file to PDF and retry.",
                )
            except HEDSException:
                raise
            except Exception as e:
                logger.error(f"Failed to convert Word document: {e}")
                raise HEDSException(code="CONVERSION_FAILED", message=f"Error processing Word document: {str(e)}")

    else:
        raise HEDSException(
            code="UNSUPPORTED_FORMAT",
            message=f"Unsupported file format: '{ext}'. Allowed: PDF, PNG, JPG, JPEG, WEBP, DOC, DOCX.",
        )


def inspect_and_count_pages(file_bytes: bytes, extension: str) -> int:
    """Backward-compatible page counting function."""
    _, count = convert_and_inspect_document(file_bytes, extension, "document" + extension)
    return count


class DocumentService:
    @staticmethod
    async def process_upload(
        file_obj: BinaryIO,
        original_filename: str,
        declared_mime_type: str,
    ) -> Tuple[str, str, int, str, int]:
        """
        Validates, sanitizes, normalizes to PDF, inspects page count, and stores the file.
        Returns (sanitized_name, storage_path, file_size, checksum, page_count).
        """
        sanitized_name = sanitize_filename(original_filename)
        ext = os.path.splitext(sanitized_name)[1].lower()

        if ext not in ALLOWED_EXTENSIONS:
            raise HEDSException(
                code="UNSUPPORTED_EXTENSION",
                message=f"File extension '{ext}' is not supported. Allowed: PDF, PNG, JPG, JPEG, WEBP, DOC, DOCX.",
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

        # Normalize to canonical printable PDF and get authoritative page count
        pdf_bytes, page_count = convert_and_inspect_document(file_bytes, ext, original_filename)
        checksum = calculate_sha256(pdf_bytes)

        # Ensure filename extension stored reflects PDF if converted
        final_storage_name = sanitized_name
        if not sanitized_name.lower().endswith(".pdf"):
            final_storage_name = f"{os.path.splitext(sanitized_name)[0]}.pdf"

        # Store normalized printable PDF
        storage_path = await storage_service.save_file(
            file_obj=io.BytesIO(pdf_bytes),
            filename=final_storage_name,
            content_type="application/pdf",
        )

        return sanitized_name, storage_path, len(pdf_bytes), checksum, page_count

    @staticmethod
    async def process_multi_upload(
        uploaded_files: List[Tuple[BinaryIO, str, str]],
    ) -> Tuple[str, str, int, str, int, List[Dict[str, Any]]]:
        """
        Processes up to 10 files.
        Normalizes each to canonical PDF, counts pages, merges them into a single printable document,
        and returns (composite_name, storage_path, total_size, checksum, total_pages, file_details).
        """
        if not uploaded_files:
            raise HEDSException(code="NO_FILES", message="No files provided for upload.")

        if len(uploaded_files) > MAX_FILES_COUNT:
            raise HEDSException(
                code="TOO_MANY_FILES",
                message=f"Maximum {MAX_FILES_COUNT} files allowed per upload.",
            )

        total_input_size = 0
        file_details: List[Dict[str, Any]] = []
        normalized_pdfs: List[Tuple[str, bytes, int]] = []

        for file_obj, original_name, mime_type in uploaded_files:
            sanitized = sanitize_filename(original_name)
            ext = os.path.splitext(sanitized)[1].lower()

            if ext not in ALLOWED_EXTENSIONS:
                raise HEDSException(
                    code="UNSUPPORTED_EXTENSION",
                    message=f"File '{original_name}' has unsupported extension '{ext}'. Allowed: PDF, PNG, JPG, JPEG, WEBP, DOC, DOCX.",
                )

            data = file_obj.read()
            size = len(data)

            if size == 0:
                raise HEDSException(code="EMPTY_FILE", message=f"File '{original_name}' is empty.")

            if size > MAX_FILE_SIZE_BYTES:
                raise HEDSException(
                    code="FILE_TOO_LARGE",
                    message=f"File '{original_name}' exceeds maximum 50MB limit.",
                )

            total_input_size += size
            if total_input_size > MAX_COMBINED_SIZE_BYTES:
                raise HEDSException(
                    code="COMBINED_SIZE_EXCEEDED",
                    message="Total upload size exceeds maximum allowed 100MB limit.",
                )

            try:
                pdf_bytes, page_cnt = convert_and_inspect_document(data, ext, original_name)
                # Store each valid normalized PDF
                final_storage_name = sanitized
                if not final_storage_name.lower().endswith(".pdf"):
                    final_storage_name = f"{os.path.splitext(sanitized)[0]}.pdf"

                storage_path = await storage_service.save_file(
                    file_obj=io.BytesIO(pdf_bytes),
                    filename=final_storage_name,
                    content_type="application/pdf",
                )
                file_checksum = calculate_sha256(pdf_bytes)

                normalized_pdfs.append((sanitized, pdf_bytes, page_cnt))
                file_details.append({
                    "filename": original_name,
                    "sanitized_name": sanitized,
                    "page_count": page_cnt,
                    "file_size_bytes": size,
                    "mime_type": mime_type,
                    "storage_path": storage_path,
                    "checksum": file_checksum,
                    "status": "READY",
                    "error": None,
                })
            except Exception as e:
                logger.warning(f"[UPLOAD-MULTI] Failed to convert individual file {original_name}: {e}")
                file_details.append({
                    "filename": original_name,
                    "sanitized_name": sanitized,
                    "page_count": 0,
                    "file_size_bytes": size,
                    "mime_type": mime_type,
                    "storage_path": None,
                    "checksum": None,
                    "status": "ERROR",
                    "error": str(e),
                })

        if not normalized_pdfs:
            # All uploaded files failed
            first_err = next((f["error"] for f in file_details if f["error"]), "All files failed processing")
            raise HEDSException(code="BATCH_PROCESSING_FAILED", message=f"Unable to process files: {first_err}")

        # Merge valid files into one composite printable PDF for legacy clients
        if len(normalized_pdfs) == 1:
            merged_pdf_bytes = normalized_pdfs[0][1]
            total_pages = normalized_pdfs[0][2]
            composite_name = normalized_pdfs[0][0]
            if not composite_name.lower().endswith(".pdf"):
                composite_name = f"{os.path.splitext(composite_name)[0]}.pdf"
        else:
            writer = PdfWriter()
            total_pages = 0
            for _, pdf_bytes, _ in normalized_pdfs:
                reader = PdfReader(io.BytesIO(pdf_bytes))
                for page in reader.pages:
                    writer.add_page(page)
                    total_pages += 1
            out_buf = io.BytesIO()
            writer.write(out_buf)
            merged_pdf_bytes = out_buf.getvalue()
            composite_name = f"combined_{len(normalized_pdfs)}_docs.pdf"

        composite_checksum = calculate_sha256(merged_pdf_bytes)
        composite_storage_path = await storage_service.save_file(
            file_obj=io.BytesIO(merged_pdf_bytes),
            filename=composite_name,
            content_type="application/pdf",
        )

        return (
            composite_name,
            composite_storage_path,
            len(merged_pdf_bytes),
            composite_checksum,
            total_pages,
            file_details,
        )


document_service = DocumentService()

