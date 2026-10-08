# HEDS — Hybrid Edge Distributed Print System

> **Cloud-to-edge print queue automation for Xerox and campus print shops.**

HEDS (Hybrid Edge Distributed Print System) is a cloud-to-edge print queue automation platform designed for college and local Xerox shops. Students scan a shop-specific QR code, upload their documents, configure print settings, receive a queue token, and track their order without creating an account. The shopkeeper receives structured print jobs through a cloud queue, while a local edge agent automatically executes them through connected printers.

---

## 1. The Problem

In high-density campus environments and local print shops, the traditional printing workflow is broken:
- **WhatsApp / Pen-Drive Chaos**: Students crowd counters sending files over messaging apps or unvetted USB drives.
- **Privacy & Security Risks**: Personal notes, assignments, ID cards, and exam documents remain stored indefinitely on shared shop computers and WhatsApp chat histories.
- **Payment & Order Confusion**: Shopkeepers juggle loose cash, split UPI screenshots, and verbal page requests ("pages 3 to 14, 2 copies, back-to-back").
- **Physical Counter Congestion**: Students wait in physical queues just to hand over files and wait further while jobs spool.
- **Paper & Toner Waste**: Miscommunication over single-sided vs. duplex or monochrome vs. color leads to wrong prints and wasted paper.

---

## 2. How HEDS Solves It

HEDS replaces counter chaos with a structured, automated cloud-and-edge lifecycle:
1. **Zero-Login Student Storefront**: Students scan a QR flyer at the counter, choose documents, configure specs, see authoritative prices, and pay instantly without registration.
2. **Authoritative Cloud Queue**: Cloud orchestrator computes prices in integer minor units and manages order states via PostgreSQL row-level locking (`FOR UPDATE SKIP LOCKED`).
3. **Local Edge Execution**: An outbound-only daemon running on the shop counter PC or Raspberry Pi claims print leases and spools documents locally to CUPS or virtual printers.
4. **Physical Privacy & Salted OTP Pickup**: Printed documents are held under privacy protection until the student presents a single-use 6-digit OTP, stored in the database only as a salted cryptographic hash.

---

## 3. Core Workflows

### Student Workflow
```text
Scan Shop QR Code
       │
       ▼
Upload Document (PDF / DOCX / Images)
       │
       ▼
Select Print Settings (Copies, B&W / Color, Single / Duplex, Page Range)
       │
       ▼
Authoritative Price Preview & Instant Payment / Sandbox Pay
       │
       ▼
Receive Perforated Queue Token (#27) & Live Tracking Link
       │
       ▼
Leave Physical Counter & Track Progress in Real Time
       │
       ▼
Present Salted 6-Digit OTP at Counter & Collect Document
```

### Shopkeeper Workflow
```text
Login to Modern POS-style Operator Console
       │
       ▼
View Live Operational Queue (Currently Printing, Up Next, Ready for Pickup)
       │
       ▼
Edge Agent Automatically Claims & Spools Dispatched Jobs
       │
       ▼
Printer Automatically Executes Hardware Spooling (Page-by-page progress)
       │
       ▼
Monitor Hardware Status & Handle Reconciliations (if printer runs out of paper)
       │
       ▼
Verify 6-Digit OTP at Pickup Station
       │
       ▼
Hand Printed Document to Student & Complete Order
```

---

## 4. System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT APPLICATIONS                           │
│   apps/student-web (Mobile PWA)       apps/shop-dashboard (Desktop)   │
└───────────────────┬─────────────────────────────────┬──────────────────┘
                    │ HTTPS / SSE                     │ HTTPS / JWT / SSE
                    ▼                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       FASTAPI CLOUD ORCHESTRATOR                       │
│  - Modular domain modules: tenants, users, orders, queue, payments,   │
│    printers, agents, pickups, audit, pricing                           │
│  - OrderStateMachine: Strict transition graph with audit logging       │
│  - QueueService: FOR UPDATE SKIP LOCKED queue leasing with TTL         │
│  - Background Reconciler: Sweeps expired leases safely into RECONCILING│
│  - Authoritative Pricing: Integer minor units calculation engine       │
└───────────────────┬─────────────────────────────────┬──────────────────┘
                    │ PostgreSQL 16                   │ Outbound Poll/SSE
                    ▼                                 ▼
┌─────────────────────────────────┐   ┌──────────────────────────────────┐
│           POSTGRESQL 16         │   │      HEDS EDGE PRINT AGENT       │
│  - Orders, PrintJobs, Pickups   │   │  - Durable SQLite queue          │
│  - Tenants, Shops, Capabilities │   │  - CloudClient (Poll/ACK/Status) │
│  - Audit logs & idempotency keys│   │  - Hardware Printer Adapters:    │
│  - Row-level lock concurrency   │   │    * MockPrinterAdapter          │
└─────────────────────────────────┘   │    * CUPSPrinterAdapter (Linux)  │
                                      └──────────────────┬───────────────┘
                                                         │ Local IPP / USB
                                                         ▼
                                              PHYSICAL / VIRTUAL PRINTER
```

### Why Edge Computing is Used
- **Network Isolation**: Counter printers are located on private local area networks (LANs) behind NAT and campus firewalls. Exposing printer ports (IPP 631 or raw 9100) to the public internet is a major security vulnerability.
- **Outbound-Only Communication**: The HEDS Edge Agent initiates all connections outbound to the cloud orchestrator over secure HTTPS/WSS. No inbound ports are ever opened on the shop network.
- **Durable Local Queuing**: If campus internet drops mid-day, the edge agent's local SQLite store keeps queued documents printing without stalling counter operations.
- **Hardware Telemetry & Zero Paper Wastage**: The edge agent observes physical printer paper trays, toner status, and page spooling directly, ensuring jobs aren't blindly repeated.

---

## 5. Reliability & Security Engineering

- **Idempotency Everywhere**: Scoped idempotency keys prevent duplicate payments, duplicate webhooks, or duplicate physical print jobs.
- **Lease Integrity (`FOR UPDATE SKIP LOCKED`)**: Dispatched jobs carry strict time-to-live leases (`lease_expires_at`). If an agent disconnects mid-print, the cloud reconciler transitions the order to `RECONCILING` instead of initiating blind retries that waste paper and toner.
- **Zero Sequential IDs**: Public tokens (`guest_access_token`, order tracking tokens) use cryptographically secure 32-byte URL-safe tokens, preventing enumeration attacks.
- **Salted Pickup OTP**: Counter pickup codes are stored exclusively as PBKDF2/SHA-256 salted hashes. Neither database dumps nor shop staff can view pickup codes before presentation.
- **Strict Tenant Context**: Multi-tenant boundaries are derived strictly from authenticated user credentials or cryptographically verified guest tokens—never client headers.

---

## 6. Quickstart & Local Setup

### Option A: Single-Command Full Stack (Docker)

Run the entire system (Database + Backend + Both Frontends + Edge Agent) with Docker Compose:

```bash
docker compose up --build
```
*(or via `make docker-up`)*

This single command automatically:
1. Starts **PostgreSQL 16** with persistent storage.
2. Applies all database schema migrations (`alembic upgrade head`).
3. Seeds realistic campus shop demonstration data (`scripts/demo_seed.py`).
4. Launches the **FastAPI Backend Core** on [http://localhost:8000](http://localhost:8000) (Interactive Swagger Docs at [http://localhost:8000/docs](http://localhost:8000/docs)).
5. Launches the **Student Web App** on [http://localhost:3000/s/campus-xerox](http://localhost:3000/s/campus-xerox).
6. Launches the **Shop Operator Dashboard** on [http://localhost:3001/dashboard](http://localhost:3001/dashboard).
7. Launches the **Edge Print Agent** in mock simulation mode to process queue leases automatically.

To stop the entire stack:
```bash
docker compose down
```

---

### Option B: Local Bare-Metal Development

1. **Virtualenv & Dependencies**:
   ```bash
   cp .env.example .env
   make setup
   ```

2. **Database Initialization**:
   ```bash
   make up        # Starts PostgreSQL in Docker
   make migrate   # Runs Alembic migrations
   make seed      # Seeds realistic shop, users, and printers
   ```

3. **Launch Microservices**:
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

**Default Operator Credentials**:
- **Operator**: `operator@campus-xerox.local` / `operator123`
- **Admin**: `admin@campus-xerox.local` / `admin123`

---

## 7. Automated Turnkey Demonstration

To run an automated live end-to-end verification demonstrating order injection, pricing calculation, mock payment, queue leasing, page progress, and OTP verification:

```bash
make demo
```

The script runs a comprehensive simulated customer journey through the live API, outputting real-time tokens, status transitions, and audit trail checkpoints.

---

## 8. Verification & Test Suite

Run the full automated test suite (Unit, Integration, Reliability, Chaos, and E2E):

```bash
make test
```

### Test Coverage Highlights (34/34 Passing Tests):
- `tests/reliability/test_duplicate_webhook.py`: Fires duplicate payment webhooks concurrently; proves exactly 1 print job created.
- `tests/reliability/test_lease_expiration.py`: Simulates agent crash; proves lease expiration recovery into `RECONCILING`.
- `tests/reliability/test_printer_failure.py`: Simulates hardware failure; proves transition to `PRINT_FAILED` and controlled operator retry.
- `tests/e2e/test_vertical_slice.py`: End-to-end verification of the complete student-to-pickup lifecycle.
- `tests/unit/test_payments.py`: Validates Razorpay HMAC signature verification endpoint, sandbox flow, and pickup OTP rate limiting.
- `tests/unit/test_pricing.py`: Validates page ranges, duplex discounting, and base price calculation.
- `tests/unit/test_agent_cups.py`: Validates Linux CUPS/IPP option parsing and pycups bindings.

---

## 9. Current Project Status

An honest evaluation of the project's engineering milestones:

| Component | Status | Details |
|---|:---:|---|
| **Core Architecture & State Machine** | **Verified** | Strict transition enforcement, audit logging, `PICKUP_READY` -> `COMPLETED` counter lifecycle, idempotent pickups. |
| **Multi-File Document Pipeline** | **Verified** | Support for PDF, DOCX/DOC (headless LibreOffice), and PNG/JPG/WEBP (PIL); max 10 files, 100MB total; authoritative page count sum. |
| **PDF Receipt Engine** | **Verified** | Authoritative backend ReportLab A5 PDF receipts (`/receipt.pdf`) with token `#XX`, line items, specs, pricing, and mobile share. |
| **Operational Analytics** | **Verified** | Real PostgreSQL aggregation without fake charts: Today / 7D / 30D KPI cards, peak printing hours, print mix, printer utilization, order status. |
| **Printer & Shop Administration** | **Verified** | Connected hardware overview, Add Printer modal (USB/IPP/CUPS), active job deletion safety check, diagnostic Test Page print. |
| **Student Web (Desktop / Laptop)** | **Verified** | Zero-login desktop storefront on `:3000`, file upload, settings, price preview, live tracking. |
| **Public QR Student Client (Mobile)** | **Verified** | Independent mobile client on `:3002`, touch dropzone, multi-file breakdown, live token status, receipt download/share. |
| **Shopkeeper Dashboard (POS)** | **Verified** | Modern POS console on `:3001`, live operational queue, token-based pickup station, printer health, agent heartbeat. |
| **Cloud Queue & Leasing** | **Verified** | PostgreSQL `FOR UPDATE SKIP LOCKED`, capability-aware matching, lease expiration reconciler. |
| **Edge Print Daemon & Mock Adapter**| **Verified** | Python daemon, outbound HTTPS client, durable SQLite queue, heartbeat telemetry, simulated page printing. |
| **CUPS / IPP Driver Layer** | **Implemented** | pycups bindings & CLI fallback; *Hardware qualification pending physical shop deployment*. |
| **Payment Integration** | **Sandbox & Mock Verified** | Authoritative pricing engine, Razorpay cryptographic signature verification endpoint, webhook deduplication; *Live merchant keys pending*. |
| **Automated Test Suite** | **50/50 Passing** | Unit, integration, reliability, chaos, multi-file, PDF receipt, analytics, and admin regression tests pass cleanly. |
| **Production Staging Deployment** | **Ready for Lab** | Full Docker Compose stack (Postgres, Backend, Edge Agent, Student Web, Shop Dashboard, Student QR) healthy and tested. |

---

## 10. Public QR Student Client & Phone Demo Setup (`apps/student-qr`)

HEDS includes an isolated, mobile-first client (`apps/student-qr`) on port `3002` designed for students scanning a physical QR flyer outside a Xerox shop:

### Zero-Friction Architecture
- **No Student Login, No Registration, No OTP**: Students scan the flyer, drop files, select settings, see authoritative prices, pay, and get a simple token (e.g., `#51`).
- **Two Front Doors, One Authoritative Backend**:
  - Desktop student experience: `http://localhost:3000`
  - Shop operator dashboard: `http://localhost:3001`
  - Public mobile QR storefront: `http://localhost:3002/s/campus-xerox`
- **Multi-File Upload**:
  - Touch drop zone (`+ Add documents`).
  - Supported formats: PDF, DOC, DOCX, JPG, JPEG, PNG, WEBP.
  - Limits: Maximum 10 files, 50MB per file, 100MB combined upload size.
  - Per-file page breakdown and estimated subtotal in the UI.
  - Authoritative backend conversion into canonical PDF via headless LibreOffice and PIL, with `pypdf` merging and authoritative page counting.
- **Authoritative PDF Receipt**:
  - Available at `GET /api/v1/orders/{guest_token}/receipt.pdf`.
  - Built with ReportLab in A5 format.
  - Contains HEDS branding, shop name, token `#XX`, order reference, document summary, authoritative price, payment status, and pickup guidance.
  - Mobile UI provides **View Receipt**, **Download PDF**, and **Share** buttons.

### Phone Testing with Cloudflare Tunnel

To test the mobile client directly on a real smartphone without exposing internal printer or database ports:

```bash
# 1. Run cloudflared tunnel pointing to the student-qr port (3002)
cloudflared tunnel --url http://localhost:3002
```

Configure your environment variables:
```bash
# In apps/student-qr/.env.local or shell:
NEXT_PUBLIC_STOREFRONT_URL=https://your-tunnel-url.trycloudflare.com
BACKEND_URL=http://localhost:8000
```

Scan the resulting URL on your mobile phone:
```text
https://your-tunnel-url.trycloudflare.com/s/campus-xerox
```

---

## 11. Hardware Printer Administration & Operational Analytics

### Printer Administration (`Settings` & `Printers`)
- **Connected Hardware**: Real-time listing of printers, models, paper sizes, color/duplex capabilities, and operational status.
- **Safe Hardware Modification**:
  - Attempting to remove or disable a printer with active print jobs warns the operator and prevents silent job abortion.
- **System Test Print**:
  - `[Test Print Page]` button dispatches a controlled diagnostic print job clearly tagged as `SYSTEM TEST PRINT` to verify spooling without student order collision.
- **Edge Agent Telemetry**:
  - Shows agent online/offline status, software version, host OS, local queue length, last heartbeat, and reconnect trigger.

### Operational Analytics
- **Authoritative PostgreSQL Aggregation**: Every metric is calculated directly from database records without mocked client statistics.
- **KPI Metrics**: Orders Today, Pages Printed, Net Revenue (₹), Average Order Value, Failed Jobs, Print Success Rate (%).
- **Charts & Breakdowns**:
  - Peak print hours distribution (08:00 to 20:00).
  - Print Mix: Monochrome vs. Color, Single-sided vs. Duplex.
  - Hardware Printer Utilization (% share of total printed jobs).
  - Order Status Breakdown (Completed, Printing, Queued, Failed, Pickup Ready).
- **Date Filters**: Filter by `Today`, `7 Days`, or `30 Days`, with clean empty states if no data is present.

---

## 11. Production Roadmap

Prioritized production gates before enterprise or live campus deployment:

### P0 — Production Foundation (Immediate Gates)
- [ ] Live Razorpay sandbox key provisioning and signed webhook signature verification in production.
- [ ] Production object storage integration (S3 / MinIO) with automated ephemeral file expiration cron.
- [ ] Hardware qualification across physical printer models (HP LaserJet, Canon imageRUNNER, Epson EcoTank) over USB and IPP.

### P1 — Operational Excellence
- [ ] Automated SMS / WhatsApp pickup notifications via Twilio or Gupshup.
- [ ] TLS reverse proxy configuration (Caddy / Nginx) with automated Let's Encrypt certificates.
- [ ] Multi-tenant shop switching in operator UI for store owners managing multiple campus locations.

### P2 — Business & Optimization
- [ ] Advanced financial settlement reconciliation and GST invoice receipt generation.
- [ ] Offline local print fallback queue synchronization when internet is down for > 1 hour.
- [ ] Paper inventory and toner telemetry tracking.

---

## 12. Documentation Directory

- [docs/public-qr-client.md](docs/public-qr-client.md) — Public QR mobile client architecture, ports, tunnels, and mobile testing.
- [docs/architecture.md](docs/architecture.md) — Comprehensive system topology, cloud-to-edge protocol.
- [docs/frontend-architecture.md](docs/frontend-architecture.md) — Design system, UI components, state management, and real-time streams.
- [docs/realtime-architecture.md](docs/realtime-architecture.md) — Server-Sent Events (SSE) and resilient polling fallback.
- [docs/security.md](docs/security.md) — Zero-trust multi-tenancy, guest tokens, OTP hashing, and document privacy.
- [docs/reliability.md](docs/reliability.md) — Distributed state, row leases, reconciliation, and idempotency.
- [docs/deployment.md](docs/deployment.md) — Docker Compose, production guidelines, and edge agent service setup.
- [docs/cups.md](docs/cups.md) — Linux CUPS printing architecture and USB/IPP printer configuration.
- [AGENTS.md](AGENTS.md) — Core architectural directives and engineering invariants.
