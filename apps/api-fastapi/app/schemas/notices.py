from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class NoticeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    title: str
    body: str
    priority: str
    category: str
    attachment_url: str | None = Field(default=None, alias="attachmentUrl")
    attachment_name: str | None = Field(default=None, alias="attachmentName")
    published_by: str = Field(alias="publishedBy")
    published_at: datetime | None = Field(default=None, alias="publishedAt")
    expires_at: datetime | None = Field(default=None, alias="expiresAt")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")
    read_count: int | None = Field(default=None, alias="readCount")
    read: bool | None = None


class NoticeReadReceiptResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    user_id: str = Field(alias="userId")
    name: str | None = None
    read_at: datetime = Field(alias="readAt")


class CreateNoticeRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    title: str
    body: str
    priority: str = "NORMAL"
    category: str = "GENERAL"
    attachment_url: str | None = Field(default=None, alias="attachmentUrl")
    attachment_name: str | None = Field(default=None, alias="attachmentName")
    expires_at: str | None = Field(default=None, alias="expiresAt")
