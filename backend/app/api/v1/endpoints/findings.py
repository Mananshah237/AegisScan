from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.api import deps
from app.db.session import get_db
from app.models.user import User
from app.models.scan import Finding, Scan
from app.schemas.scan import FindingRead

router = APIRouter()

@router.get("/", response_model=List[FindingRead])
async def list_findings(
    scan_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve findings for a specific scan.
    """
    # Verify scan ownership
    scan_result = await db.execute(
        select(Scan).join(Scan.target).where(Scan.id == scan_id, Scan.target.has(User.id == current_user.id)) # Check this syntax
    )
    # The above join syntax might be tricky in async.
    # Simpler: Get scan, check target.user_id
    
    # Let's do explicit join in query
    from app.models.target import Target
    query = select(Scan).join(Target).where(Scan.id == scan_id, Target.user_id == current_user.id)
    result = await db.execute(query)
    scan = result.scalars().first()
    
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
        
    findings_result = await db.execute(
        select(Finding).where(Finding.scan_id == scan_id).offset(skip).limit(limit)
    )
    return findings_result.scalars().all()

@router.get("/{finding_id}", response_model=FindingRead)
async def read_finding(
    finding_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get a specific finding.
    """
    # We need to verify ownership via Scan -> Target -> User
    from app.models.target import Target
    result = await db.execute(
        select(Finding)
        .join(Scan)
        .join(Target)
        .where(Finding.id == finding_id, Target.user_id == current_user.id)
    )
    finding = result.scalars().first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    return finding
