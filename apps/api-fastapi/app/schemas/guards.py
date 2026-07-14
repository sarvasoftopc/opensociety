from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class GuardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    user_id: str | None = Field(default=None, alias="userId")
    name: str
    phone: str | None = None
    employee_code: str | None = Field(default=None, alias="employeeCode")
    is_active: bool = Field(alias="isActive")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")


class CreateGuardRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    phone: str | None = None
    employee_code: str | None = Field(default=None, alias="employeeCode")
    user_id: str | None = Field(default=None, alias="userId")


class UpdateGuardRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str | None = None
    phone: str | None = None
    employee_code: str | None = Field(default=None, alias="employeeCode")
    is_active: bool | None = Field(default=None, alias="isActive")
