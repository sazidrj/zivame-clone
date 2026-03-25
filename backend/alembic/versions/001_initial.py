"""Initial schema — all tables

Revision ID: 001_initial
Revises:
Create Date: 2025-03-21
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # categories
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(100), unique=True, nullable=False),
        sa.Column("slug", sa.String(100), unique=True, nullable=False),
        sa.Column("parent_id", sa.Integer, sa.ForeignKey("categories.id"), nullable=True),
        sa.Column("image_url", sa.String(500), nullable=True),
    )

    # users
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=True),
        sa.Column("phone", sa.String(15), unique=True, nullable=True),
        sa.Column("full_name", sa.String(255), nullable=True),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean, default=True),
        sa.Column("is_verified", sa.Boolean, default=False),
        sa.Column("role", sa.String(20), default="user"),
        sa.Column("avatar_url", sa.String(500), nullable=True),
        sa.Column("date_of_birth", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("last_login_at", sa.DateTime, nullable=True),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_phone", "users", ["phone"])

    # products
    from pgvector.sqlalchemy import Vector
    op.create_table(
        "products",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(300), nullable=False),
        sa.Column("slug", sa.String(300), unique=True, nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("brand", sa.String(100), nullable=True),
        sa.Column("price", sa.Float, nullable=False),
        sa.Column("mrp", sa.Float, nullable=True),
        sa.Column("discount_percent", sa.Float, nullable=True),
        sa.Column("sku", sa.String(100), unique=True, nullable=True),
        sa.Column("stock_quantity", sa.Integer, default=0),
        sa.Column("is_active", sa.Boolean, default=True),
        sa.Column("color", sa.String(50), nullable=True),
        sa.Column("sizes", postgresql.JSONB, nullable=True),
        sa.Column("material", sa.String(100), nullable=True),
        sa.Column("care_instructions", sa.Text, nullable=True),
        sa.Column("tags", postgresql.JSONB, nullable=True),
        sa.Column("avg_rating", sa.Float, default=0.0),
        sa.Column("review_count", sa.Integer, default=0),
        sa.Column("category_id", sa.Integer, sa.ForeignKey("categories.id"), nullable=True),
        sa.Column("embedding", Vector(384), nullable=True),
        sa.Column("source_url", sa.String(500), nullable=True),
        sa.Column("source_id", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("ix_products_slug",  "products", ["slug"])
    op.create_index("ix_products_brand", "products", ["brand"])
    op.execute(
        "CREATE INDEX ix_products_embedding ON products "
        "USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)"
    )

    # product_images
    op.create_table(
        "product_images",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("product_id", sa.Integer, sa.ForeignKey("products.id", ondelete="CASCADE")),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column("alt_text", sa.String(200), nullable=True),
        sa.Column("is_primary", sa.Boolean, default=False),
        sa.Column("sort_order", sa.Integer, default=0),
    )

    # orders
    op.create_table(
        "orders",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id")),
        sa.Column("status", sa.String(30), default="pending"),
        sa.Column("total_amount", sa.Float),
        sa.Column("discount_amount", sa.Float, default=0.0),
        sa.Column("shipping_amount", sa.Float, default=0.0),
        sa.Column("shipping_address", postgresql.JSONB, nullable=True),
        sa.Column("payment_status", sa.String(20), default="pending"),
        sa.Column("payment_method", sa.String(50), nullable=True),
        sa.Column("razorpay_order_id", sa.String(100), nullable=True),
        sa.Column("coupon_code", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )

    # order_items
    op.create_table(
        "order_items",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("order_id", sa.Integer, sa.ForeignKey("orders.id", ondelete="CASCADE")),
        sa.Column("product_id", sa.Integer, sa.ForeignKey("products.id")),
        sa.Column("quantity", sa.Integer, default=1),
        sa.Column("size", sa.String(20), nullable=True),
        sa.Column("unit_price", sa.Float),
        sa.Column("total_price", sa.Float),
    )

    # carts
    op.create_table(
        "carts",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), unique=True),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )

    # cart_items
    op.create_table(
        "cart_items",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("cart_id", sa.Integer, sa.ForeignKey("carts.id", ondelete="CASCADE")),
        sa.Column("product_id", sa.Integer, sa.ForeignKey("products.id")),
        sa.Column("quantity", sa.Integer, default=1),
        sa.Column("size", sa.String(20), nullable=True),
    )

    # reviews
    op.create_table(
        "reviews",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id")),
        sa.Column("product_id", sa.Integer, sa.ForeignKey("products.id")),
        sa.Column("rating", sa.Float),
        sa.Column("title", sa.String(200), nullable=True),
        sa.Column("body", sa.Text, nullable=True),
        sa.Column("is_verified_purchase", sa.Boolean, default=False),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    # wishlist_items
    op.create_table(
        "wishlist_items",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("product_id", sa.Integer, sa.ForeignKey("products.id", ondelete="CASCADE")),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "product_id", name="uq_wishlist_user_product"),
    )

    # addresses
    op.create_table(
        "addresses",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("full_name", sa.String(200)),
        sa.Column("phone", sa.String(15)),
        sa.Column("line1", sa.String(300)),
        sa.Column("line2", sa.String(300), nullable=True),
        sa.Column("city", sa.String(100)),
        sa.Column("state", sa.String(100)),
        sa.Column("pincode", sa.String(10)),
        sa.Column("country", sa.String(50), default="India"),
        sa.Column("is_default", sa.Boolean, default=False),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    # coupons
    op.create_table(
        "coupons",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("code", sa.String(50), unique=True, nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("discount_type", sa.String(10), default="percent"),
        sa.Column("discount_value", sa.Float),
        sa.Column("min_order_amount", sa.Float, default=0.0),
        sa.Column("max_discount", sa.Float, nullable=True),
        sa.Column("usage_limit", sa.Integer, nullable=True),
        sa.Column("usage_count", sa.Integer, default=0),
        sa.Column("per_user_limit", sa.Integer, default=1),
        sa.Column("is_active", sa.Boolean, default=True),
        sa.Column("valid_from", sa.DateTime, server_default=sa.func.now()),
        sa.Column("valid_until", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("ix_coupons_code", "coupons", ["code"])


def downgrade() -> None:
    for table in [
        "coupons", "addresses", "wishlist_items",
        "reviews", "cart_items", "carts",
        "order_items", "orders",
        "product_images", "products",
        "users", "categories",
    ]:
        op.drop_table(table)
