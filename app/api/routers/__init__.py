from app.api.routers.auth import router as auth_router
from app.api.routers.health import router as health_router
from app.api.routers.media import router as media_router
from app.api.routers.tasks import router as tasks_router

__all__ = ["auth_router", "health_router", "media_router", "tasks_router"]
