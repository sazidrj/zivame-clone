"""
app/api/v1/endpoints/coupons.py
---------------------------------
Coupon validation and admin management.
  POST /coupons/validate       — Validate a coupon code, return discount amount
  POST /admin/coupons          — Create coupon (admin)
  PATCH /admin/coupons/{code}  — Toggle coupon active (admin)
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select

from app.core.dependencies import AdminUser, CurrentUser, DBSession
from app.models.coupon import Coupon
from app.models.order import Order

router = APIRouter(tags=["Coupons"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class CouponValidateRequest(BaseModel):
    code: str
    cart_total: float


class CouponValidateResponse(BaseModel):
    valid: bool
    code: str
    discount_amount: float
    message: str
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None


class CouponCreateRequest(BaseModel):
    code: str
    description: Optional[str] = None
    discount_type: str = "percent"      # "percent" | "flat"
    discount_value: float
    min_order_amount: float = 0.0
    max_discount: Optional[float] = None
    usage_limit: Optional[int] = None
    per_user_limit: int = 1
    valid_until: Optional[datetime] = None


# ── Coupon validation logic ───────────────────────────────────────────────────

async def _validate_coupon(
    code: str,
    cart_total: float,
    user_id: int,
    db: DBSession,
) -> tuple[bool, str, float, Optional[Coupon]]:
    """Returns (is_valid, message, discount_amount, coupon_or_None)."""
    result = await db.execute(
        select(Coupon).where(Coupon.code == code.upper().strip())
    )
    coupon = result.scalar_one_or_none()

    if not coupon:
        return False, "Invalid coupon code.", 0.0, None

    if not coupon.is_active:
        return False, "This coupon is no longer active.", 0.0, None

    now = datetime.now(timezone.utc)
    if coupon.valid_until and coupon.valid_until.replace(tzinfo=timezone.utc) < now:
        return False, "This coupon has expired.", 0.0, None

    if coupon.valid_from.replace(tzinfo=timezone.utc) > now:
        return False, "This coupon is not yet valid.", 0.0, None

    if cart_total < coupon.min_order_amount:
        return (
            False,
            f"Minimum order amount ₹{coupon.min_order_amount:.0f} required for this coupon.",
            0.0,
            None,
        )

    if coupon.usage_limit and coupon.usage_count >= coupon.usage_limit:
        return False, "This coupon has reached its usage limit.", 0.0, None

    # Check per-user usage
    user_usage = await db.execute(
        select(Order).where(
            Order.user_id == user_id,
        )
    )
    # (Simplified — in production, store coupon_code on Order and count per user)

    # Calculate discount
    if coupon.discount_type == "percent":
        raw = cart_total * (coupon.discount_value / 100)
        discount = min(raw, coupon.max_discount) if coupon.max_discount else raw
    else:
        discount = min(coupon.discount_value, cart_total)

    discount = round(discount, 2)
    return True, f"Coupon applied! You save ₹{discount:.0f}.", discount, coupon


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/coupons/validate", response_model=CouponValidateResponse)
async def validate_coupon(
    payload: CouponValidateRequest,
    current_user: CurrentUser,
    db: DBSession,
):
    """Check if a coupon is valid and return the discount amount."""
    valid, message, discount, coupon = await _validate_coupon(
        code=payload.code,
        cart_total=payload.cart_total,
        user_id=current_user.id,
        db=db,
    )
    return CouponValidateResponse(
        valid=valid,
        code=payload.code.upper(),
        discount_amount=discount,
        message=message,
        discount_type=coupon.discount_type if coupon else None,
        discount_value=coupon.discount_value if coupon else None,
    )


@router.post("/admin/coupons", status_code=status.HTTP_201_CREATED)
async def create_coupon(
    payload: CouponCreateRequest,
    admin: AdminUser,
    db: DBSession,
):
    """Admin: create a new coupon code."""
    existing = await db.execute(
        select(Coupon).where(Coupon.code == payload.code.upper())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Coupon code already exists.")

    coupon = Coupon(
        code=payload.code.upper(),
        description=payload.description,
        discount_type=payload.discount_type,
        discount_value=payload.discount_value,
        min_order_amount=payload.min_order_amount,
        max_discount=payload.max_discount,
        usage_limit=payload.usage_limit,
        per_user_limit=payload.per_user_limit,
        valid_until=payload.valid_until,
    )
    db.add(coupon)
    await db.flush()
    return {"id": coupon.id, "code": coupon.code, "message": "Coupon created"}


@router.patch("/admin/coupons/{code}/toggle")
async def toggle_coupon(code: str, admin: AdminUser, db: DBSession):
    """Admin: activate or deactivate a coupon."""
    result = await db.execute(select(Coupon).where(Coupon.code == code.upper()))
    coupon = result.scalar_one_or_none()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    coupon.is_active = not coupon.is_active
    return {"code": coupon.code, "is_active": coupon.is_active}


@router.get("/admin/coupons")
async def list_coupons(admin: AdminUser, db: DBSession):
    """Admin: list all coupons."""
    result = await db.execute(select(Coupon).order_by(Coupon.created_at.desc()))
    coupons = result.scalars().all()
    return [
        {
            "id": c.id,
            "code": c.code,
            "description": c.description,
            "discount_type": c.discount_type,
            "discount_value": c.discount_value,
            "min_order_amount": c.min_order_amount,
            "usage_count": c.usage_count,
            "usage_limit": c.usage_limit,
            "is_active": c.is_active,
            "valid_until": c.valid_until,
        }
        for c in coupons
    ]
