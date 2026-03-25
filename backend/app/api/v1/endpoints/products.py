"""
app/api/v1/endpoints/products.py
----------------------------------
Product catalog endpoints with filtering, pagination, and search.
"""

import math
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.core.dependencies import DBSession, CurrentUser
from app.models.product import Category, Product, ProductImage
from app.schemas.product import (
    CategoryOut,
    PaginatedProducts,
    ProductDetail,
    ProductListItem,
)

router = APIRouter(prefix="/products", tags=["Products"])


# ── Categories ────────────────────────────────────────────────────────────────

@router.get("/categories", response_model=list[CategoryOut])
async def list_categories(db: DBSession):
    result = await db.execute(
        select(Category).where(Category.parent_id.is_(None))
    )
    return result.scalars().all()


# ── Product Listing ───────────────────────────────────────────────────────────

@router.get("", response_model=PaginatedProducts)
async def list_products(
    db: DBSession,
    category_slug: Optional[str] = Query(None),
    brand: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    sizes: Optional[str] = Query(None, description="Comma-separated sizes e.g. 32B,34C"),
    color: Optional[str] = Query(None),
    sort: str = Query("popularity", enum=["popularity", "price_asc", "price_desc", "newest", "rating"]),
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=100),
    search: Optional[str] = Query(None),
    tags: Optional[str] = Query(None),
):
    import re

    query = (
        select(Product)
        .where(Product.is_active == True)
        .options(selectinload(Product.images))
    )

    if category_slug:
        query = query.join(Category).where(Category.slug == category_slug)
    if brand:
        query = query.where(Product.brand.ilike(f"%{brand}%"))
    if min_price is not None:
        query = query.where(Product.price >= min_price)
    if max_price is not None:
        query = query.where(Product.price <= max_price)
    if color:
        query = query.where(Product.color.ilike(f"%{color}%"))
    if search:
        query = query.where(
            or_(
                Product.name.ilike(f"%{search}%"),
                Product.brand.ilike(f"%{search}%"),
                Product.description.ilike(f"%{search}%"),
            )
        )
    if tags:
        query = query.where(Product.tags.contains([tags]))
    if sizes:
        size_list = [s.strip() for s in sizes.split(",")]
        for size in size_list:
            query = query.where(Product.sizes[size].as_integer() > 0)

    sort_map = {
        "popularity": Product.review_count.desc(),
        "price_asc": Product.price.asc(),
        "price_desc": Product.price.desc(),
        "newest": Product.created_at.desc(),
        "rating": Product.avg_rating.desc(),
    }
    query = query.order_by(sort_map[sort])

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    offset = (page - 1) * limit
    result = await db.execute(query.offset(offset).limit(limit))
    products = result.scalars().all()

    def base_name(name: str) -> str:
        return re.sub(r'\s*-\s*[^-]+$', '', name).strip()

    items = [
        ProductListItem(
            id=p.id,
            name=p.name,
            slug=p.slug,
            brand=p.brand,
            price=p.price,
            mrp=p.mrp,
            discount_percent=p.discount_percent,
            avg_rating=p.avg_rating,
            review_count=p.review_count,
            primary_image_url=p.primary_image.url if p.primary_image else None,
            color=p.color,
        )
        for p in products
    ]

    return PaginatedProducts(
        items=items,
        total=total,
        page=page,
        limit=limit,
        pages=math.ceil(total / limit),
    )


# ── Product Detail ────────────────────────────────────────────────────────────

def _color_hex(color: str) -> str:
    c = (color or "").lower()
    if "black" in c: return "#1a1a1a"
    if "white" in c or "snow" in c: return "#f5f5f5"
    if "raspberry" in c: return "#c0392b"
    if "red" in c or "claret" in c or "wine" in c: return "#c0392b"
    if "navy" in c or "scooter" in c: return "#2c3e87"
    if "blue" in c: return "#3182ce"
    if "pink" in c or "blossom" in c or "dogwood" in c: return "#f48fb1"
    if "skin" in c or "nude" in c or "beige" in c or "almond" in c: return "#e8b89a"
    if "grey" in c or "gray" in c or "anthracite" in c: return "#9e9e9e"
    if "green" in c or "sage" in c: return "#38a169"
    if "purple" in c or "violet" in c or "elder" in c: return "#6d2b6d"
    if "brown" in c or "nutmeg" in c or "roebuck" in c: return "#8d5524"
    if "argan" in c: return "#c8956c"
    if "teal" in c or "aqua" in c: return "#00bcd4"
    if "orange" in c or "coral" in c: return "#e67e22"
    return "#f5b8a0"


@router.get("/{slug}", response_model=ProductDetail)
async def get_product(slug: str, db: DBSession):
    import re

    def base_name(name: str) -> str:
        return re.sub(r'\s*-\s*[^-]+$', '', name).strip()

    # Fetch the main product
    result = await db.execute(
        select(Product)
        .where(Product.slug == slug, Product.is_active == True)
        .options(
            selectinload(Product.images),
            selectinload(Product.category),
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Fetch all sibling products (same brand + same base name)
    product_base = base_name(product.name)
    siblings_result = await db.execute(
        select(Product)
        .where(
            Product.is_active == True,
            Product.brand.ilike(product.brand or ""),
            Product.name.ilike(f"{product_base}%"),
        )
        .options(selectinload(Product.images))
        .order_by(Product.id)
    )
    siblings = siblings_result.scalars().all()

    # If no siblings found, try without brand filter (name match only)
    if len(siblings) <= 1:
        siblings_result2 = await db.execute(
            select(Product)
            .where(
                Product.is_active == True,
                Product.name.ilike(f"{product_base}%"),
            )
            .options(selectinload(Product.images))
            .order_by(Product.id)
        )
        siblings2 = siblings_result2.scalars().all()
        if len(siblings2) > len(siblings):
            siblings = siblings2

    # Build color_variants from siblings — each sibling = one color option
    print(f"[DEBUG] product_base='{product_base}' brand='{product.brand}' siblings={len(siblings)}: {[s.name for s in siblings]}")
    color_variants = []
    for s in siblings:
        images = [img.url for img in sorted(s.images, key=lambda x: x.sort_order)]
        color_variants.append({
            "color": s.color or "Default",
            "hex": _color_hex(s.color or ""),
            "images": images,
            "slug": s.slug,
        })

    product.color_variants = color_variants if color_variants else None
    return product