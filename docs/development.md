# Development Guide

## 1. Prerequisites

- Python 3.10+ (tested with Python 3.12 and Python 3.14)
- Node.js 18+ (tested with Node 20 / 24)
- Docker & Docker Compose
- Git

---

## 2. Quick Local Start

### Step 1: Clone & Setup Environment
```bash
cp .env.example .env
make setup
```

### Step 2: Start PostgreSQL & MinIO
```bash
make up
```

### Step 3: Run Database Migrations & Seed Data
```bash
make migrate
make seed
```

### Step 4: Run Services
In separate terminal windows:

1. **Backend API**:
   ```bash
   make dev-backend
   ```
   Access Swagger API docs at `http://localhost:8000/docs`.

2. **HEDS Edge Agent**:
   ```bash
   make dev-agent
   ```

3. **Student Web App**:
   ```bash
   make dev-student
   ```
   Open `http://localhost:3000/s/campus-xerox`.

4. **Shop Dashboard**:
   ```bash
   make dev-shop
   ```
   Open `http://localhost:3001`. Login with `operator@campus-xerox.local` / `operator123`.

---

## 3. Running Test Suites

Run all automated unit, integration, reliability, chaos, and e2e tests:
```bash
make test
```

Run dedicated reliability tests:
```bash
make test-rel
```
