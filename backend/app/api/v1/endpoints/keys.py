from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core import security
from app.db.session import get_db
from app.models.user import User, APIKey
from app.schemas.apikey import APIKeyCreated, APIKeyRead, APIKeyCreate

router = APIRouter()

@router.post("/", response_model=APIKeyCreated)
async def create_api_key(
    *,
    db: AsyncSession = Depends(get_db),
    key_in: APIKeyCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create a new API Key.
    """
    raw_key, key_hash = security.generate_api_key()
    prefix = raw_key[:8]
    
    api_key = APIKey(
        user_id=current_user.id,
        prefix=prefix,
        hashed_key=key_hash,
        name=key_in.name,
        expires_at=key_in.expires_at
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)
    
    # Return the raw key ONLY once here
    result = APIKeyCreated.model_validate(api_key)
    result.secret_key = raw_key
    return result

@router.get("/", response_model=List[APIKeyRead])
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    result = await db.execute(select(APIKey).where(APIKey.user_id == current_user.id))
    return result.scalars().all()

@router.delete("/{key_id}")
async def revoke_api_key(
    key_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    result = await db.execute(select(APIKey).where(APIKey.id == key_id, APIKey.user_id == current_user.id))
    key = result.scalars().first()
    if not key:
        raise HTTPException(status_code=404, detail="API Key not found")
        
    await db.delete(key)
    await db.commit()
    return {"status": "success"}
