# HEDS Agent Operations Manual

This document covers deploying, configuring, monitoring, and operating the HEDS Print Agent as a shop-side daemon.

---

## 1. What is the HEDS Print Agent?

The HEDS Print Agent is a lightweight Python daemon that runs on the print shop's local counter machine (or a dedicated Raspberry Pi / mini PC).

It is responsible for:
- Polling the cloud for available print jobs via outbound HTTPS (never exposing local ports)
- Persisting jobs to a local SQLite durable queue before any hardware operation
- Submitting documents to CUPS/IPP for physical printing
- Reporting job status and heartbeat telemetry back to the cloud
- Reconciling ambiguous hardware states with the cloud orchestrator

The cloud never connects inbound to the agent. The agent always initiates outbound connections.

---

## 2. Architecture Position

```text
Cloud (HEDS Backend)
     ↑ Outbound polling / status reporting (HTTPS)
     |
HEDS Agent (Shop Machine)
     |
     ├── Local SQLite Queue  (durable crash recovery)
     |
     └── Printer Adapter
          ├── MockPrinterAdapter (CI / development)
          └── CUPSPrinterAdapter (production)
               └── CUPS → IPP → Physical Printer
```

---

## 3. System Requirements

| Component       | Requirement                                              |
|-----------------|----------------------------------------------------------|
| OS              | Linux (Ubuntu 22.04+ recommended), macOS (dev only)      |
| Python          | 3.11+                                                    |
| CUPS            | Installed and running (for real printing)                |
| Disk            | ≥ 500 MB free (temporary document spooling)              |
| Network         | Outbound HTTPS to HEDS cloud API                         |
| Memory          | ≥ 256 MB RAM                                             |

---

## 4. Configuration

All configuration is via environment variables (typically in `agent/.env`):

```bash
# --- Agent Identity ---
AGENT_TOKEN=<cryptographic-agent-token>          # Issued by HEDS cloud admin
AGENT_ID=<uuid>                                  # Assigned at registration

# --- Cloud API ---
HEDS_API_URL=https://your-heds-cloud.com

# --- Print Backend ---
PRINT_BACKEND=cups                               # "mock" or "cups"
CUPS_PRINTER_NAME=Xerox-WorkCentre               # Target CUPS queue name

# --- Local Storage ---
LOCAL_DB_PATH=/var/lib/heds-agent/local_queue.db # SQLite durable queue path
SPOOL_DIR=/tmp/heds_spool                        # Temporary document directory

# --- Polling ---
POLL_INTERVAL_SECONDS=5                          # How often to poll cloud for jobs
HEARTBEAT_INTERVAL_SECONDS=10                    # How often to send heartbeat
LEASE_DURATION_SECONDS=300                       # Maximum time to hold a job lease

# --- Logging ---
LOG_LEVEL=INFO                                   # DEBUG, INFO, WARNING, ERROR
```

> **Security**: Never commit `agent/.env` to version control.
> Never log AGENT_TOKEN, document contents, OTP values, or signed URLs.

---

## 5. Starting the Agent

### Development

```bash
cd /path/to/ZeroxQueueAutomation
source .venv/bin/activate
cd agent
python -m heds_agent.main
```

### Production (systemd service)

Create `/etc/systemd/system/heds-agent.service`:

```ini
[Unit]
Description=HEDS Print Agent
After=network.target cups.service
Wants=cups.service

[Service]
Type=simple
User=hedsagent
WorkingDirectory=/opt/heds-agent
EnvironmentFile=/opt/heds-agent/.env
ExecStart=/opt/heds-agent/.venv/bin/python -m heds_agent.main
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=heds-agent

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable heds-agent
sudo systemctl start heds-agent
sudo journalctl -u heds-agent -f
```

---

## 6. Agent Authentication

Each agent has a unique cryptographic token issued at registration time.

The token is:
- Stored as a bcrypt hash in the cloud database (`agents.agent_token_hash`)
- Never stored in plaintext on the cloud
- Sent as a Bearer token in all API calls: `Authorization: Bearer <token>`
- Never logged by the agent or backend

### Credential Rotation (Planned)

The architecture supports credential rotation:

1. Admin issues new token via `POST /api/v1/admin/agents/{id}/rotate-token`
2. Cloud generates new token, stores new hash, marks old token as expiring
3. Agent receives new token (manual deployment step in current implementation)
4. Old token becomes invalid after grace period

### Agent Revocation

If an agent machine is compromised:
1. Admin revokes via `DELETE /api/v1/admin/agents/{id}` or status change
2. Agent token immediately rejected on next API call
3. All in-flight jobs transition to `RECONCILING` for operator review

---

## 7. Heartbeat Protocol

The agent transmits a heartbeat to the cloud every `HEARTBEAT_INTERVAL_SECONDS`.

Heartbeat payload:

```json
{
  "agent_id": "uuid",
  "version": "0.1.0",
  "os_info": "Linux-6.8.0-x86_64",
  "uptime_seconds": 3600,
  "printer_count": 2,
  "online_printer_count": 1,
  "local_queue_depth": 0,
  "last_completed_job_id": "uuid-or-null",
  "timestamp": "2026-10-06T22:44:13Z"
}
```

Cloud health derivation:

| Condition                        | Agent Status  |
|----------------------------------|---------------|
| Heartbeat within last 30s        | `ONLINE`      |
| Heartbeat 30s–120s ago           | `DEGRADED`    |
| No heartbeat for 120s+           | `OFFLINE`     |

---

## 8. Job Lifecycle on the Agent

```text
Cloud: QUEUED
     ↓
Agent polls → Cloud: DISPATCHED
     ↓
Agent saves to SQLite local queue (synced=false)
     ↓
Agent downloads document via signed URL
     ↓
Agent submits to CUPS → CUPS accepts → Cloud: PRINTING
     ↓
     ├── Success: Agent reports completion → Cloud: PRINT_COMPLETED → PICKUP_READY
     └── Failure: Agent reports error → Cloud: PRINT_FAILED
              ↓ Network loss mid-print:
              Cloud: RECONCILING (operator must inspect physical tray)
```

---

## 9. Local SQLite Durability

The agent stores every leased job in `local_queue.db` before any hardware operation.

The local queue records:
- `job_id` (HEDS UUID)
- `order_id`, `order_number`
- `lease_id`, `lease_expires_at`
- `document_id`, `document_filename`, `page_count`
- `print_spec` (JSON)
- `printer_name`
- `native_job_id` (CUPS job ID, populated after submission)
- `status` (PENDING → PRINTING → COMPLETED / FAILED)
- `synced_with_cloud` (0/1)

**Crash recovery**: On restart, the agent reads all unsynced jobs from SQLite
and attempts to reconcile with the cloud before claiming new jobs.

---

## 10. Structured Logging Fields

The agent emits structured log lines with the following fields:

```
timestamp   - ISO 8601
level       - INFO / WARNING / ERROR
agent_id    - Agent UUID (from config)
printer_id  - Cloud printer UUID (when applicable)
heds_job_id - HEDS job UUID
cups_job_id - Native CUPS job ID (e.g., Xerox-WorkCentre-7)
event       - job_claimed, job_stored_locally, job_dispatched, job_completed, job_failed
duration    - Elapsed time in milliseconds (when measured)
status      - Job or printer status
```

Example log line (INFO):
```
2026-10-06T22:44:13Z INFO event=job_dispatched heds_job_id=HDS-82A1 printer=Xerox-WorkCentre cups_job_id=Xerox-WorkCentre-7 duration=284ms
```

**Never logged**:
- Document contents or binary payloads
- Bearer tokens or AGENT_TOKEN
- Pickup OTP values (plaintext or hashed)
- Signed document URLs

---

## 11. Physical Print Ambiguity

If the agent submits a job to CUPS and loses network connectivity before confirming completion:

1. The lease expires on the cloud side.
2. The lease expiration worker transitions the job to `RECONCILING`.
3. The operator sees the ambiguous job in the shop dashboard.
4. The operator physically checks the printer output tray.
5. The operator confirms `COMPLETED` or `FAILED` via the dashboard.

The agent will **never automatically resubmit** a job that has already been sent to CUPS.
Uncontrolled retries cause duplicate physical paper wastage and breach student privacy.

---

## 12. Network Disconnect Behavior

| Phase                              | Behavior                                      |
|------------------------------------|-----------------------------------------------|
| Before job claim                   | Agent waits and retries polling               |
| After claim, before CUPS submit    | Job stays in SQLite; agent retries on restart |
| During CUPS submission             | CUPS operates locally; agent marks unsynced   |
| After CUPS completion, before ACK  | Agent retries cloud report on reconnect       |
| Lease expires during disconnect    | Cloud transitions to `RECONCILING`            |

---

## 13. Monitoring and Diagnostics

```bash
# View agent logs (systemd)
sudo journalctl -u heds-agent -f

# Check SQLite queue depth
sqlite3 /var/lib/heds-agent/local_queue.db \
  "SELECT status, COUNT(*) FROM local_jobs GROUP BY status;"

# Check CUPS queue state
lpstat -p
lpq -a

# Check agent health via cloud API
curl -H "Authorization: Bearer <admin-token>" \
  https://your-heds-cloud.com/api/v1/admin/agents
```

---

## 14. Known Limitations (Phase 3)

| Limitation                              | Status    |
|-----------------------------------------|-----------|
| Agent credential rotation via API       | PLANNED   |
| Automatic CUPS job completion polling   | PLANNED   |
| Multi-printer per-agent load balancing  | PARTIAL   |
| Windows printing (WinPrint API)         | PLANNED   |
| pycups support on Python 3.14           | BLOCKED (header install required) |
| Signed URL expiry enforcement on agent  | IMPLEMENTED |
| Structured log shipping to cloud        | PLANNED   |
