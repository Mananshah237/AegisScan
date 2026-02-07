from datetime import datetime
import structlog
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
# from app.models.audit import AuditLog  # If we had an audit table

logger = structlog.get_logger()

async def audit_log(
    db: AsyncSession,
    user_id: Any,
    action: str,
    resource: str,
    details: dict = None
):
    """
    Log an audit event.
    For now, we log to structlog with a specific event type.
    In future, insert into DB.
    """
    logger.info(
        "audit_event",
        user_id=str(user_id),
        action=action,
        resource=resource,
        details=details or {},
        timestamp=datetime.utcnow().isoformat()
    )
    
    # Future DB implementation:
    # audit = AuditLog(user_id=user_id, action=action, ...)
    # db.add(audit)
    # await db.commit()
