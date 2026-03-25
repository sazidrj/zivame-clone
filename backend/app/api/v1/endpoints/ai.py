"""
app/api/v1/endpoints/ai.py
---------------------------
AI-powered endpoints:
  POST /ai/chat                  — Conversational shopping assistant
  GET  /ai/recommendations/{id}  — Similar product recommendations
  GET  /ai/personalized          — Personalized feed (requires auth)
"""

from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.dependencies import CurrentUser, DBSession
from app.services.ai_service import AIAssistantService, RecommendationService
from app.schemas.product import ProductListItem
from app.models.product import Product
from sqlalchemy.orm import selectinload
from sqlalchemy import select

router = APIRouter(prefix="/ai", tags=["AI Features"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
    product_id: Optional[int] = None   # For product-page context


class ChatResponse(BaseModel):
    reply: str


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse, summary="AI shopping assistant")
async def chat_with_assistant(payload: ChatRequest, db: DBSession):
    """
    Stateless chat endpoint. Client maintains conversation history
    and sends it with each request for full context.
    """
    # Build product context if on product page
    product_context = None
    if payload.product_id:
        result = await db.execute(
            select(Product).where(Product.id == payload.product_id)
        )
        product = result.scalar_one_or_none()
        if product:
            product_context = (
                f"Name: {product.name}\n"
                f"Brand: {product.brand}\n"
                f"Price: ₹{product.price}\n"
                f"Description: {product.description or 'N/A'}\n"
                f"Sizes available: {list(product.sizes.keys()) if product.sizes else 'N/A'}\n"
                f"Material: {product.material or 'N/A'}"
            )

    assistant = AIAssistantService()
    history = [{"role": m.role, "content": m.content} for m in payload.history]
    reply = await assistant.chat(
        message=payload.message,
        conversation_history=history,
        product_context=product_context,
    )
    return ChatResponse(reply=reply)


@router.get(
    "/recommendations/{product_id}",
    response_model=list[ProductListItem],
    summary="Get similar products",
)
async def get_recommendations(product_id: int, db: DBSession):
    svc = RecommendationService(db)
    products = await svc.get_similar_products(product_id)
    return [
        ProductListItem(
            id=p.id,
            name=p.name,
            slug=p.slug,
            brand=p.brand,
            price=p.price,
            mrp=p.mrp,
            avg_rating=p.avg_rating,
            review_count=p.review_count,
        )
        for p in products
    ]


@router.get(
    "/personalized",
    response_model=list[ProductListItem],
    summary="Personalized product feed (requires login)",
)
async def personalized_feed(current_user: CurrentUser, db: DBSession):
    svc = RecommendationService(db)
    products = await svc.get_personalized_recommendations(current_user.id)
    return [
        ProductListItem(
            id=p.id,
            name=p.name,
            slug=p.slug,
            brand=p.brand,
            price=p.price,
            mrp=p.mrp,
            avg_rating=p.avg_rating,
            review_count=p.review_count,
        )
        for p in products
    ]
