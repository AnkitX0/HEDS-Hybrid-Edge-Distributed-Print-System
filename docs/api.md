# HEDS REST API Reference

The HEDS Backend provides versioned REST APIs at `/api/v1`. Full interactive OpenAPI Swagger documentation is available at `http://localhost:8000/docs`.

---

## 1. Public & Student Endpoints

### `GET /api/v1/shops/{shop_slug}`
Public shop metadata accessed when scanning a QR code. Returns name, active pricing, queue depth, and estimated waiting time.

### `POST /api/v1/shops/{shop_slug}/orders`
Multipart form upload for students:
- `file`: PDF, PNG, or JPG
- `copies`: integer (1-100)
- `color_mode`: `BW` or `COLOR`
- `duplex`: boolean
- `paper_size`: `A4`, `A3`, `LETTER`
- `page_range`: e.g. `all`, `1-5`

Returns:
- `id`: Order UUID
- `order_number`: e.g. `ORD-84192`
- `guest_access_token`: Cryptographic student bearer token
- `pricing_breakdown`: Authoritative line item calculation

### `GET /api/v1/orders/{guest_token}`
Polls live order status, queue position, ETA, and pickup OTP (when `PICKUP_READY`).

### `POST /api/v1/orders/{guest_token}/payment`
Submits payment intent / mock gateway confirmation.

---

## 2. Edge Agent Endpoints

All agent endpoints require headers:
- `X-Agent-ID`: Registered agent UUID
- `X-Agent-Key`: Secret agent token

### `POST /api/v1/agents/heartbeat`
Telemetry payload reporting uptime, attached printer statuses, and local queue length.

### `POST /api/v1/agents/jobs/poll`
Atomically claims and leases the next eligible print job using `SELECT ... FOR UPDATE SKIP LOCKED`.

### `POST /api/v1/agents/jobs/{job_id}/ack`
Acknowledges local SQLite durable persistence.

### `GET /api/v1/agents/jobs/{job_id}/document`
Streams binary document for printer spooling.

### `POST /api/v1/agents/jobs/{job_id}/status`
Reports print execution state: `PRINTING`, `COMPLETED`, or `FAILED`.

### `POST /api/v1/agents/reconcile`
Batch synchronizes locally finalized jobs after network reconnect.

---

## 3. Shop Operator & Admin Endpoints

Requires `Authorization: Bearer <jwt_token>`.

### `POST /api/v1/auth/login`
Authenticates operator or admin email and password.

### `GET /api/v1/shop/dashboard`
Returns live operational counters (waiting, spooling, completed, revenue, online printers).

### `GET /api/v1/shop/queue`
Returns real-time queue items with order details and actions.

### `POST /api/v1/jobs/{job_id}/retry`
Re-enqueues a failed job for print execution.

### `POST /api/v1/jobs/{job_id}/reconcile`
Resolves ambiguous job state (`MARK_COMPLETED` or `RETRY_PRINT`).

### `POST /api/v1/pickups/confirm`
Verifies student 6-digit OTP code against salted hash and marks order `COMPLETED`.

### `POST /api/v1/payments/webhook`
Idempotent webhook handler with `Idempotency-Key` header verification.
