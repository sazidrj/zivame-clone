"""
app/api/v1/endpoints/search.py
---------------------------------
Unified search endpoint:
  GET /search?q=...   — full-text + optional semantic (pgvector)

Strategy (zero-spend by default):
  1. Full-text ILIKE search on name, brand, description, tags
  2. If embeddings exist + query is long enough → also run pgvector ANN
  3. Merge and deduplicate results by relevance score
"""

from typing import Optional

from fastapi import APIRouter, Query
from sqlalchemy import func, or_, select, text
from sqlalchemy.orm import selectinload

from app.core.dependencies import DBSession
from app.models.product import Category, Product, ProductImage
from app.schemas.product import ProductListItem
from app.services.ai_service import EmbeddingService

router = APIRouter(prefix="/search", tags=["Search"])


class SearchResult(ProductListItem):
    relevance_score: float = 1.0


@router.get("", response_model=list[SearchResult])
async def search_products(
    db: DBSession,
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(20, ge=1, le=50),
    semantic: bool = Query(False, description="Enable semantic search (requires embeddings)"),
):
    """
    Search products by name, brand, description, and tags.
    Optionally enhances with pgvector semantic similarity when embeddings exist.
    """
    query_lower = q.strip().lower()
    seen_ids: set[int] = set()
    results: list[SearchResult] = []

    # ── 1. Full-text search (always runs, zero-spend) ──────────────────────────
    ft_result = await db.execute(
        select(Product)
        .where(
            Product.is_active == True,
            or_(
                func.lower(Product.name).contains(query_lower),
                func.lower(Product.brand).contains(query_lower),
                func.lower(Product.description).contains(query_lower),
            ),
        )
        .options(selectinload(Product.images))
        .order_by(
            # Exact name match first, then brand, then description
            (func.lower(Product.name) == query_lower).desc(),
            func.lower(Product.name).contains(query_lower).desc(),
            Product.avg_rating.desc(),
        )
        .limit(limit)
    )
    for product in ft_result.scalars().all():
        if product.id not in seen_ids:
            seen_ids.add(product.id)
            results.append(_to_result(product, score=1.0))

    # ── 2. Semantic search (runs only if semantic=True and embeddings exist) ───
    if semantic and len(q) >= 4:
        try:
            query_embedding = EmbeddingService.embed_product_text(q)
            if query_embedding:
                sem_result = await db.execute(
                    text("""
                        SELECT id, 1 - (embedding <=> CAST(:emb AS vector)) AS score
                        FROM products
                        WHERE is_active = true
                          AND embedding IS NOT NULL
                        ORDER BY embedding <=> CAST(:emb AS vector)
                        LIMIT :lim
                    """),
                    {"emb": str(query_embedding), "lim": limit},
                )
                rows = sem_result.fetchall()
                sem_ids = [r[0] for r in rows if r[0] not in seen_ids]
                scores  = {r[0]: float(r[1]) for r in rows}

                if sem_ids:
                    products_res = await db.execute(
                        select(Product)
                        .where(Product.id.in_(sem_ids))
                        .options(selectinload(Product.images))
                    )
                    for product in products_res.scalars().all():
                        seen_ids.add(product.id)
                        results.append(_to_result(product, score=scores.get(product.id, 0.5)))
        except Exception as exc:
            # Semantic search is optional — silently fall back
            print(f"[WARN] Semantic search failed: {exc}")

    # Sort merged results by relevance_score desc
    results.sort(key=lambda r: r.relevance_score, reverse=True)
    return results[:limit]


def _to_result(product: Product, score: float) -> SearchResult:
    primary_image = next((img.url for img in product.images if img.is_primary), None)
    return SearchResult(
        id=product.id,
        name=product.name,
        slug=product.slug,
        brand=product.brand,
        price=product.price,
        mrp=product.mrp,
        discount_percent=product.discount_percent,
        avg_rating=product.avg_rating,
        review_count=product.review_count,
        primary_image_url=primary_image,
        color=product.color,
        relevance_score=round(score, 4),
    )
