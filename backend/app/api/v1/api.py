from app.api.v1.endpoints import auth, users, keys, targets

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(keys.router, prefix="/keys", tags=["keys"])
api_router.include_router(targets.router, prefix="/targets", tags=["targets"])
from app.api.v1.endpoints import scans, findings
api_router.include_router(scans.router, prefix="/scans", tags=["scans"])
api_router.include_router(findings.router, prefix="/findings", tags=["findings"])
from app.api.v1.endpoints import stats
api_router.include_router(stats.router, prefix="/stats", tags=["stats"])
from app.api.v1.endpoints import health
api_router.include_router(health.router, prefix="/health", tags=["health"])
