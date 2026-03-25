"""
app/services/auth_service.py
-----------------------------
Business logic for user authentication.
Separates logic from route handlers for testability.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, create_refresh_token, verify_refresh_token
from app.models.user import User
from app.schemas.auth import TokenResponse


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── User Lookup ───────────────────────────────────────────────────────────
    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_phone(self, phone: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.phone == phone))
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: int) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    # ── Create / Activate ─────────────────────────────────────────────────────
    async def get_or_create_by_phone(self, phone: str) -> tuple[User, bool]:
        """Returns (user, is_new_user)."""
        user = await self.get_by_phone(phone)
        if user:
            return user, False
        user = User(phone=phone, is_verified=True)
        self.db.add(user)
        await self.db.flush()
        return user, True

    async def get_or_create_by_email(self, email: str) -> tuple[User, bool]:
        """Returns (user, is_new_user)."""
        user = await self.get_by_email(email)
        if user:
            return user, False
        user = User(email=email, is_verified=True)
        self.db.add(user)
        await self.db.flush()
        return user, True

    # ── Token Issuance ────────────────────────────────────────────────────────
    async def issue_tokens(self, user: User) -> TokenResponse:
        user.last_login_at = datetime.utcnow()
        await self.db.flush()
        return TokenResponse(
            access_token=create_access_token(user.id, user.role),
            refresh_token=create_refresh_token(user.id),
            token_type="bearer",
            user_id=user.id,
            is_new_user=not user.full_name,
        )

    # ── Refresh ───────────────────────────────────────────────────────────────
    async def refresh_tokens(self, refresh_token: str) -> Optional[TokenResponse]:
        payload = verify_refresh_token(refresh_token)
        if not payload:
            return None
        user = await self.get_by_id(int(payload["sub"]))
        if not user or not user.is_active:
            return None
        return await self.issue_tokens(user)

    # ── Profile Update ────────────────────────────────────────────────────────
    async def update_profile(self, user: User, full_name: str, email: Optional[str] = None) -> User:
        user.full_name = full_name
        if email and not user.email:
            user.email = email
        await self.db.flush()
        return user