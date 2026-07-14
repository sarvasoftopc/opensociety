from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class GuardDutySessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    guard_id: str = Field(alias="guardId")
    clock_in_at: datetime | None = Field(default=None, alias="clockInAt")
    clock_in_lat: float | None = Field(default=None, alias="clockInLat")
    clock_in_lng: float | None = Field(default=None, alias="clockInLng")
    checkpoint: str | None = None
    clock_in_photo_url: str | None = Field(default=None, alias="clockInPhotoUrl")
    clock_out_at: datetime | None = Field(default=None, alias="clockOutAt")
    clock_out_lat: float | None = Field(default=None, alias="clockOutLat")
    clock_out_lng: float | None = Field(default=None, alias="clockOutLng")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    guard_name: str | None = Field(default=None, alias="guardName")


class ClockCoordinates(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    lat: float | None = None
    lng: float | None = None
    checkpoint: str | None = None
    clock_in_photo_url: str | None = Field(default=None, alias="clockInPhotoUrl")


class BindGuardDeviceRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    device_id: str = Field(alias="deviceId")
    model: str | None = None
