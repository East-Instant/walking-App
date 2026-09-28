from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, AwareDatetime, ConfigDict

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
    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False)

class LocationPointCreate(LocationPointBase):
    sequence: int = Field(ge=0, le=2147483647, strict=True)
    recorded_at: AwareDatetime

class LocationPointResponse(LocationPointCreate):
    id: UUID
    model_config = ConfigDict(from_attributes=True)

class WalkLogCreate(BaseModel):
    client_request_id: UUID

class WalkLogFinish(BaseModel):
    ended_at: AwareDatetime

class WalkLogBulkLocationCreate(BaseModel):
    locations: List[LocationPointCreate] = Field(min_length=1, max_length=500)

class WalkLogResponse(BaseModel):
    id: UUID
    user_id: UUID
    started_at: datetime
    ended_at: Optional[datetime] = None
    locations: List[LocationPointResponse] = Field(default_factory=list, validation_alias="location_points")
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
