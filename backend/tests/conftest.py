# tests/conftest.py
import pytest
from app.core.config import settings

# Override settings for tests
settings.APP_ENV = "test"
settings.APP_DEBUG = False
settings.DATABASE_URL = "sqlite+aiosqlite:///./test.db"
settings.REDIS_URL = "redis://localhost:6379/15"
settings.JWT_SECRET_KEY = "test-secret-key-not-for-production"
settings.OTP_MAX_ATTEMPTS = 3
settings.OTP_LENGTH = 6
