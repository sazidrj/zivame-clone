"""
app/core/rate_limit.py
-----------------------
Sliding-window rate limiter using Redis.
Used on OTP send endpoints to prevent abuse.

Usage in route:
    @router.post("/send-otp")
    async def send_otp(
        payload: SendOTPRequest,
        redis: RedisClient,
        _: None = Depends(rate_limit("otp", max_requests=5, window_seconds=60)),
    ):
"""

from fastapi import Depends, HTTPException, Request, status
from typing import Callable

import redis.asyncio as aioredis

from app.core.dependencies import get_redis


def rate_limit(
    namespace: str,
    max_requests: int = 10,
    window_seconds: int = 60,
) -> Callable:
    """
    Returns a FastAPI dependency that enforces a sliding-window rate limit.
    Key is based on: namespace + client IP.
    Zero-spend: uses the same Redis instance already running for OTPs.
    """
    async def _limit(
        request: Request,
        redis: aioredis.Redis = Depends(get_redis),
    ) -> None:
        client_ip = (
            request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
            or request.client.host
            or "unknown"
        )
        key = f"ratelimit:{namespace}:{client_ip}"

        async with redis.pipeline(transaction=True) as pipe:
            pipe.incr(key)
            pipe.expire(key, window_seconds)
            results = await pipe.execute()

        count = results[0]
        if count > max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests. Try again in {window_seconds} seconds.",
                headers={"Retry-After": str(window_seconds)},
            )

    return _limit
