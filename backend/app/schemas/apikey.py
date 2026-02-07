import uuid
from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class APIKeyBase(BaseModel):
    name: Optional[str] = None
    expires_at: Optional[datetime] = None

class APIKeyCreate(APIKeyBase):
    pass

class APIKeyRead(APIKeyBase):
    id: uuid.UUID
    prefix: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class APIKeyCreated(APIKeyRead):
    secret_key: str # Only returned once
