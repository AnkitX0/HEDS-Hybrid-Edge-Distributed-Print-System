# HEDS Baseline Engineering Audit Report

**Date:** October 8, 2026  
**Auditor:** HEDS Principal Systems & Product Engineering  
**Test Run:** 32/32 Automated Pytest Tests Passing  
**Build Status:** Both Next.js 14 applications compile cleanly  
**Docker Stack:** 5/5 containers running and healthy (`heds-backend`, `heds-postgres`, `heds-student-web`, `heds-shop-dashboard`, `heds-edge-agent`)  

---

## 1. Executive Baseline Assessment

| Subsystem / User Journey | Baseline Status | Detailed Findings |
|---|:---:|---|
| **Student QR Landing** (`/s/:shop_slug`) | **PASS** | Correctly resolves shop info, rates, and queue pause state from backend. |
| **Student Upload & Preview** | **PASS** | Validates file types (PDF, PNG, JPG), size (max 50MB), client page count preview. |
| **Print Settings & Pricing Engine** | **PASS** | Backend calculates authoritative price in integer minor units (paise), duplex discounting, page range parsing. |
| **Order Creation** | **PASS** | Generates cryptographically secure 32-byte guest access token and order number. |
| **Mock Payment Flow** | **PASS** | Mock checkout transitions `CREATED -> PAYMENT_PENDING -> PAID -> QUEUED`. |
| **Razorpay Sandbox Integration** | **WARNING** | `RazorpayPaymentGateway` interface and HMAC verification exist in backend, but frontend currently calls mock endpoint directly without opening Razorpay checkout; webhook does not parse nested Razorpay payload or enforce signature verification. |
| **Order Tracking & Token Ticket** | **PASS** | Real-time SSE streaming with polling fallback; displays status timeline and 6-digit OTP when ready. |
| **Cloud Queue Leasing** | **PASS** | PostgreSQL `FOR UPDATE SKIP LOCKED` leases jobs with TTL; background lease reconciler cleans stalled jobs into `RECONCILING`. |
| **Edge Print Daemon** | **PASS** | Outbound HTTPS polling, durable local SQLite queue (`local_queue.db`), heartbeat telemetry. |
| **Printer Hardware Execution** | **PASS** | `MockPrinterAdapter` simulates page-by-page progress; `CUPSPrinterAdapter` handles Linux IPP/CUPS options. |
| **Pickup Station & OTP Verification** | **PASS** | Counter OTP verified against PBKDF2/SHA-256 salted hash; transitions to `COMPLETED`. |
| **OTP Rate Limiting** | **WARNING** | Currently does not enforce rate limiting on consecutive invalid OTP attempts. |
| **Automated Test Suite** | **PASS** | 32/32 tests pass (chaos, e2e, lease expiration, printer failure, edge agent durability, pricing, OTP). |
| **Turnkey Demonstration** (`make demo`) | **PASS** | Provisions realistic campus shop data, runs full pipeline, outputs status. |
| **Physical Hardware Testing** | **NOT TESTED** | Physical multi-brand laser printers have not yet undergone live USB/IPP hardware qualification. |

---

## 2. Identified Crash Points & Failure Modes

1. **Webhook Payload Discrepancy (Backend)**:
   - *Source*: `backend/app/api/v1/payments.py`
   - *Trigger*: Real Razorpay webhook incoming event.
   - *Failed Component*: `handle_payment_webhook` assumes flat `{ "gateway_order_id": ... }`, whereas Razorpay sends `{ "event": "payment.captured", "payload": { "payment": { "entity": { "order_id": "...", "id": "..." } } } }` and signature in `X-Razorpay-Signature`.
   - *Expected*: Safely extract order/payment from nested payload, verify HMAC-SHA256 signature when webhook secret is configured, reject invalid signatures with 400.
   - *Fix*: Implement Razorpay webhook parser + signature validator with backward compatibility for mock events.

2. **Client-Side Payment Verification (Frontend & Backend)**:
   - *Source*: `apps/student-web/src/app/s/[shop_slug]/page.tsx`
   - *Trigger*: Completing payment in Razorpay Sandbox modal.
   - *Failed Component*: No backend endpoint to verify client-returned `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature`.
   - *Expected*: Endpoint `POST /api/v1/orders/{guest_token}/payment/verify` validating signature cryptographically before transitioning order to `PAID` and queuing.
   - *Fix*: Add `/payment/verify` endpoint, integrate Razorpay checkout script on student frontend with automatic fallback to mock payment if Razorpay keys are not configured.

3. **Brute-Force OTP Guessing (Security)**:
   - *Source*: `backend/app/api/v1/pickups.py`
   - *Trigger*: Repeated incorrect OTP submissions at pickup counter.
   - *Failed Component*: `verify_and_complete_pickup` does not track failed attempts per order.
   - *Expected*: Maximum 5 failed attempts before locking verification for 5 minutes or requiring supervisor override.
   - *Fix*: Add in-memory or database failed attempt counter to protect OTP integrity.

4. **UI Design Tokens & Operational Hierarchy (Frontend)**:
   - *Source*: `apps/shop-dashboard` and `apps/student-web`
   - *Issue*: Needs explicit design token variables (`--heds-primary`, `--heds-bg`, `--heds-surface`, `--heds-border`), 6px–8px radius controls (avoiding pills), and strict POS-style information hierarchy.
   - *Fix*: Refactor `globals.css` in both apps with design tokens, polish Queue, Overview, Pickup, and Student pages to meet Sections 4–24.

---

## 3. Plan of Action

- **Phase 1**: Enhance Backend Payment Subsystem (Razorpay order creation, frontend verification endpoint, nested webhook handler with signature validation, payment tests).
- **Phase 2**: Add Counter Pickup OTP Rate Limiting.
- **Phase 3**: Add Razorpay Sandbox Client integration on `student-web` with seamless mock fallback.
- **Phase 4**: Refine Design Tokens and UI Polish across Student Web and Shop Dashboard according to Sections 4–24.
- **Phase 5**: Run complete test suite, verify Docker, run demo, update documentation.
