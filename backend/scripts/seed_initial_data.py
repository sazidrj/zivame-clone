"""
scripts/seed_initial_data.py
------------------------------
Seeds essential initial data:
  - Default coupons (FIRST10, WELCOME50)
  - Admin user (for dev/testing)

Usage:
    docker compose exec backend python scripts/seed_initial_data.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password
from app.models.coupon import Coupon
from app.models.user import User


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as db:
        # ── Coupons ───────────────────────────────────────────────────────────
        coupons_data = [
            {
                "code": "FIRST10",
                "description": "10% off on first order",
                "discount_type": "percent",
                "discount_value": 10.0,
                "min_order_amount": 299.0,
                "max_discount": 200.0,
                "per_user_limit": 1,
            },
            {
                "code": "WELCOME50",
                "description": "₹50 flat off on orders above ₹499",
                "discount_type": "flat",
                "discount_value": 50.0,
                "min_order_amount": 499.0,
                "per_user_limit": 1,
            },
            {
                "code": "FREESHIP",
                "description": "Free shipping on any order",
                "discount_type": "flat",
                "discount_value": 49.0,
                "min_order_amount": 0.0,
                "usage_limit": 1000,
            },
            {
                "code": "SAVE20",
                "description": "20% off on orders above ₹999",
                "discount_type": "percent",
                "discount_value": 20.0,
                "min_order_amount": 999.0,
                "max_discount": 500.0,
            },
        ]

        for cd in coupons_data:
            existing = await db.execute(select(Coupon).where(Coupon.code == cd["code"]))
            if not existing.scalar_one_or_none():
                db.add(Coupon(**cd))
                print(f"  ✓ Created coupon: {cd['code']}")
            else:
                print(f"  · Skipped coupon: {cd['code']} (already exists)")

        # ── Admin user ────────────────────────────────────────────────────────
        admin_email = "admin@zivame-clone.dev"
        existing_admin = await db.execute(select(User).where(User.email == admin_email))
        if not existing_admin.scalar_one_or_none():
            admin = User(
                email=admin_email,
                full_name="Admin User",
                password_hash=hash_password("admin123!"),  # Change in production!
                role="admin",
                is_active=True,
                is_verified=True,
            )
            db.add(admin)
            print(f"  ✓ Created admin: {admin_email} / admin123!")
            print(f"  ⚠  Change the admin password before deploying to production!")
        else:
            print(f"  · Skipped admin: {admin_email} (already exists)")

        await db.commit()

    await engine.dispose()
    print("\n[DONE] Initial data seeded successfully.")


if __name__ == "__main__":
    asyncio.run(seed())
