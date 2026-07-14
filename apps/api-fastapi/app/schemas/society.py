from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SocietyConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    name: str
    address: str
    city: str
    state: str
    pincode: str
    gstin: str | None = None
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")


class UpdateSocietyConfigRequest(BaseModel):
    name: str
    address: str
    city: str
    state: str
    pincode: str
    gstin: str | None = None
