# Development Guide

## 1. Prerequisites

- Python 3.10+ (tested with Python 3.12 and Python 3.14)
- Node.js 18+ (tested with Node 20 / 24)
- Docker & Docker Compose
- Git
- CUPS (`cups`, `cups-client`) — required for real printer integration only

---

## 2. Quick Local Start

### Step 1: Clone & Setup Environment
```bash
cp .env.example .env
make setup
```

### Step 2: Start PostgreSQL & MinIO
```bash
make up
```

### Step 3: Run Database Migrations & Seed Data
```bash
make migrate
make seed
```

### Step 4: Run Services
In separate terminal windows:

1. **Backend API**:
   ```bash
   make dev-backend
   ```
   Access Swagger API docs at `http://localhost:8000/docs`.

2. **HEDS Edge Agent**:
   ```bash
   make dev-agent
   ```

3. **Student Web App**:
   ```bash
   make dev-student
   ```
   Open `http://localhost:3000/s/campus-xerox`.

4. **Shop Dashboard**:
   ```bash
   make dev-shop
   ```
   Open `http://localhost:3001`. Login with `operator@campus-xerox.local` / `operator123`.

---

## 3. Running Test Suites

Run all automated unit, integration, reliability, chaos, and e2e tests:
```bash
make test
```

Run dedicated reliability tests:
```bash
make test-rel
```

Run CUPS unit tests only (no physical printer required):
```bash
PYTHONPATH=backend:agent .venv/bin/pytest tests/unit/test_cups_adapter.py -v
```

Run Phase 3 edge agent hardening tests:
```bash
PYTHONPATH=backend:agent .venv/bin/pytest tests/reliability/test_edge_agent_hardening.py -v
```

---

## 4. Print Backend Configuration

HEDS supports two print backends. The default is `mock` (safe for CI and development).

### Mock Backend (Default)

```bash
# agent/.env
PRINT_BACKEND=mock
```

The `MockPrinterAdapter` simulates job acceptance, job IDs, and completion without any hardware.
All tests use the mock backend by default.

### CUPS Backend (Real Printing)

```bash
# agent/.env
PRINT_BACKEND=cups
CUPS_PRINTER_NAME=Your-CUPS-Queue-Name
```

Requires:
- CUPS installed and running (`systemctl status cups`)
- At least one CUPS queue configured (`lpstat -p`)
- Agent running on the same machine as CUPS

See [docs/cups.md](cups.md) for full CUPS setup instructions.

---

## 5. CUPS Development Without Hardware

Install a virtual PDF printer for paperless CUPS testing:

```bash
sudo apt install -y cups-pdf
# PDF virtual printer appears as "PDF" in lpstat
```

Then set `CUPS_PRINTER_NAME=PDF` in `agent/.env`.
Printed output will be saved to `/var/spool/cups-pdf/<username>/`.

---

## 6. Test Print (Operator Diagnostics)

Operators can trigger a 1-page diagnostics test page from the shop dashboard:

- Via UI: **Printers** tab → printer row → **Test Print** button
- Via API:
  ```bash
  curl -X POST \
    -H "Authorization: Bearer <token>" \
    http://localhost:8000/api/v1/shop/printers/<printer-id>/test-print
  ```

This routes through the full HEDS queue → agent → adapter → printer pipeline.
