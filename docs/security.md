# HEDS Security Architecture & Threat Model

This document outlines the security boundaries, cryptographic controls, multi-tenant isolation, and threat mitigations implemented across the **Hybrid Edge Distributed Print System (HEDS)**.

---

## 1. Threat Model & Security Boundaries

HEDS operates across three distinct network environments with varying levels of trust:

```
┌─────────────────────────────────┐
│       STUDENT GUEST BROWSER     │ (Zero-Trust, Public Internet)
└────────────────┬────────────────┘
                 │ HTTPS (Restricted Endpoints only)
┌────────────────▼────────────────┐
│      HEDS CLOUD PLATFORM        │ (Trusted Core, Authoritative VPC)
│   • FastAPI Application         │
│   • PostgreSQL Database         │
└────────────────▲────────────────┘
                 │ Outbound HTTPS/WSS (Mutual Token Authentication)
┌────────────────┴────────────────┐
│        LOCAL SHOP AGENT         │ (Semi-Trusted On-Premise Gateway)
│   • Hardware Agent Daemon       │
│   • Local SQLite Spool          │
│   • CUPS / IPP Local Sockets    │
└─────────────────────────────────┘
```

---

## 2. Cryptographic Token & ID Invariants

### 2.1 Unpredictable Guest Access Tokens
- **Design Rule**: Public endpoints never accept sequential database IDs or guessable integers.
- **Implementation**: Guest orders are addressed exclusively via `guest_access_token`, generated as a 32-character cryptographically secure URL-safe token:
  ```python
  secrets.token_urlsafe(32) # ~256 bits of entropy
  ```
- **Brute-Force Resistance**: At $2^{256}$ search space, brute-force enumeration of orders is computationally infeasible.

### 2.2 Token-Based Counter Pickup
- **Security & Operational Flow**: When physical printing completes, orders transition directly to `READY_FOR_PICKUP`.
- **Counter Collection**:
  - The student displays their order number/pickup token (e.g., `#51`) from their live tracking screen or receipt.
  - The operator locates the order in their authenticated dashboard and clicks **Mark Collected**.
  - The backend verifies operator authorization, transitions the order to `COMPLETED`, and writes an immutable audit record.
- **Idempotency & Duplicate Protection**: Repeat collection calls for already completed orders are handled idempotently without error or duplicate transitions.

---

## 3. Multi-Tenant Authorization & Scoping

### 3.1 Operator Identity Scoping
- Shop operators authenticate via JWT Bearer tokens issued by the authentication service.
- The `get_authorized_shop` dependency (`backend/app/api/deps.py`) enforces:
  1. Operator must belong to the requested tenant (`operator_shop_roles`).
  2. The `X-Shop-ID` header is verified against the operator's active permissions.
  3. No query can execute without an explicit `shop_id` filter bound to the authorized tenant context.
- Operators cannot traverse or read another shop's print queues, pricing sheets, or audit logs.

### 3.2 Student Isolation
- Guest students have zero cross-order visibility.
- All student queries require both matching `order_id` and authoritative `guest_access_token`. A student with token $A$ cannot query order $B$.

---

## 4. File Upload & Binary Security

### 4.1 MIME Type & Header Validation
- File uploads are validated at the gateway level:
  - Strict extension matching: `.pdf`.
  - Magic byte verification: Validates `%PDF-` file signature (not merely client-supplied `Content-Type`).
  - Size capping: Default limit of 50MB per upload (`MAX_UPLOAD_SIZE_MB = 50`) prevents disk exhaustion attacks (DoS).

### 4.2 Path Traversal & Binary Isolation
- Document storage paths are calculated server-side using cryptographically generated document UUIDs:
  ```python
  storage_path = os.path.join(STORAGE_DIR, f"{document_id}.pdf")
  ```
- Original client-supplied filenames are sanitized (`secure_filename`) and stored solely as descriptive metadata; they are **never** used to construct filesystem paths.

### 4.3 Retention & Secure Erasure
- Documents are ephemeral. The `DocumentCleanupWorker` (`backend/app/workers/cleanup.py`) periodically unlinks binary payloads after the configured retention period (`DOCUMENT_RETENTION_HOURS = 24`), preventing persistent storage accumulation of confidential student printouts.

---

## 5. Payment Gateway Security

### 5.1 Authoritative Pricing
- **Zero Client Trust**: All pricing calculations are performed strictly backend-side by `PricingEngine.calculate_job_price()` in integer minor units (paise/cents).
- Client requests specify intent options (e.g. duplex, color); client-submitted price claims are ignored.

### 5.2 Cryptographic Webhook & Signature Verification
- Razorpay order completion requires HMAC-SHA256 signature verification:
  $$\text{Signature} = \text{HMAC-SHA256}(\text{order\_id} + "|" + \text{payment\_id}, \text{key\_secret})$$
- Webhooks verify the `X-Razorpay-Signature` header against the shared webhook secret.
- Duplicate webhooks are rejected idempotently using unique payment transaction IDs stored in `payments` table.

---

## 6. Edge Agent Mutual Authentication

- **Outbound-Only Invariant**: Edge agents running inside shop local networks never expose listening ports to the public internet. All traffic is outbound HTTPS/WSS to the HEDS cloud.
- **Enrollment Flow**:
  1. Agent boots with shop enrollment token (`AGENT_ENROLLMENT_TOKEN`).
  2. Registers with Cloud API via `POST /api/v1/agents/register`.
  3. Cloud issues an agent UUID and secret token (`agent_token`).
  4. Subsequent heartbeats (`POST /api/v1/agents/heartbeat`) and job lease claims (`POST /api/v1/agents/poll-jobs`) authenticate via `X-Agent-Token` header.
- **Lease Integrity**: Jobs leased to an agent expire after a finite lease window (`lease_expires_at`). If an agent dies mid-job, the lease reconciler safely revokes or transitions the job without infinite deadlock.

---

## 7. Security Hardening Checklist Summary

| Domain | Control | Status |
| :--- | :--- | :--- |
| **Transport** | Enforced TLS (HTTPS / WSS) | Verified |
| **CORS** | Explicit origin whitelisting (`ALLOWED_HOSTS`, `CORS_ORIGINS`) | Verified |
| **SQL Injection** | SQLAlchemy ORM parameterized queries throughout | Verified |
| **Path Traversal** | Synthetic UUID paths; client filenames quarantined to metadata | Verified |
| **Authentication** | JWT Bearer for operators; persistent bearer tokens for agents | Verified |
| **Rate Limiting** | Rate-limited OTP verification to prevent brute-force | Verified |
| **Auditing** | Immutable audit log table (`audit_logs`) tracks state mutations | Verified |
| **Logging Hygiene** | Plaintext OTPs and binary document payloads omitted from logs | Verified |
