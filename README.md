# HEDS
## Hybrid Edge Distributed Print System

Cloud-to-edge print orchestration platform that lets students submit documents through a QR storefront while local edge agents reliably execute print jobs on shop hardware.

---

## Problem

In universities and campus localities, Xerox and print shops rely on an entirely manual, friction-heavy counter workflow:

```text
Student waits in line 
  → sends files via WhatsApp / Bluetooth / USB stick 
  → operator manually downloads files to desktop 
  → operator opens file in viewer and configures print dialog (pages, duplex, color) 
  → operator prints 
  → operator calculates price verbally 
  → student shows UPI payment screenshot 
  → operator hands over physical papers
```

This manual model introduces systemic operational failure modes:
- **Counter Congestion & Long Queues**: Operators spend 3–5 minutes per customer navigating file downloads and manual printer dialogs instead of keeping hardware busy.
- **Privacy Breaches & Storage Sprawl**: Personal student records, IDs, assignments, and study materials remain permanently saved in operator Downloads folders and WhatsApp chat histories.
- **Manual Configuration Errors**: Verbal communication ("pages 4 to 18, double-sided, monochrome") frequently results in misprints, wrong page counts, and wasted paper and toner.
- **Duplicate Prints & Lost Jobs**: Jobs spooled simultaneously from multiple USB drives get mixed up, lost in Windows print spoolers, or accidentally reprinted twice.
- **Single-Machine Printer Dependency**: If the counter PC is occupied or frozen, no other customer can submit documents.
- **Zero Visibility & No Real-Time Tracking**: Students must wait physically at the counter because they cannot track queue progress.
- **No Operational Analytics**: Store owners have zero authoritative data on daily page volume, peak rush hours, hardware utilization, or net revenue.

---

## Solution

HEDS eliminates counter friction by decoupling document submission and payment from physical hardware execution:

1. **Student QR Storefront**: Students scan a counter QR flyer with their smartphone camera, select files, configure print parameters, and view authoritative prices—without creating an account or downloading an app.
2. **Backend-Authoritative Pricing & Payment**: Cloud orchestration calculates integer-accurate pricing and verifies digital payments (UPI / Razorpay) before admitting any order into the execution queue.
3. **PostgreSQL Row-Leased Queue**: Concurrency-safe job dispatching using PostgreSQL `FOR UPDATE SKIP LOCKED` guarantees deterministic FIFO ordering and strictly prevents duplicate print dispatches.
4. **Outbound-Only Edge Agent**: A lightweight Python daemon running locally on the shop network initiates outbound-only polling over HTTPS, leases jobs, and spools them directly to physical printers via CUPS/IPP without exposing shop network ports to the internet.
5. **Token-Based Counter Pickup**: When printing completes, the order transitions to `PICKUP_READY`. The student arrives at the counter with an unforgeable token (e.g., `#51`), and the operator confirms collection in one click.
6. **Authoritative Receipts & Real Analytics**: Every order produces a cryptographically accessible, downloadable PDF receipt, while shopkeepers get real-time database-driven business intelligence.

---

## Architecture

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                               STUDENT SMARTPHONE                                 │
│   Scans physical shop QR flyer  →  Loads mobile storefront (No login / No app)   │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ HTTPS / Cloudflare Tunnel
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                               PUBLIC QR CLIENT                                   │
│                        (apps/student-qr on port 3002)                            │
│   - Multi-file dropzone (PDF, DOCX, Images)                                      │
│   - Authoritative pricing preview & sandbox checkout                             │
│   - Real-time token tracking (#51) & downloadable PDF receipts                   │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ REST API / Proxied JSON
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           FASTAPI CLOUD ORCHESTRATOR                             │
│                          (backend/app on port 8000)                              │
│   - Multi-tenant shop registry & authoritative pricing engine                    │
│   - Canonical PDF document normalization pipeline                                │
│   - OrderStateMachine (Strict state transitions + structured audit trail)        │
│   - Lease-based print job dispatcher with PostgreSQL FOR UPDATE SKIP LOCKED      │
│   - Background lease expiration & crash reconciliation worker                    │
└───────────────────┬──────────────────────────────────────────┬───────────────────┘
                    │                                          │
       PostgreSQL 16│                                          │ Outbound HTTPS Poll
                    ▼                                          ▼
┌────────────────────────────────────────┐   ┌─────────────────────────────────────┐
│             POSTGRESQL 16              │   │           HEDS EDGE AGENT           │
│  - Orders, PrintJobs, Pickups, Tenants │   │      (Local Counter PC / RPi)       │
│  - Row-level lock concurrency queue    │   │  - Outbound-only poll / ACK / Lease │
│  - Scoped idempotency & audit records  │   │  - Durable local SQLite queue       │
│  - Authoritative analytics source      │   │  - Hardware abstraction layer       │
└────────────────────────────────────────┘   └──────────────────┬──────────────────┘
                                                                │ CUPS / IPP / Virtual
                                                                ▼
┌────────────────────────────────────────┐   ┌─────────────────────────────────────┐
│          SHOP OPERATOR DASHBOARD       │   │      PHYSICAL / MOCK PRINTER        │
│      (apps/shop-dashboard on 3001)     │   │  - HP LaserJet / Xerox / Canon / Mock│
│  - Stable fixed-width action column    │   │  - Hardware page-by-page execution  │
│  - Zero-layout-jump Mark Collected     │   │  - Paper tray & telemetry monitoring│
│  - Hardware & agent health telemetry   │   └─────────────────────────────────────┘
│  - Real PostgreSQL analytics & logs    │
└────────────────────────────────────────┘
```

---

## Core Engineering Features

- **Transactional Queueing**: All queue entries are durable database records managed within PostgreSQL transactional boundaries.
- **Row-Level Locking (`SELECT FOR UPDATE SKIP LOCKED`)**: Worker job polling queries select unlocked jobs atomically without table locks or inter-process race conditions.
- **End-to-End Idempotency**: Payment callbacks, webhooks, and agent lease dispatches enforce scoped idempotency keys, guaranteeing that duplicate network calls never generate duplicate physical print jobs.
- **Lease-Based Recovery**: Every dispatched print job carries an explicit time-to-live lease (`lease_expires_at`). If an edge agent disconnects or crashes mid-spool, the cloud lease reconciler detects the timeout and moves the job to `RECONCILING` rather than repeating it blindly.
- **Safety Reconciliation**: When hardware status is ambiguous, HEDS never auto-retries physical printing (preventing paper wastage and privacy leaks). Operators inspect the physical tray and reconcile with one click (`MARK_COMPLETED` or `RETRY_PRINT`).
- **Durable Local Edge Queue**: The edge agent persists active job leases in local SQLite storage (`local_queue.db`), allowing spooling to survive process restarts.
- **Printer Protocol Abstraction**: Unified printer interface (`PrinterAdapter`) with production CUPS/IPP driver implementations and automated development Mock adapters.
- **Payment Abstraction**: Authoritative pricing engine computes costs in integer minor units (paise/cents). Integrated with Razorpay webhook cryptographic HMAC-SHA256 signature verification and sandbox development mock gateways.
- **Backend-Authoritative Pricing**: Clients never dictate prices. Total order amount is computed autoritatively on the server from validated page counts, print options, and store pricing matrices.
- **Document Normalization Pipeline**: Headless conversion normalizes DOCX, DOC, JPG, and PNG uploads into canonical PDF documents with authoritative page counting prior to print spooling.
- **Token-Based Counter Pickup**: Simple, unforgeable pickup tokens (e.g. `#51`) streamline counter operations. No manual OTP friction required.
- **Cryptographic PDF Receipts**: Server-rendered ReportLab A5 receipts generated on demand from authoritative database records.
- **Structured Audit Logs**: Every state change, lease dispatch, operator action, and payment event is captured in an append-only audit trail.

---

## Student Workflow

```text
Scan Shop QR Flyer
       │
       ▼
Upload Documents (PDF, DOCX, Images — single or multi-file)
       │
       ▼
Configure Print Options (Color vs. B&W, Single-sided vs. Duplex, Copies, Page Range)
       │
       ▼
Authoritative Price Preview (₹1/page base matrix computed by server)
       │
       ▼
Digital Payment Checkout (UPI / Razorpay / Sandbox)
       │
       ▼
Receive Perforated Token (#51) & Unguessable Tracking URL
       │
       ▼
Track Live Queue Status (QUEUED → PRINTING → READY FOR PICKUP)
       │
       ▼
Collect Document at Counter by Stating Token #51
       │
       ▼
View & Download Authoritative A5 PDF Receipt
```

---

## Shop Operator Workflow

```text
Log in to Operator Console (http://localhost:3001)
       │
       ▼
Monitor Operational Queue (Real-time listing of waiting, printing, and ready jobs)
       │
       ▼
Edge Agent Automatically Claims & Dispatches Pending Jobs
       │
       ▼
Hardware Spools Document Page-by-Page
       │
       ▼
Order Automatically Transitions to READY FOR PICKUP
       │
       ▼
Student Presents Token #51 at Counter
       │
       ▼
Operator Clicks [Mark Collected] (Stable 160px action column, zero layout jump)
       │
       ▼
Order Transitions to COMPLETED & Audit Log Records Timestamp
       │
       ▼
Inspect Real-Time Analytics (Revenue, Page Count, Peak Hours, Utilization)
```

---

## Public QR Client

The dedicated mobile client located at `apps/student-qr` (served on port `3002`) is purpose-built for student mobile browsers:

- **Zero-Friction Access**: No account creation, passwords, or login required.
- **Mobile-First Layout**: Fully responsive across standard viewport widths (360px, 375px, 390px, 412px, 480px) with minimum 44px touch targets.
- **Multi-File Staging**: Students can upload multiple files simultaneously. If one file has an invalid format, valid files remain selected without clearing the form.
- **Live Status Polling**: Automatically polls order status until the job reaches `COMPLETED` or `CANCELLED`.
- **Cloudflare Tunnel Support**: Can be exposed directly over a temporary Cloudflare Tunnel for real-smartphone demonstrations without exposing internal backend ports.

---

## Supported Documents

| Format | Extension | Normalization Method | Page Count Authority |
|---|---|---|---|
| **Portable Document Format** | `.pdf` | Direct stream validation via `pypdf` | Authoritative binary header & page dictionary |
| **Microsoft Word** | `.docx`, `.doc` | Headless LibreOffice conversion to canonical PDF | Authoritative page count of rendered PDF |
| **Images** | `.jpg`, `.jpeg`, `.png`, `.webp` | PIL (Pillow) normalization into standard A4 PDF canvas | Exactly 1 printable page per image |

If a corrupted file, encrypted PDF, or invalid binary is uploaded, the document pipeline immediately rejects the file with an actionable error. Fallback page guesses are never used.

---

## Pricing

HEDS enforces backend-authoritative pricing calculated in integer minor units (paise):

- **Black & White (Monochrome)**: ₹1.00 / page (`100` paise) standard base campus rate.
- **Color**: Shop configurable (default: ₹5.00 / page).
- **Duplex (Double-sided)**: Shop configurable discount (default: ₹0.20 discount per sheet).
- **Copies**: Strict integer multiplier against single-set page count.
- **Page Ranges**: Supported syntax (`1-5, 8, 11-14`) authoritative filtering before price calculation.

*Clients cannot inject or modify prices. The total amount charged to the student matches the backend billing engine to the exact paisa.*

---

## Reliability

1. **Idempotency Everywhere**: Scoped idempotency keys prevent duplicate orders, double payment captures, and duplicate print jobs.
2. **Lease Expiration Recovery**: Each claimed job has an expiration timestamp (`lease_expires_at`). A background worker scans for expired leases every 15 seconds.
3. **Reconciliation State**: Physical print execution can experience paper jams, power drops, or network loss. When execution is ambiguous, the order transitions to `RECONCILING` rather than repeating the print.
4. **Durable Local Queue**: The edge agent logs active leases to local SQLite before sending data to the printer driver.
5. **No Blind Retries**: Automatic retries are restricted to network transport failures. Physical printer errors require operator acknowledgment to prevent paper wastage.

---

## Security

- **Private Document Storage**: Uploaded documents are saved in a protected backend storage directory with cryptographically generated UUIDs. Files are never exposed publicly.
- **Unguessable Guest Access Tokens**: Anonymous student orders use cryptographically random 32-byte URL-safe tokens (`secrets.token_urlsafe(32)`).
- **Tenant Context Isolation**: All operations derive `shop_id` from authenticated session credentials or verified guest order tokens—never from user-supplied headers.
- **Payment Verification**: Payments require cryptographic HMAC-SHA256 signature verification against secret keys before orders enter the queue.
- **Outbound-Only Edge Ports**: Printers remain on the local network. No counter printer ports (IPP 631 or raw 9100) are opened to the public internet.
- **Audit Logging**: Every transition, operator decision, lease claim, and cancellation is immutably recorded in the database.

---

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, TanStack React Query, Lucide Icons.
- **Backend Core**: FastAPI, Python 3.11+, SQLAlchemy (asyncpg), Pydantic v2, Alembic, ReportLab.
- **Database**: PostgreSQL 16.
- **Edge Agent**: Python 3.11+, SQLite, CUPS / IPP printer adapters, httpx.
- **Infrastructure & Demo**: Docker, Docker Compose, Cloudflare Tunnel (`cloudflared`).
- **Testing**: Pytest, pytest-asyncio, HTTPX AsyncClient.

---

## Repository Structure

```text
ZeroxQueueAutomation/
├── apps/
│   ├── shop-dashboard/       # Operator desktop console (Next.js, port 3001)
│   ├── student-qr/           # Mobile-first QR storefront (Next.js, port 3002)
│   └── student-web/          # Desktop student web client (Next.js, port 3000)
├── backend/
│   ├── app/
│   │   ├── api/v1/           # API routes (orders, pickups, shops, printers, payments)
│   │   ├── core/             # Database session, config, security, exceptions
│   │   ├── modules/          # Domain services (orders, queue, pickups, pricing, documents)
│   │   └── models/           # SQLAlchemy ORM declarative models
│   ├── migrations/           # Alembic database migrations
│   └── requirements.txt      # Python backend dependencies
├── agent/
│   ├── heds_agent/           # Python edge agent package
│   │   ├── cloud/            # Outbound HTTPS poll, ACK, heartbeat client
│   │   ├── printers/         # Hardware adapters (CUPS, Mock, IPP)
│   │   └── queue/            # Durable local SQLite queue
│   └── pyproject.toml        # Agent package definition
├── infrastructure/
│   └── docker/               # Production Dockerfiles (Backend, Agent, Frontends)
├── scripts/
│   ├── demo.sh               # Turnkey examiner demo runner
│   ├── demo_seed.py          # Realistic campus shop test data seeder
│   └── seed.py               # Minimal base seeder
├── tests/
│   ├── chaos/                # Input validation and malformed payload tests
│   ├── e2e/                  # Complete vertical slice integration tests
│   ├── fixtures/             # Standard test documents (1, 3, 5, 11, 20, 60 pages)
│   ├── reliability/          # Agent crash, lease expiration, duplicate webhook tests
│   └── unit/                 # Pricing, document counting, state machine, cups tests
├── docker-compose.yml        # Multi-container orchestration stack
├── Makefile                  # Developer workflow automation targets
└── README.md                 # System technical documentation
```

---

## Running Locally

### Option 1: Docker Compose (Full Stack)

Launch the entire stack (Database + Backend + Frontends + Edge Agent) in one command:

```bash
docker compose up --build
```

#### Service Port Mapping:
- **FastAPI Backend Core & API Docs**: `http://localhost:8000` / `http://localhost:8000/docs`
- **Shop Operator Dashboard**: `http://localhost:3001`
- **Public Mobile QR Client**: `http://localhost:3002`
- **Student Web (Desktop)**: `http://localhost:3000`
- **PostgreSQL 16**: `localhost:5432`

To shut down the stack:
```bash
docker compose down
```

---

### Option 2: Native Local Development

1. **Install Virtual Environment & Python Dependencies**:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r backend/requirements.txt
   pip install -e agent/
   ```

2. **Install Frontend Dependencies**:
   ```bash
   npm --prefix apps/shop-dashboard install
   npm --prefix apps/student-qr install
   npm --prefix apps/student-web install
   ```

3. **Start PostgreSQL & Run Database Migrations**:
   ```bash
   make up
   make migrate
   make seed
   ```

4. **Run Services Concurrently**:
   ```bash
   # Terminal 1: Backend
   make dev-backend

   # Terminal 2: Edge Agent
   make dev-agent

   # Terminal 3: Shop Dashboard
   make dev-shop

   # Terminal 4: Public Mobile QR Client
   npm --prefix apps/student-qr run dev -- -p 3002
   ```

---

## Public Phone Demo

To demonstrate mobile scanning and submission from a real smartphone:

1. Ensure the Docker stack or local services are running.
2. Start a Cloudflare Tunnel pointing to the mobile QR client port:
   ```bash
   cloudflared tunnel --url http://localhost:3002
   ```
3. Cloudflare outputs a public HTTPS URL (e.g., `https://example-tunnel.trycloudflare.com`).
4. Open your phone's camera, scan the QR code pointing to:
   ```text
   https://example-tunnel.trycloudflare.com/s/campus-xerox
   ```
5. Submit documents, configure print settings, pay, and receive a live pickup token directly on your phone.

*Internal database and printer ports remain completely unexposed.*

---

## Testing

Run the full automated test suite:

```bash
make test
```

### Production Build Verification:

```bash
npm --prefix apps/shop-dashboard run build
npm --prefix apps/student-qr run build
npm --prefix apps/student-web run build
```

---

## Demo Flow

For evaluators and examiners, follow this 14-step verification flow:

1. Open `http://localhost:3002/s/campus-xerox` (or your Cloudflare Tunnel URL on mobile).
2. Upload test document (e.g. `tests/fixtures/heds-test-3-page.pdf`).
3. Observe authoritative page count (`3 pages`) detected by server.
4. Select `Black & White`, `Single-sided`, `1 copy`.
5. Verify authoritative price preview displays `₹3.00` (₹1.00 / page).
6. Click `Pay ₹3.00`.
7. Order enters queue and generates student token (e.g. `#51`).
8. Open Shop Dashboard at `http://localhost:3001/dashboard` (Log in with `operator@campus-xerox.local` / `operator123`).
9. View job `#51` in the `Print Queue` table.
10. Edge Agent automatically claims job lease and simulates printing (`PRINTING`).
11. On spool completion, order transitions to `READY FOR PICKUP`.
12. Student tracking page displays `READY FOR PICKUP`.
13. Operator clicks `Mark Collected` in the queue table.
    - Button shows `Collecting...` loading indicator.
    - Action column maintains stable 160px width without layout shift.
    - Button updates to `Collected`.
14. Student screen updates to `COMPLETED`. Click `PDF` to download the official ReportLab receipt.

---

## Current Status

- **Cloud Orchestration & State Machine**: Implemented, Fully Tested, Production-Ready.
- **Transactional PostgreSQL Queue (`SKIP LOCKED`)**: Implemented, Fully Tested, Production-Ready.
- **Multi-File Upload & Normalization**: Implemented, Fully Tested.
- **Authoritative PDF Receipt Engine**: Implemented, Fully Tested.
- **Operational Analytics & Metrics**: Implemented, Live Database Derived.
- **Shop Operator Dashboard**: Implemented, Layout Polished, Production Builds Pass.
- **Mobile Student QR Client**: Implemented, Mobile Responsive, Production Builds Pass.
- **Edge Agent (Mock Mode)**: Implemented, Fully Tested, Resilient to Restarts.
- **CUPS / IPP Driver Adapter**: Implemented (Hardware-dependent qualification on physical printers).
- **Payment Gateway Integration**: Sandbox Mock Verified (Production Razorpay API keys required for live currency transactions).

---

## Roadmap

- **Production Payment Key Provisioning**: Enable live Razorpay merchant credentials and signed webhook callbacks.
- **Multi-Shop Fleet Routing**: Centralized management portal for university print chains across multiple campus campuses.
- **Automated WhatsApp / SMS Notification**: Dispatch token pickup alerts when orders transition to `READY FOR PICKUP`.
- **ZeroConf Local Discovery**: mDNS / Bonjour printer discovery on shop subnets.
- **Consumable Telemetry**: Paper tray level tracking and toner level warnings via SNMP.

---

## Engineering Decisions

### 1. Modular Monolith vs. Microservices
We intentionally structured the HEDS cloud core as a modular Python monolith rather than independent microservices. In print queue management, orders, leases, and payments share tight transactional consistency requirements. A modular monolith allows us to use standard PostgreSQL ACID transactions and row-level locks, eliminating distributed transaction failures and network overhead.

### 2. PostgreSQL Queue vs. Kafka / Redis
While message brokers like Kafka or Redis are popular for high-throughput streaming, print shops process discrete, durable jobs where reliability and state tracking matter more than nanosecond latency. PostgreSQL `SELECT FOR UPDATE SKIP LOCKED` delivers ACID queue semantics, lease tracking, and durability in a single datastore without introducing operational overhead.

### 3. SQLite at the Edge
The edge agent uses an embedded SQLite database (`local_queue.db`) rather than in-memory queues. If the local shop computer experiences power loss or a reboot mid-spool, active lease state is preserved across restarts.

### 4. Outbound-Only Polling vs. Inbound Webhooks
Printers reside in private subnets behind strict campus NATs and firewalls. Opening router ports to counter printers is a severe security vulnerability. The HEDS Edge Agent exclusively initiates outbound HTTPS requests to the cloud orchestrator.

### 5. Document Normalization to Canonical PDF
Students submit a wide variety of formats (Word documents, PDFs, smartphone camera photos). Passing disparate formats directly to printer drivers creates driver errors. HEDS normalizes every upload into a validated, canonical PDF before spooling.

### 6. Order State Machine Invariants
All status changes flow strictly through `OrderStateMachine.transition()`. Arbitrary status mutations and illegal state jumps are rejected, and each transition generates an immutable audit record.
