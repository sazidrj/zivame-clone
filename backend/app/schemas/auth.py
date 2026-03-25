"""
app/schemas/auth.py
--------------------
Pydantic v2 request/response schemas for authentication.
"""

import re
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator


# ── Request Schemas ───────────────────────────────────────────────────────────

class SendOTPRequest(BaseModel):
    """Send OTP to mobile or email."""
    identifier: str  # phone number or email
    channel: str     # "mobile" | "email"
    purpose: str     # "login" | "signup" | "reset"

    @field_validator("identifier")
    @classmethod
    def validate_identifier(cls, v: str, info) -> str:
        # Will be validated more strictly in the endpoint based on channel
        return v.strip()

    @field_validator("channel")
    @classmethod
    def validate_channel(cls, v: str) -> str:
        if v not in ("mobile", "email"):
            raise ValueError("channel must be 'mobile' or 'email'")
        return v

    @field_validator("purpose")
    @classmethod
    def validate_purpose(cls, v: str) -> str:
        if v not in ("login", "signup", "reset"):
            raise ValueError("purpose must be 'login', 'signup', or 'reset'")
        return v


class VerifyOTPRequest(BaseModel):
    """Verify OTP and issue JWT."""
    identifier: str
    otp: str
    channel: str
    purpose: str

    @field_validator("otp")
    @classmethod
    def validate_otp(cls, v: str) -> str:
        if not v.isdigit() or len(v) != 6:
            raise ValueError("OTP must be a 6-digit number")
        return v


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UpdateProfileRequest(BaseModel):
    full_name: str
    email: Optional[EmailStr] = None


# ── Response Schemas ──────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: int
    is_new_user: bool = False


class OTPSentResponse(BaseModel):
    message: str
    expires_in: int  # seconds


class UserResponse(BaseModel):
    id: int
    email: Optional[str] = None
    phone: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_verified: bool
    role: str

    model_config = {"from_attributes": True}
