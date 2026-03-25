"""
app/services/storage_service.py
---------------------------------
Image upload: local disk (free) or AWS S3 (paid).
Auto-selects based on whether AWS keys are configured.
"""

import io
import os
import uuid
from pathlib import Path
from typing import Optional

from app.core.config import settings


class StorageService:

    async def upload_bytes(
        self,
        content: bytes,
        filename: str,
        content_type: str = "image/jpeg",
        folder: str = "products",
    ) -> str:
        """Upload raw bytes, return public URL."""
        ext      = Path(filename).suffix.lower() or ".jpg"
        key      = f"{folder}/{uuid.uuid4().hex}{ext}"

        if settings.use_s3:
            return await self._upload_s3(key, content, content_type)
        return await self._save_local(key, content)

    # ── AWS S3 ────────────────────────────────────────────────────────────────
    async def _upload_s3(self, key: str, content: bytes, content_type: str) -> str:
        try:
            import boto3
            s3 = boto3.client(
                "s3",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION,
            )
            s3.put_object(
                Bucket=settings.AWS_S3_BUCKET,
                Key=key,
                Body=content,
                ContentType=content_type,
                ACL="public-read",
            )
            return f"https://{settings.AWS_S3_BUCKET}.s3.{settings.AWS_S3_REGION}.amazonaws.com/{key}"
        except Exception as exc:
            print(f"[WARN] S3 upload failed, saving locally: {exc}")
            return await self._save_local(key, content)

    # ── Local disk ────────────────────────────────────────────────────────────
    async def _save_local(self, relative_path: str, content: bytes) -> str:
        full_path = Path(settings.LOCAL_STORAGE_PATH) / relative_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_bytes(content)
        return f"{settings.LOCAL_STORAGE_URL}/{relative_path}"

    async def delete(self, url: str) -> None:
        if settings.use_s3 and "amazonaws.com" in url:
            try:
                import boto3
                key = url.split(".amazonaws.com/")[-1]
                boto3.client(
                    "s3",
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                ).delete_object(Bucket=settings.AWS_S3_BUCKET, Key=key)
            except Exception as exc:
                print(f"[WARN] S3 delete failed: {exc}")
        elif settings.LOCAL_STORAGE_URL in url:
            rel  = url.replace(settings.LOCAL_STORAGE_URL + "/", "")
            path = Path(settings.LOCAL_STORAGE_PATH) / rel
            if path.exists():
                path.unlink()
