from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ApartmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    tower: str
    apartment_no: str = Field(alias="apartmentNo")
    floor: int | None = None
    bhk_type: str | None = Field(default=None, alias="bhkType")
    is_active: bool = Field(alias="isActive")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")


class CreateApartmentRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    tower: str
    apartment_no: str = Field(alias="apartmentNo")
    floor: int | None = None
    bhk_type: str | None = Field(default=None, alias="bhkType")


class CreateApartmentsBulkRequest(BaseModel):
    apartments: list[CreateApartmentRequest]


class UpdateApartmentRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    tower: str | None = None
    apartment_no: str | None = Field(default=None, alias="apartmentNo")
    floor: int | None = None
    bhk_type: str | None = Field(default=None, alias="bhkType")
    is_active: bool | None = Field(default=None, alias="isActive")
