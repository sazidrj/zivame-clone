#!/usr/bin/env bash
# setup.sh — One-command local dev setup (zero-spend defaults)
# Usage: chmod +x setup.sh && ./setup.sh

set -e
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Zivame Clone — Dev Setup           ║${NC}"
echo -e "${BLUE}║   Zero-spend defaults active         ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

# 1. Check Docker
if ! command -v docker &> /dev/null; then
  echo "❌ Docker not found. Install Docker Desktop from https://docker.com"
  exit 1
fi
if ! docker compose version &> /dev/null; then
  echo "❌ Docker Compose plugin not found."
  exit 1
fi

# 2. Create .env from template
if [ ! -f .env ]; then
  cp .env.example .env
  echo -e "${YELLOW}⚠  Created .env from .env.example${NC}"
  echo "   OTPs will print to console (check: docker compose logs -f backend)"
  echo "   No paid API keys required."
fi

# 3. Create static uploads dir
mkdir -p backend/static/uploads

# 4. Start all services
echo ""
echo "🐳 Starting services..."
docker compose up -d --build

# 5. Wait for Postgres
echo "⏳ Waiting for Postgres..."
until docker compose exec -T postgres pg_isready -U zivame &>/dev/null; do
  sleep 2
  echo -n "."
done
echo ""

# 6. Run migrations
echo "🗃  Running migrations..."
docker compose exec -T backend alembic upgrade head

# 7. Seed initial data (coupons, admin user)
echo "🌱 Seeding initial data..."
docker compose exec -T backend python scripts/seed_initial_data.py

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Setup complete!                       ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Frontend  →  http://localhost:5173       ║${NC}"
echo -e "${GREEN}║  Backend   →  http://localhost:8000       ║${NC}"
echo -e "${GREEN}║  API Docs  →  http://localhost:8000/docs  ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  To read OTPs:                            ║${NC}"
echo -e "${GREEN}║  docker compose logs -f backend           ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Available coupons: FIRST10, WELCOME50    ║${NC}"
echo -e "${GREEN}║  Admin login: admin@zivame-clone.dev      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
