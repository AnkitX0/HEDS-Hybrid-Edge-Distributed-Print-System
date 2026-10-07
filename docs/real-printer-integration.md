# Real Printer Integration & Edge Agent Hardening Audit

**Status:** Completed Audit  
**Phase:** 3 — Real Printer Integration + Edge Agent Hardening  
**Target Architecture:** Dual-backend (`MockPrinterAdapter` & `CUPSPrinterAdapter`) behind unified `PrinterAdapter` boundary.

---

## 1. Audit Findings

### 1.1 Existing CUPS Printer Adapter State
- `agent/heds_agent/printers/cups.py` implements a preliminary `CUPSPrinterAdapter` that directly imports `cups` (`pycups`).
- **Limitation:** In modern Linux environments (such as Python 3.14 without development headers installed via `apt-get`), `pycups` fails to compile because C header `cups/http.h` is missing. However, standard Linux CUPS binaries (`/usr/bin/lp`, `/usr/bin/lpstat`, `/usr/bin/lpoptions`, `/usr/bin/cancel`) are pre-installed and functional, and the local `cupsd` scheduler is active.
- The adapter lacks:
  - Robust fallback to standard CUPS CLI tooling (`lp`, `lpstat`, `lpoptions`, `cancel`) when `pycups` is absent.
  - Native CUPS Job ID tracking (`HEDS Job ID ↔ CUPS Job ID`).
  - Active job status polling via `lpstat` / IPP.
  - Dynamic discovery of actual printer options and capability extraction.
  - Job pause and resume operations.
  - Cancellation via CUPS job ID.

### 1.2 Printer Capabilities Representation
- **Current Model:** `Printer.capabilities_json` in PostgreSQL contains JSON values like `{"color": true, "duplex": true, "paper_sizes": ["A4", "A3"]}`.
- **Limitation:** Existing `cups.py` hardcoded dummy capabilities:
  ```python
  {"color": False, "duplex": True, "paper_sizes": ["A4", "Letter"]}
  ```
  It did not query actual PPD options (`PageSize`, `ColorModel`, `Duplex`) from CUPS.

### 1.3 Job Submission & Spooling Flow
1. **Cloud:** Order is paid &rarr; `QueueService.enqueue_order()` &rarr; `PrintJob` in `QUEUED` state.
2. **Lease:** Agent polls `/api/v1/agents/jobs/poll` &rarr; leases job atomically via `FOR UPDATE SKIP LOCKED`.
3. **Local Queue:** Agent inserts job record into SQLite `local_queue.db`.
4. **Ack:** Agent posts to `/api/v1/agents/jobs/{job_id}/ack`.
5. **Download:** Agent downloads binary stream from `/api/v1/agents/jobs/{job_id}/document`.
6. **Execution Bug:** `agent/heds_agent/main.py` currently hardcodes:
   ```python
   printer_name = "Mock Printer 01"
   ```
   It never checks `job.printer_name` or selects an active CUPS printer.

### 1.4 Agent Authentication & Identity
- Agent sends cryptographic credentials via HTTP headers:
  - `X-Agent-ID`: UUID of the agent.
  - `X-Agent-Key`: Secret shared secret token.
- Backend verifies `agent.agent_token_hash == sha256(X-Agent-Key)`.
- Identity is isolated per tenant and shop.

### 1.5 Agent Heartbeat & Telemetry
- Edge daemon issues background heartbeat to `/api/v1/agents/heartbeat` every 5 seconds.
- Reports: `agent_id`, `uptime_seconds`, `local_queue_length`, `printers` list.
- Backend derives operational health:
  - `ONLINE`: < 30 seconds since last ping.
  - `DEGRADED`: < 60 seconds.
  - `OFFLINE`: > 60 seconds.
- Attached `Printer` records in the database are automatically created or updated with latest status and capabilities.

### 1.6 Printer Status & Telemetry
- Adapters report: `ONLINE`, `BUSY`, `ERROR`, `OFFLINE`.
- Real CUPS printer states:
  - State 3 (`idle`) &rarr; `ONLINE`
  - State 4 (`processing`) &rarr; `BUSY`
  - State 5 (`stopped` / error) &rarr; `ERROR`

### 1.7 Physical Print Ambiguity & Reconciliation
- When network disconnects during printing, automatic retry is strictly forbidden by invariant.
- Ambiguous jobs move to `RECONCILING`.
- Operator inspects physical printer tray and decides:
  - `MARK_COMPLETED`: Paper printed &rarr; moves to `PICKUP_READY` with Privacy Hold OTP.
  - `RETRY_PRINT`: Paper did not print &rarr; re-enqueues job.

---

## 2. Architectural Deficiencies To Solve

| # | Deficiency | Solution |
|---|------------|----------|
| 1 | `pycups` fails to build when C headers are absent | Provide unified CUPS adapter supporting both `pycups` and native CLI commands (`lp`, `lpstat`, `lpoptions`, `cancel`). |
| 2 | Hardcoded printer name `"Mock Printer 01"` | Derive printer target from lease metadata, capability match, or default CUPS queue. |
| 3 | Static printer capabilities | Dynamically parse `lpoptions -l` or IPP attributes (`media-supported`, `color-supported`, `sides-supported`). |
| 4 | Print spec translation missing | Implement translation from canonical HEDS spec to CUPS options (`-o PageSize=... -o sides=... -o ColorModel=...`). |
| 5 | Scheduler does not check capabilities | Implement deterministic capability-aware filtering in `QueueService`. |
| 6 | Lack of CUPS Job ID tracking | Store and report `cups_job_id` for hardware spool status tracking. |
| 7 | Unsafe document paths | Strict validation of document endpoints, temporary file isolation, and post-spool unlinking. |

---

## 3. Plan of Execution

1. **Adapter Interface Refinement (`agent/heds_agent/printers/base.py`):**
   - Add `get_job_status()`, `pause()`, `resume()`, `cups_job_id` tracking.
2. **Robust `CUPSPrinterAdapter` (`agent/heds_agent/printers/cups.py`):**
   - Auto-detect environment (`pycups` vs `/usr/bin/lp`, `lpstat`, `lpoptions`, `cancel`).
   - Dynamic discovery and capability parsing.
   - Canonical print spec to CUPS options translation.
   - Real spooling with `cups_job_id` capture.
3. **Agent Hardening (`agent/heds_agent/main.py`):**
   - Remove hardcoded `"Mock Printer 01"`.
   - Bind to assigned printer.
   - Clean ephemeral document disposal.
   - Structured logging.
4. **Capability-Aware Cloud Scheduler (`backend/app/modules/queue/service.py`):**
   - Deterministic capability matching (paper size, color mode, duplex) before leasing.
5. **Safe Test Print Endpoint (`backend/app/api/v1/printers_admin.py`):**
   - Operator "Print Test Page" via standard queue and agent pipeline.
6. **Comprehensive Automated Test Suite (`tests/unit/`, `tests/integration/`):**
   - CUPS capability parsing, option translation, agent restart durability, ambiguous physical reconciliation.
