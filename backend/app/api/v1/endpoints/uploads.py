"""
app/api/v1/endpoints/uploads.py
---------------------------------
POST /uploads/image  — upload a single image, returns public URL.
Uses local disk or S3 depending on config (zero-spend default = local disk).
"""

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.core.dependencies import CurrentUser
from app.services.storage_service import StorageService

router = APIRouter(prefix="/uploads", tags=["Uploads"])

ALLOWED_TYPES  = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_BYTES = 5 * 1024 * 1024   # 5 MB


class UploadResponse(BaseModel):
    url: str
    filename: str
    size_kb: float


@router.post("/image", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_image(
    current_user: CurrentUser,
    file: UploadFile = File(...),
    folder: str = "products",
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"File type '{file.content_type}' not supported. Use JPEG, PNG, WEBP, or GIF.",
        )

    content = await file.read()

    if len(content) > MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large ({len(content)/1024:.0f} KB). Max 5 MB.",
        )

    svc = StorageService()
    url = await svc.upload_bytes(
        content=content,
        filename=file.filename or "upload.jpg",
        content_type=file.content_type or "image/jpeg",
        folder=folder,
    )

    return UploadResponse(
        url=url,
        filename=file.filename or "upload",
        size_kb=round(len(content) / 1024, 1),
    )
