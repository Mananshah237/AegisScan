from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.api import deps
from app.db.session import get_db
from app.models.user import User
from app.models.scan import Scan, ScanStatus
from app.schemas.scan import ScanCreate, ScanRead
from app.tasks.scan import run_scan_task

router = APIRouter()

@router.post("/", response_model=ScanRead)
async def create_scan(
    *,
    db: AsyncSession = Depends(get_db),
    scan_in: ScanCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create a new scan and start it.
    """
    # Verify ownership of target is done by ownership or just existence?
    # Better to verify target belongs to user
    from app.models.target import Target
    result = await db.execute(select(Target).where(Target.id == scan_in.target_id, Target.user_id == current_user.id))
    target = result.scalars().first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
        
    scan = Scan(
        target_id=scan_in.target_id,
        profile=scan_in.profile,
        status=ScanStatus.QUEUED
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)
    
    # Trigger Celery Task
    run_scan_task.delay(str(scan.id))
    
    return scan

@router.get("/{scan_id}", response_model=ScanRead)
async def read_scan(
    scan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    # Join target to verify ownership
    result = await db.execute(
        select(Scan).join(Scan.target).where(Scan.id == scan_id, Target.user_id == current_user.id)
    )
    scan = result.scalars().first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan

@router.get("/{scan_id}/report")
async def get_scan_report(
    scan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Download scan report as HTML.
    """
    from fastapi.responses import HTMLResponse
    from app.core.reports import generate_html_report
    from app.models.target import Target
    from app.models.scan import Finding
    
    # Get Scan + Target
    result = await db.execute(
        select(Scan).join(Target).where(Scan.id == scan_id, Target.user_id == current_user.id)
    )
    scan = result.scalars().first()
    
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
        
    # Get Target explicitly if needed or use scan.target (lazy load might apply)
    # Since we joined, scan.target might be available if we configure relationship nicely,
    # but AsyncSQLAlchemy needs explicit eager load or separate query.
    # Let's simple query for target.
    target_res = await db.execute(select(Target).where(Target.id == scan.target_id))
    target = target_res.scalars().first()

    # Get Findings
    findings_res = await db.execute(select(Finding).where(Finding.scan_id == scan_id))
    findings = findings_res.scalars().all()
    
    html_content = generate_html_report(scan, target, findings)
    
    return HTMLResponse(content=html_content)
