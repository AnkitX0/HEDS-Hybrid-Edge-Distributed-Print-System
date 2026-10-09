# HEDS Public Cloud Deployment & Mentor Demonstration Guide

This guide provides end-to-end instructions for deploying the **Hybrid Edge Distributed Print System (HEDS)** for free public evaluation and mentor testing without requiring a physical printer or a local machine to remain online.

---

## 1. Architecture & Hosting Topology

| Component | Target Host | Root Directory | Build Command | Start / Run Command |
| :--- | :--- | :--- | :--- | :--- |
| **Relational Database** | Neon PostgreSQL (Free Tier) | N/A | Serverless provision | Persistent Managed Postgres |
| **Object Storage** | Cloudflare R2 (or AWS S3) | N/A | S3-Compatible API | Private encrypted bucket |
| **FastAPI Backend** | Render Free Web Service | `backend` | `pip install -r requirements.txt` | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Student QR App** | Vercel | `apps/student-qr` | `npm run build` | Next.js Serverless Function |
| **Student Web App** | Vercel | `apps/student-web` | `npm run build` | Next.js Serverless Function |
| **Shop Dashboard** | Vercel | `apps/shop-dashboard` | `npm run build` | Next.js Serverless Function |

---

## 2. Step 1: Provision Managed Database (Neon PostgreSQL)

1. Sign up / Log in to [Neon Console](https://console.neon.tech/).
2. Create a new project:
   - **Project Name:** `heds-production` (or `heds-demo`)
   - **Postgres Version:** 16
   - **Database Name:** `heds_db` (or default `neondb`)
3. Copy the pooled connection string:
   ```text
   postgresql://[user]:[password]@[endpoint].neon.tech/neondb?sslmode=require
   ```
4. **Note:** The HEDS backend automatically normalizes this connection string to `postgresql+asyncpg://` for async sessions and derives `SYNC_DATABASE_URL` for Alembic migrations.

---

## 3. Step 2: Configure Private Object Storage (Cloudflare R2 / AWS S3)

HEDS stores uploaded student PDFs and spool documents in private object storage. Files are **never publicly accessible** via public bucket URLs; all downloads are authenticated and streamed through the backend API.

### If using Cloudflare R2 (Recommended Free Tier):
1. In Cloudflare Dashboard, navigate to **R2 Object Storage**.
2. Create a bucket: `heds-documents`
3. Under **Account Details**, copy your Account ID.
   - Your S3 Endpoint is: `<ACCOUNT_ID>.r2.cloudflarestorage.com` (do not include `https://`).
4. Generate R2 API Tokens:
   - Navigate to **Manage R2 API Tokens** -> **Create API Token**.
   - Permissions: **Object Read & Write** (or Admin Read & Write).
   - Copy the **Access Key ID** and **Secret Access Key**.

### If using AWS S3:
1. Create a private bucket: `heds-documents` (Block Public Access: ON).
2. Create an IAM User with `AmazonS3FullAccess` or restricted bucket policy.
3. Save the Access Key ID and Secret Access Key.

*(Note: If you omit S3 credentials during initial testing, HEDS automatically defaults to local ephemeral container storage, but files will not persist across container reboots).*

---

## 4. Step 3: Deploy FastAPI Backend (Render Web Service)

1. In [Render Dashboard](https://dashboard.render.com/), click **New +** -> **Web Service**.
2. Connect your Git repository (`AnkitX0/HEDS-Hybrid-Edge-Distributed-Print-System`).
3. Configure the service settings:
   - **Name:** `heds-backend`
   - **Region:** Choose region closest to you (e.g., Oregon or Frankfurt)
   - **Branch:** `main` (or your deployment branch)
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** `Free`

4. Add **Environment Variables** in the Render Dashboard:

| Variable Name | Example / Recommended Value | Description |
| :--- | :--- | :--- |
| `APP_ENV` | `demo` (or `production`) | Application environment |
| `ENVIRONMENT` | `demo` | Environment label |
| `DEBUG` | `false` | Disable debug stack traces in production |
| `SECRET_KEY` | *(generate 32+ char hex: `openssl rand -hex 32`)* | JWT signing and token hashing key |
| `DATABASE_URL` | `postgresql://...neon.tech/neondb?sslmode=require` | Neon connection string |
| `STORAGE_BACKEND` | `s3` (or `local`) | `s3` for Cloudflare R2/AWS, or `local` |
| `S3_ENDPOINT` | `<account_id>.r2.cloudflarestorage.com` | R2/S3 endpoint (no https://) |
| `S3_ACCESS_KEY_ID` | *(your access key ID)* | R2/S3 Access Key |
| `S3_SECRET_ACCESS_KEY` | *(your secret key)* | R2/S3 Secret Key |
| `S3_BUCKET_NAME` | `heds-documents` | Bucket name |
| `S3_REGION` | `auto` | `auto` for R2, or AWS region e.g. `us-east-1` |
| `S3_SECURE` | `true` | Enforces HTTPS |
| `PAYMENT_GATEWAY` | `mock` | `mock` for mentor demonstration |
| `ALLOW_MOCK_PAYMENTS` | `true` | Allows safe mock checkout in demo mode |
| `ENABLE_MOCK_PRINT_WORKER` | `true` | **Crucial for mentor demo:** Automatically executes mock print spooling |
| `MOCK_WORKER_INTERVAL_SECONDS`| `3.0` | Polling tick for cloud mock spooling |
| `CORS_ORIGINS` | *(see Step 5 below)* | Comma-separated list of deployed Vercel frontend URLs |

5. Click **Create Web Service**. Wait for the build and deployment to complete.
6. Once deployed, note your service URL (e.g. `https://heds-backend.onrender.com`).
7. Test the health endpoint:
   ```bash
   curl https://heds-backend.onrender.com/health
   # Returns: {"status":"healthy","service":"heds-backend","timestamp":...,"environment":"demo"}
   ```

---

## 5. Step 4: Run Migrations & Seed Demo Data on Neon

Do not seed production data automatically on server start. Run migrations and demo seeding explicitly:

### Option A: From your local development machine against Neon:
Ensure your local `.env` points to your Neon `DATABASE_URL`, then execute:
```bash
# 1. Run Alembic schema migrations
PYTHONPATH=backend python -m alembic -c backend/alembic.ini upgrade head

# 2. Seed realistic campus demo data
PYTHONPATH=backend python scripts/seed.py
```

### Option B: Using Render Shell (Web Service Console):
In Render Dashboard -> **heds-backend** -> **Shell**:
```bash
alembic upgrade head
python ../scripts/seed.py --confirm-reset-production
```

After seeding, the database will be pre-populated with:
- **Demo Shop:** Campus Xerox & Print Hub (`slug: campus-xerox`)
- **Operator Account:** `operator@campus-xerox.local` / `operator123`
- **Admin Account:** `admin@campus-xerox.local` / `admin123`
- **Printers:** HP LaserJet B/W, Canon imageRUNNER Color, Epson EcoTank
- **Active Pricing Rule:** ₹1.00 B/W, ₹10.00 Color per page

---

## 6. Step 5: Deploy Frontends on Vercel

Deploy each of the three Next.js frontend applications to Vercel as independent projects.

### Frontend 1: Student QR App (`apps/student-qr`)
1. In [Vercel Dashboard](https://vercel.com/dashboard), click **Add New...** -> **Project**.
2. Select your repository.
3. In project settings:
   - **Project Name:** `heds-student-qr`
   - **Framework Preset:** `Next.js`
   - **Root Directory:** Click Edit -> select `apps/student-qr`
4. Add Environment Variables:
   - `BACKEND_URL`: `https://heds-backend.onrender.com`
   - `NEXT_PUBLIC_STOREFRONT_URL`: `https://heds-student-qr.vercel.app`
5. Click **Deploy**.

### Frontend 2: Student Web App (`apps/student-web`)
1. Click **Add New...** -> **Project**.
2. Select your repository.
3. In project settings:
   - **Project Name:** `heds-student-web`
   - **Framework Preset:** `Next.js`
   - **Root Directory:** Click Edit -> select `apps/student-web`
4. Add Environment Variables:
   - `BACKEND_URL`: `https://heds-backend.onrender.com`
5. Click **Deploy**.

### Frontend 3: Shop Dashboard (`apps/shop-dashboard`)
1. Click **Add New...** -> **Project**.
2. Select your repository.
3. In project settings:
   - **Project Name:** `heds-shop-dashboard`
   - **Framework Preset:** `Next.js`
   - **Root Directory:** Click Edit -> select `apps/shop-dashboard`
4. Add Environment Variables:
   - `BACKEND_URL`: `https://heds-backend.onrender.com`
   - `NEXT_PUBLIC_STOREFRONT_URL`: `https://heds-student-qr.vercel.app`
5. Click **Deploy**.

---

## 7. Step 6: Update Backend CORS Origins

Now that you have your three Vercel URLs, update the `CORS_ORIGINS` variable on Render:

1. In Render Dashboard -> **heds-backend** -> **Environment**.
2. Update `CORS_ORIGINS` with the explicit list of origins (comma-separated):
   ```text
   https://heds-student-qr.vercel.app,https://heds-student-web.vercel.app,https://heds-shop-dashboard.vercel.app
   ```
3. Save changes. Render will automatically redeploy the backend with the new origins.

---

## 8. Mentor Demonstration Workflow

Share the following URLs and test flow with your mentor:

### 1. Student Self-Service Flow:
- **URL:** `https://heds-student-qr.vercel.app/s/campus-xerox` (or `https://heds-student-web.vercel.app/s/campus-xerox`)
- **Action:**
  1. Upload 1 or more PDF files.
  2. Customize print settings (Copies, Color vs. B/W, Double-sided).
  3. Notice real-time authoritative backend pricing calculation.
  4. Click **Proceed to Payment** -> Checkout with **Mock Payment**.
  5. The order enters `QUEUED` state.

### 2. Automated Cloud Mock Spooling:
- **Action:**
  1. Because `ENABLE_MOCK_PRINT_WORKER=true` is enabled on Render, the backend leases the job within 3 seconds.
  2. On the student tracking screen, status visibly updates in real time:
     `WAITING TO PRINT (QUEUED)` -> `PRINTING (Progress Bar)` -> `READY FOR PICKUP (Pickup Token)`.
  3. Student receives their unique pickup order token (e.g. `ORD-10025`).
  4. Student can click **View Receipt** or **Download PDF Receipt** (dynamically generated by ReportLab).

### 3. Shop Operator Counter Collection:
- **URL:** `https://heds-shop-dashboard.vercel.app/login`
- **Credentials:**
  - Email: `operator@campus-xerox.local`
  - Password: `operator123`
- **Action:**
  1. In the **Queue** tab, see the live order moving through states.
  2. In the **Ready for Pickup** counter view, input the student's order token to complete collection.
  3. In the **Printers** tab, view printer statuses and capabilities.
  4. In the **Analytics** tab, view revenue, peak hours, and page statistics.
  5. In the **Audit Logs** tab, inspect tamper-proof transition records.

---

## 9. Troubleshooting & Common Pitfalls

| Issue | Cause | Resolution |
| :--- | :--- | :--- |
| **Render spin-down delay (50s cold start)** | Render free tier puts inactive services to sleep after 15 mins. | The first request will take ~40-50s to wake up. Inform the mentor that cold starts are normal on free tier. |
| **CORS Error on frontend** | Origin not listed in `CORS_ORIGINS`. | Check exact Vercel URL (including `https://` and without trailing slash) in Render `CORS_ORIGINS`. |
| **Database Connection Failure** | Neon connection string syntax or SSL. | Ensure `?sslmode=require` is present in `DATABASE_URL`. HEDS will handle asyncpg translation automatically. |
| **Jobs stay in QUEUED forever** | Cloud mock worker is disabled and no edge agent is online. | Set `ENABLE_MOCK_PRINT_WORKER=true` in Render environment variables. |
| **Uploads fail with 403 on S3/R2** | R2 API token permissions. | Verify your R2 token has Object Read & Write permissions, and bucket name matches `S3_BUCKET_NAME`. |
| **Frontend displays "Cannot connect to HEDS backend"** | `BACKEND_URL` not set in Vercel. | In Vercel Project Settings -> Environment Variables, ensure `BACKEND_URL` is set to your Render HTTPS URL. |
