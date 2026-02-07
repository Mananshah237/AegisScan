from typing import Generator, Optional
from fastapi import Depends, HTTPException, status, Security
from fastapi.security import OAuth2PasswordBearer, APIKeyHeader
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.core import security
from app.core.config import settings
from app.models.user import User, APIKey
from app.schemas.user import TokenPayload

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/access-token"
)

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(reusable_oauth2)
) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    
    result = await db.execute(select(User).where(User.id == token_data.sub))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_user_or_apikey(
    db: AsyncSession = Depends(get_db),
    token: Optional[str] = Depends(reusable_oauth2),
    x_api_key: Optional[str] = Security(api_key_header)
) -> User:
    if x_api_key:
        # Validate API Key
        # Find key by prefix (first 8 chars) to avoid full table scan if possible, 
        # but for now we might have to scan or check if we split the key.
        # Our key format is aas_RANDOM. 
        # Actually, for security, we should hash the input and look up? 
        # But we salt/hash. We store the hash. We can't lookup by hash unless we hash the input.
        # Yes, client sends "aas_SECRET". We hash it. We match against DB.
        # BUT we want to avoid linear scan. 
        # Optimization: We store prefix separate? Yes, we implemented prefix column.
        
        prefix = x_api_key[:8]
        result = await db.execute(select(APIKey).where(APIKey.prefix == prefix))
        api_keys = result.scalars().all()
        
        for key in api_keys:
            if security.verify_api_key(x_api_key, key.hashed_key):
                # Found match, get user
                user_result = await db.execute(select(User).where(User.id == key.user_id))
                return user_result.scalars().first()
        
        raise HTTPException(status_code=403, detail="Invalid API Key")

    elif token:
        return await get_current_user(db, token)
    else:
        raise HTTPException(status_code=401, detail="Not authenticated")
