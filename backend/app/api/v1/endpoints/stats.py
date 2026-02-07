from typing import Any, List, Dict
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
import datetime

from app.api import deps
from app.db.session import get_db
from app.models.user import User
from app.models.scan import Scan, Finding
from app.models.target import Target

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get aggregated stats for the dashboard.
    """
    # 1. Total Scans (Global for user)
    # Join Target to ensure ownership
    q_scans = select(func.count(Scan.id)).join(Target).where(Target.user_id == current_user.id)
    total_scans = (await db.execute(q_scans)).scalar() or 0
    
    # 2. Total Targets
    q_targets = select(func.count(Target.id)).where(Target.user_id == current_user.id)
    total_targets = (await db.execute(q_targets)).scalar() or 0
    
    # 3. Recent Scans (Chart Data) - Last 7 days or last 10 scans
    # We want valid scans to plot risk?
    # Risk calculation is complex. For now, let's just count findings by severity for the last few scans.
    
    last_scans_q = (
        select(Scan)
        .join(Target)
        .where(Target.user_id == current_user.id)
        .order_by(desc(Scan.created_at))
        .limit(5)
    )
    last_scans = (await db.execute(last_scans_q)).scalars().all()
    
    # For each scan, get high/med/low counts
    chart_data = []
    
    for scan in reversed(last_scans): # Oldest first for chart
        # Count findings
        # This is N+1, but limit is 5, so valid.
        high = (await db.execute(select(func.count(Finding.id)).where(Finding.scan_id == scan.id, Finding.severity == 'High'))).scalar() or 0
        medium = (await db.execute(select(func.count(Finding.id)).where(Finding.scan_id == scan.id, Finding.severity == 'Medium'))).scalar() or 0
        
        chart_data.append({
            "date": scan.created_at.strftime("%m-%d %H:%M"),
            "high": high,
            "medium": medium,
            "id": str(scan.id)
        })

    return {
        "total_scans": total_scans,
        "total_targets": total_targets,
        "recent_trend": chart_data
    }
