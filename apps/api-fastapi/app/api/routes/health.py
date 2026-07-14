from fastapi import APIRouter


router = APIRouter()


@router.get("/")
async def root() -> dict[str, str]:
    return {"name": "opensociety-api", "status": "ok"}


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
