from typing import Optional, List
from datetime import datetime
import uuid
from pydantic import BaseModel
from app.models.scan import ScanProfile, ScanStatus, Severity

class ScanBase(BaseModel):
    profile: ScanProfile = ScanProfile.QUICK

class ScanCreate(ScanBase):
    target_id: uuid.UUID

class ScanRead(ScanBase):
    id: uuid.UUID
    target_id: uuid.UUID
    status: ScanStatus
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class FindingRead(BaseModel):
    id: uuid.UUID
    title: str
    severity: Severity
    risk_score: float
    confidence: str
    endpoint_url: str
    description: str
    
    class Config:
        from_attributes = True
