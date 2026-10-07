#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "=================================================="
echo "  HEDS — PREPARING EXAMINER DEMO ENVIRONMENT"
echo "=================================================="

# 1. Run migrations
echo "[1/2] Verifying database migrations..."
PYTHONPATH=backend .venv/bin/python -m alembic -c backend/alembic.ini upgrade head > /dev/null 2>&1 || true

# 2. Reseed realistic demonstration data
echo "[2/2] Resetting & seeding realistic campus shop data..."
PYTHONPATH=backend .venv/bin/python scripts/demo_seed.py

# 3. Print demo URLs & credentials
echo "=================================================="
echo "  HEDS DEMO ENVIRONMENT READY"
echo "=================================================="
echo ""
echo "Student Storefront:"
echo "  http://localhost:3000/s/campus-xerox"
echo ""
echo "Shop Operator Dashboard:"
echo "  http://localhost:3001/dashboard"
echo ""
echo "Operator Login:"
echo "  URL:      http://localhost:3001/login"
echo "  Email:    operator@campus-xerox.local"
echo "  Password: operator123"
echo ""
echo "Admin Login:"
echo "  Email:    admin@campus-xerox.local"
echo "  Password: admin123"
echo ""
echo "Backend Documentation:"
echo "  http://localhost:8000/docs"
echo ""
echo "Examiner Live Demo Workflow:"
echo "  Option A (Operator Dashboard):"
echo "    Click '⚡ Run Demo Print [Dev]' button to watch live queue leasing & spooling."
echo "  Option B (Student Upload):"
echo "    Open http://localhost:3000/s/campus-xerox"
echo "    Click '📄 Use Demo PDF (3 pages)' -> Pay -> Watch live queue & pickup OTP."
echo "    Verify OTP on Shop Dashboard to complete privacy hold."
echo "=================================================="
