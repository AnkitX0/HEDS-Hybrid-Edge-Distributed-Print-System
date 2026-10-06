# HEDS — Hybrid Edge Distributed Print System

> **Cloud Print Orchestration + Edge Execution + Reliable Job Processing Platform**

HEDS is a production-grade infrastructure platform designed to automate printing workflows in college, campus, and local Xerox shops. It replaces manual WhatsApp file transfers, payment confusion, physical queues, and document privacy leaks with a resilient cloud-controlled queue and a local edge printer execution layer.

---

## The Workflow

```text
Student scans Shop QR → Uploads Document → Configures Print Settings → Receives Authoritative Price
        ↓
Completes Mock Payment → Order Enters PostgreSQL Queue (`QUEUED`)
        ↓
Cloud Orchestrator Leases Job (`SELECT ... FOR UPDATE SKIP LOCKED`)
        ↓
Local HEDS Print Agent Claims Job → Persists to Local SQLite Queue (`local_queue.db`)
        ↓
Printer Adapter Dispatches Job → Mock Printer / Linux CUPS Spools Page-by-Page
        ↓
Cloud Receives Completion (`PRINT_COMPLETED`) → Privacy Hold Engaged (`PICKUP_READY`)
        ↓
Student Receives Salted 6-Digit Pickup OTP → Shop Operator Verifies OTP → `COMPLETED`
```

---

## Core Technical Features

- **Modular Monolith Backend**: FastAPI + PostgreSQL + SQLAlchemy Async + Alembic with clean domain boundaries (`tenants`, `users`, `pricing`, `documents`, `orders`, `payments`, `queue`, `agents`, `printers`, `pickups`, `audit`).
- **Distributed Job Leasing**: Row-level locking (`FOR UPDATE SKIP LOCKED`) with leases (`lease_id`, `lease_expires_at`) and automatic background lease reconciliation.
- **Physical Printing Reliability**: Prevents uncontrolled retries when printers fail or disconnect mid-job. Ambiguous physical jobs enter `RECONCILING` for operator review.
- **Durable Local Edge Queue**: Built with SQLite (`local_queue.db`) on the edge agent machine. Keeps executing cached jobs even through temporary cloud/network disconnects.
- **Hardware Abstraction Layer**: Pluggable printer adapter interface supporting both `MockPrinterAdapter` (page-by-page progress simulation) and `CUPSPrinterAdapter` (Linux IPP/CUPS).
- **Privacy Hold**: Documents remain protected until physical verification. The student receives a 6-digit OTP stored only as a PBKDF2/SHA-256 salted hash.
- **Idempotency Everywhere**: Scoped idempotency keys prevent duplicate payments, duplicate webhooks, or duplicate physical print jobs.
- **Frontend Applications**:
  - `apps/student-web`: Mobile-first Next.js PWA with QR entry, instant price preview, and live progress tracker.
  - `apps/shop-dashboard`: Desktop Next.js operations console with live active queue, printer/agent health, and OTP verification.

---

## Quickstart

### 1. Prerequisites
- Python 3.10+
- Node.js 18+
- Docker & Docker Compose

### 2. Environment Setup
```bash
cp .env.example .env
make setup
```

### 3. Start Database & Run Migrations
```bash
make up        # Starts PostgreSQL and MinIO in Docker
make migrate   # Runs Alembic migrations
make seed      # Seeds realistic shops, users, agents, printers, and 20 orders
```

### 4. Run All Services Locally
In separate terminals:
```bash
# Terminal 1: Backend API (http://localhost:8000/docs)
make dev-backend

# Terminal 2: Edge Print Agent (Simulates local printer execution)
make dev-agent

# Terminal 3: Student Web Portal (http://localhost:3000/s/campus-xerox)
make dev-student

# Terminal 4: Shop Operator Dashboard (http://localhost:3001)
make dev-shop
```

Default credentials:
- **Operator**: `operator@campus-xerox.local` / `operator123`
- **Admin**: `admin@campus-xerox.local` / `admin123`

---

## Verification & Automated Test Suites

Run the full automated test suite (Unit, Integration, Reliability, Chaos, and E2E):
```bash
make test
```

### Reliability Tests:
- `tests/reliability/test_duplicate_webhook.py`: Fires duplicate payment webhooks concurrently; proves exactly 1 print job created.
- `tests/reliability/test_lease_expiration.py`: Simulates agent crash; proves lease expiration recovery into `RECONCILING`.
- `tests/reliability/test_printer_failure.py`: Simulates hardware failure; proves transition to `PRINT_FAILED` and controlled operator retry.
- `tests/e2e/test_vertical_slice.py`: End-to-end verification of the complete student-to-pickup lifecycle.

---

## Documentation

- [docs/architecture.md](docs/architecture.md): Topology, communication protocols, and edge execution model.
- [docs/database.md](docs/database.md): PostgreSQL schema, tables, foreign keys, and indexes.
- [docs/state-machine.md](docs/state-machine.md): Centralized order lifecycle and state transition graph.
- [docs/reliability.md](docs/reliability.md): Distributed leases, fault tolerance, and offline resilience.
- [docs/api.md](docs/api.md): REST API specification and endpoints.
- [docs/development.md](docs/development.md): Step-by-step developer guide.
- [AGENTS.md](AGENTS.md): Engineering rules and constraints for future AI coding assistants.
