"""
app/api/v1/endpoints/payments.py
----------------------------------
Razorpay payment flow (zero-spend: not required, COD works without this):
  POST /payments/create-order     — Create Razorpay order
  POST /payments/verify           — Verify payment signature, mark order paid
  POST /payments/webhook          — Razorpay webhook for async status updates

To enable Razorpay:
  1. Create account at razorpay.com (free)
  2. Add to .env:  RAZORPAY_KEY_ID=rzp_test_xxx  RAZORPAY_KEY_SECRET=xxx
  3. Uncomment RAZORPAY settings in config.py

If keys are blank, all endpoints return a helpful "not configured" message.
"""

import hashlib
import hmac
import json

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select

from app.core.config import settings
from app.core.dependencies import CurrentUser, DBSession
from app.models.order import Order
from app.tasks import send_order_confirmation_task

router = APIRouter(prefix="/payments", tags=["Payments"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class CreatePaymentOrderRequest(BaseModel):
    order_id: int  # Our internal order ID


class CreatePaymentOrderResponse(BaseModel):
    razorpay_order_id: str
    amount: int          # In paise (multiply ₹ by 100)
    currency: str
    key_id: str


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    internal_order_id: int


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/create-order", response_model=CreatePaymentOrderResponse)
async def create_payment_order(
    payload: CreatePaymentOrderRequest,
    current_user: CurrentUser,
    db: DBSession,
):
    """Create a Razorpay order for an existing internal order."""
    _require_razorpay()

    result = await db.execute(
        select(Order).where(Order.id == payload.order_id, Order.user_id == current_user.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.payment_status == "paid":
        raise HTTPException(status_code=400, detail="Order already paid")

    import razorpay
    client = razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )
    rz_order = client.order.create({
        "amount": int(order.total_amount * 100),  # paise
        "currency": "INR",
        "receipt": f"order_{order.id}",
        "notes": {"internal_order_id": str(order.id)},
    })

    order.razorpay_order_id = rz_order["id"]
    await db.flush()

    return CreatePaymentOrderResponse(
        razorpay_order_id=rz_order["id"],
        amount=rz_order["amount"],
        currency=rz_order["currency"],
        key_id=settings.RAZORPAY_KEY_ID,
    )


@router.post("/verify")
async def verify_payment(
    payload: VerifyPaymentRequest,
    current_user: CurrentUser,
    db: DBSession,
    background_tasks: BackgroundTasks,
):
    """Verify Razorpay payment signature and mark order as paid."""
    _require_razorpay()

    # Verify HMAC signature
    body = f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}"
    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        body.encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, payload.razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    result = await db.execute(
        select(Order).where(
            Order.id == payload.internal_order_id,
            Order.user_id == current_user.id,
        )
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.payment_status = "paid"
    order.status = "confirmed"
    await db.flush()

    # Send confirmation email in background
    if current_user.email:
        background_tasks.add_task(
            send_order_confirmation_task.delay,
            order.id,
            current_user.email,
            current_user.full_name or "",
        )

    return {"message": "Payment verified", "order_id": order.id, "status": "paid"}


@router.post("/webhook")
async def razorpay_webhook(request: Request, db: DBSession):
    """
    Razorpay sends async payment status updates here.
    Configure in Razorpay dashboard: Settings → Webhooks → Add URL.
    """
    _require_razorpay()

    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    # Verify webhook signature
    expected = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event = json.loads(body)
    event_type = event.get("event")

    if event_type == "payment.captured":
        rz_order_id = event["payload"]["payment"]["entity"].get("order_id")
        if rz_order_id:
            result = await db.execute(
                select(Order).where(Order.razorpay_order_id == rz_order_id)
            )
            order = result.scalar_one_or_none()
            if order and order.payment_status != "paid":
                order.payment_status = "paid"
                order.status = "confirmed"

    elif event_type == "payment.failed":
        rz_order_id = event["payload"]["payment"]["entity"].get("order_id")
        if rz_order_id:
            result = await db.execute(
                select(Order).where(Order.razorpay_order_id == rz_order_id)
            )
            order = result.scalar_one_or_none()
            if order:
                order.payment_status = "failed"

    return {"status": "ok"}


# ── Helper ────────────────────────────────────────────────────────────────────

def _require_razorpay() -> None:
    if not getattr(settings, "RAZORPAY_KEY_ID", "") or not getattr(settings, "RAZORPAY_KEY_SECRET", ""):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Razorpay is not configured. "
                "Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env to enable. "
                "Cash on Delivery works without this."
            ),
        )
