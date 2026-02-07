from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.api import deps
from app.db.session import get_db
from app.models.user import User
from app.models.target import Target
from app.schemas.target import TargetCreate, TargetRead

router = APIRouter()

@router.post("/", response_model=TargetRead)
async def create_target(
    *,
    db: AsyncSession = Depends(get_db),
    target_in: TargetCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create a new target.
    """
    # Validation happens in Schema via validate_target_url
    
    target = Target(
        user_id=current_user.id, # type: ignore
        name=target_in.name,
        base_url=target_in.base_url
    )
    db.add(target)
    await db.commit()
    await db.refresh(target)
    return target

@router.get("/", response_model=List[TargetRead])
async def list_targets(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve targets.
    """
    result = await db.execute(
        select(Target).where(Target.user_id == current_user.id).offset(skip).limit(limit)
    )
    return result.scalars().all()

@router.get("/{target_id}", response_model=TargetRead)
async def read_target(
    target_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get a specific target by ID.
    """
    result = await db.execute(
        select(Target).where(Target.id == target_id, Target.user_id == current_user.id)
    )
    target = result.scalars().first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    return target

@router.delete("/{target_id}")
async def delete_target(
    target_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete a target.
    """
    result = await db.execute(
        select(Target).where(Target.id == target_id, Target.user_id == current_user.id)
    )
    target = result.scalars().first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
        
    await db.delete(target)
    await db.commit()
    return {"status": "success"}
