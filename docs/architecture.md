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
