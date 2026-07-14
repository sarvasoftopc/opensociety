from fastapi import APIRouter, HTTPException, status


router = APIRouter()


def not_yet_ported(feature: str) -> None:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=f"{feature} is not ported to FastAPI yet",
    )

