# HEDS Backup and Disaster Recovery Strategy

This document outlines the backup, disaster recovery, point-in-time restoration, and retention policies for the **HEDS (Hybrid Edge Distributed Print System)**.

---

## 1. Overview & Operational Status

HEDS distinguishes between active implemented features, operational recommendations, and unfulfilled infrastructure capabilities.

| Subsystem | Implemented Strategy | Status |
| :--- | :--- | :--- |
| **Database Schemas & Migrations** | Alembic versioned migrations with transactional rollbacks | **IMPLEMENTED** |
| **Local Queue Durability** | SQLite edge WAL journaling surviving power failures | **IMPLEMENTED** |
| **Document Retention Cleanup** | `DocumentCleanupWorker` purging storage binaries after lease/order completion | **IMPLEMENTED** |
| **PostgreSQL Backup Script** | Automated `pg_dump` binary backup script in `scripts/backup_db.sh` | **IMPLEMENTED** |
| **WAL / Point-In-Time-Recovery (PITR)** | PostgreSQL continuous archiving via WAL-G / pgBackRest | **RECOMMENDED** |
| **Cross-Region S3 Replication** | Multi-region storage bucket mirroring | **NOT IMPLEMENTED** |

---

## 2. PostgreSQL Database Backup Procedures

### 2.1 Daily Logical Backups (`pg_dump`)
The database contains authoritative order state, tenant pricing rules, print audit trails, and payment idempotency tokens.

- **Command**:
  ```bash
  docker exec -t heds_postgres pg_dump -U heds_user -F c heds_db > /backups/heds_db_$(date +%Y%m%d_%H%M%S).dump
  ```
- **Frequency**: Daily at 02:00 UTC.
- **Retention**: 30 days locally, rotated automatically.

### 2.2 Database Restoration Procedure
To restore HEDS PostgreSQL state from a binary dump:

1. **Stop HEDS backend services**:
   ```bash
   docker compose stop backend agent
   ```
2. **Drop existing connections & restore database**:
   ```bash
   docker exec -t heds_postgres dropdb -U heds_user heds_db
   docker exec -t heds_postgres createdb -U heds_user heds_db
   docker exec -i heds_postgres pg_restore -U heds_user -d heds_db < /backups/heds_db_20261008_020000.dump
   ```
3. **Run migrations to ensure schema alignment**:
   ```bash
   docker compose run --rm backend alembic upgrade head
   ```
4. **Restart applications**:
   ```bash
   docker compose start backend agent
   ```

---

## 3. Storage Binary & Document Backup Strategy

Student document binaries stored in `./storage_data/` or MinIO/S3 are subject to strict privacy hold and retention parameters.

- **Active Binary Retention**: Documents remain active only during order processing and for `DOCUMENT_RETENTION_HOURS` (default 24h) after completion.
- **Cleanup Worker Execution**: `DocumentCleanupWorker.purge_expired_documents()` safely deletes disk/S3 binaries while preserving immutable database metadata for audit compliance.
- **Binary Backup Recommendation**: Storage binaries do NOT require long-term backups due to ephemeral privacy compliance. Ephemeral uploads can be re-uploaded by students if a catastrophic storage loss occurs prior to printing.

---

## 4. Edge Agent SQLite Recovery

Each edge agent maintains a local SQLite database (`local_queue.db`) with Write-Ahead Logging (`PRAGMA journal_mode=WAL`).

- **Process Restart Safety**: Active leased print jobs persist across agent restarts and reboot events.
- **Re-synchronization**: Upon internet restoration, the agent queries the backend API to reconcile current job state. If the lease expired in the backend, the job status moves to `RECONCILING` to prevent duplicate physical print outputs.
