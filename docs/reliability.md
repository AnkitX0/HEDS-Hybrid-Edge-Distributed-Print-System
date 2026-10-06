# Reliability, Fault Tolerance & Edge Resilience

## 1. Physical Printing Reliability Principles

In distributed systems, there is a fundamental difference between:
- **Exactly-once software execution**, and
- **Exactly-once physical hardware execution**.

A printer may run out of paper on page 9 of 10, jam in the output roller, or suffer power failure after accepting bytes. Therefore, HEDS treats physical printing as an ambiguous hardware operation with clear software boundaries:

1. **Idempotency Keys**: All API transactions, payment webhook callbacks, and lease requests carry scoped idempotency keys.
2. **Atomic Row-Level Locking**: Job polling utilizes PostgreSQL `FOR UPDATE SKIP LOCKED`.
3. **Lease Expiration Worker**: Expired leases transition to `RECONCILING`.
4. **Controlled Operator Retry**: When hardware reports `FAILED`, automatic loops are prevented. Operators verify and retry manually.

---

## 2. Edge Agent Offline Resilience

If the print shop experiences local network loss:
1. **Durable Local SQLite Queue**: Leased jobs are immediately saved to disk (`local_queue.db`) prior to spooling.
2. **Offline Hardware Execution**: The agent continues spooling locally cached documents even if the cloud API is unreachable.
3. **Post-Reconnect Reconciliation**: Upon connection restoration, the agent executes `POST /api/v1/agents/reconcile` to report all completed or failed jobs, restoring synchronization with the cloud.

---

## 3. Automated Reliability Proofs

The test suite includes dedicated automated reliability tests:
- `tests/reliability/test_duplicate_webhook.py`: Fires 5 duplicate payment webhooks; proves exactly 1 print job created.
- `tests/reliability/test_lease_expiration.py`: Simulates agent crash; proves lease expiration recovery.
- `tests/reliability/test_printer_failure.py`: Simulates hardware failure; proves transition to `PRINT_FAILED` and operator retry.
