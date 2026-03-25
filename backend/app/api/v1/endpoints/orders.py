"""
app/api/v1/endpoints/orders.py
-------------------------------
Order management endpoints:
  POST /orders             — Create order from cart
  GET  /orders             — List user's orders
  GET  /orders/{id}        — Get order detail
  POST /orders/{id}/cancel — Cancel order
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.dependencies import CurrentUser, DBSession
from app.models.cart import Cart, CartItem
from app.models.order import Order, OrderItem
from app.models.product import Product

router = APIRouter(prefix="/orders", tags=["Orders"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class AddressSchema(BaseModel):
    full_name: str
    phone: str
    line1: str
    line2: Optional[str] = None
    city: str
    state: str
    pincode: str
    country: str = "India"


class CreateOrderRequest(BaseModel):
    shipping_address: AddressSchema
    payment_method: str = "cod"   # cod | razorpay | upi


class OrderItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_slug: str
    product_image: Optional[str] = None
    quantity: int
    size: Optional[str] = None
    unit_price: float
    total_price: float

    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: int
    status: str
    total_amount: float
    discount_amount: float
    shipping_amount: float
    payment_status: str
    payment_method: Optional[str] = None
    shipping_address: Optional[dict] = None
    created_at: datetime
    items: list[OrderItemOut]

    model_config = {"from_attributes": True}


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: CreateOrderRequest,
    current_user: CurrentUser,
    db: DBSession,
):
    # Load cart
    result = await db.execute(
        select(Cart)
        .where(Cart.user_id == current_user.id)
        .options(selectinload(Cart.items).selectinload(CartItem.product).selectinload(Product.images))
    )
    cart = result.scalar_one_or_none()

    if not cart or not cart.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # Calculate totals
    total_amount = sum(item.product.price * item.quantity for item in cart.items)
    shipping_amount = 0.0 if total_amount >= 599 else 49.0
    final_amount = total_amount + shipping_amount

    # Create order
    order = Order(
        user_id=current_user.id,
        status="confirmed" if payload.payment_method == "cod" else "pending",
        total_amount=round(final_amount, 2),
        discount_amount=0.0,
        shipping_amount=shipping_amount,
        shipping_address=payload.shipping_address.model_dump(),
        payment_status="pending",
        payment_method=payload.payment_method,
    )
    db.add(order)
    await db.flush()

    # Create order items and deduct stock
    for cart_item in cart.items:
        product = cart_item.product
        if product.stock_quantity < cart_item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {product.name}"
            )
        product.stock_quantity -= cart_item.quantity

        primary_img = next((img.url for img in product.images if img.is_primary), None)
        order.items.append(OrderItem(
            product_id=product.id,
            quantity=cart_item.quantity,
            size=cart_item.size,
            unit_price=product.price,
            total_price=round(product.price * cart_item.quantity, 2),
        ))

    # Clear cart
    for item in list(cart.items):
        await db.delete(item)

    await db.flush()

    # Build response
    return await _get_order_out(order.id, db)


@router.get("", response_model=list[OrderOut])
async def list_orders(current_user: CurrentUser, db: DBSession):
    result = await db.execute(
        select(Order)
        .where(Order.user_id == current_user.id)
        .options(selectinload(Order.items).selectinload(OrderItem.product).selectinload(Product.images))
        .order_by(Order.created_at.desc())
    )
    orders = result.scalars().all()
    return [_build_order_out(o) for o in orders]


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(order_id: int, current_user: CurrentUser, db: DBSession):
    order_out = await _get_order_out(order_id, db)
    if not order_out:
        raise HTTPException(status_code=404, detail="Order not found")
    return order_out


@router.post("/{order_id}/cancel", response_model=OrderOut)
async def cancel_order(order_id: int, current_user: CurrentUser, db: DBSession):
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id, Order.user_id == current_user.id)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status not in ("pending", "confirmed"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel order with status '{order.status}'")

    order.status = "cancelled"
    # Restore stock
    for item in order.items:
        item.product.stock_quantity += item.quantity

    await db.flush()
    return await _get_order_out(order_id, db)


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_order_out(order_id: int, db: DBSession) -> Optional[OrderOut]:
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.items).selectinload(OrderItem.product).selectinload(Product.images))
    )
    order = result.scalar_one_or_none()
    if not order:
        return None
    return _build_order_out(order)


def _build_order_out(order: Order) -> OrderOut:
    items_out = []
    for item in order.items:
        p = item.product
        primary_img = next((img.url for img in p.images if img.is_primary), None)
        items_out.append(OrderItemOut(
            id=item.id,
            product_id=p.id,
            product_name=p.name,
            product_slug=p.slug,
            product_image=primary_img,
            quantity=item.quantity,
            size=item.size,
            unit_price=item.unit_price,
            total_price=item.total_price,
        ))

    return OrderOut(
        id=order.id,
        status=order.status,
        total_amount=order.total_amount,
        discount_amount=order.discount_amount,
        shipping_amount=order.shipping_amount,
        payment_status=order.payment_status,
        payment_method=order.payment_method,
        shipping_address=order.shipping_address,
        created_at=order.created_at,
        items=items_out,
    )
