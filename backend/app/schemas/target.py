from typing import Optional
from datetime import datetime
import uuid
from pydantic import BaseModel, HttpUrl, field_validator
from app.core.ssrf import validate_target_url

class TargetBase(BaseModel):
    name: str
    base_url: str 
    
    @field_validator('base_url')
    def validate_url(cls, v):
        return validate_target_url(v)

class TargetCreate(TargetBase):
    pass

class TargetRead(TargetBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
