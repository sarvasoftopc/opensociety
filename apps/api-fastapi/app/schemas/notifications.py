from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


class RegisterDeviceTokenRequest(BaseModel):
    token: str
    platform: str = "UNKNOWN"
    provider: str = "FCM"
    device_label: str | None = Field(default=None, alias="deviceLabel")

    model_config = ConfigDict(populate_by_name=True)


class SendTestNotificationRequest(BaseModel):
    user_id: str | None = Field(default=None, alias="userId")
    all_residents: bool = Field(default=False, alias="allResidents")
    title: str
    body: str
    data: dict[str, Any] | None = None

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="after")
    def validate_target(self) -> "SendTestNotificationRequest":
        if self.all_residents:
            return self
        if self.user_id:
            return self
        raise ValueError("Provide userId or set allResidents=true")


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    user_id: str = Field(alias="userId")
    type: str
    title: str
    body: str
    data: dict[str, Any] | None = None
    source: str | None = None
    delivery_status: str = Field(alias="deliveryStatus")
    read_at: datetime | None = Field(default=None, alias="readAt")
    created_at: datetime = Field(alias="createdAt")


class NotificationDispatchResponse(BaseModel):
    created: NotificationResponse | None = None
    target_count: int = Field(alias="targetCount")
    created_count: int = Field(alias="createdCount")
    push_success_count: int = Field(alias="pushSuccessCount")
    push_partial_failure_count: int = Field(alias="pushPartialFailureCount")
    push_attempted: bool = Field(alias="pushAttempted")
    push_sent: bool = Field(alias="pushSent")
    push_error: str | None = Field(default=None, alias="pushError")

    model_config = ConfigDict(populate_by_name=True)
