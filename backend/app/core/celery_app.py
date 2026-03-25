"""
app/core/celery_app.py
-----------------------
Celery application factory.
Workers run background tasks: OTP SMS/email, order notifications, embedding jobs.
"""

from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "zivame",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    # Retry failed tasks up to 3 times with exponential backoff
    task_default_retry_delay=60,
    task_max_retries=3,
)
