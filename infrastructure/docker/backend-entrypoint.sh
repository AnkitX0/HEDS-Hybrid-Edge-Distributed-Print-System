#!/usr/bin/env bash
set -e

echo "[HEDS Backend] Waiting for PostgreSQL database..."
python3 -c "
import time, os, sys
from sqlalchemy import create_engine

sync_url = os.environ.get('SYNC_DATABASE_URL', 'postgresql://heds_user:heds_secure_password@postgres:5432/heds_db')
for i in range(30):
    try:
        engine = create_engine(sync_url)
        with engine.connect() as conn:
            print('[HEDS Backend] PostgreSQL is connected and ready.')
            sys.exit(0)
    except Exception:
        print(f'[HEDS Backend] Waiting for database (attempt {i+1}/30)...')
        time.sleep(1)
sys.exit(1)
"

echo "[HEDS Backend] Applying database migrations..."
PYTHONPATH=/app/backend python3 -m alembic -c /app/backend/alembic.ini upgrade head

echo "[HEDS Backend] Initializing campus shop & demonstration seed data..."
PYTHONPATH=/app/backend python3 /app/scripts/demo_seed.py || echo "[HEDS Backend] Seed notice: database already initialized."

echo "[HEDS Backend] Starting FastAPI application on port 8000..."
cd /app/backend
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
