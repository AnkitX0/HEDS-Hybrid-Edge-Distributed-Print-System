# HEDS — Public QR Mobile Student Client

**Status**: Active Production Feature  
**Client Path**: `apps/student-qr`  
**Default Port**: `3002`  
**Target Route**: `/s/{shop_slug}` (e.g., `/s/campus-xerox`)

---

## 1. Architectural Overview

The HEDS Public QR Client is a dedicated, mobile-first web storefront built for students scanning a physical QR flyer outside a Xerox shop.

It functions as an additive, completely isolated client running alongside the existing operator laptop dashboard:

```text
                    HEDS BACKEND
             (FastAPI + PostgreSQL on :8000)
                         │
             ┌───────────┴────────────┐
             │                        │
     SHOPKEEPER CLIENT         STUDENT QR CLIENT
    (apps/shop-dashboard)      (apps/student-qr)
      [Laptop / :3001]          [Phone / :3002]
             │                        │
      Dashboard View            Mobile Storefront
             │                        │
             └───────────┬────────────┘
                         │
                    SAME ORDERS
                    SAME QUEUE
                    SAME DB
                    SAME PAYMENT
                         │
                    EDGE AGENT
                         │
                  Mock / CUPS Printer
```

### Core Invariants Maintained
1. **Isolated Codebase**: `apps/student-qr` has its own dependencies, layouts, and pages. It does NOT import from or alter `apps/shop-dashboard`.
2. **Identical Backend Contract**: Consumes the same authoritative HEDS REST API endpoints.
3. **No Account / No OTP**: The workflow is radically streamlined: **SCAN → UPLOAD → CONFIGURE → PAY → GET TOKEN → DONE**.
4. **Authoritative Backend Pricing**: Page count is extracted by the backend; pricing is calculated in integer paise.

---

## 2. Customer Journey & Screen Flow

1. **Screen 1: Shop Storefront** (`/s/{shop_slug}`)
   - Displays shop name, status (`OPEN`), B&W rate (₹1/page), Color rate, and live queue wait time.
   - Action: `[ START PRINTING ]`.
2. **Screen 2: Document Upload**
   - Drag & drop or file picker (PDF up to 50 MB).
   - Server extracts authoritative page count (e.g., 60 pages).
   - Displays filename, size, and verified page count badge.
3. **Screen 3: Print Settings & Authoritative Quote**
   - Segmented touch controls (44px min height):
     - **Color**: Black & White vs. Color
     - **Sides**: Single-sided vs. Double-sided
     - **Copies**: `[-] 1 [+]`
     - **Paper**: A4
     - **Page Range**: All pages vs. Custom range
   - Real-time authoritative price quote from `POST /api/v1/shops/{slug}/pricing/quote`.
4. **Screen 4: Sandbox / Razorpay Payment**
   - Action: `[ Pay ₹X.00 ]` (disables and shows `Processing...` on click to prevent duplicate charges).
   - Server initiates payment intent; upon settlement, moves order state `CREATED → PAYMENT_PENDING → PAID → QUEUED`.
5. **Screen 5: Live Print Token & Status Tracker** (`/orders/{guest_token}`)
   - Prominent Print Token (e.g., `#51` or `ORD-XXXXX`).
   - Instructions: *"Show this token number at the shop counter."*
   - Status transitions: `WAITING IN QUEUE` → `PRINTING IN PROGRESS` → `READY FOR PICKUP` → `COMPLETED`.
   - Polling every 2 seconds until terminal state.
6. **Screen 6: Official Receipt**
   - Modal with clean, printable itemized receipt details (Shop, Token, Order ref, Pages, Copies, Mode, Total, Payment status).

---

## 3. Local Development & Ports

| Service | Path | Port | Purpose |
| :--- | :--- | :--- | :--- |
| **Backend API** | `backend/` | `8000` | FastAPI orchestrator, DB state machine, queue |
| **Shop Dashboard** | `apps/shop-dashboard/` | `3001` | Laptop operator dashboard |
| **Student Web** | `apps/student-web/` | `3000` | Existing desktop/web student client |
| **Student QR Client** | `apps/student-qr/` | `3002` | New mobile QR storefront client |

### Starting Student QR Client
```bash
# Run standalone dev server on port 3002
npm --prefix apps/student-qr run dev

# Or build and run production server
npm --prefix apps/student-qr run build
npm --prefix apps/student-qr run start
```

---

## 4. Environment Variables

Create `.env.local` inside `apps/student-qr/`:

```env
# URL of the HEDS backend API (defaults to http://localhost:8000)
BACKEND_URL=http://localhost:8000

# Public Storefront URL used for QR poster rendering
NEXT_PUBLIC_STOREFRONT_URL=http://localhost:3002
```

In production or staging, configure:
```env
NEXT_PUBLIC_STOREFRONT_URL=https://print.campus-xerox.com
```

---

## 5. Exposing Public QR via Tunnel (Phone Testing)

Because a physical mobile phone cannot access `http://localhost`, use Cloudflare Tunnel or ngrok to expose port `3002`:

### Using Cloudflare Tunnel:
```bash
# Expose port 3002
cloudflared tunnel --url http://localhost:3002
```
Output will provide a public HTTPS URL, for example:
```text
https://random-subdomain.trycloudflare.com
```

Set the public URL in your environment:
```bash
NEXT_PUBLIC_STOREFRONT_URL=https://random-subdomain.trycloudflare.com
```

Now, scanning the physical QR code from any smartphone (Android / iOS) will immediately load the HEDS mobile print portal.

---

## 6. End-to-End Verification Matrix

| Step | Action | Expected Result | Status |
| :--- | :--- | :--- | :--- |
| **1** | Phone loads `/s/campus-xerox` | Shop details, rates (₹1/page), and upload zone appear | **PASS** |
| **2** | Upload 11-page PDF | Server responds with `page_count: 11` | **PASS** |
| **3** | Change settings to 2 copies | Authoritative quote updates to `₹22.00` | **PASS** |
| **4** | Click Pay button | Order created; payment settles; moves to `QUEUED` | **PASS** |
| **5** | Double-click test | Button disables during request; zero duplicate orders | **PASS** |
| **6** | Laptop dashboard check | Operator queue on `:3001` shows the newly created order | **PASS** |
| **7** | Agent spooling | Mock printer simulates pages; moves to `PICKUP_READY` | **PASS** |
| **8** | Student phone status | Tracker updates live to `READY FOR PICKUP` with token `#392` | **PASS** |
| **9** | Counter pickup | Operator confirms token; order transitions to `COMPLETED` | **PASS** |

---

## 7. Security & Privacy Guarantees

1. **No Client Secrets**: Razorpay secret keys, database credentials, and agent keys remain strictly server-side.
2. **Ephemeral Document Storage**: Document binaries in storage are automatically purged by `DocumentCleanupWorker` after the retention window (`DOCUMENT_RETENTION_HOURS`).
3. **Guest Token Entropy**: Orders use cryptographically secure 256-bit URL-safe tokens (`generate_guest_order_token()`).
4. **Idempotent Checkout**: Duplicate payment calls are rejected idempotently without creating redundant queue entries.
