"""
app/api/v1/endpoints/admin.py
------------------------------
Admin-only endpoints:
  POST   /admin/products           — Create product
  PUT    /admin/products/{id}      — Update product
  DELETE /admin/products/{id}      — Soft-delete product
  GET    /admin/stats              — Dashboard stats
  POST   /admin/products/embed-all — Regenerate all embeddings
"""

from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from app.core.dependencies import AdminUser, DBSession
from app.models.order import Order
from app.models.product import Category, Product, ProductImage
from app.models.user import User
from app.services.ai_service import EmbeddingService

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class ProductCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    brand: Optional[str] = None
    price: float = Field(..., gt=0)
    mrp: Optional[float] = None
    category_id: Optional[int] = None
    color: Optional[str] = None
    sizes: Optional[dict] = None
    material: Optional[str] = None
    care_instructions: Optional[str] = None
    tags: Optional[list[str]] = None
    stock_quantity: int = 0
    images: list[str] = []


class ProductUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    brand: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    mrp: Optional[float] = None
    category_id: Optional[int] = None
    color: Optional[str] = None
    sizes: Optional[dict] = None
    material: Optional[str] = None
    care_instructions: Optional[str] = None
    tags: Optional[list[str]] = None
    stock_quantity: Optional[int] = None
    is_active: Optional[bool] = None
    images: Optional[list[str]] = None


class DashboardStats(BaseModel):
    total_users: int
    total_products: int
    total_orders: int
    revenue_total: float
    orders_pending: int
    orders_today: int


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=DashboardStats)
async def get_stats(admin: AdminUser, db: DBSession):
    from datetime import date, datetime

    users = (await db.execute(select(func.count(User.id)))).scalar_one()
    products = (await db.execute(select(func.count(Product.id)).where(Product.is_active == True))).scalar_one()
    orders_total = (await db.execute(select(func.count(Order.id)))).scalar_one()
    revenue = (await db.execute(
        select(func.sum(Order.total_amount)).where(Order.payment_status == "paid")
    )).scalar_one() or 0.0
    pending = (await db.execute(
        select(func.count(Order.id)).where(Order.status == "pending")
    )).scalar_one()
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_orders = (await db.execute(
        select(func.count(Order.id)).where(Order.created_at >= today_start)
    )).scalar_one()

    return DashboardStats(
        total_users=users,
        total_products=products,
        total_orders=orders_total,
        revenue_total=round(float(revenue), 2),
        orders_pending=pending,
        orders_today=today_orders,
    )


@router.post("/products", status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreateRequest,
    admin: AdminUser,
    db: DBSession,
):
    import re
    slug_base = re.sub(r"[^\w\s-]", "", payload.name.lower())
    slug = re.sub(r"[\s_]+", "-", slug_base).strip("-")

    # Ensure unique slug
    existing = await db.execute(select(Product).where(Product.slug == slug))
    if existing.scalar_one_or_none():
        import uuid
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"

    discount = None
    if payload.mrp and payload.mrp > payload.price:
        discount = round((payload.mrp - payload.price) / payload.mrp * 100, 1)

    product = Product(
        name=payload.name,
        slug=slug,
        description=payload.description,
        brand=payload.brand,
        price=payload.price,
        mrp=payload.mrp,
        discount_percent=discount,
        category_id=payload.category_id,
        color=payload.color,
        sizes=payload.sizes,
        material=payload.material,
        care_instructions=payload.care_instructions,
        tags=payload.tags,
        stock_quantity=payload.stock_quantity,
    )
    db.add(product)
    await db.flush()

    # Add images
    for i, url in enumerate(payload.images):
        db.add(ProductImage(
            product_id=product.id,
            url=url,
            is_primary=(i == 0),
            sort_order=i,
        ))

    # Generate embedding
    try:
        product.embedding = EmbeddingService.embed_product(product)
    except Exception:
        pass

    await db.flush()
    return {"id": product.id, "slug": product.slug, "message": "Product created"}


@router.put("/products/{product_id}")
async def update_product(
    product_id: int,
    payload: ProductUpdateRequest,
    admin: AdminUser,
    db: DBSession,
):
    from sqlalchemy import delete as sql_delete
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = payload.model_dump(exclude_none=True)

    # Handle images separately — delete old and insert new
    new_images = update_data.pop("images", None)
    if new_images is not None:
        await db.execute(
            sql_delete(ProductImage).where(ProductImage.product_id == product_id)
        )
        for i, url in enumerate(new_images):
            db.add(ProductImage(
                product_id=product_id,
                url=url,
                alt_text=product.name,
                is_primary=(i == 0),
                sort_order=i,
            ))

    # Update other fields
    for field, value in update_data.items():
        setattr(product, field, value)

    # Recalculate discount
    if product.mrp and product.mrp > product.price:
        product.discount_percent = round((product.mrp - product.price) / product.mrp * 100, 1)

    # Refresh embedding if name/description changed
    if "name" in update_data or "description" in update_data:
        try:
            product.embedding = EmbeddingService.embed_product(product)
        except Exception:
            pass

    return {"message": "Product updated"}


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(product_id: int, admin: AdminUser, db: DBSession):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_active = False  # Soft delete


@router.post("/products/embed-all")
async def regenerate_embeddings(admin: AdminUser, db: DBSession):
    """Batch regenerate embeddings for all active products."""
    result = await db.execute(select(Product).where(Product.is_active == True))
    products = result.scalars().all()
    updated = 0
    for product in products:
        try:
            product.embedding = EmbeddingService.embed_product(product)
            updated += 1
        except Exception:
            pass
    return {"updated": updated, "total": len(products)}