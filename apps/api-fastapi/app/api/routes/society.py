from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_tenant, require_authenticated_actor
from app.core.auth import ActorContext
from app.core.tenant import TenantContext
from app.db.models import SocietyConfig, Tenant
from app.schemas.society import SocietyConfigResponse, UpdateSocietyConfigRequest


router = APIRouter(prefix="/society", tags=["society"])


@router.get("", response_model=SocietyConfigResponse | None)
async def get_society(
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> SocietyConfigResponse | None:
    _ = actor
    row = (
        db.query(SocietyConfig)
        .join(Tenant, SocietyConfig.tenant_id == Tenant.id)
        .filter(Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if row is None:
        return None
    return SocietyConfigResponse.model_validate(row)


@router.put("", response_model=SocietyConfigResponse)
async def update_society(
    payload: UpdateSocietyConfigRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
    response: Response,
) -> SocietyConfigResponse:
    if actor.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    if tenant_row is None:
        tenant_row = Tenant(slug=tenant.tenant_slug, name=payload.name)
        db.add(tenant_row)
        db.flush()

    row = db.query(SocietyConfig).filter(SocietyConfig.tenant_id == tenant_row.id).one_or_none()
    created = row is None
    if row is None:
        row = SocietyConfig(
            tenant_id=tenant_row.id,
            name=payload.name,
            address=payload.address,
            city=payload.city,
            state=payload.state,
            pincode=payload.pincode,
            gstin=payload.gstin or None,
        )
        db.add(row)
    else:
        row.name = payload.name
        row.address = payload.address
        row.city = payload.city
        row.state = payload.state
        row.pincode = payload.pincode
        row.gstin = payload.gstin or None
        tenant_row.name = payload.name

    db.commit()
    db.refresh(row)
    if created:
        response.status_code = status.HTTP_201_CREATED
    return SocietyConfigResponse.model_validate(row)
