from datetime import datetime
from typing import Annotated
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

Latitude = Annotated[float, Field(ge=-90, le=90, allow_inf_nan=False)]
Longitude = Annotated[float, Field(ge=-180, le=180, allow_inf_nan=False)]
Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Memo = Annotated[str, StringConstraints(max_length=1000)]


class PinCreate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    latitude: Latitude
    longitude: Longitude
    title: Title
    memo: Memo = ''
    client_request_id: UUID


class PinUpdate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    latitude: Latitude | None = None
    longitude: Longitude | None = None
    title: Title | None = None
    memo: Memo | None = None

    @model_validator(mode='after')
    def check_fields(self):
        if not self.model_fields_set:
            raise ValueError('変更項目を指定してください')
        if any(getattr(self, key) is None for key in self.model_fields_set):
            raise ValueError('null は指定できません')
        if ('latitude' in self.model_fields_set) != ('longitude' in self.model_fields_set):
            raise ValueError('緯度と経度は両方指定してください')
        return self


class PinResponse(BaseModel):
    id: UUID
    latitude: float
    longitude: float
    title: str
    memo: str
    created_at: datetime
    updated_at: datetime


class PinPage(BaseModel):
    items: list[PinResponse]
    next_offset: int | None
