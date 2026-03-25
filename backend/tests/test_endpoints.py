"""
tests/test_endpoints.py
------------------------
Integration tests for cart, wishlist, address, and order endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock

from app.main import app
from app.core.security import create_access_token

client = TestClient(app)


def auth_header(user_id: int = 1, role: str = "user") -> dict:
    token = create_access_token(user_id, role)
    return {"Authorization": f"Bearer {token}"}


# ── Products ──────────────────────────────────────────────────────────────────

class TestProductEndpoints:
    def test_list_products_returns_paginated(self):
        r = client.get("/api/v1/products")
        assert r.status_code == 200
        body = r.json()
        assert "items" in body
        assert "total" in body
        assert "page" in body
        assert "pages" in body
        assert isinstance(body["items"], list)

    def test_list_products_default_limit(self):
        r = client.get("/api/v1/products")
        assert r.status_code == 200
        # Default limit is 24
        assert len(r.json()["items"]) <= 24

    def test_list_products_custom_limit(self):
        r = client.get("/api/v1/products?limit=5")
        assert r.status_code == 200
        assert len(r.json()["items"]) <= 5

    def test_list_products_sort_options(self):
        for sort in ["popularity", "price_asc", "price_desc", "newest", "rating"]:
            r = client.get(f"/api/v1/products?sort={sort}")
            assert r.status_code == 200, f"Sort '{sort}' failed"

    def test_list_products_invalid_sort(self):
        r = client.get("/api/v1/products?sort=random")
        assert r.status_code == 422

    def test_list_products_price_filter(self):
        r = client.get("/api/v1/products?min_price=100&max_price=500")
        assert r.status_code == 200

    def test_list_products_search(self):
        r = client.get("/api/v1/products?search=bra")
        assert r.status_code == 200

    def test_get_product_not_found(self):
        r = client.get("/api/v1/products/nonexistent-slug-xyz-999")
        assert r.status_code == 404

    def test_list_categories(self):
        r = client.get("/api/v1/products/categories")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ── Auth ──────────────────────────────────────────────────────────────────────

class TestAuthEndpoints:
    def test_send_otp_mobile_valid(self):
        with patch("app.services.otp_service.OTPService._dispatch_sms", new_callable=AsyncMock):
            r = client.post("/api/v1/auth/send-otp", json={
                "identifier": "+919876543210",
                "channel": "mobile",
                "purpose": "login",
            })
        assert r.status_code == 200
        assert "expires_in" in r.json()

    def test_send_otp_email_valid(self):
        with patch("app.services.otp_service.OTPService._dispatch_email", new_callable=AsyncMock):
            r = client.post("/api/v1/auth/send-otp", json={
                "identifier": "user@test.com",
                "channel": "email",
                "purpose": "signup",
            })
        assert r.status_code == 200

    def test_send_otp_invalid_phone(self):
        r = client.post("/api/v1/auth/send-otp", json={
            "identifier": "123",
            "channel": "mobile",
            "purpose": "login",
        })
        assert r.status_code == 422

    def test_send_otp_invalid_email(self):
        r = client.post("/api/v1/auth/send-otp", json={
            "identifier": "not-an-email",
            "channel": "email",
            "purpose": "login",
        })
        assert r.status_code == 422

    def test_send_otp_bad_channel(self):
        r = client.post("/api/v1/auth/send-otp", json={
            "identifier": "+919876543210",
            "channel": "carrier_pigeon",
            "purpose": "login",
        })
        assert r.status_code == 422

    def test_send_otp_bad_purpose(self):
        r = client.post("/api/v1/auth/send-otp", json={
            "identifier": "+919876543210",
            "channel": "mobile",
            "purpose": "hack",
        })
        assert r.status_code == 422

    def test_verify_otp_wrong_format(self):
        r = client.post("/api/v1/auth/verify-otp", json={
            "identifier": "+919876543210",
            "otp": "abc",
            "channel": "mobile",
            "purpose": "login",
        })
        assert r.status_code == 422

    def test_get_me_without_token(self):
        r = client.get("/api/v1/auth/me")
        assert r.status_code == 403

    def test_refresh_invalid_token(self):
        r = client.post("/api/v1/auth/refresh", json={"refresh_token": "not.a.real.token"})
        assert r.status_code == 401


# ── Cart (requires auth) ──────────────────────────────────────────────────────

class TestCartEndpoints:
    def test_get_cart_without_auth(self):
        r = client.get("/api/v1/cart")
        assert r.status_code == 403

    def test_add_to_cart_without_auth(self):
        r = client.post("/api/v1/cart/items", json={"product_id": 1, "quantity": 1})
        assert r.status_code == 403

    def test_add_invalid_product_to_cart(self):
        r = client.post(
            "/api/v1/cart/items",
            json={"product_id": 99999, "quantity": 1},
            headers=auth_header(),
        )
        assert r.status_code == 404

    def test_add_invalid_quantity(self):
        r = client.post(
            "/api/v1/cart/items",
            json={"product_id": 1, "quantity": 0},
            headers=auth_header(),
        )
        # 0 quantity should be rejected or treated as invalid
        assert r.status_code in (400, 422)


# ── Wishlist ──────────────────────────────────────────────────────────────────

class TestWishlistEndpoints:
    def test_get_wishlist_without_auth(self):
        r = client.get("/api/v1/wishlist")
        assert r.status_code == 403

    def test_add_nonexistent_product_to_wishlist(self):
        r = client.post("/api/v1/wishlist/99999", headers=auth_header())
        assert r.status_code == 404

    def test_check_wishlist_without_auth(self):
        r = client.get("/api/v1/wishlist/1/check")
        assert r.status_code == 403


# ── Orders ────────────────────────────────────────────────────────────────────

class TestOrderEndpoints:
    def test_list_orders_without_auth(self):
        r = client.get("/api/v1/orders")
        assert r.status_code == 403

    def test_create_order_empty_cart(self):
        r = client.post(
            "/api/v1/orders",
            json={
                "shipping_address": {
                    "full_name": "Test User",
                    "phone": "9876543210",
                    "line1": "123 Main St",
                    "city": "Mumbai",
                    "state": "Maharashtra",
                    "pincode": "400001",
                },
                "payment_method": "cod",
            },
            headers=auth_header(),
        )
        assert r.status_code == 400
        assert "empty" in r.json()["detail"].lower()

    def test_cancel_nonexistent_order(self):
        r = client.post("/api/v1/orders/99999/cancel", headers=auth_header())
        assert r.status_code == 404


# ── Addresses ─────────────────────────────────────────────────────────────────

class TestAddressEndpoints:
    def test_list_addresses_without_auth(self):
        r = client.get("/api/v1/addresses")
        assert r.status_code == 403

    def test_delete_nonexistent_address(self):
        r = client.delete("/api/v1/addresses/99999", headers=auth_header())
        assert r.status_code == 404


# ── AI ────────────────────────────────────────────────────────────────────────

class TestAIEndpoints:
    def test_chat_rule_based_size(self):
        r = client.post("/api/v1/ai/chat", json={
            "message": "How do I find my bra size?",
            "history": [],
        })
        assert r.status_code == 200
        assert "reply" in r.json()
        # Rule-based response should mention sizing info
        assert len(r.json()["reply"]) > 10

    def test_chat_rule_based_return(self):
        r = client.post("/api/v1/ai/chat", json={
            "message": "What is your return policy?",
            "history": [],
        })
        assert r.status_code == 200

    def test_chat_with_history(self):
        r = client.post("/api/v1/ai/chat", json={
            "message": "Tell me more",
            "history": [
                {"role": "user", "content": "What sizes do you have?"},
                {"role": "assistant", "content": "We have sizes 32A to 42DD."},
            ],
        })
        assert r.status_code == 200

    def test_recommendations_nonexistent_product(self):
        r = client.get("/api/v1/ai/recommendations/99999")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ── System ────────────────────────────────────────────────────────────────────

class TestSystem:
    def test_health(self):
        r = client.get("/health")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "ok"
        assert "services" in body

    def test_health_services_structure(self):
        r = client.get("/health")
        services = r.json()["services"]
        assert "images" in services
        assert "ai" in services
        assert "sms" in services
        assert "email" in services
