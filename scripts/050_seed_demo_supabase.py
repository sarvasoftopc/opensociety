#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import dotenv_values
from supabase import create_client


REPO_ROOT = Path(__file__).resolve().parents[1]
API_ROOT = REPO_ROOT / "apps" / "api-fastapi"
os.chdir(API_ROOT)
sys.path.insert(0, str(API_ROOT))

from app.db.models import (  # noqa: E402
    Apartment,
    BillConfig,
    BillLineItem,
    Guard,
    GuardDevice,
    GuardDutySession,
    HouseHelp,
    HouseHelpAssignment,
    HouseHelpEntry,
    HouseHelpReview,
    MaintenanceBill,
    MaintenanceTicket,
    Notice,
    NoticeRead,
    ParkingSlot,
    Payment,
    Residency,
    SocietyConfig,
    Tenant,
    User,
    Vehicle,
    VisitorEntry,
    VisitorPreApproval,
)
from app.db.session import SessionLocal  # noqa: E402


TZ = timezone.utc
NOW = datetime.now(TZ)


@dataclass(frozen=True)
class DemoAuthUser:
    email: str
    password: str
    name: str
    phone: str
    role: str
    status: str = "APPROVED"


DEMO_AUTH_USERS = [
    DemoAuthUser(
        email="admin@demo.local",
        password="DemoAdmin123!",
        name="Demo Admin",
        phone="+910000000000",
        role="ADMIN",
    ),
    DemoAuthUser(
        email="resident@demo.local",
        password="Resident123!",
        name="Ananya Resident",
        phone="+919999111111",
        role="RESIDENT",
    ),
    DemoAuthUser(
        email="guard@demo.local",
        password="Guard123!",
        name="Rakesh Guard",
        phone="+918888111111",
        role="GUARD",
    ),
    DemoAuthUser(
        email="resident2@demo.local",
        password="Resident123!",
        name="Vikram Resident",
        phone="+919999222222",
        role="RESIDENT",
    ),
]


def env_config() -> dict[str, str]:
    cfg = dotenv_values(API_ROOT / ".env")
    required = [
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
    ]
    missing = [key for key in required if not cfg.get(key)]
    if missing:
        raise RuntimeError(f"Missing required env values in apps/api-fastapi/.env: {', '.join(missing)}")
    return {key: value for key, value in cfg.items() if value is not None}


def ensure_auth_users() -> dict[str, str]:
    cfg = env_config()
    client = create_client(cfg["SUPABASE_URL"], cfg["SUPABASE_SERVICE_ROLE_KEY"])
    existing = {user.email.lower(): user for user in client.auth.admin.list_users() if getattr(user, "email", None)}

    auth_ids: dict[str, str] = {}
    for demo_user in DEMO_AUTH_USERS:
        metadata = {
            "full_name": demo_user.name,
            "phone": demo_user.phone,
            "role": demo_user.role,
            "status": demo_user.status,
        }
        app_metadata = {"role": demo_user.role}
        current = existing.get(demo_user.email.lower())
        if current is None:
            created = client.auth.admin.create_user(
                {
                    "email": demo_user.email,
                    "password": demo_user.password,
                    "email_confirm": True,
                    "user_metadata": metadata,
                    "app_metadata": app_metadata,
                    "role": "authenticated",
                }
            )
            auth_ids[demo_user.email] = created.user.id
            continue

        updated = client.auth.admin.update_user_by_id(
            current.id,
            {
                "email": demo_user.email,
                "password": demo_user.password,
                "email_confirm": True,
                "user_metadata": metadata,
                "app_metadata": app_metadata,
                "ban_duration": "none",
                "role": "authenticated",
            },
        )
        auth_ids[demo_user.email] = updated.user.id

    return auth_ids


def ensure_row(session, model, lookup: dict, defaults: dict):
    row = session.query(model).filter_by(**lookup).one_or_none()
    if row is None:
        row = model(**lookup, **defaults)
        session.add(row)
        session.flush()
        return row, True

    for key, value in defaults.items():
        setattr(row, key, value)
    session.flush()
    return row, False


def seed_database(auth_ids: dict[str, str]) -> dict[str, str]:
    session = SessionLocal()
    try:
        tenant, _ = ensure_row(
            session,
            Tenant,
            {"slug": "demo-society"},
            {"id": "00000000-0000-0000-0000-000000000001", "name": "Demo Society"},
        )

        ensure_row(
            session,
            SocietyConfig,
            {"tenant_id": tenant.id},
            {
                "name": "Demo Society Residences",
                "address": "123 Palm Avenue, Sector 45",
                "city": "Gurgaon",
                "state": "Haryana",
                "pincode": "122003",
                "gstin": "06ABCDE1234F1Z5",
            },
        )

        apartments = {
            "A-101": ensure_row(
                session,
                Apartment,
                {"id": "22222222-2222-2222-2222-222222222222"},
                {"tenant_id": tenant.id, "tower": "A", "apartment_no": "101", "floor": 1, "bhk_type": "2BHK", "is_active": True},
            )[0],
            "A-102": ensure_row(
                session,
                Apartment,
                {"id": "22222222-2222-2222-2222-222222222223"},
                {"tenant_id": tenant.id, "tower": "A", "apartment_no": "102", "floor": 1, "bhk_type": "3BHK", "is_active": True},
            )[0],
            "B-201": ensure_row(
                session,
                Apartment,
                {"id": "22222222-2222-2222-2222-222222222224"},
                {"tenant_id": tenant.id, "tower": "B", "apartment_no": "201", "floor": 2, "bhk_type": "3BHK", "is_active": True},
            )[0],
            "C-301": ensure_row(
                session,
                Apartment,
                {"id": "22222222-2222-2222-2222-222222222225"},
                {"tenant_id": tenant.id, "tower": "C", "apartment_no": "301", "floor": 3, "bhk_type": "4BHK", "is_active": True},
            )[0],
        }

        users = {
            "admin": ensure_row(
                session,
                User,
                {"id": "11111111-1111-1111-1111-111111111111"},
                {
                    "tenant_id": tenant.id,
                    "supabase_auth_id": auth_ids["admin@demo.local"],
                    "email": "admin@demo.local",
                    "phone": "+910000000000",
                    "name": "Demo Admin",
                    "role": "ADMIN",
                    "status": "APPROVED",
                    "is_active": True,
                    "clerk_id": None,
                },
            )[0],
            "resident": ensure_row(
                session,
                User,
                {"id": "33333333-3333-3333-3333-333333333333"},
                {
                    "tenant_id": tenant.id,
                    "supabase_auth_id": auth_ids["resident@demo.local"],
                    "email": "resident@demo.local",
                    "phone": "+919999111111",
                    "name": "Ananya Resident",
                    "role": "RESIDENT",
                    "status": "APPROVED",
                    "is_active": True,
                    "clerk_id": None,
                },
            )[0],
            "guard_user": ensure_row(
                session,
                User,
                {"id": "44444444-4444-4444-4444-444444444444"},
                {
                    "tenant_id": tenant.id,
                    "supabase_auth_id": auth_ids["guard@demo.local"],
                    "email": "guard@demo.local",
                    "phone": "+918888111111",
                    "name": "Rakesh Guard",
                    "role": "GUARD",
                    "status": "APPROVED",
                    "is_active": True,
                    "clerk_id": None,
                },
            )[0],
            "resident2": ensure_row(
                session,
                User,
                {"id": "55555555-5555-5555-5555-555555555555"},
                {
                    "tenant_id": tenant.id,
                    "supabase_auth_id": auth_ids["resident2@demo.local"],
                    "email": "resident2@demo.local",
                    "phone": "+919999222222",
                    "name": "Vikram Resident",
                    "role": "RESIDENT",
                    "status": "APPROVED",
                    "is_active": True,
                    "clerk_id": None,
                },
            )[0],
        }

        ensure_row(
            session,
            Residency,
            {"tenant_id": tenant.id, "user_id": users["resident"].id, "apartment_id": apartments["A-101"].id},
            {"relation": "OWNER", "is_primary": True, "end_date": None},
        )
        ensure_row(
            session,
            Residency,
            {"tenant_id": tenant.id, "user_id": users["resident2"].id, "apartment_id": apartments["A-102"].id},
            {"relation": "TENANT", "is_primary": True, "end_date": None},
        )

        guard = ensure_row(
            session,
            Guard,
            {"id": "66666666-6666-6666-6666-666666666666"},
            {
                "tenant_id": tenant.id,
                "user_id": users["guard_user"].id,
                "name": "Rakesh Guard",
                "phone": "+918888111111",
                "employee_code": "G-101",
                "is_active": True,
            },
        )[0]

        ensure_row(
            session,
            GuardDevice,
            {"tenant_id": tenant.id, "guard_id": guard.id, "device_id": "demo-guard-device"},
            {"model": "Android Demo Device", "revoked_at": None, "last_active_at": NOW},
        )

        ensure_row(
            session,
            GuardDutySession,
            {"id": "77777777-7777-7777-7777-777777777777"},
            {
                "tenant_id": tenant.id,
                "guard_id": guard.id,
                "clock_in_at": NOW - timedelta(hours=2),
                "clock_in_lat": 28.4595,
                "clock_in_lng": 77.0266,
                "clock_out_at": None,
                "clock_out_lat": None,
                "clock_out_lng": None,
            },
        )

        notices = [
            (
                "12121212-1212-1212-1212-121212121212",
                "Water supply maintenance",
                "Morning water supply will be paused from 10 AM to 1 PM for pump servicing.",
                "HIGH",
                "MAINTENANCE",
            ),
            (
                "13131313-1313-1313-1313-131313131313",
                "Independence Day celebration",
                "Community celebration starts at 6 PM in the central lawn. Residents are welcome to join.",
                "NORMAL",
                "EVENT",
            ),
        ]
        for notice_id, title, body, priority, category in notices:
            ensure_row(
                session,
                Notice,
                {"id": notice_id},
                {
                    "tenant_id": tenant.id,
                    "title": title,
                    "body": body,
                    "priority": priority,
                    "category": category,
                    "attachment_url": None,
                    "attachment_name": None,
                    "published_by": users["admin"].id,
                    "published_at": NOW - timedelta(days=1),
                    "expires_at": NOW + timedelta(days=14),
                },
            )

        notice_rows = session.query(Notice).filter(Notice.tenant_id == tenant.id).all()
        if notice_rows:
            ensure_row(
                session,
                NoticeRead,
                {"tenant_id": tenant.id, "notice_id": notice_rows[0].id, "user_id": users["resident"].id},
                {"read_at": NOW - timedelta(hours=3)},
            )

        pre_approval = ensure_row(
            session,
            VisitorPreApproval,
            {"id": "88888888-8888-8888-8888-888888888888"},
            {
                "tenant_id": tenant.id,
                "apartment_id": apartments["A-101"].id,
                "created_by": users["resident"].id,
                "visitor_name": "Priya Guest",
                "visitor_phone": "9999988888",
                "approval_type": "ONE_TIME",
                "code": "DEMO1234",
                "valid_from": NOW - timedelta(hours=1),
                "valid_until": NOW + timedelta(days=1),
                "max_uses": 1,
                "use_count": 0,
                "is_active": True,
            },
        )[0]

        approved_visitor = ensure_row(
            session,
            VisitorEntry,
            {"id": "99999999-9999-9999-9999-999999999999"},
            {
                "tenant_id": tenant.id,
                "apartment_id": apartments["A-101"].id,
                "pre_approval_id": None,
                "visitor_name": "Courier Partner",
                "visitor_phone": "9898989898",
                "type": "DELIVERY",
                "status": "APPROVED",
                "purpose": "Parcel delivery",
                "vehicle_number": None,
                "photo_url": None,
                "approved_by": users["resident"].id,
                "denied_reason": None,
                "check_in_by": None,
                "check_out_by": None,
                "check_in_at": None,
                "check_out_at": None,
                "created_at": NOW - timedelta(minutes=20),
                "updated_at": NOW - timedelta(minutes=20),
            },
        )[0]

        entered_visitor = ensure_row(
            session,
            VisitorEntry,
            {"id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"},
            {
                "tenant_id": tenant.id,
                "apartment_id": apartments["A-102"].id,
                "pre_approval_id": pre_approval.id,
                "visitor_name": "Priya Guest",
                "visitor_phone": "9999988888",
                "type": "GUEST",
                "status": "ENTERED",
                "purpose": "Dinner visit",
                "vehicle_number": "HR26DK0001",
                "photo_url": None,
                "approved_by": users["resident2"].id,
                "denied_reason": None,
                "check_in_by": users["guard_user"].id,
                "check_out_by": None,
                "check_in_at": NOW - timedelta(minutes=30),
                "check_out_at": None,
                "created_at": NOW - timedelta(hours=1),
                "updated_at": NOW - timedelta(minutes=30),
            },
        )[0]

        ensure_row(
            session,
            MaintenanceTicket,
            {"id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"},
            {
                "tenant_id": tenant.id,
                "apartment_id": apartments["A-101"].id,
                "raised_by": users["resident"].id,
                "title": "Kitchen sink leaking",
                "description": "Leak under the sink cabinet since yesterday evening.",
                "category": "PLUMBING",
                "priority": "HIGH",
                "status": "OPEN",
                "assigned_to": users["admin"].id,
                "resolution_note": None,
                "resolved_at": None,
            },
        )
        ensure_row(
            session,
            MaintenanceTicket,
            {"id": "cccccccc-cccc-cccc-cccc-cccccccccccc"},
            {
                "tenant_id": tenant.id,
                "apartment_id": apartments["A-102"].id,
                "raised_by": users["resident2"].id,
                "title": "Lift panel flickering",
                "description": "The lift floor panel flickers between floors 1 and 2.",
                "category": "ELECTRICAL",
                "priority": "NORMAL",
                "status": "IN_PROGRESS",
                "assigned_to": users["admin"].id,
                "resolution_note": None,
                "resolved_at": None,
            },
        )

        ensure_row(
            session,
            Vehicle,
            {"id": "dddddddd-dddd-dddd-dddd-dddddddddddd"},
            {
                "tenant_id": tenant.id,
                "apartment_id": apartments["A-101"].id,
                "registered_by": users["resident"].id,
                "registration_number": "DL01AB1234",
                "type": "CAR",
                "make": "Hyundai",
                "color": "White",
                "is_active": True,
            },
        )
        ensure_row(
            session,
            Vehicle,
            {"id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"},
            {
                "tenant_id": tenant.id,
                "apartment_id": apartments["A-102"].id,
                "registered_by": users["resident2"].id,
                "registration_number": "HR26XY5678",
                "type": "BIKE",
                "make": "Honda",
                "color": "Black",
                "is_active": True,
            },
        )

        ensure_row(
            session,
            ParkingSlot,
            {"id": "f1111111-1111-1111-1111-111111111111"},
            {
                "tenant_id": tenant.id,
                "slot_number": "A1-01",
                "type": "COVERED",
                "apartment_id": apartments["A-101"].id,
                "is_temporary": False,
                "assigned_until": None,
                "assigned_by": users["admin"].id,
                "assigned_at": NOW - timedelta(days=10),
                "is_visitor": False,
                "occupied_by_entry_id": None,
                "occupied_at": None,
                "notes": "Owner slot",
                "is_active": True,
            },
        )
        ensure_row(
            session,
            ParkingSlot,
            {"id": "f2222222-2222-2222-2222-222222222222"},
            {
                "tenant_id": tenant.id,
                "slot_number": "V1",
                "type": "OPEN",
                "apartment_id": None,
                "is_temporary": False,
                "assigned_until": None,
                "assigned_by": None,
                "assigned_at": None,
                "is_visitor": True,
                "occupied_by_entry_id": entered_visitor.id,
                "occupied_at": NOW - timedelta(minutes=30),
                "notes": "Visitor parking",
                "is_active": True,
            },
        )

        bill_config, _ = ensure_row(
            session,
            BillConfig,
            {"tenant_id": tenant.id},
            {
                "due_day_of_month": 12,
                "line_items": [
                    {"description": "Maintenance", "amount": 450000, "taxRatePct": 18},
                    {"description": "Security", "amount": 150000, "taxRatePct": 18},
                ],
                "updated_by": users["admin"].id,
            },
        )
        bill_config.updated_at = NOW

        monthly_bill = ensure_row(
            session,
            MaintenanceBill,
            {"id": "f3333333-3333-3333-3333-333333333333"},
            {
                "tenant_id": tenant.id,
                "apartment_id": apartments["A-101"].id,
                "type": "MONTHLY",
                "title": "July maintenance",
                "period_month": "2026-07",
                "subtotal": 600000,
                "tax_amount": 108000,
                "total_amount": 708000,
                "status": "PARTIALLY_PAID",
                "due_date": NOW + timedelta(days=7),
                "issued_at": NOW - timedelta(days=4),
                "created_by": users["admin"].id,
            },
        )[0]
        onetime_bill = ensure_row(
            session,
            MaintenanceBill,
            {"id": "f4444444-4444-4444-4444-444444444444"},
            {
                "tenant_id": tenant.id,
                "apartment_id": apartments["A-102"].id,
                "type": "ONE_TIME",
                "title": "Clubhouse repair contribution",
                "period_month": None,
                "subtotal": 100000,
                "tax_amount": 18000,
                "total_amount": 118000,
                "status": "ISSUED",
                "due_date": NOW + timedelta(days=10),
                "issued_at": NOW - timedelta(days=2),
                "created_by": users["admin"].id,
            },
        )[0]

        bill_lines = [
            ("16161616-1616-1616-1616-161616161616", monthly_bill.id, "Maintenance", 450000, 18, 81000),
            ("17171717-1717-1717-1717-171717171717", monthly_bill.id, "Security", 150000, 18, 27000),
            ("18181818-1818-1818-1818-181818181818", onetime_bill.id, "Repair fund", 100000, 18, 18000),
        ]
        for bill_line_id, bill_id, description, amount, tax_rate_pct, tax_amount in bill_lines:
            ensure_row(
                session,
                BillLineItem,
                {"id": bill_line_id},
                {
                    "tenant_id": tenant.id,
                    "bill_id": bill_id,
                    "description": description,
                    "amount": amount,
                    "tax_rate_pct": tax_rate_pct,
                    "tax_amount": tax_amount,
                },
            )

        ensure_row(
            session,
            Payment,
            {"id": "f5555555-5555-5555-5555-555555555555"},
            {
                "tenant_id": tenant.id,
                "bill_id": monthly_bill.id,
                "apartment_id": apartments["A-101"].id,
                "amount": 300000,
                "method": "UPI",
                "reference": "DEMO-UPI-001",
                "notes": "Partial payment",
                "paid_at": NOW - timedelta(days=1),
                "recorded_by": users["admin"].id,
            },
        )

        help_rows = {
            "maya": ensure_row(
                session,
                HouseHelp,
                {"id": "f6666666-6666-6666-6666-666666666666"},
                {
                    "tenant_id": tenant.id,
                    "name": "Maya",
                    "phone": "9000000001",
                    "type": "MAID",
                    "photo_url": None,
                    "id_proof_type": "AADHAAR",
                    "id_proof_number": "1234-5678-9999",
                    "id_proof_url": None,
                    "id_verified": True,
                    "background_check": "CLEARED",
                    "incident_count": 0,
                    "is_active": True,
                    "registered_by": users["resident"].id,
                },
            )[0],
            "suresh": ensure_row(
                session,
                HouseHelp,
                {"id": "f7777777-7777-7777-7777-777777777777"},
                {
                    "tenant_id": tenant.id,
                    "name": "Suresh",
                    "phone": "9000000002",
                    "type": "COOK",
                    "photo_url": None,
                    "id_proof_type": "PAN",
                    "id_proof_number": "ABCDE1234F",
                    "id_proof_url": None,
                    "id_verified": False,
                    "background_check": "PENDING",
                    "incident_count": 0,
                    "is_active": True,
                    "registered_by": users["resident2"].id,
                },
            )[0],
        }

        ensure_row(
            session,
            HouseHelpAssignment,
            {"tenant_id": tenant.id, "house_help_id": help_rows["maya"].id, "apartment_id": apartments["A-101"].id},
            {"assigned_by": users["resident"].id},
        )
        ensure_row(
            session,
            HouseHelpAssignment,
            {"tenant_id": tenant.id, "house_help_id": help_rows["suresh"].id, "apartment_id": apartments["A-102"].id},
            {"assigned_by": users["resident2"].id},
        )

        ensure_row(
            session,
            HouseHelpReview,
            {"tenant_id": tenant.id, "house_help_id": help_rows["maya"].id, "reviewer_id": users["resident"].id},
            {"rating": 5, "comment": "Very punctual and polite."},
        )

        ensure_row(
            session,
            HouseHelpEntry,
            {"id": "f8888888-8888-8888-8888-888888888888"},
            {
                "tenant_id": tenant.id,
                "house_help_id": help_rows["maya"].id,
                "apartment_id": apartments["A-101"].id,
                "check_in_at": NOW - timedelta(hours=1),
                "check_in_by": users["guard_user"].id,
                "check_out_at": None,
                "check_out_by": None,
            },
        )

        session.commit()

        return {
            "tenant_slug": tenant.slug,
            "admin_email": "admin@demo.local",
            "resident_email": "resident@demo.local",
            "guard_email": "guard@demo.local",
        }
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def main() -> None:
    auth_ids = ensure_auth_users()
    summary = seed_database(auth_ids)
    print("Demo seed completed.")
    print("Tenant:", summary["tenant_slug"])
    print("Admin:", summary["admin_email"], "password=DemoAdmin123!")
    print("Resident:", summary["resident_email"], "password=Resident123!")
    print("Guard:", summary["guard_email"], "password=Guard123!")


if __name__ == "__main__":
    main()
