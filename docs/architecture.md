# HEDS System Architecture

## 1. Executive Summary

**HEDS (Hybrid Edge Distributed Print System)** is a cloud + edge infrastructure platform built to eliminate physical queues, manual WhatsApp document exchanges, printer downtime ambiguity, and document privacy leaks in campus and local print shops.

Rather than a simple web uploader or SaaS mock, HEDS implements a resilient distributed systems architecture:

- **Cloud Orchestrator (Modular Monolith)**: FastAPI backend coordinating multi-tenant print queues, authoritative integer pricing, idempotent payments, and job leasing.
- **Durable Edge Execution (HEDS Agent)**: Python daemon running locally on the shopkeeper's counter PC with a local SQLite durable queue and printer adapter boundary.
- **Hardware Abstraction Layer**: Pluggable adapters (`MockPrinterAdapter` for deterministic simulation, `CUPSPrinterAdapter` for real Linux IPP/CUPS printing).
- **Privacy Hold**: Hashed OTP gate preventing document handover until verified by the shopkeeper.

---

## 2. High-Level Topology

```text
  +--------------------+               +--------------------+
  |    Student Web     |               |   Shop Dashboard   |
  |  (Mobile-first PWA)|               |  (Desktop Ops UI)  |
  +---------+----------+               +---------+----------+
            |                                    |
            | HTTPS / REST                       | HTTPS / REST
            +-----------------+------------------+
                              |
                              v
                 +--------------------------+
                 |       HEDS Backend       |
                 |    (FastAPI / Python)    |
                 +-------------+------------+
                               |
              +----------------+----------------+
              |                                 |
              v                                 v
     +------------------+              +------------------+
     |    PostgreSQL    |              |  Object Storage  |
     | (Queue / Leases) |              | (MinIO / Private)|
     +------------------+              +------------------+
              ^
              | Outbound HTTP Polling
              | Heartbeats & Lease ACKs
              |
     +--------+---------------------------------+
     |          HEDS Print Agent                |
     |        (Local Shop Machine)              |
     |                                          |
     |  +-------------------+                   |
     |  | Local SQLite Queue| (Durable offline) |
     |  +---------+---------+                   |
     |            |                             |
     |            v                             |
     |  +-------------------+                   |
     |  |  Printer Adapter  |                   |
     |  +---------+---------+                   |
     +------------|-----------------------------+
                  |
         +--------+--------+
         |                 |
         v                 v
   +------------+    +------------+
   |Mock Printer|    | Linux CUPS |
   +------------+    +------------+
```

---

## 3. Communication Protocols

1. **Inbound Public Access**:
   - Students access shops via public slugs (e.g., `https://heds.local/s/campus-xerox`).
   - Access is authorization-scoped via high-entropy `guest_access_token` (no sequential IDs exposed).
2. **Outbound Edge Agent Polling**:
   - Printers and counter machines are never exposed directly to the public internet.
   - The agent initiates outbound polling (`POST /api/v1/agents/jobs/poll`) using cryptographic agent credentials.
   - Polling uses PostgreSQL `SELECT ... FOR UPDATE SKIP LOCKED` to lease jobs atomically without concurrency collisions.
3. **Heartbeat & Telemetry**:
   - Edge agents transmit hardware profile, uptime, local queue depth, and printer statuses every 10 seconds.
   - Cloud dynamically evaluates agent health as `ONLINE`, `DEGRADED`, or `OFFLINE`.

---

## 4. Phase 3 Additions — Real Printer Integration

### Printer Adapter Boundary

The `PrinterAdapter` abstract interface (`agent/heds_agent/printers/base.py`) defines:

```
discover()          → List printer queues
get_status()        → ONLINE / OFFLINE / BUSY / ERROR / UNKNOWN
get_capabilities()  → paper_sizes, color, duplex, copies, max_dpi
submit_job()        → SubmitResult(success, native_job_id, error)
cancel_job()        → bool
pause()             → bool
resume()            → bool
get_job_status()    → str
```

Backend logic never imports CUPS-specific types. The adapter boundary is complete.

### CUPSPrinterAdapter

`agent/heds_agent/printers/cups.py` provides:

- **Dual execution mode**: uses `pycups` bindings if available, falls back to Linux CLI tools (`lp`, `lpstat`, `lpoptions`, `cancel`, `cupsenable`, `cupsdisable`)
- **Dynamic printer discovery**: parses `lpstat -p` output
- **Dynamic capability extraction**: parses `lpoptions -p <name> -l` for paper sizes, color, duplex, and DPI
- **Canonical spec translation**: converts HEDS print spec to CUPS options (`sides=`, `ColorModel=`, `PageSize=`, `page-ranges=`, etc.)
- **Secure document isolation**: temp file written at `0o600`, guaranteed `finally: os.remove()` cleanup
- **CUPS Job ID capture**: parses `request id is <printer>-<num>` from lp stdout
- **Idempotent cancellation**: `cancel <cups_job_id>` with pycups fallback

### Capability-Aware Scheduler

`backend/app/modules/queue/service.py::poll_and_lease_job()` now:

1. Filters available printers by capability match (color, duplex, paper size)
2. Rejects incompatible assignments before lease
3. Prefers monochrome printers for B&W jobs (capacity preservation)
4. Prefers IDLE over PRINTING printers (load distribution)

### CUPS Job ID Tracking

The agent stores the relationship `HEDS Job ID ↔ CUPS Job ID` in:
- Local SQLite (`native_job_id` column in `local_jobs`)
- Cloud API (`native_job_id` field in `JobStatusUpdateRequest`)

This enables cross-referencing physical CUPS state with HEDS cloud state.

### Operator Test Print

`POST /api/v1/shop/printers/{id}/test-print` generates an authoritative 1-page A4 PDF
and routes it through the full HEDS queue pipeline (not a bypass).

### Structured Agent Logging

Agent logs include: `event`, `heds_job_id`, `cups_job_id`, `printer`, `duration`, `status`.
Sensitive fields (tokens, OTPs, signed URLs, document contents) are never logged.

