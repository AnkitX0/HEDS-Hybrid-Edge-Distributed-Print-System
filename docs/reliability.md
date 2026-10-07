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

---

## 4. Phase 3 Additions — Edge Agent Hardening

### Capability-Aware Scheduling

The scheduler filters and rejects incompatible printer assignments before any lease is issued:
- Color jobs are blocked from monochrome-only printers.
- A3 jobs are blocked from A4-only printers.
- B&W jobs prefer monochrome printers to preserve color printer capacity.

See `tests/reliability/test_edge_agent_hardening.py` for verified test coverage.

### SQLite Crash Recovery

The local durable queue persists `native_job_id` (CUPS job ID) alongside HEDS job state.
On agent restart, unsynced jobs are detected and reconciled with the cloud before new jobs are claimed.

### Physical Print Ambiguity Handling

When a job has been submitted to CUPS but network connectivity is lost before the agent
can confirm completion:

1. The lease expires (after `LEASE_DURATION_SECONDS`).
2. The lease expiration worker transitions the job to `RECONCILING`.
3. The operator physically checks the printer output tray.
4. The operator confirms `COMPLETED` or `FAILED` in the shop dashboard.

**The system never automatically resubmits a physically ambiguous job.**

### Test Coverage (Phase 3)

| Test                                        | What it proves                                   |
|---------------------------------------------|--------------------------------------------------|
| `test_agent_sqlite_queue_durability_*`      | SQLite survives process restart, preserves `native_job_id` |
| `test_deterministic_capability_aware_*`     | Color → color printer; B&W → mono affinity       |
| `test_capability_mismatch_prevents_*`       | A3 job not leased to A4-only printer             |
| `test_operator_diagnostic_test_print_page`  | Test print queued via real pipeline              |
| `test_cups_print_spec_option_translation`   | CUPS options correct for all color/duplex/orient |
| `test_cups_capability_extraction_*`         | lpoptions parsed correctly                       |
| `test_cups_status_parsing`                  | idle/printing/disabled → correct AdapterStatus  |
| `test_cups_job_submission_*`                | Temp file created, CUPS job ID captured, cleaned |
| `test_cups_cancellation_and_job_status`     | cancel command invoked; job removed from tracking|

