from fastapi import APIRouter

from app.api.routes.auth import router as auth_router
from app.api.routes.bill_config import router as bill_config_router
from app.api.routes.bills import router as bills_router
from app.api.routes.apartments import router as apartments_router
from app.api.routes.guards import router as guards_router
from app.api.routes.health import router as health_router
from app.api.routes.house_help import router as house_help_router
from app.api.routes.notices import router as notices_router
from app.api.routes.notifications import router as notifications_router
from app.api.routes.parking import router as parking_router
from app.api.routes.payments import router as payments_router
from app.api.routes.placeholders import router as placeholder_router
from app.api.routes.reports import router as reports_router
from app.api.routes.society import router as society_router
from app.api.routes.tickets import router as tickets_router
from app.api.routes.uploads import router as uploads_router
from app.api.routes.users import router as users_router
from app.api.routes.vehicles import router as vehicles_router
from app.api.routes.visitors import router as visitors_router
from app.api.routes.webhooks import router as webhooks_router


api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(health_router)
api_router.include_router(apartments_router)
api_router.include_router(bill_config_router)
api_router.include_router(bills_router)
api_router.include_router(guards_router)
api_router.include_router(house_help_router)
api_router.include_router(notices_router)
api_router.include_router(notifications_router)
api_router.include_router(parking_router)
api_router.include_router(payments_router)
api_router.include_router(reports_router)
api_router.include_router(society_router)
api_router.include_router(tickets_router)
api_router.include_router(uploads_router)
api_router.include_router(users_router)
api_router.include_router(vehicles_router)
api_router.include_router(visitors_router)
api_router.include_router(webhooks_router)
api_router.include_router(placeholder_router)
