from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field

class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    password_confirm: str
    terms_accepted: bool

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: str
    username: str
    email: str

class LocationPointBase(BaseModel):
    latitude: float = Field(..., description="緯度", example=35.681236)
    longitude: float = Field(..., description="経度", example=139.767125)

class LocationPointCreate(LocationPointBase):
    pass

class LocationPointResponse(LocationPointBase):
    id: UUID
    recorded_at: datetime

    class Config:
        from_attributes = True

class WalkLogCreate(BaseModel):
    pass

class WalkLogBulkLocationCreate(BaseModel):
    locations: List[LocationPointCreate]

class WalkLogResponse(BaseModel):
    id: UUID
    user_id: UUID
    started_at: datetime
    ended_at: Optional[datetime] = None
    locations: List[LocationPointResponse] = []

    class Config:
        from_attributes = True