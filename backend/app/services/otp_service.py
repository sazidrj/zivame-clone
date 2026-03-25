"""
app/services/otp_service.py
----------------------------
OTP lifecycle: generate → send → verify → invalidate.

Dispatch priority (zero-spend by default):
  SMS  : Twilio (if TWILIO_ACCOUNT_SID set) → console log
  Email: SendGrid (if SENDGRID_API_KEY set)
         → SMTP (if SMTP_HOST + SMTP_USER set)
         → console log

No paid keys needed to run in development.
OTP is always printed to server console as a fallback.
"""

import random
import smtplib
import string
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from enum import Enum

import redis.asyncio as aioredis

from app.core.config import settings


class OTPChannel(str, Enum):
    MOBILE = "mobile"
    EMAIL  = "email"


class OTPPurpose(str, Enum):
    LOGIN  = "login"
    SIGNUP = "signup"
    RESET  = "reset"


class OTPService:
    """Handles OTP lifecycle: generate → send → verify → invalidate."""

    def __init__(self, redis: aioredis.Redis):
        self.redis = redis

    @staticmethod
    def _otp_key(identifier: str, purpose: OTPPurpose) -> str:
        return f"otp:{purpose}:{identifier}"

    @staticmethod
    def _attempts_key(identifier: str, purpose: OTPPurpose) -> str:
        return f"otp_attempts:{purpose}:{identifier}"

    @staticmethod
    def _generate_otp() -> str:
        return "".join(random.choices(string.digits, k=settings.OTP_LENGTH))

    # ── Send OTP ─────────────────────────────────────────────────────────────
    async def send_otp(
        self,
        identifier: str,
        channel: OTPChannel,
        purpose: OTPPurpose,
    ) -> str:
        otp          = self._generate_otp()
        key          = self._otp_key(identifier, purpose)
        attempts_key = self._attempts_key(identifier, purpose)

        async with self.redis.pipeline(transaction=True) as pipe:
            pipe.setex(key, settings.OTP_EXPIRE_SECONDS, otp)
            pipe.delete(attempts_key)
            await pipe.execute()

        if channel == OTPChannel.MOBILE:
            await self._dispatch_sms(identifier, otp, purpose)
        else:
            await self._dispatch_email(identifier, otp, purpose)

        return otp

    # ── Verify OTP ───────────────────────────────────────────────────────────
    async def verify_otp(
        self,
        identifier: str,
        otp: str,
        purpose: OTPPurpose,
    ) -> tuple[bool, str]:
        key          = self._otp_key(identifier, purpose)
        attempts_key = self._attempts_key(identifier, purpose)

        attempts = await self.redis.get(attempts_key)
        if attempts and int(attempts) >= settings.OTP_MAX_ATTEMPTS:
            return False, "Too many attempts. Please request a new OTP."

        stored_otp = await self.redis.get(key)
        if not stored_otp:
            return False, "OTP expired or not found. Please request a new one."

        # Redis may return bytes — decode to string for comparison
        if isinstance(stored_otp, bytes):
            stored_otp = stored_otp.decode("utf-8")

        if stored_otp != otp:
            await self.redis.incr(attempts_key)
            await self.redis.expire(attempts_key, settings.OTP_EXPIRE_SECONDS)
            used = int(await self.redis.get(attempts_key) or 0)
            remaining = settings.OTP_MAX_ATTEMPTS - used
            return False, f"Invalid OTP. {remaining} attempt(s) remaining."

        await self.redis.delete(key, attempts_key)
        return True, "OTP verified successfully."

    # ── SMS dispatch: Twilio → console ───────────────────────────────────────
    async def _dispatch_sms(self, phone: str, otp: str, purpose: OTPPurpose) -> None:
        if settings.use_twilio:
            await self._send_twilio(phone, otp, purpose)
        else:
            self._console_otp("SMS", phone, otp, purpose)

    # ── Email dispatch: SendGrid → SMTP → console ────────────────────────────
    async def _dispatch_email(self, email: str, otp: str, purpose: OTPPurpose) -> None:
        if settings.use_sendgrid:
            await self._send_sendgrid(email, otp, purpose)
        elif settings.use_smtp:
            await self._send_smtp(email, otp, purpose)
        else:
            self._console_otp("EMAIL", email, otp, purpose)

    # ── Console log (zero-spend, always works) ───────────────────────────────
    @staticmethod
    def _console_otp(channel: str, dest: str, otp: str, purpose: OTPPurpose) -> None:
        border = "=" * 52
        print(f"\n{border}")
        print(f"  [OTP — {channel}]  {purpose.value.upper()}")
        print(f"  To      : {dest}")
        print(f"  OTP     : {otp}")
        print(f"  Expires : {settings.OTP_EXPIRE_SECONDS // 60} minutes")
        print(f"  Hint    : Use this OTP in the app to sign in.")
        print(f"{border}\n")

    # ── Twilio (paid) ────────────────────────────────────────────────────────
    async def _send_twilio(self, phone: str, otp: str, purpose: OTPPurpose) -> None:
        try:
            from twilio.rest import Client
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            client.messages.create(
                body=f"Your {purpose.value} OTP is {otp}. Valid for 5 minutes. Do not share.",
                from_=settings.TWILIO_PHONE_NUMBER,
                to=phone,
            )
        except Exception as exc:
            print(f"[WARN] Twilio SMS failed, falling back to console: {exc}")
            self._console_otp("SMS", phone, otp, purpose)

    # ── SendGrid (paid, 100/day free tier) ────────────────────────────────────
    async def _send_sendgrid(self, email: str, otp: str, purpose: OTPPurpose) -> None:
        try:
            import sendgrid
            from sendgrid.helpers.mail import Mail
            sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
            sg.send(Mail(
                from_email=(settings.SENDGRID_FROM_EMAIL, settings.SENDGRID_FROM_NAME),
                to_emails=email,
                subject=f"Your {purpose.value.capitalize()} OTP",
                html_content=_otp_email_html(otp, purpose.value),
            ))
        except Exception as exc:
            print(f"[WARN] SendGrid failed, trying SMTP: {exc}")
            if settings.use_smtp:
                await self._send_smtp(email, otp, purpose)
            else:
                self._console_otp("EMAIL", email, otp, purpose)

    # ── SMTP (free — Gmail App Password, Mailtrap, etc.) ─────────────────────
    async def _send_smtp(self, email: str, otp: str, purpose: OTPPurpose) -> None:
        try:
            msg            = MIMEMultipart("alternative")
            msg["Subject"] = f"Your {purpose.value.capitalize()} OTP"
            msg["From"]    = f"{settings.SENDGRID_FROM_NAME} <{settings.SMTP_USER}>"
            msg["To"]      = email
            msg.attach(MIMEText(_otp_email_html(otp, purpose.value), "html"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                if settings.SMTP_USE_TLS:
                    server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_USER, email, msg.as_string())
        except Exception as exc:
            print(f"[WARN] SMTP failed, falling back to console: {exc}")
            self._console_otp("EMAIL", email, otp, purpose)


# ── Shared HTML email template ────────────────────────────────────────────────
def _otp_email_html(otp: str, purpose: str) -> str:
    return f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
      <h2 style="color:#db2777;margin-bottom:8px">Your OTP</h2>
      <p style="color:#374151">
        Your one-time password for <strong>{purpose}</strong> is:
      </p>
      <div style="font-size:40px;font-weight:900;letter-spacing:10px;
                  color:#db2777;padding:24px 0;text-align:center;
                  background:#fdf2f8;border-radius:12px;margin:16px 0">
        {otp}
      </div>
      <p style="color:#6b7280;font-size:13px;margin-top:8px">
        Valid for {settings.OTP_EXPIRE_SECONDS // 60} minutes.
        Do not share this code with anyone.
        If you did not request this, please ignore this message.
      </p>
    </div>
    """