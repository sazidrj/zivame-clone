"""
app/api/v1/endpoints/wishlist.py
----------------------------------
Wishlist endpoints:
  GET    /wishlist           — Get user's wishlist
  POST   /wishlist/{id}      — Add product to wishlist
  DELETE /wishlist/{id}      — Remove product from wishlist
  GET    /wishlist/{id}/check — Check if product is wishlisted
"""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.dependencies import CurrentUser, DBSession
from app.models.product import Product, ProductImage
from app.models.wishlist import WishlistItem
from app.schemas.product import ProductListItem

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])


@router.get("", response_model=list[ProductListItem])
async def get_wishlist(current_user: CurrentUser, db: DBSession):
    result = await db.execute(
        select(WishlistItem)
        .where(WishlistItem.user_id == current_user.id)
        .options(
            selectinload(WishlistItem.product)
            .selectinload(Product.images)
        )
        .order_by(WishlistItem.created_at.desc())
    )
    items = result.scalars().all()

    return [
        ProductListItem(
            id=item.product.id,
            name=item.product.name,
            slug=item.product.slug,
            brand=item.product.brand,
            price=item.product.price,
            mrp=item.product.mrp,
            discount_percent=item.product.discount_percent,
            avg_rating=item.product.avg_rating,
            review_count=item.product.review_count,
            primary_image_url=next(
                (img.url for img in item.product.images if img.is_primary), None
            ),
            color=item.product.color,
        )
        for item in items
    ]


@router.post("/{product_id}", status_code=status.HTTP_201_CREATED)
async def add_to_wishlist(
    product_id: int,
    current_user: CurrentUser,
    db: DBSession,
):
    product = await db.get(Product, product_id)
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = await db.execute(
        select(WishlistItem).where(
            WishlistItem.user_id == current_user.id,
            WishlistItem.product_id == product_id,
        )
    )
    if existing.scalar_one_or_none():
        return {"message": "Already in wishlist"}

    db.add(WishlistItem(user_id=current_user.id, product_id=product_id))
    return {"message": "Added to wishlist"}


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_wishlist(
    product_id: int,
    current_user: CurrentUser,
    db: DBSession,
):
    result = await db.execute(
        select(WishlistItem).where(
            WishlistItem.user_id == current_user.id,
            WishlistItem.product_id == product_id,
        )
    )
    item = result.scalar_one_or_none()
    if item:
        await db.delete(item)


@router.get("/{product_id}/check")
async def check_wishlist(
    product_id: int,
    current_user: CurrentUser,
    db: DBSession,
):
    result = await db.execute(
        select(WishlistItem).where(
            WishlistItem.user_id == current_user.id,
            WishlistItem.product_id == product_id,
        )
    )
    return {"wishlisted": result.scalar_one_or_none() is not None}
