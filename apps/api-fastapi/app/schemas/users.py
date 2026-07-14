from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    clerk_id: str | None = Field(default=None, alias="clerkId")
    email: str | None = None
    phone: str | None = None
    name: str
    role: str
    status: str
    is_active: bool = Field(alias="isActive")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")


class ApproveUserRequest(BaseModel):
    apartment_id: str = Field(alias="apartmentId")
    relation: str = "OWNER"
    is_primary: bool = Field(default=True, alias="isPrimary")

    model_config = ConfigDict(populate_by_name=True)


class UpdateUserRoleRequest(BaseModel):
    role: str
