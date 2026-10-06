# AGENTS.md — HEDS Engineering Directives

This document defines core architectural boundaries and engineering constraints for any AI coding assistant or engineer working on **HEDS (Hybrid Edge Distributed Print System)**.

---

## 1. Architectural Guardrails

- **Do NOT introduce microservices prematurely.** HEDS backend is a modular monolith structured around clean Python domain packages.
- **Do NOT introduce Redis, Kafka, or Kubernetes** just because distributed systems tutorials mention them. PostgreSQL handles queues, locking (`FOR UPDATE SKIP LOCKED`), and outbox patterns efficiently.
- **Do NOT change architecture without explicit justification.** Maintain the documented module separation between cloud orchestration, edge agent, and printer adapters.
- **Do NOT expose printer ports directly to the public internet.** Edge agents always initiate outbound HTTPS/WSS communication to the cloud.

---

## 2. Distributed State & Printing Invariants

- **Do NOT bypass the centralized order state machine.** All order state transitions must pass through `OrderStateMachine.transition()` with transition validation and audit logging.
- **Never claim exactly-once physical printing.** Physical printing can fail or disconnect mid-job. When a job's physical completion status is ambiguous, transition it to `RECONCILING`.
- **Do NOT automatically resend an ambiguous physical job.** Uncontrolled retries cause duplicate physical paper wastage and breach student privacy. Operators must inspect the physical tray and reconcile.
- **Enforce idempotency everywhere.** Duplicate payment webhooks or print dispatch calls must never produce duplicate print jobs or orders.
- **Lease integrity:** All dispatched jobs have finite leases (`lease_expires_at`). Reconcile expired leases safely.

---

## 3. Security & Multi-Tenancy

- **Never trust client-side prices or payment success flags.** The backend pricing engine calculates authoritative prices in integer minor units. Payments are verified via cryptographic signatures or authoritative gateway callbacks.
- **Derive tenant context strictly from authenticated identity or cryptographic guest order tokens.** Never trust client-supplied `tenant_id` or `shop_id` headers.
- **Never expose sequential database IDs publicly.** Use cryptographically random UUIDs or secure URL-safe tokens for guest student access (`guest_access_token`).
- **Store Pickup OTPs as secure salted hashes.** Do not store plaintext OTPs in the database.
- **Never commit secrets, `.env` files, or production keys.**

---

## 4. Engineering Quality

- **Never create fake functionality.** Avoid `console.log("coming soon")` or mock states disconnected from backend data. Every UI control must map to verified APIs.
- **Run tests after meaningful changes:**
  ```bash
  make test
  ```
- **Keep documentation synchronized** whenever schema, APIs, or architectural decisions change.
