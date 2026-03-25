"""
app/main.py
-----------
FastAPI application factory with lifespan, middleware, and router registration.
Local static files are served from LOCAL_STORAGE_PATH when S3 is not configured.
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api.v1.endpoints import auth, products, ai, cart, orders, reviews, admin, wishlist, addresses, uploads, coupons, search, payments


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure local upload directory exists (used when S3 is not configured)
    Path(settings.LOCAL_STORAGE_PATH).mkdir(parents=True, exist_ok=True)
    print(f"[STARTUP] {settings.APP_NAME} — {settings.APP_ENV}")
    print(f"[STARTUP] Images  : {'AWS S3' if settings.use_s3 else 'Local disk → ' + settings.LOCAL_STORAGE_PATH}")
    print(f"[STARTUP] AI      : {'Claude/OpenAI enabled' if settings.ai_enabled else 'Rule-based (set ANTHROPIC_API_KEY to enable)'}")
    print(f"[STARTUP] SMS OTP : {'Twilio' if settings.use_twilio else 'Console log (set TWILIO_ACCOUNT_SID to enable)'}")
    email_mode = "SendGrid" if settings.use_sendgrid else ("SMTP" if settings.use_smtp else "Console log")
    print(f"[STARTUP] Email   : {email_mode}")
    yield
    print("[SHUTDOWN] Cleaning up...")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version="1.0.0",
        docs_url="/docs" if settings.APP_DEBUG else None,
        redoc_url="/redoc" if settings.APP_DEBUG else None,
        lifespan=lifespan,
    )

    # ── Middleware ────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # ── Serve local uploads at /static/uploads (zero-spend image storage) ────
    upload_path = Path(settings.LOCAL_STORAGE_PATH)
    upload_path.mkdir(parents=True, exist_ok=True)
    app.mount("/static/uploads", StaticFiles(directory=str(upload_path)), name="uploads")

    # ── API Routes ────────────────────────────────────────────────────────────
    prefix = settings.API_V1_PREFIX
    app.include_router(auth.router,      prefix=prefix)
    app.include_router(products.router,  prefix=prefix)
    app.include_router(ai.router,        prefix=prefix)
    app.include_router(cart.router,      prefix=prefix)
    app.include_router(orders.router,    prefix=prefix)
    app.include_router(reviews.router,   prefix=prefix)
    app.include_router(admin.router,     prefix=prefix)
    app.include_router(wishlist.router,  prefix=prefix)
    app.include_router(addresses.router, prefix=prefix)
    app.include_router(uploads.router,   prefix=prefix)
    app.include_router(coupons.router,   prefix=prefix)
    app.include_router(search.router,    prefix=prefix)
    app.include_router(payments.router,  prefix=prefix)

    # ── Health + status endpoint ──────────────────────────────────────────────
    @app.get("/health", tags=["System"])
    async def health():
        return {
            "status": "ok",
            "env": settings.APP_ENV,
            "services": {
                "images":  "s3" if settings.use_s3 else "local",
                "ai":      "enabled" if settings.ai_enabled else "rule-based",
                "sms":     "twilio" if settings.use_twilio else "console",
                "email":   "sendgrid" if settings.use_sendgrid else ("smtp" if settings.use_smtp else "console"),
            },
        }

    return app


app = create_app()
