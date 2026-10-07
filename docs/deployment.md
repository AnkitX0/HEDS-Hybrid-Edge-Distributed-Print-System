# HEDS Deployment & Operations Manual

This document details production deployment topology, Docker orchestration, environment configuration, database lifecycle, and on-premise Edge Agent operations for the **Hybrid Edge Distributed Print System (HEDS)**.

---

## 1. System Topology

```
                       [ Public Internet ]
                                │
                        HTTPS / TLS (443)
                                │
                     ┌──────────▼──────────┐
                     │     Nginx Proxy     │
                     └────┬────────────┬───┘
                          │            │
            ┌─────────────▼─┐        ┌─▼─────────────┐
            │  student-web  │        │shop-dashboard │
            │  Next.js :3000│        │ Next.js :3001 │
            └───────┬───────┘        └───────┬───────┘
                    │                        │
                    └───────────┬────────────┘
                                │
                        HTTP Proxy (:8000)
                                │
                     ┌──────────▼──────────┐
                     │    FastAPI Core     │
                     └──────────┬──────────┘
                                │
                    PostgreSQL 16 (:5432)
                                ▲
                                │ Outbound HTTPS Poll
                                │
                     ┌──────────┴──────────┐
                     │  On-Premise Agent   │
                     │  (Print Shop Host)  │
                     └──────────┬──────────┘
                                │ Local IPP / USB
                     ┌──────────▼──────────┐
                     │ CUPS / Office Print │
                     └─────────────────────┘
```

---

## 2. Environment Variables Specification

Production deployments require a `.env` file containing:

```bash
# Core Environment
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=<generate_secure_random_64_char_key>

# Database Configuration
DATABASE_URL=postgresql+psycopg://heds_user:heds_password@heds-postgres:5432/heds_db

# Multi-Tenant & Shop Defaults (Seed)
DEMO_SHOP_ID=b52a6ecb-5dbc-4e41-a8cb-88f05f68859a
DEMO_AGENT_ID=467674bf-343b-4484-adde-efc923c87db3
AGENT_ENROLLMENT_TOKEN=<shared_secure_enrollment_token>

# Payment Gateway (Razorpay)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=yyyyyyyyyyyyyyyyyyyyyyyy
RAZORPAY_WEBHOOK_SECRET=zzzzzzzzzzzzzzzzzzzzzzzz

# Document Storage & Retention
STORAGE_DIR=/var/heds/documents
MAX_UPLOAD_SIZE_MB=50
DOCUMENT_RETENTION_HOURS=24

# CORS & Allowed Hosts
ALLOWED_HOSTS=print.campus.edu,operator.campus.edu,api.campus.edu
CORS_ORIGINS=https://print.campus.edu,https://operator.campus.edu
```

---

## 3. Production Docker Compose Deployment

The repository includes production container recipes in `infrastructure/docker/`:

### 3.1 Services Defined
- `heds-postgres`: PostgreSQL 16 database with persistent volume `pgdata`.
- `heds-backend`: FastAPI modular monolith running via Uvicorn with 4 workers.
- `heds-student-web`: Next.js standalone container for student self-service.
- `heds-shop-dashboard`: Next.js standalone container for operator desk.

### 3.2 Build & Launch Commands
```bash
# 1. Build all container images
docker compose build

# 2. Run database migrations and seed data
docker compose run --rm heds-backend alembic upgrade head
docker compose run --rm heds-backend python scripts/demo_seed.py

# 3. Launch stack in background
docker compose up -d
```

### 3.3 Health Checks
- Backend health: `GET http://localhost:8000/health` (returns `{"status": "healthy"}`)
- Student Web: `GET http://localhost:3000/`
- Shop Dashboard: `GET http://localhost:3001/`

---

## 4. On-Premise Edge Agent Deployment

The Edge Agent runs on a local machine physically connected to campus printers (Linux with CUPS or Raspberry Pi).

### 4.1 System Prerequisites
- Linux with Python 3.11+
- CUPS installed and running:
  ```bash
  sudo apt-get install cups libcups2-dev
  sudo systemctl enable --now cups
  ```
- Local printer configured in CUPS (e.g. `lpstat -p -d`).

### 4.2 Installation & Systemd Service
Clone the repository and install the agent package:
```bash
cd /opt/heds/agent
python3 -m venv .venv
.venv/bin/pip install -e .
```

Configure `/etc/systemd/system/heds-agent.service`:
```ini
[Unit]
Description=HEDS Edge Print Agent
After=network-online.target cups.service
Wants=network-online.target cups.service

[Service]
Type=simple
User=heds
WorkingDirectory=/opt/heds/agent
EnvironmentFile=/etc/heds/agent.env
ExecStart=/opt/heds/agent/.venv/bin/python -m heds_agent.main
Restart=always
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now heds-agent
```

---

## 5. Maintenance & Disaster Recovery

### 5.1 Database Backups
Automated PostgreSQL logical dumps should be executed daily:
```bash
docker exec -t heds-postgres pg_dump -U heds_user heds_db | gzip > /backups/heds_db_$(date +%Y%m%d).sql.gz
```

### 5.2 Document Retention Worker
The automated background worker (`backend/app/workers/cleanup.py`) runs every hour inside the FastAPI lifespan process. It cleans up temporary PDFs older than `DOCUMENT_RETENTION_HOURS`, preventing storage exhaustion without requiring external cron daemons.

### 5.3 Ambiguous Print Reconciliation
In case of power outages or paper jams, print jobs enter `RECONCILING`. Operators navigate to **Shop Dashboard → Queue**, verify the physical output tray, and manually mark the job as either:
- **Reprint** (reschedules to next available printer)
- **Completed** (unlocks student OTP verification)
- **Cancelled** (triggers refund flow)
