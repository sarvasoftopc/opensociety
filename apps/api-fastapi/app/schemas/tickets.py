from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TicketResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    apartment_id: str = Field(alias="apartmentId")
    raised_by: str = Field(alias="raisedBy")
    title: str
    description: str
    category: str
    priority: str
    status: str
    assigned_to: str | None = Field(default=None, alias="assignedTo")
    resolution_note: str | None = Field(default=None, alias="resolutionNote")
    resolved_at: datetime | None = Field(default=None, alias="resolvedAt")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")


class CreateTicketRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    apartment_id: str = Field(alias="apartmentId")
    title: str
    description: str
    category: str = "OTHER"
    priority: str = "NORMAL"


class TransitionTicketRequest(BaseModel):
    action: str
    resolution_note: str | None = Field(default=None, alias="resolutionNote")

    model_config = ConfigDict(populate_by_name=True)


class AssignTicketRequest(BaseModel):
    assigned_to: str = Field(alias="assignedTo")

    model_config = ConfigDict(populate_by_name=True)
