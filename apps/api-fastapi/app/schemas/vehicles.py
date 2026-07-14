from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class VehicleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    apartment_id: str = Field(alias="apartmentId")
    registered_by: str | None = Field(default=None, alias="registeredBy")
    registration_number: str = Field(alias="registrationNumber")
    type: str
    make: str | None = None
    color: str | None = None
    is_active: bool = Field(alias="isActive")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")


class CreateVehicleRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    apartment_id: str = Field(alias="apartmentId")
    registration_number: str = Field(alias="registrationNumber", min_length=1)
    type: str = "CAR"
    make: str | None = None
    color: str | None = None


class UpdateVehicleRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    registration_number: str | None = Field(default=None, alias="registrationNumber", min_length=1)
    type: str | None = None
    make: str | None = None
    color: str | None = None
    is_active: bool | None = Field(default=None, alias="isActive")


class VehicleGateLogRow(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    visitor_name: str = Field(alias="visitorName")
    vehicle_number: str | None = Field(default=None, alias="vehicleNumber")
    type: str
    status: str
    check_in_at: datetime | None = Field(default=None, alias="checkInAt")
    check_out_at: datetime | None = Field(default=None, alias="checkOutAt")
    created_at: datetime = Field(alias="createdAt")
    apartment: str | None = None
    registered: bool
