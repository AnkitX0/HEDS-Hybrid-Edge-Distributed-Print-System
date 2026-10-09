.PHONY: help setup dev dev-backend dev-student dev-shop dev-agent test migrate seed demo lint clean

PYTHON = .venv/bin/python
PIP = .venv/bin/pip

help:
	@echo "HEDS — Hybrid Edge Distributed Print System"
	@echo "Available commands:"
	@echo "  make docker-up    - Build and launch the entire stack (Postgres + Backend + Frontends + Agent)"
	@echo "  make docker-down  - Stop all running containers"
	@echo "  make setup        - Initialize virtualenv, install dependencies"
	@echo "  make up           - Start PostgreSQL via Docker for local development"
	@echo "  make down         - Stop Docker containers"
	@echo "  make migrate      - Run database migrations"
	@echo "  make seed         - Seed test data (shops, users, printers, orders)"
	@echo "  make demo         - Run interactive examiner demo reset"
	@echo "  make dev-backend  - Run FastAPI backend locally"
	@echo "  make dev-agent    - Run HEDS Edge Print Agent locally"
	@echo "  make dev-student  - Run Student Web app"
	@echo "  make dev-shop     - Run Shop Dashboard app"
	@echo "  make test         - Run all test suites"

setup:
	python3 -m venv .venv
	$(PIP) install --upgrade pip
	$(PIP) install -r backend/requirements.txt
	$(PIP) install -e agent/
	cd apps/student-web && npm install
	cd apps/shop-dashboard && npm install

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down

up:
	docker compose up -d postgres

down:
	docker compose down

migrate:
	PYTHONPATH=backend $(PYTHON) -m alembic -c backend/alembic.ini upgrade head

seed:
	PYTHONPATH=backend $(PYTHON) scripts/seed.py

demo:
	bash scripts/demo.sh

demo-reset:
	bash scripts/demo.sh

dev-backend:
	PYTHONPATH=backend $(PYTHON) -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-agent:
	$(PYTHON) -m heds_agent

dev-student:
	cd apps/student-web && npm run dev -- -p 3000

dev-shop:
	cd apps/shop-dashboard && npm run dev -- -p 3001

dev-qr:
	cd apps/student-qr && npm run dev -- -p 3002

test:
	PYTHONPATH=backend:agent $(PYTHON) -m pytest tests/ -v

test-rel:
	PYTHONPATH=backend:agent $(PYTHON) -m pytest tests/reliability/ -v

clean:
	rm -rf .pytest_cache .coverage htmlcov local_queue.db storage_data
