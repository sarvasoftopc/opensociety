import mimetypes
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from fastapi.responses import FileResponse

from app.api.deps import require_authenticated_actor
from app.core.auth import ActorContext
from app.core.config import get_settings


router = APIRouter(prefix="/uploads", tags=["uploads"])

MAX_BYTES = 5 * 1024 * 1024
ALLOWED = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
}


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_file(
    request: Request,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    content_type: Annotated[str | None, Header()] = None,
) -> dict[str, str]:
    _ = actor
    actual_type = (content_type or "").split(";")[0].strip()
    ext = ALLOWED.get(actual_type)
    if not ext:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="unsupported content type")
    body = await request.body()
    if not body:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="empty body")
    if len(body) > MAX_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="file too large (max 5MB)")
    settings = get_settings()
    upload_dir = Path(settings.uploads_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    key = f"{uuid.uuid4()}{ext}"
    (upload_dir / key).write_bytes(body)
    return {"key": key, "url": f"/uploads/{key}"}


@router.get("/{key}")
async def get_upload(
    key: str,
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
) -> FileResponse:
    _ = actor
    settings = get_settings()
    path = Path(settings.uploads_dir) / key
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not found")
    media_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return FileResponse(path, media_type=media_type, headers={"cache-control": "private, max-age=3600"})
