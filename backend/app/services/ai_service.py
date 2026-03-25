"""
app/services/ai_service.py
---------------------------
AI features — all degrade gracefully when no API keys are configured.

AIAssistantService:
  - Claude API (ANTHROPIC_API_KEY set)  → real AI responses
  - OpenAI API (OPENAI_API_KEY set)     → fallback AI
  - Neither set                         → rule-based helpful responses (zero-spend)

RecommendationService:
  - pgvector cosine search (if embeddings exist) → semantic recommendations
  - Fallback: same-category top-rated products   → always works, zero-spend

EmbeddingService:
  - sentence-transformers (all-MiniLM-L6-v2, runs locally, FREE)
  - No external API needed — model downloads once to Docker volume
"""

from typing import Optional

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.product import Product


# ── Rule-based responses (zero-spend fallback) ────────────────────────────────
_RULE_RESPONSES = {
    "size":     "For bras, measure your underbust for the band size and overbust for the cup. "
                "Use our Size Guide (button on any product page) for a detailed chart. "
                "If between sizes, go up one band and down one cup.",
    "return":   "We offer 15-day hassle-free returns on all unworn items with tags attached. "
                "Go to My Orders → select the order → Request Return.",
    "delivery": "Standard delivery takes 3–5 business days. Orders above ₹599 get free shipping. "
                "You can track your order under My Orders once shipped.",
    "payment":  "We accept Cash on Delivery, UPI (PhonePe, GPay), and all major credit/debit cards.",
    "offer":    "Use code FIRST10 for 10% off your first order. Watch the banner for seasonal sales.",
    "care":     "Most of our lingerie should be hand-washed in cold water with a mild detergent. "
                "Avoid machine washing underwired bras. Lay flat to dry — never tumble dry.",
}

_DEFAULT_RESPONSE = (
    "I'm your shopping assistant! I can help with sizing, finding products, "
    "returns, delivery, and care instructions. What would you like to know?"
)


def _rule_based_response(message: str) -> str:
    """Simple keyword matcher — works with zero API cost."""
    msg = message.lower()
    for keyword, response in _RULE_RESPONSES.items():
        if keyword in msg:
            return response
    # Generic product search hint
    if any(w in msg for w in ["bra", "panty", "panties", "nightwear", "shapewear", "activewear"]):
        return (
            f"We have a great selection! Use the search bar or browse by category at the top. "
            f"You can filter by size, price, and colour to find exactly what you need."
        )
    return _DEFAULT_RESPONSE


# ── AI Shopping Assistant ─────────────────────────────────────────────────────

class AIAssistantService:
    """
    Conversational shopping assistant.

    Tier 1 (paid)  : Claude via Anthropic API
    Tier 2 (paid)  : GPT-4o-mini via OpenAI API
    Tier 3 (free)  : Rule-based keyword responses — always available
    """

    SYSTEM_PROMPT = (
        "You are a helpful, friendly shopping assistant for an Indian lingerie and innerwear brand. "
        "Help customers find the right products, understand sizing, care for their garments, "
        "and make confident purchase decisions. Be warm, body-positive, and informative. "
        "Keep responses concise (2–4 sentences). Do not make up product details."
    )

    async def chat(
        self,
        message: str,
        conversation_history: list[dict],
        product_context: Optional[str] = None,
    ) -> str:
        if not settings.ai_enabled:
            return _rule_based_response(message)

        system = self.SYSTEM_PROMPT
        if product_context:
            system += f"\n\nCurrently viewed product:\n{product_context}"

        messages = conversation_history[-10:] + [{"role": "user", "content": message}]

        if settings.ANTHROPIC_API_KEY:
            return await self._call_anthropic(system, messages)
        elif settings.OPENAI_API_KEY:
            return await self._call_openai(system, messages)

        return _rule_based_response(message)

    async def _call_anthropic(self, system: str, messages: list[dict]) -> str:
        try:
            import anthropic
            client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            response = await client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=512,
                system=system,
                messages=messages,
            )
            return response.content[0].text
        except Exception as exc:
            print(f"[WARN] Anthropic API failed: {exc}")
            return _rule_based_response(messages[-1]["content"])

    async def _call_openai(self, system: str, messages: list[dict]) -> str:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                max_tokens=512,
                messages=[{"role": "system", "content": system}] + messages,
            )
            return response.choices[0].message.content
        except Exception as exc:
            print(f"[WARN] OpenAI API failed: {exc}")
            return _rule_based_response(messages[-1]["content"])


# ── Recommendation Service ───────────────────────────────────────────────────

class RecommendationService:
    """
    Tier 1: pgvector cosine similarity (needs embeddings pre-computed)
    Tier 2: Same-category top-rated products (always free, always works)
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_similar_products(
        self,
        product_id: int,
        limit: int = 8,
    ) -> list[Product]:
        result = await self.db.execute(
            select(Product.embedding).where(Product.id == product_id)
        )
        row = result.first()

        if row and row[0] is not None:
            try:
                similar = await self.db.execute(
                    text("""
                        SELECT id FROM products
                        WHERE id != :pid
                          AND is_active = true
                          AND embedding IS NOT NULL
                        ORDER BY embedding <=> CAST(:emb AS vector)
                        LIMIT :lim
                    """),
                    {"pid": product_id, "emb": str(row[0]), "lim": limit},
                )
                ids = [r[0] for r in similar.fetchall()]
                if ids:
                    products = await self.db.execute(
                        select(Product).where(Product.id.in_(ids))
                    )
                    return products.scalars().all()
            except Exception as exc:
                print(f"[WARN] pgvector search failed, using fallback: {exc}")

        return await self._category_fallback(product_id, limit)

    async def _category_fallback(self, product_id: int, limit: int) -> list[Product]:
        source = await self.db.get(Product, product_id)
        if not source:
            return []
        result = await self.db.execute(
            select(Product)
            .where(
                Product.category_id == source.category_id,
                Product.id != product_id,
                Product.is_active == True,
            )
            .order_by(Product.avg_rating.desc(), Product.review_count.desc())
            .limit(limit)
        )
        return result.scalars().all()

    async def get_personalized_recommendations(
        self,
        user_id: int,
        limit: int = 12,
    ) -> list[Product]:
        """Phase 2: personalised. Currently returns top-rated as baseline."""
        result = await self.db.execute(
            select(Product)
            .where(Product.is_active == True)
            .order_by(Product.avg_rating.desc(), Product.review_count.desc())
            .limit(limit)
        )
        return result.scalars().all()


# ── Embedding Service (runs 100% locally, zero-spend) ────────────────────────

class EmbeddingService:
    """
    Uses sentence-transformers (all-MiniLM-L6-v2) — runs locally in Docker.
    Model is ~90MB, downloads once on first use.
    No external API. No cost.
    """

    _model = None

    @classmethod
    def _get_model(cls):
        if cls._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                cls._model = SentenceTransformer("all-MiniLM-L6-v2")
            except ImportError:
                print("[WARN] sentence-transformers not installed. Embeddings disabled.")
                return None
        return cls._model

    @classmethod
    def embed_product_text(cls, text: str) -> Optional[list[float]]:
        """Embed arbitrary text (used for semantic search queries)."""
        model = cls._get_model()
        if model is None:
            return None
        return model.encode(text).tolist()

    @classmethod
    def embed_product(cls, product: Product) -> Optional[list[float]]:
        model = cls._get_model()
        if model is None:
            return None
        text = " ".join(filter(None, [
            product.name,
            product.brand,
            product.description,
            " ".join(product.tags or []),
            product.color,
            product.material,
        ]))
        return model.encode(text).tolist()

    @classmethod
    async def update_product_embedding(cls, product: Product, db: AsyncSession) -> None:
        embedding = cls.embed_product(product)
        if embedding:
            product.embedding = embedding
            await db.flush()
