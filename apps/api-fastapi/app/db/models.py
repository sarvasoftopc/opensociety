from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Index, String, Text, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


UUID_TYPE = Uuid(as_uuid=False)


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(UUID_TYPE, primary_key=True, default=lambda: str(uuid.uuid4()))
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        "created_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        "updated_at",
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class SocietyConfig(Base):
    __tablename__ = "society_config"

    id: Mapped[str] = mapped_column(UUID_TYPE, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("tenants.id"), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    address: Mapped[str] = mapped_column(Text())
    city: Mapped[str] = mapped_column(String(100))
    state: Mapped[str] = mapped_column(String(100))
    pincode: Mapped[str] = mapped_column(String(6))
    gstin: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        "created_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        "updated_at",
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Apartment(Base):
    __tablename__ = "apartments"

    id: Mapped[str] = mapped_column(UUID_TYPE, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("tenants.id"), index=True)
    tower: Mapped[str] = mapped_column(String(50))
    apartment_no: Mapped[str] = mapped_column("apartment_no", String(20))
    floor: Mapped[int | None]
    bhk_type: Mapped[str | None] = mapped_column("bhk_type", String(32), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(
        "created_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        "updated_at",
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(UUID_TYPE, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("tenants.id"), index=True)
    clerk_id: Mapped[str | None] = mapped_column("clerk_id", String(255), nullable=True)
    supabase_auth_id: Mapped[str | None] = mapped_column("supabase_auth_id", String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    name: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32), default="RESIDENT")
    status: Mapped[str] = mapped_column(String(32), default="PENDING")
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(
        "created_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        "updated_at",
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Residency(Base):
    __tablename__ = "residencies"

    id: Mapped[str] = mapped_column(UUID_TYPE, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("tenants.id"), index=True)
    user_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("users.id"), index=True)
    apartment_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("apartments.id"), index=True)
    relation: Mapped[str] = mapped_column(String(32), default="OWNER")
    is_primary: Mapped[bool] = mapped_column("is_primary", default=False)
    start_date: Mapped[datetime] = mapped_column(
        "start_date",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    end_date: Mapped[datetime | None] = mapped_column("end_date", DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        "created_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class VisitorPreApproval(Base):
    __tablename__ = "visitor_pre_approvals"

    id: Mapped[str] = mapped_column(UUID_TYPE, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("tenants.id"), index=True)
    apartment_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("apartments.id"), index=True)
    created_by: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("users.id"), index=True)
    visitor_name: Mapped[str] = mapped_column(String(255))
    visitor_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    approval_type: Mapped[str] = mapped_column(String(32), default="ONE_TIME")
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    valid_from: Mapped[datetime] = mapped_column(
        "valid_from",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    valid_until: Mapped[datetime | None] = mapped_column("valid_until", DateTime(timezone=True), nullable=True)
    max_uses: Mapped[int | None] = mapped_column("max_uses", nullable=True)
    use_count: Mapped[int] = mapped_column("use_count", default=0)
    is_active: Mapped[bool] = mapped_column("is_active", default=True)
    created_at: Mapped[datetime] = mapped_column(
        "created_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class VisitorEntry(Base):
    __tablename__ = "visitor_entries"

    id: Mapped[str] = mapped_column(UUID_TYPE, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("tenants.id"), index=True)
    apartment_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("apartments.id"), index=True)
    pre_approval_id: Mapped[str | None] = mapped_column(
        "pre_approval_id",
        UUID_TYPE,
        ForeignKey("visitor_pre_approvals.id"),
        nullable=True,
    )
    visitor_name: Mapped[str] = mapped_column(String(255))
    visitor_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    type: Mapped[str] = mapped_column(String(32), default="GUEST")
    status: Mapped[str] = mapped_column(String(32), default="PENDING")
    purpose: Mapped[str | None] = mapped_column(Text(), nullable=True)
    partner_name: Mapped[str | None] = mapped_column("partner_name", String(120), nullable=True)
    vehicle_number: Mapped[str | None] = mapped_column("vehicle_number", String(32), nullable=True)
    photo_url: Mapped[str | None] = mapped_column("photo_url", Text(), nullable=True)
    approved_by: Mapped[str | None] = mapped_column("approved_by", UUID_TYPE, ForeignKey("users.id"), nullable=True)
    denied_reason: Mapped[str | None] = mapped_column("denied_reason", Text(), nullable=True)
    check_in_by: Mapped[str | None] = mapped_column("check_in_by", UUID_TYPE, nullable=True)
    check_out_by: Mapped[str | None] = mapped_column("check_out_by", UUID_TYPE, nullable=True)
    check_in_at: Mapped[datetime | None] = mapped_column("check_in_at", DateTime(timezone=True), nullable=True)
    check_out_at: Mapped[datetime | None] = mapped_column("check_out_at", DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        "created_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        "updated_at",
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Notice(Base):
    __tablename__ = "notices"

    id: Mapped[str] = mapped_column(UUID_TYPE, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("tenants.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text())
    priority: Mapped[str] = mapped_column(String(32), default="NORMAL")
    category: Mapped[str] = mapped_column(String(32), default="GENERAL")
    attachment_url: Mapped[str | None] = mapped_column("attachment_url", Text(), nullable=True)
    attachment_name: Mapped[str | None] = mapped_column("attachment_name", String(255), nullable=True)
    published_by: Mapped[str] = mapped_column("published_by", UUID_TYPE, ForeignKey("users.id"))
    published_at: Mapped[datetime] = mapped_column(
        "published_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    expires_at: Mapped[datetime | None] = mapped_column("expires_at", DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        "created_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        "updated_at",
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class NoticeRead(Base):
    __tablename__ = "notice_reads"

    id: Mapped[str] = mapped_column(UUID_TYPE, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("tenants.id"), index=True)
    notice_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("notices.id"), index=True)
    user_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("users.id"), index=True)
    read_at: Mapped[datetime] = mapped_column(
        "read_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class UserDeviceToken(Base):
    __tablename__ = "user_device_tokens"
    __table_args__ = (
        UniqueConstraint("tenant_id", "token", name="user_device_tokens_tenant_token_unique"),
    )

    id: Mapped[str] = mapped_column(UUID_TYPE, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("tenants.id"), index=True)
    user_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("users.id"), index=True)
    token: Mapped[str] = mapped_column(Text())
    platform: Mapped[str] = mapped_column(String(32), default="UNKNOWN")
    provider: Mapped[str] = mapped_column(String(32), default="FCM")
    device_label: Mapped[str | None] = mapped_column("device_label", String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    last_seen_at: Mapped[datetime] = mapped_column(
        "last_seen_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        "created_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        "updated_at",
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class AppNotification(Base):
    __tablename__ = "app_notifications"
    __table_args__ = (
        Index("app_notifications_tenant_user_created_idx", "tenant_id", "user_id", "created_at"),
    )

    id: Mapped[str] = mapped_column(UUID_TYPE, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("tenants.id"), index=True)
    user_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("users.id"), index=True)
    type: Mapped[str] = mapped_column(String(64), default="INFO")
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text())
    data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    source: Mapped[str | None] = mapped_column(String(64), nullable=True)
    delivery_status: Mapped[str] = mapped_column("delivery_status", String(32), default="IN_APP_ONLY")
    read_at: Mapped[datetime | None] = mapped_column("read_at", DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        "created_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class Guard(Base):
    __tablename__ = "guards"

    id: Mapped[str] = mapped_column(UUID_TYPE, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("tenants.id"), index=True)
    user_id: Mapped[str | None] = mapped_column("user_id", UUID_TYPE, ForeignKey("users.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    employee_code: Mapped[str | None] = mapped_column("employee_code", String(64), nullable=True)
    is_active: Mapped[bool] = mapped_column("is_active", default=True)
    created_at: Mapped[datetime] = mapped_column(
        "created_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        "updated_at",
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class GuardDevice(Base):
    __tablename__ = "guard_devices"

    id: Mapped[str] = mapped_column(UUID_TYPE, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("tenants.id"), index=True)
    guard_id: Mapped[str] = mapped_column("guard_id", UUID_TYPE, ForeignKey("guards.id"), index=True)
    device_id: Mapped[str] = mapped_column("device_id", String(255))
    model: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bound_at: Mapped[datetime] = mapped_column(
        "bound_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    last_active_at: Mapped[datetime] = mapped_column(
        "last_active_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    revoked_at: Mapped[datetime | None] = mapped_column("revoked_at", DateTime(timezone=True), nullable=True)


class MaintenanceTicket(Base):
    __tablename__ = "maintenance_tickets"

    id: Mapped[str] = mapped_column(UUID_TYPE, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("tenants.id"), index=True)
    apartment_id: Mapped[str] = mapped_column("apartment_id", UUID_TYPE, ForeignKey("apartments.id"), index=True)
    raised_by: Mapped[str] = mapped_column("raised_by", UUID_TYPE, ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text())
    category: Mapped[str] = mapped_column(String(32), default="OTHER")
    priority: Mapped[str] = mapped_column(String(32), default="NORMAL")
    status: Mapped[str] = mapped_column(String(32), default="OPEN")
    assigned_to: Mapped[str | None] = mapped_column("assigned_to", UUID_TYPE, ForeignKey("users.id"), nullable=True)
    resolution_note: Mapped[str | None] = mapped_column("resolution_note", Text(), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column("resolved_at", DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        "created_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        "updated_at",
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Vehicle(Base):
    __tablename__ = "vehicles"
    __table_args__ = (
        UniqueConstraint("tenant_id", "registration_number", name="vehicles_tenant_registration_number_unq"),
        Index("vehicles_tenant_apartment_id_idx", "tenant_id", "apartment_id"),
    )

    id: Mapped[str] = mapped_column(UUID_TYPE, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("tenants.id"), index=True)
    apartment_id: Mapped[str] = mapped_column("apartment_id", UUID_TYPE, ForeignKey("apartments.id"), index=True)
    registered_by: Mapped[str | None] = mapped_column("registered_by", UUID_TYPE, ForeignKey("users.id"), nullable=True)
    registration_number: Mapped[str] = mapped_column("registration_number", String(64))
    type: Mapped[str] = mapped_column(String(32), default="CAR")
    make: Mapped[str | None] = mapped_column(String(255), nullable=True)
    color: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column("is_active", Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        "created_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        "updated_at",
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class ParkingSlot(Base):
    __tablename__ = "parking_slots"
    __table_args__ = (
        UniqueConstraint("tenant_id", "slot_number", name="parking_slots_tenant_slot_number_unq"),
        Index("parking_slots_tenant_apartment_id_idx", "tenant_id", "apartment_id"),
        Index("parking_slots_tenant_is_visitor_idx", "tenant_id", "is_visitor"),
    )

    id: Mapped[str] = mapped_column(UUID_TYPE, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("tenants.id"), index=True)
    slot_number: Mapped[str] = mapped_column("slot_number", String(64))
    type: Mapped[str] = mapped_column(String(32), default="OPEN")
    apartment_id: Mapped[str | None] = mapped_column("apartment_id", UUID_TYPE, ForeignKey("apartments.id"), nullable=True)
    is_temporary: Mapped[bool] = mapped_column("is_temporary", Boolean, default=False)
    assigned_until: Mapped[datetime | None] = mapped_column("assigned_until", DateTime(timezone=True), nullable=True)
    assigned_by: Mapped[str | None] = mapped_column("assigned_by", UUID_TYPE, ForeignKey("users.id"), nullable=True)
    assigned_at: Mapped[datetime | None] = mapped_column("assigned_at", DateTime(timezone=True), nullable=True)
    is_visitor: Mapped[bool] = mapped_column("is_visitor", Boolean, default=False)
    occupied_by_entry_id: Mapped[str | None] = mapped_column(
        "occupied_by_entry_id",
        UUID_TYPE,
        ForeignKey("visitor_entries.id"),
        nullable=True,
    )
    occupied_at: Mapped[datetime | None] = mapped_column("occupied_at", DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text(), nullable=True)
    is_active: Mapped[bool] = mapped_column("is_active", Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        "created_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        "updated_at",
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class MaintenanceBill(Base):
    __tablename__ = "maintenance_bills"
    __table_args__ = (
        Index("maintenance_bills_tenant_apartment_id_idx", "tenant_id", "apartment_id"),
        Index("maintenance_bills_tenant_period_month_idx", "tenant_id", "period_month"),
    )

    id: Mapped[str] = mapped_column(UUID_TYPE, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("tenants.id"), index=True)
    apartment_id: Mapped[str] = mapped_column("apartment_id", UUID_TYPE, ForeignKey("apartments.id"), index=True)
    type: Mapped[str] = mapped_column(String(32), default="MONTHLY")
    title: Mapped[str] = mapped_column(String(255))
    period_month: Mapped[str | None] = mapped_column("period_month", String(7), nullable=True)
    subtotal: Mapped[int] = mapped_column(default=0)
    tax_amount: Mapped[int] = mapped_column("tax_amount", default=0)
    total_amount: Mapped[int] = mapped_column("total_amount", default=0)
    status: Mapped[str] = mapped_column(String(32), default="ISSUED")
    due_date: Mapped[datetime | None] = mapped_column("due_date", DateTime(timezone=True), nullable=True)
    issued_at: Mapped[datetime] = mapped_column(
        "issued_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    created_by: Mapped[str | None] = mapped_column("created_by", UUID_TYPE, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        "created_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        "updated_at",
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class BillLineItem(Base):
    __tablename__ = "bill_line_items"

    id: Mapped[str] = mapped_column(UUID_TYPE, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("tenants.id"), index=True)
    bill_id: Mapped[str] = mapped_column("bill_id", UUID_TYPE, ForeignKey("maintenance_bills.id"), index=True)
    description: Mapped[str] = mapped_column(Text())
    amount: Mapped[int]
    tax_rate_pct: Mapped[int] = mapped_column("tax_rate_pct", default=0)
    tax_amount: Mapped[int] = mapped_column("tax_amount", default=0)
    created_at: Mapped[datetime] = mapped_column(
        "created_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        Index("payments_tenant_bill_id_idx", "tenant_id", "bill_id"),
        Index("payments_tenant_apartment_id_idx", "tenant_id", "apartment_id"),
    )

    id: Mapped[str] = mapped_column(UUID_TYPE, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("tenants.id"), index=True)
    bill_id: Mapped[str] = mapped_column("bill_id", UUID_TYPE, ForeignKey("maintenance_bills.id"), index=True)
    apartment_id: Mapped[str] = mapped_column("apartment_id", UUID_TYPE, ForeignKey("apartments.id"), index=True)
    amount: Mapped[int]
    method: Mapped[str] = mapped_column(String(32))
    reference: Mapped[str | None] = mapped_column(Text(), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text(), nullable=True)
    paid_at: Mapped[datetime] = mapped_column(
        "paid_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    recorded_by: Mapped[str | None] = mapped_column("recorded_by", UUID_TYPE, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        "created_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class BillConfig(Base):
    __tablename__ = "bill_config"

    id: Mapped[str] = mapped_column(UUID_TYPE, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("tenants.id"), unique=True, index=True)
    due_day_of_month: Mapped[int] = mapped_column("due_day_of_month", default=10)
    line_items: Mapped[list] = mapped_column("line_items", JSON, default=list)
    updated_by: Mapped[str | None] = mapped_column("updated_by", UUID_TYPE, ForeignKey("users.id"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        "updated_at",
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class HouseHelp(Base):
    __tablename__ = "house_help"

    id: Mapped[str] = mapped_column(UUID_TYPE, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("tenants.id"), index=True)
    name: Mapped[str] = mapped_column(Text())
    phone: Mapped[str | None] = mapped_column(Text(), nullable=True)
    type: Mapped[str] = mapped_column(String(32), default="OTHER")
    photo_url: Mapped[str | None] = mapped_column("photo_url", Text(), nullable=True)
    id_proof_type: Mapped[str | None] = mapped_column("id_proof_type", String(32), nullable=True)
    id_proof_number: Mapped[str | None] = mapped_column("id_proof_number", Text(), nullable=True)
    id_proof_url: Mapped[str | None] = mapped_column("id_proof_url", Text(), nullable=True)
    id_verified: Mapped[bool] = mapped_column("id_verified", Boolean, default=False)
    background_check: Mapped[str] = mapped_column("background_check", String(32), default="PENDING")
    incident_count: Mapped[int] = mapped_column("incident_count", default=0)
    is_active: Mapped[bool] = mapped_column("is_active", Boolean, default=True)
    registered_by: Mapped[str | None] = mapped_column("registered_by", UUID_TYPE, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        "created_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        "updated_at",
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class HouseHelpEntry(Base):
    __tablename__ = "house_help_entries"

    id: Mapped[str] = mapped_column(UUID_TYPE, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("tenants.id"), index=True)
    house_help_id: Mapped[str] = mapped_column("house_help_id", UUID_TYPE, ForeignKey("house_help.id"), index=True)
    apartment_id: Mapped[str | None] = mapped_column("apartment_id", UUID_TYPE, ForeignKey("apartments.id"), nullable=True)
    check_in_at: Mapped[datetime] = mapped_column(
        "check_in_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    check_in_by: Mapped[str | None] = mapped_column("check_in_by", UUID_TYPE, ForeignKey("users.id"), nullable=True)
    check_out_at: Mapped[datetime | None] = mapped_column("check_out_at", DateTime(timezone=True), nullable=True)
    check_out_by: Mapped[str | None] = mapped_column("check_out_by", UUID_TYPE, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        "created_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class HouseHelpAssignment(Base):
    __tablename__ = "house_help_assignments"
    __table_args__ = (
        UniqueConstraint("tenant_id", "house_help_id", "apartment_id", name="house_help_assignments_tenant_help_apartment_unq"),
    )

    id: Mapped[str] = mapped_column(UUID_TYPE, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("tenants.id"), index=True)
    house_help_id: Mapped[str] = mapped_column("house_help_id", UUID_TYPE, ForeignKey("house_help.id"), index=True)
    apartment_id: Mapped[str] = mapped_column("apartment_id", UUID_TYPE, ForeignKey("apartments.id"), index=True)
    assigned_by: Mapped[str | None] = mapped_column("assigned_by", UUID_TYPE, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        "created_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class HouseHelpReview(Base):
    __tablename__ = "house_help_reviews"
    __table_args__ = (
        UniqueConstraint("tenant_id", "house_help_id", "reviewer_id", name="house_help_reviews_tenant_help_reviewer_unq"),
    )

    id: Mapped[str] = mapped_column(UUID_TYPE, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("tenants.id"), index=True)
    house_help_id: Mapped[str] = mapped_column("house_help_id", UUID_TYPE, ForeignKey("house_help.id"), index=True)
    reviewer_id: Mapped[str] = mapped_column("reviewer_id", UUID_TYPE, ForeignKey("users.id"), index=True)
    rating: Mapped[int]
    comment: Mapped[str | None] = mapped_column(Text(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        "created_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        "updated_at",
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class GuardDutySession(Base):
    __tablename__ = "guard_duty_sessions"

    id: Mapped[str] = mapped_column(UUID_TYPE, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(UUID_TYPE, ForeignKey("tenants.id"), index=True)
    guard_id: Mapped[str] = mapped_column("guard_id", UUID_TYPE, ForeignKey("guards.id"), index=True)
    clock_in_at: Mapped[datetime] = mapped_column(
        "clock_in_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    clock_in_lat: Mapped[float | None] = mapped_column("clock_in_lat", nullable=True)
    clock_in_lng: Mapped[float | None] = mapped_column("clock_in_lng", nullable=True)
    checkpoint: Mapped[str | None] = mapped_column(String(120), nullable=True)
    clock_in_photo_url: Mapped[str | None] = mapped_column("clock_in_photo_url", Text(), nullable=True)
    clock_out_at: Mapped[datetime | None] = mapped_column("clock_out_at", DateTime(timezone=True), nullable=True)
    clock_out_lat: Mapped[float | None] = mapped_column("clock_out_lat", nullable=True)
    clock_out_lng: Mapped[float | None] = mapped_column("clock_out_lng", nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        "created_at",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
