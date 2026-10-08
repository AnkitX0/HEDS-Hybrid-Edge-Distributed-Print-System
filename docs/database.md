# Database Schema & Data Models

## 1. Relational Topology

HEDS utilizes PostgreSQL 16+ with strict multi-tenant scoping and relational integrity.

```text
tenants
  └── shops
        ├── users (via shop_members)
        ├── pricing_rules
        ├── agents
        │     └── printers
        └── orders
              ├── documents
              ├── print_specifications
              ├── payments (└── payment_events)
              ├── print_jobs
              └── pickups
```

---

## 2. Model Definitions

### `tenants`
- `id` (UUID, PK)
- `name` (String)
- `slug` (Unique Index)
- `status` (`ACTIVE`, `SUSPENDED`)

### `shops`
- `id` (UUID, PK)
- `tenant_id` (FK -> tenants.id)
- `name` (String)
- `slug` (Unique Index, QR destination)
- `is_active` (Boolean)
- `is_queue_paused` (Boolean)

### `pricing_rules`
- `id` (UUID, PK)
- `shop_id` (FK -> shops.id)
- `name` (String)
- `paper_size` (String: A4, A3, Letter)
- `bw_per_page_cents` (Integer minor units, e.g. 200 = ₹2.00)
- `color_per_page_cents` (Integer minor units, e.g. 1000 = ₹10.00)
- `duplex_discount_cents` (Integer minor units)
- `minimum_order_cents` (Integer minor units)

### `documents`
- `id` (UUID, PK)
- `shop_id` (FK -> shops.id)
- `original_filename` (String)
- `sanitized_filename` (String)
- `storage_path` (String, private object storage path)
- `mime_type` (String)
- `file_size_bytes` (BigInteger)
- `page_count` (Integer)
- `checksum_sha256` (String)
- `expires_at` (DateTime, 24h retention)

### `orders`
- `id` (UUID, PK)
- `shop_id` (FK -> shops.id)
- `order_number` (String, human-readable e.g. ORD-10294)
- `guest_access_token` (String, 32-byte secure URL-safe token)
- `document_id` (FK -> documents.id)
- `status` (OrderState enum)
- `total_amount_cents` (Integer minor units)
- `currency` (String: INR)
- `pricing_breakdown_json` (JSON)

### `print_jobs`
- `id` (UUID, PK)
- `order_id` (FK -> orders.id, Unique)
- `shop_id` (FK -> shops.id)
- `printer_id` (FK -> printers.id)
- `agent_id` (FK -> agents.id)
- `priority` (Integer, default 10)
- `status` (JobStatus enum: `QUEUED`, `DISPATCHED`, `PRINTING`, `COMPLETED`, `FAILED`, `RECONCILING`)
- `attempt_count` (Integer)
- `lease_id` (String, lease token)
- `lease_expires_at` (DateTime with time zone)

### `pickups` (Counter Collection)
- `id` (UUID, PK)
- `order_id` (FK -> orders.id, Unique)
- `shop_id` (FK -> shops.id)
- `expires_at` (DateTime)
- `confirmed_at` (DateTime, nullable)
- `confirmed_by_user_id` (FK -> users.id, nullable)

### `idempotency_keys`
- `key` (String, PK)
- `scope` (String, PK: e.g. `payment_webhook`, `order_create`)
- `resource_id` (String)
- `status_code` (Integer)
- `response_payload_json` (JSON)

### `audit_logs`
- `id` (UUID, PK)
- `tenant_id` (UUID, nullable)
- `shop_id` (UUID, nullable)
- `actor_type` (`USER`, `AGENT`, `SYSTEM`, `GUEST`)
- `actor_id` (String)
- `action` (String)
- `resource_type` (String)
- `resource_id` (String)
- `metadata_json` (JSON)
