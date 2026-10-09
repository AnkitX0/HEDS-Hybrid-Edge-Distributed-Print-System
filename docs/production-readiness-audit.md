# HEDS Production Readiness Audit Report

Date: October 2026  
Status: Comprehensive Technical & Infrastructure Security Audit  
System: Hybrid Edge Distributed Print System (HEDS)

---

## Executive Summary

This document evaluates the operational readiness, hardware capability matching, payment resilience, tenant isolation, and security posture of HEDS prior to real-world print-shop deployment.

| Area | Status | Priority | Primary Risk | Action Required |
| :--- | :--- | :--- | :--- | :--- |
| **CUPS Hardware Adapter** | Implemented | High | Job spec mismatches (e.g. Color sent to Mono printer) | Enforce capability-aware matching & Diagnostic Test Print trigger |
| **Edge Agent Identity** | Partial | High | Ephemeral Agent UUIDs on restart | Implement persistent agent credentials (`agent_token` / `agent_id`) |
| **Local SQLite Queue** | Implemented | Medium | Internet outage job desynchronization | Test offline job spooling and reconnection lease reconciliation |
| **Razorpay Boundary** | Implemented | High | Signature tampering & duplicate webhook dispatches | Enforce HMAC-SHA256 verification and idempotent webhook handlers |
| **Document Retention** | Implemented | Medium | Disk space exhaustion & student privacy compliance | Audit background `DocumentCleanupWorker` lifecycle |
| **Tenant Isolation** | Implemented | Critical | Cross-tenant operator data access | Enforce strict shop context validation across all API endpoints |
| **Observability** | Partial | Medium | Missing correlation IDs during multi-system dispatches | Propagate `X-Request-ID` across HTTP requests and structured logs |

---

## Detailed System Audits

### 1. Hardware Integration (CUPS / IPP Adapter)
- **What Exists**: `CUPSPrinterAdapter` in `agent/heds_agent/printers/cups.py` with `lpoptions` PPD parsing and fallback CLI bindings (`lp`, `lpstat`, `lpoptions`, `cancel`).
- **What Is Missing**: Server-side job scheduler capability matching preventing assignment of Color/Duplex print specifications to Monochrome/Simplex-only hardware.
- **Risk**: Waste of expensive paper/ink or physical printer rejection errors.
- **Recommended Fix**: Enforce capability validation in `backend/app/modules/queue/service.py` before assigning lease to target printer. Add explicit diagnostic `[ Test Print ]` endpoint.

### 2. Edge Agent Identity & Durability
- **What Exists**: Local SQLite queue (`local_queue.db`) and `CloudClient` polling logic.
- **What Is Missing**: Deterministic agent token persistence across daemon restarts.
- **Risk**: Frequent process restarts result in dynamic agent ID generation, leading to duplicate agent registrations.
- **Recommended Fix**: Store persistent `agent_id` and secret `agent_token` in local agent config/storage (`/etc/heds/agent.json` or persistent `.env`).

### 3. Payment Gateway Boundary (Razorpay & Webhooks)
- **What Exists**: Abstract `PaymentGateway`, `MockPaymentGateway`, and `RazorpayPaymentGateway` in `backend/app/modules/payments/`.
- **What Is Missing**: Comprehensive HMAC-SHA256 signature verification test suite and duplicate webhook idempotency test.
- **Risk**: Client-side payment status spoofing or double-printing from repeated gateway retries.
- **Recommended Fix**: Verify `razorpay_signature` using HMAC-SHA256 with `RAZORPAY_KEY_SECRET`. Ensure duplicate payment webhooks yield HTTP 200 without creating duplicate print jobs.

### 4. Tenant Isolation & API Security
- **What Exists**: `require_shop_operator` dependency in FastAPI endpoints.
- **What Is Missing**: Verification that an authenticated operator from Shop A cannot access orders/printers of Shop B by tampering with headers or request params.
- **Risk**: Critical multi-tenant data leak.
- **Recommended Fix**: Add unit tests verifying cross-tenant access rejection (`HTTP 403 Forbidden`).

### 5. Document Security & Retention Cleanup
- **What Exists**: `DocumentCleanupWorker` in `backend/app/workers/cleanup.py` with `purge_expired_documents` logic.
- **What Is Missing**: Verification that active in-flight jobs are never purged, while expired completed documents are deleted from disk.
- **Risk**: Disk space exhaustion or accidental deletion of active print jobs.
- **Recommended Fix**: Add test suite covering retention cleanup lifecycle and verification.
