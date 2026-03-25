"""
tests/test_auth.py
-------------------
Integration tests for authentication endpoints.
Uses an in-memory SQLite + fakeredis for isolation.
"""

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock

from app.main import app

client = TestClient(app)


class FakeRedis:
    """Simple in-memory Redis stub for tests."""
    def __init__(self):
        self._store: dict = {}
        self._counters: dict = {}

    async def setex(self, key, ttl, value):
        self._store[key] = value

    async def get(self, key):
        return self._store.get(key)

    async def delete(self, *keys):
        for k in keys:
            self._store.pop(k, None)
            self._counters.pop(k, None)

    async def incr(self, key):
        self._counters[key] = self._counters.get(key, 0) + 1
        return self._counters[key]

    async def expire(self, key, ttl):
        pass

    def pipeline(self, transaction=True):
        return FakePipeline(self)


class FakePipeline:
    def __init__(self, redis: FakeRedis):
        self._redis = redis
        self._ops = []

    def setex(self, key, ttl, value):
        self._ops.append(("setex", key, ttl, value))
        return self

    def delete(self, key):
        self._ops.append(("delete", key))
        return self

    async def execute(self):
        for op in self._ops:
            if op[0] == "setex":
                await self._redis.setex(op[1], op[2], op[3])
            elif op[0] == "delete":
                await self._redis.delete(op[1])

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.execute()


@pytest.fixture
def fake_redis():
    return FakeRedis()


@pytest.fixture
def override_redis(fake_redis):
    from app.core.dependencies import get_redis
    app.dependency_overrides[get_redis] = lambda: fake_redis
    yield fake_redis
    app.dependency_overrides.clear()


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestSendOTP:
    def test_send_otp_mobile_success(self, override_redis):
        with patch("app.services.otp_service.OTPService._send_sms", new_callable=AsyncMock):
            response = client.post("/api/v1/auth/send-otp", json={
                "identifier": "+919876543210",
                "channel": "mobile",
                "purpose": "login",
            })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["expires_in"] > 0

    def test_send_otp_email_success(self, override_redis):
        with patch("app.services.otp_service.OTPService._send_email", new_callable=AsyncMock):
            response = client.post("/api/v1/auth/send-otp", json={
                "identifier": "test@example.com",
                "channel": "email",
                "purpose": "login",
            })
        assert response.status_code == 200

    def test_send_otp_invalid_phone(self, override_redis):
        response = client.post("/api/v1/auth/send-otp", json={
            "identifier": "12345",
            "channel": "mobile",
            "purpose": "login",
        })
        assert response.status_code == 422

    def test_send_otp_invalid_email(self, override_redis):
        response = client.post("/api/v1/auth/send-otp", json={
            "identifier": "not-an-email",
            "channel": "email",
            "purpose": "login",
        })
        assert response.status_code == 422

    def test_send_otp_invalid_channel(self):
        response = client.post("/api/v1/auth/send-otp", json={
            "identifier": "+919876543210",
            "channel": "telegram",
            "purpose": "login",
        })
        assert response.status_code == 422


class TestOTPService:
    """Unit tests for OTPService business logic."""

    @pytest.mark.asyncio
    async def test_generate_and_verify_otp(self):
        from app.services.otp_service import OTPService, OTPChannel, OTPPurpose

        redis = FakeRedis()
        svc = OTPService(redis)

        with patch.object(svc, "_send_sms", new_callable=AsyncMock):
            otp = await svc.send_otp("+919876543210", OTPChannel.MOBILE, OTPPurpose.LOGIN)

        success, msg = await svc.verify_otp("+919876543210", otp, OTPPurpose.LOGIN)
        assert success is True

    @pytest.mark.asyncio
    async def test_wrong_otp_increments_attempts(self):
        from app.services.otp_service import OTPService, OTPChannel, OTPPurpose
        from app.core.config import settings

        redis = FakeRedis()
        svc = OTPService(redis)

        with patch.object(svc, "_send_sms", new_callable=AsyncMock):
            await svc.send_otp("+919876543210", OTPChannel.MOBILE, OTPPurpose.LOGIN)

        success, msg = await svc.verify_otp("+919876543210", "000000", OTPPurpose.LOGIN)
        assert success is False
        assert "Invalid" in msg

    @pytest.mark.asyncio
    async def test_otp_one_time_use(self):
        from app.services.otp_service import OTPService, OTPChannel, OTPPurpose

        redis = FakeRedis()
        svc = OTPService(redis)

        with patch.object(svc, "_send_email", new_callable=AsyncMock):
            otp = await svc.send_otp("test@example.com", OTPChannel.EMAIL, OTPPurpose.LOGIN)

        # First use — success
        ok, _ = await svc.verify_otp("test@example.com", otp, OTPPurpose.LOGIN)
        assert ok is True

        # Second use — should fail (OTP deleted)
        ok2, msg2 = await svc.verify_otp("test@example.com", otp, OTPPurpose.LOGIN)
        assert ok2 is False

    @pytest.mark.asyncio
    async def test_lockout_after_max_attempts(self):
        from app.services.otp_service import OTPService, OTPChannel, OTPPurpose
        from app.core.config import settings

        redis = FakeRedis()
        svc = OTPService(redis)

        with patch.object(svc, "_send_sms", new_callable=AsyncMock):
            await svc.send_otp("+919876543210", OTPChannel.MOBILE, OTPPurpose.LOGIN)

        # Exhaust all attempts
        for _ in range(settings.OTP_MAX_ATTEMPTS):
            await svc.verify_otp("+919876543210", "000000", OTPPurpose.LOGIN)

        # Should now be locked out
        success, msg = await svc.verify_otp("+919876543210", "000000", OTPPurpose.LOGIN)
        assert success is False
        assert "Too many" in msg


class TestProducts:
    def test_list_products(self):
        response = client.get("/api/v1/products")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data

    def test_list_products_with_filters(self):
        response = client.get("/api/v1/products?sort=price_asc&limit=5&page=1")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) <= 5

    def test_list_products_invalid_sort(self):
        response = client.get("/api/v1/products?sort=invalid")
        assert response.status_code == 422

    def test_get_product_not_found(self):
        response = client.get("/api/v1/products/nonexistent-slug-xyz")
        assert response.status_code == 404

    def test_list_categories(self):
        response = client.get("/api/v1/products/categories")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestHealthCheck:
    def test_health(self):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
