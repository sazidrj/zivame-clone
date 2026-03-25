"""
app/schemas/product.py
"""

from typing import Optional
from pydantic import BaseModel


class ProductImageOut(BaseModel):
    id: int
    url: str
    alt_text: Optional[str] = None
    is_primary: bool

    model_config = {"from_attributes": True}


class CategoryOut(BaseModel):
    id: int
    name: str
    slug: str
    image_url: Optional[str] = None

    model_config = {"from_attributes": True}


class ProductListItem(BaseModel):
    """Lightweight product for listing pages."""
    id: int
    name: str
    slug: str
    brand: Optional[str] = None
    price: float
    mrp: Optional[float] = None
    discount_percent: Optional[float] = None
    avg_rating: float
    review_count: int
    primary_image_url: Optional[str] = None
    color: Optional[str] = None

    model_config = {"from_attributes": True}


class ProductDetail(BaseModel):
    """Full product detail."""
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    brand: Optional[str] = None
    price: float
    mrp: Optional[float] = None
    discount_percent: Optional[float] = None
    sku: Optional[str] = None
    stock_quantity: int
    color: Optional[str] = None
    sizes: Optional[dict] = None
    material: Optional[str] = None
    care_instructions: Optional[str] = None
    tags: Optional[list] = None
    avg_rating: float
    review_count: int
    images: list[ProductImageOut] = []
    category: Optional[CategoryOut] = None
    color_variants: Optional[list] = None  # computed at runtime from siblings, not stored in DB

    model_config = {"from_attributes": True}


class ProductFilterParams(BaseModel):
    """Query params for product listing."""
    category_slug: Optional[str] = None
    brand: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    sizes: Optional[str] = None   # comma-separated: "32B,34C"
    color: Optional[str] = None
    sort: Optional[str] = "popularity"  # popularity | price_asc | price_desc | newest | rating
    page: int = 1
    limit: int = 24
    search: Optional[str] = None


class PaginatedProducts(BaseModel):
    items: list[ProductListItem]
    total: int
    page: int
    limit: int
    pages: int