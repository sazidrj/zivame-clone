"""
app/tasks.py
-------------
Celery background tasks — all degrade gracefully when paid keys are absent.

send_otp_sms_task    → Twilio (if configured) else console log
send_otp_email_task  → SendGrid → SMTP → console log
send_order_confirmation_task → same email chain
embed_product_task   → sentence-transformers (local, free)
"""

import asyncio
from app.core.celery_app import celery_app
from app.core.config import settings


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def send_otp_sms_task(self, phone: str, otp: str, purpose: str):
    if settings.use_twilio:
        try:
            from twilio.rest import Client
            Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN).messages.create(
                body=f"Your {purpose} OTP is {otp}. Valid for 5 minutes. Do not share.",
                from_=settings.TWILIO_PHONE_NUMBER,
                to=phone,
            )
        except Exception as exc:
            raise self.retry(exc=exc)
    else:
        _console_otp("SMS", phone, otp, purpose)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def send_otp_email_task(self, email: str, otp: str, purpose: str):
    if settings.use_sendgrid:
        _send_via_sendgrid(email, otp, purpose, self)
    elif settings.use_smtp:
        _send_via_smtp(email, otp, purpose, self)
    else:
        _console_otp("EMAIL", email, otp, purpose)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_order_confirmation_task(self, order_id: int, user_email: str, user_name: str):
    html = f"""
    <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px">
      <h2 style="color:#db2777">Order Confirmed 🎉</h2>
      <p>Hi {user_name or 'there'},</p>
      <p>Your order <strong>#{order_id}</strong> has been confirmed.
         Expected delivery in 3–5 business days.</p>
    </div>
    """
    if settings.use_sendgrid:
        try:
            import sendgrid
            from sendgrid.helpers.mail import Mail
            sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
            sg.send(Mail(
                from_email=(settings.SENDGRID_FROM_EMAIL, settings.SENDGRID_FROM_NAME),
                to_emails=user_email,
                subject=f"Order #{order_id} Confirmed!",
                html_content=html,
            ))
        except Exception as exc:
            raise self.retry(exc=exc)
    elif settings.use_smtp:
        _send_via_smtp(user_email, f"#{order_id} confirmed", "order", self, html_override=html)
    else:
        print(f"[ORDER CONFIRMED] #{order_id} → {user_email} ({user_name})")


@celery_app.task(bind=True, max_retries=2)
def embed_product_task(self, product_id: int):
    """Compute and store product embedding using local sentence-transformers (free)."""
    async def _run():
        from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
        from app.models.product import Product
        from app.services.ai_service import EmbeddingService

        engine  = create_async_engine(settings.DATABASE_URL, echo=False)
        Session = async_sessionmaker(engine, expire_on_commit=False)
        async with Session() as session:
            product = await session.get(Product, product_id)
            if product:
                embedding = EmbeddingService.embed_product(product)
                if embedding:
                    product.embedding = embedding
                    await session.commit()
        await engine.dispose()

    try:
        asyncio.run(_run())
    except Exception as exc:
        raise self.retry(exc=exc)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _console_otp(channel: str, dest: str, otp: str, purpose: str) -> None:
    border = "=" * 52
    print(f"\n{border}")
    print(f"  [OTP — {channel}]  {purpose.upper()}")
    print(f"  To      : {dest}")
    print(f"  OTP     : {otp}")
    print(f"  Expires : {settings.OTP_EXPIRE_SECONDS // 60} minutes")
    print(f"{border}\n")


def _send_via_sendgrid(email: str, otp: str, purpose: str, task, html_override: str = "") -> None:
    try:
        import sendgrid
        from sendgrid.helpers.mail import Mail
        from app.services.otp_service import _otp_email_html
        sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
        sg.send(Mail(
            from_email=(settings.SENDGRID_FROM_EMAIL, settings.SENDGRID_FROM_NAME),
            to_emails=email,
            subject=f"Your {purpose.capitalize()} OTP",
            html_content=html_override or _otp_email_html(otp, purpose),
        ))
    except Exception as exc:
        raise task.retry(exc=exc)


def _send_via_smtp(email: str, otp: str, purpose: str, task, html_override: str = "") -> None:
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from app.services.otp_service import _otp_email_html
    try:
        msg            = MIMEMultipart("alternative")
        msg["Subject"] = f"Your {purpose.capitalize()} OTP"
        msg["From"]    = f"{settings.SENDGRID_FROM_NAME} <{settings.SMTP_USER}>"
        msg["To"]      = email
        msg.attach(MIMEText(html_override or _otp_email_html(otp, purpose), "html"))
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, email, msg.as_string())
    except Exception as exc:
        raise task.retry(exc=exc)
