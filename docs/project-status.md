# HEDS Project Delivery & Engineering Status Report

**Last Updated:** October 7, 2026  
**Status:** In Active Development (Phase 1–17 Engineering Plan)  
**Baseline Test Status:** 22/22 pytest tests passing  
**Frontend Builds:** Both `student-web` and `shop-dashboard` compile cleanly with Next.js 14  

---

## 1. Executive Summary & Readiness Evaluation

| Dimension | Score | Assessment |
|---|:---:|---|
| **Overall Completion** | **82%** | Core functional pathways from student submission to printer output are working end-to-end. |
| **MVP Readiness** | **90%** | The system executes complete vertical slices in automated tests and demo runs. |
| **Examiner Demo Readiness** | **95%** | `make demo` provisions realistic data, hardware telemetry, and simulated live print pipelines. |
| **Production Readiness** | **45%** | Blocked by missing concrete payment gateway credentials, document retention background workers, and multi-tenant UI scoping. |

---

## 2. Current Architecture

HEDS follows a **Modular Monolith** architecture for cloud orchestration, paired with an **Outbound Polling Edge Daemon**:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT APPLICATIONS                           │
│   apps/student-web (Mobile PWA)       apps/shop-dashboard (Desktop)   │
└───────────────────┬─────────────────────────────────┬──────────────────┘
                    │ HTTPS / REST                    │ HTTPS / JWT
                    ▼                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       FASTAPI CLOUD ORCHESTRATOR                       │
│  - Modular domain modules: tenants, users, orders, queue, payments,   │
│    printers, agents, pickups, audit, pricing                           │
│  - OrderStateMachine (Strict FSM with audit logging)                   │
│  - QueueService (FOR UPDATE SKIP LOCKED queue leasing)                 │
│  - Lease Reconciler Worker (15s sweep for expired leases)              │
│  - StorageService (Local FS / MinIO object storage abstraction)        │
└───────────────────┬─────────────────────────────────┬──────────────────┘
                    │ SQL                             │ Outbound Polling
                    ▼                                 ▼
┌─────────────────────────────────┐   ┌──────────────────────────────────┐
│      POSTGRESQL 16 (DOCKER)     │   │      HEDS EDGE PRINT AGENT       │
│  - Orders, PrintJobs, Pickups   │   │  - Durable SQLite queue          │
│  - Tenants, Shops, Members      │   │  - CloudClient (Poll/ACK/Status) │
│  - Audit logs & idempotency keys│   │  - Hardware Printer Adapters:    │
└─────────────────────────────────┘   │    * MockPrinterAdapter          │
                                      │    * CUPSPrinterAdapter (Linux)  │
                                      └──────────────────┬───────────────┘
                                                         │ IPP / USB
                                                         ▼
                                              PHYSICAL / VIRTUAL PRINTER
```

---

## 3. Completed Functionality

1. **State Machine (`OrderStateMachine`):** Strict transition validation, preventing illegal state jumps, logging every mutation into `audit_logs`.
2. **PostgreSQL Queue Leasing:** Capability-aware queue matching with `FOR UPDATE SKIP LOCKED`. Monochrome jobs prefer black-and-white printers to preserve color hardware.
3. **Lease Reconciler:** Background asyncio task continuously sweeping for expired leases and transitioning stalled jobs to `RECONCILING` to prevent unmonitored double-printing.
4. **Privacy Hold (`PickupService`):** 6-digit OTP generated upon print completion, stored only as a PBKDF2/SHA-256 salted hash, verified at the counter by the operator.
5. **Authoritative Pricing Engine:** Integer minor-unit calculations handling base rates, page ranges (`"1-3, 5"`), duplex discounts, and minimum order floors.
6. **Edge Print Daemon:** Outbound-only polling agent with local SQLite durable logging (`local_queue.db`), heartbeat telemetry, document binary downloading, and offline reconnection reconciliation.
7. **Dual Printer Adapters:** `MockPrinterAdapter` (customizable speed and failure injection) and `CUPSPrinterAdapter` (native pycups / CLI fallback with standard option parsing).
8. **Student Web App:** Next.js 14 mobile-first storefront (`/s/[shop_slug]`) with file upload, live price estimate, demo file loader, sandbox checkout, and live order tracking (`/orders/[guest_token]`).
9. **Shop Dashboard:** Next.js 14 console with overview statistics, queue management, orders ledger, printer diagnostics (test page print), agent heartbeats, pricing configuration, audit log viewer, and shop settings.
10. **Automated Verification:** 22 automated tests spanning chaos payload testing, vertical slice E2E, lease expiration recovery, printer failure handling, and CUPS adapter unit tests.

---

## 4. Incomplete Functionality & Gaps

1. **Concrete Production Payment Integration:** `RazorpayPaymentGateway` defines interface boundaries and signature verification, but actual intent creation, direct checkout callbacks, and refunds raise `NotImplementedError`.
2. **Automated Document Retention Worker:** `DOCUMENT_RETENTION_HOURS=24` is defined in settings, but there is no running background worker or cron that systematically purges expired document binaries from disk storage.
3. **Real-time Status Streaming:** The frontend currently polls APIs every 2.5–3 seconds via React Query. Server-Sent Events (SSE) with automatic polling fallback are not yet built.
4. **Customer Notifications:** `backend/app/modules/notifications` is empty. There is no SMS or WhatsApp integration for notifying students when their orders are ready for pickup.
5. **Multi-Tenant Dashboard Scoping:** Dashboard routes currently fetch the first shop (`Shop.limit(1)`) rather than scoping views to an active, selected shop context with explicit backend authorization.

---

## 5. Known Bugs & Implementation Deficiencies

1. **Edge Agent Dev Authentication Mismatch (P0):** `scripts/demo_seed.py` generates new random UUIDs for agents on every run, while `.env` leaves `HEDS_AGENT_ID` blank and `agent/heds_agent/config.py` hardcodes a stale default UUID. Running `make dev-agent` fails with 401 Unauthorized unless synchronized.
2. **Shop Dashboard Docker Build Failure (P1):** `infrastructure/docker/Dockerfile.frontend` contains `COPY --from=builder /app/public ./public`, but `apps/shop-dashboard` lacks a `public/` directory, causing Docker build failures.
3. **SQLAlchemy Registry Standalone Loading:** Importing `app.modules.agents.models.Agent` in isolation without importing `app.models` first causes an `InvalidRequestError` when compiling relationships to `Shop`.

---

## 6. Technical Debt

1. **Orphan Skeleton Directories:** `backend/app/modules/notifications`, `backend/app/workers`, `packages/contracts`, and `tests/integration` exist as empty folders without `.gitkeep` or baseline files.
2. **Pytest Rootdir Precedence:** Pytest picks up `agent/pyproject.toml` as rootdir when running `make test` rather than the repo root, causing slight path confusion in output logs.
3. **Hardcoded Mock Fallbacks in Client UI:** Small client-side fallbacks (e.g., fallback OTP `"482913"` when backend pickup OTP isn't available) need clean empty/loading states rather than mock defaults.

---

## 7. Production Blockers

1. **Payment Gateway Credentials & SDK:** Lack of live Razorpay integration keys, webhook validation in production, and merchant settlement accounts.
2. **Hardware Environment Validation:** Physical Linux CUPS print queues have not been tested against real USB/IPP printers in a live Xerox shop setup.
3. **Automated Storage Hygiene:** Without the retention purge worker, high-volume production stores will run out of disk space from stored PDFs.
4. **TLS/SSL and Reverse Proxy Configuration:** Missing Nginx/Caddy production reverse proxy configuration for termination of HTTPS and WSS/SSE.

---

## 8. Frontend Weaknesses

1. **State Duplication & Missing Shared Types:** Domain types (e.g., `ShopInfo`, `OrderDetail`, `QueueItem`) are duplicated across `student-web` and `shop-dashboard` rather than shared or centrally defined.
2. **Single-Shop Assumption:** The dashboard UI assumes a single shop exists and does not provide a shop switcher for multi-store operators.
3. **No SSE Support:** Network overhead is incurred due to 2.5s polling across both student tracking and operator queue views.

---

## 9. Reliability Weaknesses

1. **Agent Heartbeat Desync:** If an edge agent dies abruptly while holding a leased job, the order remains in `PRINTING` until the 60-second lease expires and the reconciler sweeps it (up to 15s later).
2. **Storage Cleanup Failures:** If storage deletion fails during order cancellation, stranded files may remain untracked in storage directories.

---

## 10. Security Weaknesses

1. **Default Secrets in Dev Config:** `.env.example` and `config.py` include dev JWT secret keys (`"heds-super-secret-key-..."`) that must be enforced as high-entropy secrets in production.
2. **Guest Token Entropy & Validation:** While URL-safe tokens are generated with 32 bytes of randomness, rate limiting is needed on the `/orders/{guest_token}` route to prevent brute-force probing.
