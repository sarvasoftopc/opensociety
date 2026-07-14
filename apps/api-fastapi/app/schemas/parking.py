from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ParkingSlotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    slot_number: str = Field(alias="slotNumber")
    type: str
    apartment_id: str | None = Field(default=None, alias="apartmentId")
    is_temporary: bool = Field(alias="isTemporary")
    assigned_until: datetime | None = Field(default=None, alias="assignedUntil")
    assigned_by: str | None = Field(default=None, alias="assignedBy")
    assigned_at: datetime | None = Field(default=None, alias="assignedAt")
    is_visitor: bool = Field(alias="isVisitor")
    occupied_by_entry_id: str | None = Field(default=None, alias="occupiedByEntryId")
    occupied_at: datetime | None = Field(default=None, alias="occupiedAt")
    notes: str | None = None
    is_active: bool = Field(alias="isActive")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")
    apartment: str | None = None


class ParkingDirectoryRow(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    slot_number: str = Field(alias="slotNumber")
    type: str
    is_temporary: bool = Field(alias="isTemporary")
    assigned_until: datetime | None = Field(default=None, alias="assignedUntil")
    apartment: str | None = None


class VisitorParkingSlotRow(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    slot_number: str = Field(alias="slotNumber")
    type: str
    is_active: bool = Field(alias="isActive")
    is_visitor: bool = Field(alias="isVisitor")
    occupied_by_entry_id: str | None = Field(default=None, alias="occupiedByEntryId")
    occupied_at: datetime | None = Field(default=None, alias="occupiedAt")
    visitor_name: str | None = Field(default=None, alias="visitorName")
    vehicle_number: str | None = Field(default=None, alias="vehicleNumber")


class VisitorParkingSummary(BaseModel):
    total: int
    available: int
    occupied: int
    is_full: bool = Field(alias="isFull")

    model_config = ConfigDict(populate_by_name=True)


class VisitorParkingView(BaseModel):
    slots: list[VisitorParkingSlotRow]
    summary: VisitorParkingSummary


class CreateParkingSlotRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    slot_number: str = Field(alias="slotNumber", min_length=1)
    type: str = "OPEN"
    is_visitor: bool = Field(default=False, alias="isVisitor")
    notes: str | None = None


class UpdateParkingSlotRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    slot_number: str | None = Field(default=None, alias="slotNumber", min_length=1)
    type: str | None = None
    is_visitor: bool | None = Field(default=None, alias="isVisitor")
    notes: str | None = None
    is_active: bool | None = Field(default=None, alias="isActive")


class AssignParkingSlotRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    apartment_id: str | None = Field(alias="apartmentId")
    is_temporary: bool = Field(default=False, alias="isTemporary")
    assigned_until: datetime | None = Field(default=None, alias="assignedUntil")

    @model_validator(mode="after")
    def validate_assignment(self) -> "AssignParkingSlotRequest":
        if self.apartment_id is None and self.is_temporary:
            raise ValueError("cannot release a slot as a temporary assignment")
        if self.is_temporary and self.assigned_until is None:
            raise ValueError("a temporary assignment needs an assignedUntil")
        return self
