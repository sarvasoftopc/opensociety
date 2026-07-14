import json
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class BillLineInput(BaseModel):
    description: str
    amount: int
    tax_rate_pct: int = Field(alias="taxRatePct")

    model_config = ConfigDict(populate_by_name=True)


class GenerateBillsRequest(BaseModel):
    period_month: str = Field(alias="periodMonth")
    title: str
    due_date: datetime | None = Field(default=None, alias="dueDate")
    line_items: list[BillLineInput] = Field(alias="lineItems")

    model_config = ConfigDict(populate_by_name=True)


class CreateBillRequest(BaseModel):
    apartment_id: str = Field(alias="apartmentId")
    title: str
    due_date: datetime | None = Field(default=None, alias="dueDate")
    line_items: list[BillLineInput] = Field(alias="lineItems")

    model_config = ConfigDict(populate_by_name=True)


class RecordPaymentRequest(BaseModel):
    bill_id: str = Field(alias="billId")
    amount: int
    method: str
    reference: str | None = None
    notes: str | None = None
    paid_at: datetime | None = Field(default=None, alias="paidAt")

    model_config = ConfigDict(populate_by_name=True)


class BillLineItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    bill_id: str = Field(alias="billId")
    description: str
    amount: int
    tax_rate_pct: int = Field(alias="taxRatePct")
    tax_amount: int = Field(alias="taxAmount")
    created_at: datetime | None = Field(default=None, alias="createdAt")


class MaintenanceBillResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    apartment_id: str = Field(alias="apartmentId")
    type: str
    title: str
    period_month: str | None = Field(default=None, alias="periodMonth")
    subtotal: int
    tax_amount: int = Field(alias="taxAmount")
    total_amount: int = Field(alias="totalAmount")
    status: str
    due_date: datetime | None = Field(default=None, alias="dueDate")
    issued_at: datetime | None = Field(default=None, alias="issuedAt")
    created_by: str | None = Field(default=None, alias="createdBy")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")
    paid_amount: int | None = Field(default=None, alias="paidAmount")
    apartment: str | None = None
    line_items: list[BillLineItemResponse] | None = Field(default=None, alias="lineItems")


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    bill_id: str = Field(alias="billId")
    apartment_id: str = Field(alias="apartmentId")
    amount: int
    method: str
    reference: str | None = None
    notes: str | None = None
    paid_at: datetime | None = Field(default=None, alias="paidAt")
    recorded_by: str | None = Field(default=None, alias="recordedBy")
    created_at: datetime | None = Field(default=None, alias="createdAt")


class DuesRow(BaseModel):
    apartment_id: str = Field(alias="apartmentId")
    apartment: str | None = None
    billed: int
    paid: int
    outstanding: int

    model_config = ConfigDict(populate_by_name=True)


class BillConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str | None
    due_day_of_month: int = Field(alias="dueDayOfMonth")
    line_items: list[dict[str, Any]] = Field(alias="lineItems")
    updated_by: str | None = Field(default=None, alias="updatedBy")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")

    @classmethod
    def from_row(cls, row: Any) -> "BillConfigResponse":
        line_items = row.line_items
        if isinstance(line_items, str):
            line_items = json.loads(line_items or "[]")
        return cls(
            id=row.id,
            dueDayOfMonth=row.due_day_of_month,
            lineItems=line_items or [],
            updatedBy=row.updated_by,
            updatedAt=row.updated_at,
        )


class UpdateBillConfigRequest(BaseModel):
    due_day_of_month: int = Field(alias="dueDayOfMonth")
    line_items: list[BillLineInput] = Field(alias="lineItems")

    model_config = ConfigDict(populate_by_name=True)


class FinanceReport(BaseModel):
    by_month: list[dict[str, Any]] = Field(alias="byMonth")
    by_method: list[dict[str, Any]] = Field(alias="byMethod")
    total_billed: int = Field(alias="totalBilled")
    total_collected: int = Field(alias="totalCollected")

    model_config = ConfigDict(populate_by_name=True)


class CollectionAnalytics(BaseModel):
    by_month: list[dict[str, Any]] = Field(alias="byMonth")
    by_tower: list[dict[str, Any]] = Field(alias="byTower")
    payers: dict[str, Any]
    total_billed: int = Field(alias="totalBilled")
    total_collected: int = Field(alias="totalCollected")
    overall_rate_pct: float = Field(alias="overallRatePct")
    fully_paid_pct: float = Field(alias="fullyPaidPct")

    model_config = ConfigDict(populate_by_name=True)
