# Makefile — Common developer tasks

.PHONY: up down build logs migrate seed scrape test lint shell-backend shell-frontend

## Start all services
up:
	docker compose up -d

## Start with rebuild
build:
	docker compose up -d --build

## Stop all services
down:
	docker compose down

## Follow logs
logs:
	docker compose logs -f

## Run database migrations
migrate:
	docker compose exec backend alembic upgrade head

## Rollback last migration
rollback:
	docker compose exec backend alembic downgrade -1

## Seed default categories and coupons (run once after migrate)
seed-defaults:
	docker compose exec backend python scraper/seed_defaults.py

## Seed initial data (coupons, admin user)
seed-data:
	docker compose exec backend python scripts/seed_initial_data.py

## Seed DB from scraped JSON (run scrape first)
seed:
	docker compose exec backend python scraper/seed_db.py

## Scrape product data (5 pages of bras + panties)
scrape:
	docker compose exec backend python -m scraper.zivame_scraper --pages 5 --category bras panties

## Run backend tests
test:
	docker compose exec backend pytest -v

## Lint backend
lint:
	docker compose exec backend ruff check app/

## Shell into backend container
shell-backend:
	docker compose exec backend bash

## Shell into frontend container
shell-frontend:
	docker compose exec frontend sh

## Create new migration
migration:
	docker compose exec backend alembic revision --autogenerate -m "$(MSG)"

## Reset everything (DESTRUCTIVE)
reset:
	docker compose down -v
	docker compose up -d --build
	sleep 5
	docker compose exec backend alembic upgrade head
