# Order State Machine & Lifecycle

## 1. Centralized State Transition Engine

In HEDS, order state mutations are strictly governed by `OrderStateMachine.transition()`. Direct database updates bypassing this function are prohibited.

---

## 2. State Transition Graph

```text
                  CREATED
                     |
         +-----------+-----------+
         |                       |
         v                       v
  PAYMENT_PENDING        VALIDATION_FAILED / CANCELLED
         |
         v
       PAID
         |
         v
      QUEUED <======================+
         |                          | Operator Retry
         v                          |
    DISPATCHED                      |
         |                          |
         v                          |
     PRINTING                       |
         |                          |
    +----+----+                     |
    |         |                     |
    v         v                     |
PRINT_FAILED  RECONCILING           |
    |             |                 |
    +------+------+                 |
           |                        |
           +------------------------+
           |
           v (Hardware Spool Finish)
    PRINT_COMPLETED
           |
           v (Generate Salted OTP)
     PICKUP_READY
           |
           v (Operator Verifies OTP)
       COMPLETED (Terminal)
```

---

## 3. Physical Printing Invariants

1. **No Blind Retries**:
   If an edge agent disconnects while a job is in `PRINTING`, the cloud cannot know whether physical paper was output or interrupted. The job transitions to `RECONCILING`. The operator must physically inspect the tray and choose to either mark it printed or trigger a controlled reprint.
2. **Idempotent Webhook Settlements**:
   Multiple identical payment callbacks from gateways are de-duplicated via `idempotency_keys` table and status checks, ensuring that duplicate payments never generate multiple print jobs.
3. **Lease Guardrails**:
   Dispatched jobs carry a 60-second lease (`lease_expires_at`). A background worker reclaims orphaned leases without human intervention.
