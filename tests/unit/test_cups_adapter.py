import pytest
import os
import tempfile
from unittest.mock import patch, MagicMock

from heds_agent.printers.cups import CUPSPrinterAdapter
from heds_agent.printers.base import AdapterStatus


def test_cups_print_spec_option_translation():
    adapter = CUPSPrinterAdapter()

    # Spec 1: Standard B&W duplex A4
    spec_bw = {
        "copies": 2,
        "color_mode": "BW",
        "duplex": True,
        "paper_size": "A4",
        "page_range": "1-5",
        "orientation": "PORTRAIT",
        "scaling": "FIT",
    }
    opts = adapter.translate_spec_to_options(spec_bw)
    assert "-o" in opts
    assert "copies=2" in opts
    assert "sides=two-sided-long-edge" in opts
    assert "ColorModel=Gray" in opts
    assert "PageSize=A4" in opts
    assert "page-ranges=1-5" in opts
    assert "orientation-requested=3" in opts
    assert "fit-to-page" in opts

    # Spec 2: Color single-sided A3 landscape
    spec_color = {
        "copies": 1,
        "color_mode": "COLOR",
        "duplex": False,
        "paper_size": "A3",
        "page_range": "all",
        "orientation": "LANDSCAPE",
        "scaling": "ACTUAL",
    }
    opts_color = adapter.translate_spec_to_options(spec_color)
    assert "ColorModel=RGB" in opts_color
    assert "sides=one-sided" in opts_color
    assert "PageSize=A3" in opts_color
    assert "orientation-requested=4" in opts_color
    assert "fit-to-page" not in opts_color


def test_cups_capability_extraction_from_lpoptions():
    adapter = CUPSPrinterAdapter()

    sample_lpoptions_output = """PageSize/Media Size: *A4 A3 Letter Legal Custom.100x150mm
Duplex/2-Sided Printing: None *DuplexNoTumble DuplexTumble
ColorModel/Color Mode: *RGB CMYK Gray
Resolution/Output Resolution: 300dpi *600dpi 1200dpi
"""

    mock_proc = MagicMock()
    mock_proc.returncode = 0
    mock_proc.stdout = sample_lpoptions_output

    with patch.object(adapter, "_run_cmd", return_value=mock_proc):
        caps = adapter.get_capabilities("Office_Xerox")
        assert "A4" in caps["paper_sizes"]
        assert "A3" in caps["paper_sizes"]
        assert "Letter" in caps["paper_sizes"]
        assert caps["duplex"] is True
        assert caps["color"] is True


def test_cups_status_parsing():
    adapter = CUPSPrinterAdapter()

    sample_lpstat = """printer Xerox-01 is idle.  enabled since Tue 06 Oct 2026
printer Canon-Color is printing.  enabled since Tue 06 Oct 2026
printer HP-Failed is disabled.  stopped since Tue 06 Oct 2026
"""

    mock_proc = MagicMock()
    mock_proc.returncode = 0
    mock_proc.stdout = sample_lpstat

    with patch.object(adapter, "_run_cmd", return_value=mock_proc):
        discovered = adapter.discover()
        status_map = {p["name"]: p["status"] for p in discovered}
        assert status_map["Xerox-01"] == AdapterStatus.ONLINE.value
        assert status_map["Canon-Color"] == AdapterStatus.BUSY.value
        assert status_map["HP-Failed"] == AdapterStatus.ERROR.value


@pytest.mark.asyncio
async def test_cups_job_submission_and_temp_file_cleanup():
    adapter = CUPSPrinterAdapter()

    mock_submit_proc = MagicMock()
    mock_submit_proc.returncode = 0
    mock_submit_proc.stdout = "request id is Test_Office_Printer-42 (1 file(s))\n"

    created_temp_path = None

    def capture_run(cmd, timeout=12.0):
        nonlocal created_temp_path
        created_temp_path = cmd[-1]
        assert os.path.exists(created_temp_path)
        return mock_submit_proc

    with patch.object(adapter, "_run_cmd", side_effect=capture_run):
        result = await adapter.submit_job(
            printer_name="Test_Office_Printer",
            job_id="test-job-uuid-1234",
            document_bytes=b"%PDF-1.4 sample pdf content",
            print_spec={"copies": 1, "color_mode": "BW", "paper_size": "A4"},
        )

        assert result.success is True
        assert result.native_job_id == "Test_Office_Printer-42"
        # Invariant: temporary document MUST be deleted after submission
        assert not os.path.exists(created_temp_path)


def test_cups_cancellation_and_job_status():
    adapter = CUPSPrinterAdapter()
    adapter._active_jobs["job-1"] = "Printer-01-99"

    mock_cancel_proc = MagicMock()
    mock_cancel_proc.returncode = 0
    mock_cancel_proc.stdout = ""

    with patch.object(adapter, "_run_cmd", return_value=mock_cancel_proc):
        assert adapter.cancel_job("job-1") is True
        assert "job-1" not in adapter._active_jobs
