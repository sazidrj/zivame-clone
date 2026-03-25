"""
app/models/coupon.py
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Coupon(Base):
    __tablename__ = "coupons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Type: "percent" | "flat"
    discount_type: Mapped[str] = mapped_column(String(10), default="percent")
    discount_value: Mapped[float] = mapped_column(Float)           # 10 = 10% or ₹10 flat
    min_order_amount: Mapped[float] = mapped_column(Float, default=0.0)
    max_discount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # Cap for % coupons

    # Usage limits
    usage_limit: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)   # None = unlimited
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    per_user_limit: Mapped[int] = mapped_column(Integer, default=1)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    valid_from: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    valid_until: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
