import os
import io
import pytest
from pypdf import PdfWriter
from app.core.exceptions import HEDSException
from app.modules.documents.service import inspect_and_count_pages, document_service


def test_pdf_page_count_is_authoritative():
    """
    Regression test ensuring that inspect_and_count_pages extracts exact
    authoritative page counts (1, 3, 5, 11, 20, 60) directly from PDF contents.
    Never returns hardcoded 3 or demo fallbacks.
    """
    test_cases = [1, 3, 5, 11, 20, 60]
    for p in test_cases:
        fixture_path = f"tests/fixtures/heds-test-{p}-page.pdf"
        assert os.path.exists(fixture_path), f"Fixture {fixture_path} must exist"
        with open(fixture_path, "rb") as f:
            pdf_bytes = f.read()
        
        extracted_pages = inspect_and_count_pages(pdf_bytes, ".pdf")
        assert extracted_pages == p, f"Expected {p} pages, got {extracted_pages}"


def test_fake_pdf_header_rejected():
    """
    Files claiming to be .pdf with random text must be rejected with INVALID_DOCUMENT.
    """
    fake_bytes = b"This is not a real PDF file at all, just plain text."
    with pytest.raises(HEDSException) as exc_info:
        inspect_and_count_pages(fake_bytes, ".pdf")
    assert exc_info.value.code == "INVALID_DOCUMENT"
    assert "valid PDF header" in exc_info.value.message


def test_corrupted_pdf_rejected():
    """
    A file with %PDF- header but truncated/garbled content must raise INVALID_DOCUMENT.
    """
    corrupt_bytes = b"%PDF-1.4\nGarbled truncated random bytes..."
    with pytest.raises(HEDSException) as exc_info:
        inspect_and_count_pages(corrupt_bytes, ".pdf")
    assert exc_info.value.code == "INVALID_DOCUMENT"


def test_encrypted_password_protected_pdf_handled():
    """
    Password-protected PDFs must raise DOCUMENT_ENCRYPTED with a friendly message.
    """
    writer = PdfWriter()
    writer.add_blank_page(width=595, height=842)
    writer.encrypt("supersecretpass")
    buf = io.BytesIO()
    writer.write(buf)
    encrypted_bytes = buf.getvalue()

    with pytest.raises(HEDSException) as exc_info:
        inspect_and_count_pages(encrypted_bytes, ".pdf")
    assert exc_info.value.code == "DOCUMENT_ENCRYPTED"
    assert "password-protected" in exc_info.value.message.lower()


@pytest.mark.asyncio
async def test_document_service_process_upload_e2e():
    """
    Full document service process_upload flow with a valid 11-page PDF.
    """
    with open("tests/fixtures/heds-test-11-page.pdf", "rb") as f:
        file_obj = io.BytesIO(f.read())
    
    sanitized_name, storage_path, file_size, checksum, page_count = (
        await document_service.process_upload(
            file_obj=file_obj,
            original_filename="final_lab_report.pdf",
            declared_mime_type="application/pdf",
        )
    )

    assert sanitized_name == "final_lab_report.pdf"
    assert page_count == 11
    assert file_size > 0
    assert len(checksum) == 64
    assert os.path.exists(storage_path)
