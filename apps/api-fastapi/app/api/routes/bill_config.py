from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_tenant, require_authenticated_actor
from app.core.auth import ActorContext
from app.core.tenant import TenantContext
from app.db.models import BillConfig, Tenant
from app.schemas.finance import BillConfigResponse, UpdateBillConfigRequest


router = APIRouter(prefix="/bill-config", tags=["bill-config"])


def require_admin(actor: ActorContext) -> None:
    if actor.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")


@router.get("", response_model=BillConfigResponse)
async def get_bill_config(
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> BillConfigResponse:
    require_admin(actor)
    row = (
        db.query(BillConfig)
        .join(Tenant, BillConfig.tenant_id == Tenant.id)
        .filter(Tenant.slug == tenant.tenant_slug)
        .one_or_none()
    )
    if row is None:
        return BillConfigResponse(id=None, dueDayOfMonth=10, lineItems=[], updatedBy=None, updatedAt=None)
    return BillConfigResponse.from_row(row)


@router.put("", response_model=BillConfigResponse)
async def update_bill_config(
    payload: UpdateBillConfigRequest,
    tenant: Annotated[TenantContext, Depends(get_tenant)],
    actor: Annotated[ActorContext, Depends(require_authenticated_actor)],
    db: Annotated[Session, Depends(get_db)],
) -> BillConfigResponse:
    require_admin(actor)
    tenant_row = db.query(Tenant).filter(Tenant.slug == tenant.tenant_slug).one_or_none()
    if tenant_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="tenant not found")
    row = db.query(BillConfig).filter(BillConfig.tenant_id == tenant_row.id).one_or_none()
    line_items = [item.model_dump(by_alias=True) for item in payload.line_items]
    if row is None:
        row = BillConfig(
            tenant_id=tenant_row.id,
            due_day_of_month=payload.due_day_of_month,
            line_items=line_items,
            updated_by=actor.user_id,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return BillConfigResponse.from_row(row)
    row.due_day_of_month = payload.due_day_of_month
    row.line_items = line_items
    row.updated_by = actor.user_id
    db.commit()
    db.refresh(row)
    return BillConfigResponse.from_row(row)
