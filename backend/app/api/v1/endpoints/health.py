from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.session import get_db

router = APIRouter()

@router.get("/ready")
async def health_ready(
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Readiness probe. Checks DB connection.
    """
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": str(e)}

@router.get("/live")
async def health_live() -> Any:
    """
    Liveness probe. Just checks if API is up.
    """
    return {"status": "ok"}
