# HEDS Safety Baseline Before QR Client Implementation

**Date**: 2026-10-08  
**Branch**: `feat/public-qr-client`  
**Commit**: `ede2b31d912a7dbf3c0dbcf32b92cdfbc43416e3`

---

## 1. System Verification Baseline

### 1.1 Backend Test Suite
- **Command**: `PYTHONPATH=backend:agent .venv/bin/python -m pytest tests/ -v`
- **Result**: **44/44 PASS** (0 failures, 6.85s)
- **Invariant Tests Verified**:
  - `OrderStateMachine` valid and illegal transition protections
  - PostgreSQL row-locking `FOR UPDATE SKIP LOCKED`
  - Deterministic capability-aware printer matching
  - Agent lease expiration and reconciliation
  - Document retention worker binary purge lifecycle
  - Cryptographic Razorpay signature verification and idempotent webhook processing
  - Pickup OTP and guest token randomness
  - Production environment restriction on `/api/v1/dev/*` routes
  - Database health and readiness probes (`/api/v1/readiness`)

### 1.2 Frontend Builds
- **Shop Dashboard (`apps/shop-dashboard`)**:
  - **Command**: `npm --prefix apps/shop-dashboard run build`
  - **Result**: **PASS** (6/6 static pages compiled cleanly)
  - **Routes**:
    - `/`
    - `/login`
    - `/dashboard`
    - `/_not-found`
    - `/api/[...path]`
- **Student Web (`apps/student-web`)**:
  - **Command**: `npm --prefix apps/student-web run build`
  - **Result**: **PASS** (4/4 static pages compiled cleanly)
  - **Routes**:
    - `/`
    - `/s/[shop_slug]`
    - `/orders/[guest_token]`
    - `/_not-found`
    - `/api/[...path]`

### 1.3 Docker Status
- **Postgres (`heds-postgres`)**: `Up 2 hours (healthy)` on `5432`
- **Backend API (`heds-backend`)**: `Up 2 hours` on `8000`
- **Shop Dashboard (`heds-shop-dashboard`)**: `Up 2 hours` on `3001`
- **Student Web (`heds-student-web`)**: `Up 2 hours` on `3000`
- **Edge Print Agent (`heds-edge-agent`)**: `Up` (mock printer active)

---

## 2. Invariant Rules for Feat: Public QR Client (`apps/student-qr`)

1. **Frozen Laptop Desktop Application**: `apps/shop-dashboard` is completely frozen. No components, routes, or layout will be modified.
2. **Untouched Student Web**: `apps/student-web` will not be altered or replaced.
3. **Dedicated Port**: `apps/student-qr` operates on port `3002`.
4. **Shared Backend & Invariants**: Both clients communicate with the same HEDS backend (`http://localhost:8000`), sharing identical orders, PostgreSQL queues, pricing rules, edge agents, and mock printers.
5. **No OTP in QR Student Workflow**: Direct token-based pickup identifier (e.g., `#51`).
