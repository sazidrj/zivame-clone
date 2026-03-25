"""
app/api/v1/endpoints/cart.py
-----------------------------
Cart management endpoints:
  GET    /cart              — Get current user's cart
  POST   /cart/items        — Add item to cart
  PATCH  /cart/items/{id}   — Update quantity/size
  DELETE /cart/items/{id}   — Remove item
  DELETE /cart              — Clear cart
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.dependencies import CurrentUser, DBSession
from app.models.cart import Cart, CartItem
from app.models.product import Product

router = APIRouter(prefix="/cart", tags=["Cart"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class AddToCartRequest(BaseModel):
    product_id: int
    quantity: int = 1
    size: Optional[str] = None


class UpdateCartItemRequest(BaseModel):
    quantity: Optional[int] = None
    size: Optional[str] = None


class CartItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_slug: str
    product_image: Optional[str] = None
    price: float
    mrp: Optional[float] = None
    quantity: int
    size: Optional[str] = None
    subtotal: float

    model_config = {"from_attributes": True}


class CartOut(BaseModel):
    id: int
    items: list[CartItemOut]
    total_items: int
    total_amount: float
    savings: float


# ── Helper ────────────────────────────────────────────────────────────────────

async def get_or_create_cart(user_id: int, db: DBSession) -> Cart:
    result = await db.execute(
        select(Cart)
        .where(Cart.user_id == user_id)
        .options(selectinload(Cart.items).selectinload(CartItem.product).selectinload(Product.images))
    )
    cart = result.scalar_one_or_none()
    if not cart:
        cart = Cart(user_id=user_id)
        db.add(cart)
        await db.flush()
        # Reload with relationships eagerly loaded
        result = await db.execute(
            select(Cart)
            .where(Cart.id == cart.id)
            .options(selectinload(Cart.items).selectinload(CartItem.product).selectinload(Product.images))
        )
        cart = result.scalar_one()
    return cart


def build_cart_response(cart: Cart) -> CartOut:
    items_out = []
    total_amount = 0.0
    total_mrp = 0.0

    for item in cart.items:
        p = item.product
        primary_img = next((img.url for img in p.images if img.is_primary), None)
        subtotal = p.price * item.quantity
        total_amount += subtotal
        total_mrp += (p.mrp or p.price) * item.quantity

        items_out.append(CartItemOut(
            id=item.id,
            product_id=p.id,
            product_name=p.name,
            product_slug=p.slug,
            product_image=primary_img,
            price=p.price,
            mrp=p.mrp,
            quantity=item.quantity,
            size=item.size,
            subtotal=subtotal,
        ))

    return CartOut(
        id=cart.id,
        items=items_out,
        total_items=sum(i.quantity for i in cart.items),
        total_amount=round(total_amount, 2),
        savings=round(max(0, total_mrp - total_amount), 2),
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("", response_model=CartOut)
async def get_cart(current_user: CurrentUser, db: DBSession):
    cart = await get_or_create_cart(current_user.id, db)
    return build_cart_response(cart)


@router.post("/items", response_model=CartOut, status_code=status.HTTP_201_CREATED)
async def add_to_cart(
    payload: AddToCartRequest,
    current_user: CurrentUser,
    db: DBSession,
):
    # Validate product exists and is in stock
    product = await db.get(Product, payload.product_id)
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.stock_quantity < payload.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    cart = await get_or_create_cart(current_user.id, db)

    # Check if item already in cart (same product + size)
    existing = next(
        (i for i in cart.items
         if i.product_id == payload.product_id and i.size == payload.size),
        None
    )

    if existing:
        existing.quantity += payload.quantity
    else:
        cart.items.append(CartItem(
            product_id=payload.product_id,
            quantity=payload.quantity,
            size=payload.size,
        ))

    await db.flush()
    # Reload with product data
    cart = await get_or_create_cart(current_user.id, db)
    return build_cart_response(cart)


@router.patch("/items/{item_id}", response_model=CartOut)
async def update_cart_item(
    item_id: int,
    payload: UpdateCartItemRequest,
    current_user: CurrentUser,
    db: DBSession,
):
    cart = await get_or_create_cart(current_user.id, db)
    item = next((i for i in cart.items if i.id == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    if payload.quantity is not None:
        if payload.quantity <= 0:
            db.delete(item)
        else:
            item.quantity = payload.quantity
    if payload.size is not None:
        item.size = payload.size

    await db.flush()
    cart = await get_or_create_cart(current_user.id, db)
    return build_cart_response(cart)


@router.delete("/items/{item_id}", response_model=CartOut)
async def remove_cart_item(
    item_id: int,
    current_user: CurrentUser,
    db: DBSession,
):
    cart = await get_or_create_cart(current_user.id, db)
    item = next((i for i in cart.items if i.id == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    await db.delete(item)
    await db.flush()
    cart = await get_or_create_cart(current_user.id, db)
    return build_cart_response(cart)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def clear_cart(current_user: CurrentUser, db: DBSession):
    cart = await get_or_create_cart(current_user.id, db)
    for item in list(cart.items):
        await db.delete(item)
    await db.flush()