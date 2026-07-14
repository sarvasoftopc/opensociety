from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class GuardDeviceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    guard_id: str = Field(alias="guardId")
    device_id: str = Field(alias="deviceId")
    model: str | None = None
    bound_at: datetime | None = Field(default=None, alias="boundAt")
    last_active_at: datetime | None = Field(default=None, alias="lastActiveAt")
    revoked_at: datetime | None = Field(default=None, alias="revokedAt")
