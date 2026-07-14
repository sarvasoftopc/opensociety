from collections.abc import Generator
from contextlib import contextmanager
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.tenant import resolve_tenant
from app.db.base import Base
from app.db.models import (
    Apartment,
    Guard,
    GuardDevice,
    MaintenanceTicket,
    Notice,
    NoticeRead,
    ParkingSlot,
    Residency,
    Tenant,
    User,
    Vehicle,
    VisitorEntry,
    VisitorPreApproval,
)
from app.main import app


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite://",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    Base.metadata.create_all(bind=engine)

    def override_get_db() -> Generator[Session, None, None]:
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@contextmanager
def seeded_db_session() -> Generator[Session, None, None]:
    session_gen = app.dependency_overrides[get_db]()
    db = next(session_gen)
    try:
        yield db
    finally:
        try:
            next(session_gen)
        except StopIteration:
            pass


def test_root_contract(client: TestClient) -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"name": "opensociety-api", "status": "ok"}


def test_health_contract(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_tenant_resolution_uses_default_for_local_hosts() -> None:
    localhost = resolve_tenant(tenant_id=None, society_slug=None, host="localhost:8788")
    loopback = resolve_tenant(tenant_id=None, society_slug=None, host="127.0.0.1:8788")

    assert localhost.tenant_slug == "demo-society"
    assert loopback.tenant_slug == "demo-society"


def test_tenant_resolution_uses_subdomain_for_real_hosts() -> None:
    tenant = resolve_tenant(tenant_id=None, society_slug=None, host="alpha.example.com")

    assert tenant.tenant_slug == "alpha"
    assert tenant.resolution_source == "host-subdomain"


def test_society_returns_null_when_missing(client: TestClient) -> None:
    response = client.get("/society", headers={"x-user-id": "dev-admin"})
    assert response.status_code == 200
    assert response.json() is None


def test_society_create_and_update_flow(client: TestClient) -> None:
    payload = {
        "name": "Palm Residency",
        "address": "Sector 1",
        "city": "Gurgaon",
        "state": "Haryana",
        "pincode": "122001",
        "gstin": "06ABCDE1234F1Z5",
    }

    create_response = client.put("/society", json=payload, headers={"x-user-id": "dev-admin"})
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["name"] == payload["name"]
    assert created["city"] == payload["city"]
    assert created["pincode"] == payload["pincode"]
    assert created["gstin"] == payload["gstin"]
    assert created["createdAt"] is not None
    assert created["updatedAt"] is not None

    get_response = client.get("/society", headers={"x-user-id": "dev-admin"})
    assert get_response.status_code == 200
    fetched = get_response.json()
    assert fetched["id"] == created["id"]
    assert fetched["name"] == payload["name"]

    update_payload = {**payload, "name": "Palm Residency Phase 2", "gstin": ""}
    update_response = client.put("/society", json=update_payload, headers={"x-user-id": "dev-admin"})
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["id"] == created["id"]
    assert updated["name"] == "Palm Residency Phase 2"
    assert updated["gstin"] is None


def test_society_requires_authentication(client: TestClient) -> None:
    response = client.get("/society")
    assert response.status_code == 401
    assert response.json() == {"detail": "authentication required"}


def test_list_users_filters_by_tenant_and_status(client: TestClient) -> None:
    with seeded_db_session() as db:
        tenant_a = Tenant(slug="demo-society", name="Demo Society")
        tenant_b = Tenant(slug="other-society", name="Other Society")
        db.add_all([tenant_a, tenant_b])
        db.flush()
        db.add_all(
            [
                User(
                    tenant_id=tenant_a.id,
                    clerk_id="clerk-a",
                    email="approved@example.com",
                    name="Approved User",
                    role="RESIDENT",
                    status="APPROVED",
                ),
                User(
                    tenant_id=tenant_a.id,
                    clerk_id="clerk-b",
                    email="pending@example.com",
                    name="Pending User",
                    role="RESIDENT",
                    status="PENDING",
                ),
                User(
                    tenant_id=tenant_b.id,
                    clerk_id="clerk-c",
                    email="other@example.com",
                    name="Other Tenant User",
                    role="RESIDENT",
                    status="APPROVED",
                ),
            ]
        )
        db.commit()

    response = client.get("/users?status=PENDING", headers={"x-user-id": "dev-admin"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["email"] == "pending@example.com"
    assert data[0]["status"] == "PENDING"


def test_list_apartments_scopes_by_tenant(client: TestClient) -> None:
    with seeded_db_session() as db:
        tenant_a = Tenant(slug="demo-society", name="Demo Society")
        tenant_b = Tenant(slug="other-society", name="Other Society")
        db.add_all([tenant_a, tenant_b])
        db.flush()
        db.add_all(
            [
                Apartment(tenant_id=tenant_a.id, tower="A", apartment_no="101", floor=1, bhk_type="2BHK"),
                Apartment(tenant_id=tenant_b.id, tower="Z", apartment_no="999", floor=9, bhk_type="4BHK"),
            ]
        )
        db.commit()

    response = client.get("/apartments", headers={"x-user-id": "dev-admin"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["tower"] == "A"
    assert data[0]["apartmentNo"] == "101"


def test_create_apartment(client: TestClient) -> None:
    with seeded_db_session() as db:
        db.add(Tenant(slug="demo-society", name="Demo Society"))
        db.commit()

    response = client.post(
        "/apartments",
        json={"tower": "C", "apartmentNo": "301", "floor": 3, "bhkType": "2BHK"},
        headers={"x-user-id": "dev-admin"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["tower"] == "C"
    assert data["apartmentNo"] == "301"
    assert data["floor"] == 3
    assert data["bhkType"] == "2BHK"
    assert data["isActive"] is True


def test_create_apartments_bulk(client: TestClient) -> None:
    with seeded_db_session() as db:
        db.add(Tenant(slug="demo-society", name="Demo Society"))
        db.commit()

    response = client.post(
        "/apartments/bulk",
        json={
            "apartments": [
                {"tower": "D", "apartmentNo": "401", "floor": 4, "bhkType": "3BHK"},
                {"tower": "D", "apartmentNo": "402"},
            ]
        },
        headers={"x-user-id": "dev-admin"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["count"] == 2
    assert len(data["apartments"]) == 2
    assert data["apartments"][0]["apartmentNo"] == "401"
    assert data["apartments"][1]["apartmentNo"] == "402"


def test_update_apartment(client: TestClient) -> None:
    with seeded_db_session() as db:
        tenant = Tenant(slug="demo-society", name="Demo Society")
        db.add(tenant)
        db.flush()
        apartment = Apartment(tenant_id=tenant.id, tower="E", apartment_no="501", floor=5, bhk_type="4BHK")
        db.add(apartment)
        db.commit()
        apartment_id = apartment.id

    response = client.patch(
        f"/apartments/{apartment_id}",
        json={"floor": None, "bhkType": None, "isActive": False},
        headers={"x-user-id": "dev-admin"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["floor"] is None
    assert data["bhkType"] is None
    assert data["isActive"] is False


def test_list_my_apartments_returns_only_current_residencies(client: TestClient) -> None:
    with seeded_db_session() as db:
        tenant = Tenant(slug="demo-society", name="Demo Society")
        db.add(tenant)
        db.flush()
        user = User(
            tenant_id=tenant.id,
            clerk_id="resident-mine",
            email="residentmine@example.com",
            name="Resident Mine",
            role="RESIDENT",
            status="APPROVED",
        )
        apartment_a = Apartment(tenant_id=tenant.id, tower="M", apartment_no="101", floor=1, bhk_type="2BHK")
        apartment_b = Apartment(tenant_id=tenant.id, tower="M", apartment_no="102", floor=1, bhk_type="2BHK")
        db.add_all([user, apartment_a, apartment_b])
        db.flush()
        db.add(
            Residency(
                tenant_id=tenant.id,
                user_id=user.id,
                apartment_id=apartment_a.id,
                relation="OWNER",
                is_primary=True,
            )
        )
        db.commit()
        user_id = user.id

    response = client.get("/apartments/mine", headers={"x-user-id": user_id})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["tower"] == "M"
    assert data[0]["apartmentNo"] == "101"


def test_approve_user_creates_residency_and_updates_status(client: TestClient) -> None:
    with seeded_db_session() as db:
        tenant = Tenant(slug="demo-society", name="Demo Society")
        db.add(tenant)
        db.flush()
        apartment = Apartment(tenant_id=tenant.id, tower="B", apartment_no="204", floor=2, bhk_type="3BHK")
        user = User(
            tenant_id=tenant.id,
            clerk_id="clerk-pending",
            email="resident@example.com",
            name="Resident Pending",
            role="RESIDENT",
            status="PENDING",
        )
        db.add_all([apartment, user])
        db.commit()
        apartment_id = apartment.id
        user_id = user.id

    response = client.post(
        f"/users/{user_id}/approve",
        json={"apartmentId": apartment_id, "relation": "OWNER", "isPrimary": True},
        headers={"x-user-id": "dev-admin"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "APPROVED"
    assert data["id"] == user_id


def test_update_user_role(client: TestClient) -> None:
    with seeded_db_session() as db:
        tenant = Tenant(slug="demo-society", name="Demo Society")
        db.add(tenant)
        db.flush()
        user = User(
            tenant_id=tenant.id,
            clerk_id="clerk-role",
            email="guard@example.com",
            name="Guard Role User",
            role="RESIDENT",
            status="APPROVED",
        )
        db.add(user)
        db.commit()
        user_id = user.id

    response = client.patch(
        f"/users/{user_id}/role",
        json={"role": "GUARD"},
        headers={"x-user-id": "dev-admin"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "GUARD"


def test_create_and_list_visitors(client: TestClient) -> None:
    with seeded_db_session() as db:
        tenant = Tenant(slug="demo-society", name="Demo Society")
        db.add(tenant)
        db.flush()
        apartment = Apartment(tenant_id=tenant.id, tower="F", apartment_no="601", floor=6, bhk_type="2BHK")
        db.add(apartment)
        db.commit()
        apartment_id = apartment.id

    create_response = client.post(
        "/visitors",
        json={
            "apartmentId": apartment_id,
            "visitorName": "Courier Person",
            "visitorPhone": "9999999999",
            "type": "DELIVERY",
            "purpose": "Parcel",
        },
        headers={"x-user-id": "dev-admin"},
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["visitorName"] == "Courier Person"
    assert created["status"] == "PENDING"

    list_response = client.get("/visitors?status=PENDING", headers={"x-user-id": "dev-admin"})
    assert list_response.status_code == 200
    rows = list_response.json()
    assert len(rows) == 1
    assert rows[0]["id"] == created["id"]


def test_visitor_transitions_approve_checkin_checkout(client: TestClient) -> None:
    with seeded_db_session() as db:
        tenant = Tenant(slug="demo-society", name="Demo Society")
        db.add(tenant)
        db.flush()
        apartment = Apartment(tenant_id=tenant.id, tower="G", apartment_no="701", floor=7, bhk_type="3BHK")
        db.add(apartment)
        db.flush()
        visitor = VisitorEntry(
            tenant_id=tenant.id,
            apartment_id=apartment.id,
            visitor_name="Approved Visitor",
            visitor_phone="8888888888",
            type="GUEST",
            status="PENDING",
        )
        db.add(visitor)
        db.commit()
        visitor_id = visitor.id

    approve_response = client.post(f"/visitors/{visitor_id}/approve", headers={"x-user-id": "dev-admin"})
    assert approve_response.status_code == 200
    assert approve_response.json()["status"] == "APPROVED"

    checkin_response = client.post(
        f"/visitors/{visitor_id}/checkin",
        json={"guardId": "guard-1", "vehicleNumber": "DL01AB1234"},
        headers={"x-user-id": "dev-admin"},
    )
    assert checkin_response.status_code == 200
    assert checkin_response.json()["status"] == "ENTERED"
    assert checkin_response.json()["vehicleNumber"] == "DL01AB1234"

    checkout_response = client.post(f"/visitors/{visitor_id}/checkout", headers={"x-user-id": "dev-admin"})
    assert checkout_response.status_code == 200
    assert checkout_response.json()["status"] == "EXITED"


def test_deny_visitor(client: TestClient) -> None:
    with seeded_db_session() as db:
        tenant = Tenant(slug="demo-society", name="Demo Society")
        db.add(tenant)
        db.flush()
        apartment = Apartment(tenant_id=tenant.id, tower="H", apartment_no="801", floor=8, bhk_type="2BHK")
        db.add(apartment)
        db.flush()
        visitor = VisitorEntry(
            tenant_id=tenant.id,
            apartment_id=apartment.id,
            visitor_name="Denied Visitor",
            type="GUEST",
            status="PENDING",
        )
        db.add(visitor)
        db.commit()
        visitor_id = visitor.id

    response = client.post(
        f"/visitors/{visitor_id}/deny",
        json={"reason": "not expected"},
        headers={"x-user-id": "dev-admin"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "DENIED"
    assert data["deniedReason"] == "not expected"


def test_pre_approval_create_redeem_and_revoke(client: TestClient) -> None:
    with seeded_db_session() as db:
        tenant = Tenant(slug="demo-society", name="Demo Society")
        db.add(tenant)
        db.flush()
        apartment = Apartment(tenant_id=tenant.id, tower="J", apartment_no="901", floor=9, bhk_type="4BHK")
        creator = User(
            tenant_id=tenant.id,
            clerk_id="clerk-admin",
            email="admin@example.com",
            name="Admin User",
            role="ADMIN",
            status="APPROVED",
        )
        db.add_all([apartment, creator])
        db.commit()
        apartment_id = apartment.id

    create_response = client.post(
        "/visitors/pre-approvals",
        json={
            "apartmentId": apartment_id,
            "visitorName": "Expected Guest",
            "visitorPhone": "7777777777",
            "approvalType": "ONE_TIME",
        },
        headers={"x-user-id": "dev-admin"},
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["visitorName"] == "Expected Guest"
    assert created["isActive"] is True

    list_response = client.get("/visitors/pre-approvals", headers={"x-user-id": "dev-admin"})
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    redeem_response = client.post(
        "/visitors/pre-approvals/redeem",
        json={"code": created["code"], "guardId": "guard-2"},
        headers={"x-user-id": "dev-admin"},
    )
    assert redeem_response.status_code == 201
    redeemed = redeem_response.json()
    assert redeemed["status"] == "ENTERED"
    assert redeemed["preApprovalId"] == created["id"]

    revoke_response = client.post(
        f"/visitors/pre-approvals/{created['id']}/revoke",
        headers={"x-user-id": "dev-admin"},
    )
    assert revoke_response.status_code == 200
    assert revoke_response.json()["isActive"] is False


def test_create_and_list_notices(client: TestClient) -> None:
    with seeded_db_session() as db:
        tenant = Tenant(slug="demo-society", name="Demo Society")
        publisher = User(
            tenant_id="seed",
            clerk_id="clerk-notice",
            email="notice@example.com",
            name="Notice Admin",
            role="ADMIN",
            status="APPROVED",
        )
        db.add(tenant)
        db.flush()
        publisher.tenant_id = tenant.id
        db.add(publisher)
        db.commit()

    create_response = client.post(
        "/notices",
        json={"title": "Water Supply", "body": "Off at 2pm", "priority": "HIGH", "category": "MAINTENANCE"},
        headers={"x-user-id": "dev-admin"},
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["title"] == "Water Supply"
    assert created["priority"] == "HIGH"

    list_response = client.get("/notices?category=MAINTENANCE&q=Water", headers={"x-user-id": "dev-admin"})
    assert list_response.status_code == 200
    rows = list_response.json()
    assert len(rows) == 1
    assert rows[0]["id"] == created["id"]
    assert rows[0]["readCount"] == 0


def test_notice_read_and_read_receipts(client: TestClient) -> None:
    with seeded_db_session() as db:
        tenant = Tenant(slug="demo-society", name="Demo Society")
        admin = User(
            tenant_id="seed",
            clerk_id="clerk-admin-notice",
            email="admin-notice@example.com",
            name="Admin Reader",
            role="ADMIN",
            status="APPROVED",
        )
        db.add(tenant)
        db.flush()
        admin.tenant_id = tenant.id
        db.add(admin)
        db.flush()
        notice = Notice(
            tenant_id=tenant.id,
            title="Meeting",
            body="Society meeting tomorrow",
            priority="NORMAL",
            category="GENERAL",
            published_by=admin.id,
        )
        db.add(notice)
        db.commit()
        notice_id = notice.id

    read_response = client.post(f"/notices/{notice_id}/read", headers={"x-user-id": "dev-admin"})
    assert read_response.status_code == 200
    assert read_response.json()["ok"] is True

    receipts_response = client.get(f"/notices/{notice_id}/reads", headers={"x-user-id": "dev-admin"})
    assert receipts_response.status_code == 200
    receipts = receipts_response.json()
    assert len(receipts) == 1
    assert receipts[0]["readAt"] is not None


def test_create_update_and_list_guards(client: TestClient) -> None:
    with seeded_db_session() as db:
        tenant = Tenant(slug="demo-society", name="Demo Society")
        db.add(tenant)
        db.commit()

    create_response = client.post(
        "/guards",
        json={"name": "Ramesh Kumar", "phone": "+919999999999", "employeeCode": "G-001"},
        headers={"x-user-id": "dev-admin"},
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["name"] == "Ramesh Kumar"
    assert created["employeeCode"] == "G-001"

    list_response = client.get("/guards", headers={"x-user-id": "dev-admin"})
    assert list_response.status_code == 200
    rows = list_response.json()
    assert len(rows) == 1

    update_response = client.patch(
        f"/guards/{created['id']}",
        json={"phone": None, "isActive": False},
        headers={"x-user-id": "dev-admin"},
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["phone"] is None
    assert updated["isActive"] is False


def test_list_and_revoke_guard_devices(client: TestClient) -> None:
    with seeded_db_session() as db:
        tenant = Tenant(slug="demo-society", name="Demo Society")
        db.add(tenant)
        db.flush()
        guard = Guard(tenant_id=tenant.id, name="Suresh", phone=None, employee_code="G-002", is_active=True)
        db.add(guard)
        db.flush()
        device = GuardDevice(tenant_id=tenant.id, guard_id=guard.id, device_id="device-1", model="Pixel")
        db.add(device)
        db.commit()
        guard_id = guard.id

    list_response = client.get(f"/guards/{guard_id}/devices", headers={"x-user-id": "dev-admin"})
    assert list_response.status_code == 200
    devices = list_response.json()
    assert len(devices) == 1
    assert devices[0]["deviceId"] == "device-1"

    revoke_response = client.post(f"/guards/{guard_id}/devices/device-1/revoke", headers={"x-user-id": "dev-admin"})
    assert revoke_response.status_code == 200
    revoked = revoke_response.json()
    assert revoked["revokedAt"] is not None


def test_create_and_list_tickets(client: TestClient) -> None:
    with seeded_db_session() as db:
        tenant = Tenant(slug="demo-society", name="Demo Society")
        admin = User(
            tenant_id="seed",
            clerk_id="clerk-ticket-admin",
            email="ticket-admin@example.com",
            name="Ticket Admin",
            role="ADMIN",
            status="APPROVED",
        )
        db.add(tenant)
        db.flush()
        admin.tenant_id = tenant.id
        apartment = Apartment(tenant_id=tenant.id, tower="K", apartment_no="1001", floor=10, bhk_type="3BHK")
        db.add_all([admin, apartment])
        db.commit()
        apartment_id = apartment.id

    create_response = client.post(
        "/tickets",
        json={
            "apartmentId": apartment_id,
            "title": "Leaking tap",
            "description": "Kitchen sink leaking",
            "category": "PLUMBING",
            "priority": "HIGH",
        },
        headers={"x-user-id": "dev-admin"},
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["title"] == "Leaking tap"
    assert created["status"] == "OPEN"

    list_response = client.get("/tickets?status=OPEN", headers={"x-user-id": "dev-admin"})
    assert list_response.status_code == 200
    rows = list_response.json()
    assert len(rows) == 1
    assert rows[0]["id"] == created["id"]


def test_assign_and_transition_ticket(client: TestClient) -> None:
    with seeded_db_session() as db:
        tenant = Tenant(slug="demo-society", name="Demo Society")
        admin = User(
            tenant_id="seed",
            clerk_id="clerk-ticket-admin2",
            email="ticket-admin2@example.com",
            name="Ticket Admin 2",
            role="ADMIN",
            status="APPROVED",
        )
        assignee = User(
            tenant_id="seed",
            clerk_id="clerk-staff",
            email="staff@example.com",
            name="Staff User",
            role="STAFF",
            status="APPROVED",
        )
        db.add(tenant)
        db.flush()
        admin.tenant_id = tenant.id
        assignee.tenant_id = tenant.id
        apartment = Apartment(tenant_id=tenant.id, tower="L", apartment_no="1101", floor=11, bhk_type="2BHK")
        db.add_all([admin, assignee, apartment])
        db.flush()
        ticket = MaintenanceTicket(
            tenant_id=tenant.id,
            apartment_id=apartment.id,
            raised_by=admin.id,
            title="Broken light",
            description="Corridor light broken",
            category="ELECTRICAL",
            priority="NORMAL",
            status="OPEN",
        )
        db.add(ticket)
        db.commit()
        ticket_id = ticket.id
        assignee_id = assignee.id

    assign_response = client.patch(
        f"/tickets/{ticket_id}/assign",
        json={"assignedTo": assignee_id},
        headers={"x-user-id": "dev-admin"},
    )
    assert assign_response.status_code == 200
    assert assign_response.json()["assignedTo"] == assignee_id

    start_response = client.post(
        f"/tickets/{ticket_id}/transition",
        json={"action": "start"},
        headers={"x-user-id": "dev-admin"},
    )
    assert start_response.status_code == 200
    assert start_response.json()["status"] == "IN_PROGRESS"

    resolve_response = client.post(
        f"/tickets/{ticket_id}/transition",
        json={"action": "resolve", "resolutionNote": "Replaced bulb"},
        headers={"x-user-id": "dev-admin"},
    )
    assert resolve_response.status_code == 200
    resolved = resolve_response.json()
    assert resolved["status"] == "RESOLVED"
    assert resolved["resolutionNote"] == "Replaced bulb"

    close_response = client.post(
        f"/tickets/{ticket_id}/transition",
        json={"action": "close"},
        headers={"x-user-id": "dev-admin"},
    )
    assert close_response.status_code == 200
    assert close_response.json()["status"] == "CLOSED"


def test_resident_ticket_visibility_is_scoped(client: TestClient) -> None:
    with seeded_db_session() as db:
        tenant = Tenant(slug="demo-society", name="Demo Society")
        resident = User(
            tenant_id="seed",
            clerk_id="dev-resident",
            email="resident-ticket@example.com",
            name="Resident Ticket User",
            role="RESIDENT",
            status="APPROVED",
        )
        other = User(
            tenant_id="seed",
            clerk_id="other-resident",
            email="other-ticket@example.com",
            name="Other Resident",
            role="RESIDENT",
            status="APPROVED",
        )
        db.add(tenant)
        db.flush()
        resident.tenant_id = tenant.id
        other.tenant_id = tenant.id
        apt_mine = Apartment(tenant_id=tenant.id, tower="M", apartment_no="1201", floor=12, bhk_type="2BHK")
        apt_other = Apartment(tenant_id=tenant.id, tower="N", apartment_no="1301", floor=13, bhk_type="3BHK")
        db.add_all([resident, other, apt_mine, apt_other])
        db.flush()
        db.add(Residency(tenant_id=tenant.id, user_id=resident.id, apartment_id=apt_mine.id, relation="OWNER", is_primary=True))
        db.add_all(
            [
                MaintenanceTicket(
                    tenant_id=tenant.id,
                    apartment_id=apt_mine.id,
                    raised_by=resident.id,
                    title="Mine",
                    description="My ticket",
                    category="OTHER",
                    priority="NORMAL",
                    status="OPEN",
                ),
                MaintenanceTicket(
                    tenant_id=tenant.id,
                    apartment_id=apt_other.id,
                    raised_by=other.id,
                    title="Other",
                    description="Other ticket",
                    category="OTHER",
                    priority="NORMAL",
                    status="OPEN",
                ),
            ]
        )
        db.commit()

    response = client.get("/tickets", headers={"x-user-id": "dev-resident"})
    assert response.status_code == 200
    rows = response.json()
    assert len(rows) == 1
    assert rows[0]["title"] == "Mine"


def test_vehicle_registry_and_gate_log_contracts(client: TestClient) -> None:
    with seeded_db_session() as db:
        tenant = Tenant(slug="demo-society", name="Demo Society")
        resident = User(
            tenant_id="seed",
            clerk_id="resident-vehicle",
            email="vehicle@example.com",
            name="Vehicle Resident",
            role="RESIDENT",
            status="APPROVED",
        )
        guard = User(
            tenant_id="seed",
            clerk_id="guard-vehicle",
            email="guardvehicle@example.com",
            name="Gate Guard",
            role="GUARD",
            status="APPROVED",
        )
        db.add(tenant)
        db.flush()
        resident.tenant_id = tenant.id
        guard.tenant_id = tenant.id
        apartment = Apartment(tenant_id=tenant.id, tower="J", apartment_no="1001", floor=10, bhk_type="3BHK")
        db.add_all([resident, guard, apartment])
        db.flush()
        db.add(Residency(tenant_id=tenant.id, user_id=resident.id, apartment_id=apartment.id, relation="OWNER", is_primary=True))
        db.commit()
        apartment_id = apartment.id
        resident_id = resident.id

    create_response = client.post(
        "/vehicles",
        json={
            "apartmentId": apartment_id,
            "registrationNumber": "KA 01 AB 1234",
            "type": "CAR",
            "make": "Honda City",
            "color": "White",
        },
        headers={"x-user-id": resident_id},
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["registrationNumber"] == "KA01AB1234"
    assert created["registeredBy"] == resident_id

    list_response = client.get("/vehicles", headers={"x-user-id": resident_id})
    assert list_response.status_code == 200
    vehicles = list_response.json()
    assert len(vehicles) == 1
    assert vehicles[0]["registrationNumber"] == "KA01AB1234"

    with seeded_db_session() as db:
        tenant = db.query(Tenant).filter(Tenant.slug == "demo-society").one()
        db.add(
            VisitorEntry(
                tenant_id=tenant.id,
                apartment_id=apartment_id,
                visitor_name="Courier Rider",
                vehicle_number="KA-01-AB-1234",
                type="DELIVERY",
                status="ENTERED",
            )
        )
        db.commit()

    gate_log_response = client.get("/vehicles/gate-log", headers={"x-user-id": "guard-vehicle"})
    assert gate_log_response.status_code == 200
    gate_log = gate_log_response.json()
    assert len(gate_log) == 1
    assert gate_log[0]["visitorName"] == "Courier Rider"
    assert gate_log[0]["apartment"] == "J-1001"
    assert gate_log[0]["registered"] is True


def test_vehicle_duplicate_and_parking_contracts(client: TestClient) -> None:
    with seeded_db_session() as db:
        tenant = Tenant(slug="demo-society", name="Demo Society")
        admin = User(
            tenant_id="seed",
            clerk_id="admin-parking",
            email="adminparking@example.com",
            name="Parking Admin",
            role="ADMIN",
            status="APPROVED",
        )
        db.add(tenant)
        db.flush()
        admin.tenant_id = tenant.id
        apartment = Apartment(tenant_id=tenant.id, tower="K", apartment_no="1102", floor=11, bhk_type="2BHK")
        db.add_all([admin, apartment])
        db.commit()
        apartment_id = apartment.id
        admin_id = admin.id

    first_vehicle = client.post(
        "/vehicles",
        json={"apartmentId": apartment_id, "registrationNumber": "DL 01 CD 9999", "type": "CAR"},
        headers={"x-user-id": admin_id},
    )
    assert first_vehicle.status_code == 201

    dupe_vehicle = client.post(
        "/vehicles",
        json={"apartmentId": apartment_id, "registrationNumber": "DL01-CD-9999", "type": "CAR"},
        headers={"x-user-id": admin_id},
    )
    assert dupe_vehicle.status_code == 409
    assert dupe_vehicle.json() == {"detail": "vehicle already registered"}

    create_slot = client.post(
        "/parking/slots",
        json={"slotNumber": "b1 05", "type": "OPEN", "isVisitor": False},
        headers={"x-user-id": admin_id},
    )
    assert create_slot.status_code == 201
    created_slot = create_slot.json()
    assert created_slot["slotNumber"] == "B1 05"
    slot_id = created_slot["id"]

    assign_slot = client.post(
        f"/parking/slots/{slot_id}/assign",
        json={"apartmentId": apartment_id, "isTemporary": True, "assignedUntil": "2026-07-20T23:59:59Z"},
        headers={"x-user-id": admin_id},
    )
    assert assign_slot.status_code == 200
    assigned_slot = assign_slot.json()
    assert assigned_slot["apartmentId"] == apartment_id
    assert assigned_slot["isTemporary"] is True

    list_slots = client.get("/parking/slots", headers={"x-user-id": admin_id})
    assert list_slots.status_code == 200
    slots = list_slots.json()
    assert len(slots) == 1
    assert slots[0]["apartment"] == "K-1102"

    list_directory = client.get("/parking/directory", headers={"x-user-id": admin_id})
    assert list_directory.status_code == 200
    directory = list_directory.json()
    assert len(directory) == 1
    assert directory[0]["slotNumber"] == "B1 05"
    assert directory[0]["apartment"] == "K-1102"


def test_visitor_parking_auto_allocation_and_release(client: TestClient) -> None:
    with seeded_db_session() as db:
        tenant = Tenant(slug="demo-society", name="Demo Society")
        guard = User(
            tenant_id="seed",
            clerk_id="guard-auto-park",
            email="guardauto@example.com",
            name="Auto Guard",
            role="GUARD",
            status="APPROVED",
        )
        db.add(tenant)
        db.flush()
        guard.tenant_id = tenant.id
        apartment = Apartment(tenant_id=tenant.id, tower="L", apartment_no="1203", floor=12, bhk_type="2BHK")
        db.add_all(
            [
                apartment,
                guard,
                ParkingSlot(
                    tenant_id=tenant.id,
                    slot_number="V1",
                    type="OPEN",
                    is_visitor=True,
                    is_active=True,
                    is_temporary=False,
                ),
            ]
        )
        db.commit()
        apartment_id = apartment.id

    create_response = client.post(
        "/visitors",
        json={"apartmentId": apartment_id, "visitorName": "Cab Driver", "type": "GUEST", "vehicleNumber": "HR26DK0001"},
        headers={"x-user-id": "guard-auto-park"},
    )
    assert create_response.status_code == 201
    visitor_id = create_response.json()["id"]

    approve_response = client.post(f"/visitors/{visitor_id}/approve", headers={"x-user-id": "dev-admin"})
    assert approve_response.status_code == 200

    checkin_response = client.post(
        f"/visitors/{visitor_id}/checkin",
        json={"guardId": "guard-auto-park", "vehicleNumber": "HR26DK0001"},
        headers={"x-user-id": "guard-auto-park"},
    )
    assert checkin_response.status_code == 200

    visitor_parking = client.get("/parking/visitor", headers={"x-user-id": "guard-auto-park"})
    assert visitor_parking.status_code == 200
    parking_view = visitor_parking.json()
    assert parking_view["summary"] == {"total": 1, "available": 0, "occupied": 1, "isFull": True}
    assert parking_view["slots"][0]["visitorName"] == "Cab Driver"

    checkout_response = client.post(f"/visitors/{visitor_id}/checkout", headers={"x-user-id": "guard-auto-park"})
    assert checkout_response.status_code == 200

    visitor_parking_after = client.get("/parking/visitor", headers={"x-user-id": "guard-auto-park"})
    assert visitor_parking_after.status_code == 200
    parking_view_after = visitor_parking_after.json()
    assert parking_view_after["summary"] == {"total": 1, "available": 1, "occupied": 0, "isFull": False}
    assert parking_view_after["slots"][0]["occupiedByEntryId"] is None


def test_billing_payment_and_reports_contracts(client: TestClient) -> None:
    with seeded_db_session() as db:
        tenant = Tenant(slug="demo-society", name="Demo Society")
        admin = User(tenant_id="seed", clerk_id="finance-admin", email="finance@example.com", name="Finance Admin", role="ADMIN", status="APPROVED")
        db.add(tenant)
        db.flush()
        admin.tenant_id = tenant.id
        apartment = Apartment(tenant_id=tenant.id, tower="P", apartment_no="1401", floor=14, bhk_type="3BHK")
        db.add_all([admin, apartment])
        db.commit()
        apartment_id = apartment.id
        admin_id = admin.id

    cfg_response = client.put(
        "/bill-config",
        json={"dueDayOfMonth": 12, "lineItems": [{"description": "Maintenance", "amount": 500000, "taxRatePct": 18}]},
        headers={"x-user-id": admin_id},
    )
    assert cfg_response.status_code in {200, 201}
    assert cfg_response.json()["dueDayOfMonth"] == 12

    create_bill = client.post(
        "/bills",
        json={
            "apartmentId": apartment_id,
            "title": "One-time repair",
            "lineItems": [{"description": "Repair", "amount": 100000, "taxRatePct": 18}],
        },
        headers={"x-user-id": admin_id},
    )
    assert create_bill.status_code == 201
    bill = create_bill.json()
    assert bill["totalAmount"] == 118000

    record_payment = client.post(
        "/payments",
        json={"billId": bill["id"], "amount": 118000, "method": "UPI"},
        headers={"x-user-id": admin_id},
    )
    assert record_payment.status_code == 201
    payment = record_payment.json()
    assert payment["method"] == "UPI"

    list_bills = client.get("/bills", headers={"x-user-id": admin_id})
    assert list_bills.status_code == 200
    bills = list_bills.json()
    assert len(bills) == 1
    assert bills[0]["paidAmount"] == 118000

    get_bill = client.get(f"/bills/{bill['id']}", headers={"x-user-id": admin_id})
    assert get_bill.status_code == 200
    assert get_bill.json()["lineItems"][0]["description"] == "Repair"

    invoice = client.get(f"/bills/{bill['id']}/invoice", headers={"x-user-id": admin_id})
    assert invoice.status_code == 200
    assert invoice.headers["content-type"].startswith("application/pdf")

    dues = client.get("/bills/dues", headers={"x-user-id": admin_id})
    assert dues.status_code == 200
    assert dues.json() == []

    finance = client.get("/reports/finance", headers={"x-user-id": admin_id})
    assert finance.status_code == 200
    assert finance.json()["totalCollected"] == 0


def test_house_help_upload_and_webhook_contracts(client: TestClient) -> None:
    with seeded_db_session() as db:
        tenant = Tenant(slug="demo-society", name="Demo Society")
        resident = User(tenant_id="seed", clerk_id="help-resident", email="help@example.com", name="Help Resident", role="RESIDENT", status="APPROVED")
        guard = User(tenant_id="seed", clerk_id="help-guard", email="helpguard@example.com", name="Help Guard", role="GUARD", status="APPROVED")
        db.add(tenant)
        db.flush()
        resident.tenant_id = tenant.id
        guard.tenant_id = tenant.id
        apartment = Apartment(tenant_id=tenant.id, tower="Q", apartment_no="1501", floor=15, bhk_type="2BHK")
        db.add_all([resident, guard, apartment])
        db.flush()
        db.add(Residency(tenant_id=tenant.id, user_id=resident.id, apartment_id=apartment.id, relation="OWNER", is_primary=True))
        db.commit()
        apartment_id = apartment.id
        resident_id = resident.id

    create_help = client.post(
        "/house-help",
        json={"name": "Maya", "phone": "9999999999", "type": "MAID", "idProofType": "AADHAAR", "idProofNumber": "1234"},
        headers={"x-user-id": resident_id},
    )
    assert create_help.status_code == 201
    help_row = create_help.json()
    help_id = help_row["id"]

    review = client.post(
        f"/house-help/{help_id}/reviews",
        json={"rating": 5, "comment": "Very punctual"},
        headers={"x-user-id": resident_id},
    )
    assert review.status_code == 201
    assert review.json()["ok"] is True

    assignments = client.post(
        f"/house-help/{help_id}/assignments",
        json={"apartmentId": apartment_id},
        headers={"x-user-id": resident_id},
    )
    assert assignments.status_code == 201

    checkin = client.post(
        f"/house-help/{help_id}/checkin",
        json={"apartmentId": apartment_id},
        headers={"x-user-id": "help-guard"},
    )
    assert checkin.status_code == 201
    entry_id = checkin.json()["id"]

    entries = client.get("/house-help/entries", headers={"x-user-id": resident_id})
    assert entries.status_code == 200
    assert entries.json()[0]["helpName"] == "Maya"

    checkout = client.post(f"/house-help/entries/{entry_id}/checkout", headers={"x-user-id": "help-guard"})
    assert checkout.status_code == 200

    upload = client.post("/uploads", content=b"fakepng", headers={"x-user-id": resident_id, "content-type": "image/png"})
    assert upload.status_code == 201
    upload_json = upload.json()
    fetch_upload = client.get(upload_json["url"], headers={"x-user-id": resident_id})
    assert fetch_upload.status_code == 200
    assert fetch_upload.content == b"fakepng"
    upload_path = Path("/Users/sarabjeetsingh/Documents/Hub/Github/opensociety/apps/api-fastapi/.uploads") / upload_json["key"]
    if upload_path.exists():
        upload_path.unlink()

    webhook = client.post(
        "/webhooks/clerk",
        json={
            "type": "user.created",
            "data": {
                "id": "clerk-new-user",
                "first_name": "New",
                "last_name": "Resident",
                "email_addresses": [{"email_address": "newresident@example.com"}],
                "phone_numbers": [{"phone_number": "8888888888"}],
            },
        },
    )
    assert webhook.status_code == 200
    assert webhook.json() == {"ok": True}


def test_guard_duty_and_device_binding_contracts(client: TestClient) -> None:
    with seeded_db_session() as db:
        tenant = Tenant(slug="demo-society", name="Demo Society")
        db.add(tenant)
        db.flush()
        guard = Guard(tenant_id=tenant.id, name="On Duty Guard", phone="7777777777", employee_code="G-100", is_active=True)
        db.add(guard)
        db.commit()
        guard_id = guard.id

    bind_response = client.post(
        f"/guards/{guard_id}/devices",
        json={"deviceId": "guard-device-1", "model": "Pixel"},
        headers={"x-user-id": "dev-admin"},
    )
    assert bind_response.status_code == 201
    assert bind_response.json()["deviceId"] == "guard-device-1"

    clock_in = client.post(
        f"/guards/{guard_id}/duty/clock-in",
        json={"lat": 28.61, "lng": 77.20},
        headers={"x-user-id": "dev-admin"},
    )
    assert clock_in.status_code == 201
    session = clock_in.json()
    assert session["guardId"] == guard_id

    active = client.get("/guards/duty/active", headers={"x-user-id": "dev-admin"})
    assert active.status_code == 200
    assert len(active.json()) == 1
    assert active.json()[0]["guardName"] == "On Duty Guard"

    clock_out = client.post(
        f"/guards/duty/{session['id']}/clock-out",
        json={"lat": 28.62, "lng": 77.21},
        headers={"x-user-id": "dev-admin"},
    )
    assert clock_out.status_code == 200
    assert clock_out.json()["clockOutAt"] is not None
