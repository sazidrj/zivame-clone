"""
app/api/v1/endpoints/auth.py
-----------------------------
Authentication endpoints:
  POST /auth/send-otp      — Send OTP via SMS or email
  POST /auth/verify-otp    — Verify OTP, issue JWT
  POST /auth/refresh        — Refresh access token
  GET  /auth/me             — Get current user
  PATCH /auth/me            — Update profile
  POST /auth/logout         — Invalidate refresh token
"""

import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

import redis.asyncio as aioredis

from app.core.config import settings
from app.core.dependencies import CurrentUser, DBSession, RedisClient
from app.core.rate_limit import rate_limit
from app.schemas.auth import (
    OTPSentResponse,
    RefreshTokenRequest,
    SendOTPRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserResponse,
    VerifyOTPRequest,
)
from app.services.auth_service import AuthService
from app.services.otp_service import OTPChannel, OTPPurpose, OTPService

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Helpers ───────────────────────────────────────────────────────────────────

PHONE_RE = re.compile(r"^\+?[1-9]\d{9,14}$")
EMAIL_RE = re.compile(r"^[^@]+@[^@]+\.[^@]+$")


def _validate_identifier(identifier: str, channel: str) -> str:
    if channel == "mobile":
        if not PHONE_RE.match(identifier):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid phone number format. Use E.164 format e.g. +919876543210",
            )
    else:
        if not EMAIL_RE.match(identifier):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid email address",
            )
    return identifier


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post(
    "/send-otp",
    response_model=OTPSentResponse,
    status_code=status.HTTP_200_OK,
    summary="Send OTP to mobile or email",
    dependencies=[Depends(rate_limit("otp_send", max_requests=5, window_seconds=60))],
)
async def send_otp(
    payload: SendOTPRequest,
    redis: RedisClient,
):
    identifier = _validate_identifier(payload.identifier, payload.channel)
    otp_svc = OTPService(redis)

    await otp_svc.send_otp(
        identifier=identifier,
        channel=OTPChannel(payload.channel),
        purpose=OTPPurpose(payload.purpose),
    )

    return OTPSentResponse(
        message=f"OTP sent to your {'phone' if payload.channel == 'mobile' else 'email'}",
        expires_in=settings.OTP_EXPIRE_SECONDS,
    )


@router.post(
    "/verify-otp",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify OTP and receive access + refresh tokens",
)
async def verify_otp(
    payload: VerifyOTPRequest,
    db: DBSession,
    redis: RedisClient,
):
    identifier = _validate_identifier(payload.identifier, payload.channel)
    otp_svc = OTPService(redis)
    auth_svc = AuthService(db)

    success, message = await otp_svc.verify_otp(
        identifier=identifier,
        otp=payload.otp,
        purpose=OTPPurpose(payload.purpose),
    )

    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)

    # Get or create user
    if payload.channel == "mobile":
        user, _ = await auth_svc.get_or_create_by_phone(identifier)
    else:
        user, _ = await auth_svc.get_or_create_by_email(identifier)

    return await auth_svc.issue_tokens(user)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token using refresh token",
)
async def refresh_token(
    payload: RefreshTokenRequest,
    db: DBSession,
):
    auth_svc = AuthService(db)
    tokens = await auth_svc.refresh_tokens(payload.refresh_token)
    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    return tokens


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user",
)
async def get_me(current_user: CurrentUser):
    return current_user


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Update user profile",
)
async def update_profile(
    payload: UpdateProfileRequest,
    current_user: CurrentUser,
    db: DBSession,
):
    auth_svc = AuthService(db)
    updated = await auth_svc.update_profile(
        user=current_user,
        full_name=payload.full_name,
        email=payload.email,
    )
    return updated
