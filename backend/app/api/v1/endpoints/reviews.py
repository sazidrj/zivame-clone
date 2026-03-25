"""
app/api/v1/endpoints/reviews.py
---------------------------------
Product review endpoints:
  GET  /products/{slug}/reviews     — List product reviews
  POST /products/{slug}/reviews     — Submit a review (auth required)
"""

import math
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select, update

from app.core.dependencies import CurrentUser, DBSession
from app.models.product import Product
from app.models.review import Review

router = APIRouter(tags=["Reviews"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class CreateReviewRequest(BaseModel):
    rating: float = Field(..., ge=1.0, le=5.0)
    title: Optional[str] = Field(None, max_length=200)
    body: Optional[str] = Field(None, max_length=2000)


class ReviewOut(BaseModel):
    id: int
    user_name: str
    rating: float
    title: Optional[str] = None
    body: Optional[str] = None
    is_verified_purchase: bool
    created_at: str

    model_config = {"from_attributes": True}


class PaginatedReviews(BaseModel):
    items: list[ReviewOut]
    total: int
    avg_rating: float
    rating_distribution: dict[int, int]   # {5: 40, 4: 25, 3: 10, 2: 5, 1: 2}
    page: int
    pages: int


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/products/{slug}/reviews", response_model=PaginatedReviews)
async def list_reviews(
    slug: str,
    db: DBSession,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    sort: str = Query("newest", enum=["newest", "highest", "lowest", "helpful"]),
):
    product_result = await db.execute(select(Product).where(Product.slug == slug))
    product = product_result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Sort
    sort_map = {
        "newest": Review.created_at.desc(),
        "highest": Review.rating.desc(),
        "lowest": Review.rating.asc(),
        "helpful": Review.created_at.desc(),
    }

    # Count
    total = (await db.execute(
        select(func.count()).where(Review.product_id == product.id)
    )).scalar_one()

    # Ratings distribution
    dist_result = await db.execute(
        select(func.floor(Review.rating).label("r"), func.count().label("c"))
        .where(Review.product_id == product.id)
        .group_by(func.floor(Review.rating))
    )
    distribution = {int(r): c for r, c in dist_result.fetchall()}
    for i in range(1, 6):
        distribution.setdefault(i, 0)

    # Reviews with user join
    from app.models.user import User
    from sqlalchemy.orm import selectinload
    reviews_result = await db.execute(
        select(Review, User.full_name.label("user_name"))
        .join(User, Review.user_id == User.id)
        .where(Review.product_id == product.id)
        .order_by(sort_map[sort])
        .offset((page - 1) * limit)
        .limit(limit)
    )
    rows = reviews_result.fetchall()

    items = [
        ReviewOut(
            id=r.Review.id,
            user_name=r.user_name or "Anonymous",
            rating=r.Review.rating,
            title=r.Review.title,
            body=r.Review.body,
            is_verified_purchase=r.Review.is_verified_purchase,
            created_at=r.Review.created_at.strftime("%d %b %Y"),
        )
        for r in rows
    ]

    return PaginatedReviews(
        items=items,
        total=total,
        avg_rating=round(product.avg_rating, 1),
        rating_distribution=distribution,
        page=page,
        pages=math.ceil(total / limit) if total else 1,
    )


@router.post(
    "/products/{slug}/reviews",
    response_model=ReviewOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_review(
    slug: str,
    payload: CreateReviewRequest,
    current_user: CurrentUser,
    db: DBSession,
):
    product_result = await db.execute(select(Product).where(Product.slug == slug))
    product = product_result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Prevent duplicate reviews
    existing = await db.execute(
        select(Review).where(
            Review.product_id == product.id,
            Review.user_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You have already reviewed this product")

    review = Review(
        user_id=current_user.id,
        product_id=product.id,
        rating=payload.rating,
        title=payload.title,
        body=payload.body,
    )
    db.add(review)
    await db.flush()

    # Recalculate product avg_rating
    stats = await db.execute(
        select(func.avg(Review.rating), func.count(Review.id))
        .where(Review.product_id == product.id)
    )
    avg, count = stats.one()
    product.avg_rating = round(float(avg or 0), 1)
    product.review_count = count

    return ReviewOut(
        id=review.id,
        user_name=current_user.full_name or "Anonymous",
        rating=review.rating,
        title=review.title,
        body=review.body,
        is_verified_purchase=review.is_verified_purchase,
        created_at=review.created_at.strftime("%d %b %Y"),
    )
