from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class VisitorEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    apartment_id: str = Field(alias="apartmentId")
    apartment_label: str | None = Field(default=None, alias="apartmentLabel")
    pre_approval_id: str | None = Field(default=None, alias="preApprovalId")
    visitor_name: str = Field(alias="visitorName")
    visitor_phone: str | None = Field(default=None, alias="visitorPhone")
    type: str
    status: str
    purpose: str | None = None
    partner_name: str | None = Field(default=None, alias="partnerName")
    vehicle_number: str | None = Field(default=None, alias="vehicleNumber")
    photo_url: str | None = Field(default=None, alias="photoUrl")
    approved_by: str | None = Field(default=None, alias="approvedBy")
    denied_reason: str | None = Field(default=None, alias="deniedReason")
    check_in_by: str | None = Field(default=None, alias="checkInBy")
    check_out_by: str | None = Field(default=None, alias="checkOutBy")
    check_in_at: datetime | None = Field(default=None, alias="checkInAt")
    check_out_at: datetime | None = Field(default=None, alias="checkOutAt")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")


class VisitorPreApprovalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    apartment_id: str = Field(alias="apartmentId")
    created_by: str = Field(alias="createdBy")
    visitor_name: str = Field(alias="visitorName")
    visitor_phone: str | None = Field(default=None, alias="visitorPhone")
    approval_type: str = Field(alias="approvalType")
    code: str
    valid_from: datetime | None = Field(default=None, alias="validFrom")
    valid_until: datetime | None = Field(default=None, alias="validUntil")
    max_uses: int | None = Field(default=None, alias="maxUses")
    use_count: int = Field(alias="useCount")
    is_active: bool = Field(default=True, alias="isActive")
    created_at: datetime | None = Field(default=None, alias="createdAt")


class CreateVisitorRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    apartment_id: str = Field(alias="apartmentId")
    visitor_name: str = Field(alias="visitorName")
    visitor_phone: str | None = Field(default=None, alias="visitorPhone")
    type: str = "GUEST"
    purpose: str | None = None
    partner_name: str | None = Field(default=None, alias="partnerName")
    photo_url: str | None = Field(default=None, alias="photoUrl")
    vehicle_number: str | None = Field(default=None, alias="vehicleNumber")


class DenyVisitorRequest(BaseModel):
    reason: str


class CheckInVisitorRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    guard_id: str | None = Field(default=None, alias="guardId")
    photo_url: str | None = Field(default=None, alias="photoUrl")
    vehicle_number: str | None = Field(default=None, alias="vehicleNumber")


class CreatePreApprovalRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    apartment_id: str = Field(alias="apartmentId")
    visitor_name: str = Field(alias="visitorName")
    visitor_phone: str | None = Field(default=None, alias="visitorPhone")
    approval_type: str = Field(alias="approvalType")
    valid_until: str | None = Field(default=None, alias="validUntil")
    max_uses: int | None = Field(default=None, alias="maxUses")


class RedeemPreApprovalRequest(BaseModel):
    code: str
    guard_id: str | None = Field(default=None, alias="guardId")
