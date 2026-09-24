from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models import User
from app.pins import service
from app.photos import service as photo_service
from app.photos.storage import get_storage, LocalPhotoStorage
from app.pins.schemas import PinCreate, PinUpdate, PinResponse, PinPage

router = APIRouter(prefix='/pins', tags=['Favorite pins'])
DB = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post('', response_model=PinResponse, status_code=201)
def create_pin(data: PinCreate, response: Response, db: DB, user: CurrentUser):
    result, created = service.create(db, user.id, data)
    response.status_code = 201 if created else 200
    return result


@router.get('', response_model=PinPage)
def list_pins(db: DB, user: CurrentUser,
              latitude: Annotated[float | None, Query(ge=-90, le=90, allow_inf_nan=False)] = None,
              longitude: Annotated[float | None, Query(ge=-180, le=180, allow_inf_nan=False)] = None,
              radius_m: Annotated[float | None, Query(gt=0, le=10000, allow_inf_nan=False)] = None,
              limit: Annotated[int, Query(ge=1, le=100)] = 50,
              offset: Annotated[int, Query(ge=0, le=10000)] = 0):
    if any(v is not None for v in (latitude, longitude, radius_m)) and not all(v is not None for v in (latitude, longitude, radius_m)):
        raise HTTPException(422, '距離検索には緯度・経度・半径をすべて指定してください')
    return service.listing(db, user.id, latitude, longitude, radius_m, limit, offset)


@router.get('/{pin_id}', response_model=PinResponse)
def get_pin(pin_id: UUID, db: DB, user: CurrentUser):
    return service.view(service.owned(db, user.id, pin_id), db)


@router.patch('/{pin_id}', response_model=PinResponse)
def update_pin(pin_id: UUID, data: PinUpdate, db: DB, user: CurrentUser):
    return service.update(db, user.id, pin_id, data)


@router.delete('/{pin_id}', status_code=204)
def delete_pin(pin_id: UUID, db: DB, user: CurrentUser,
               storage: Annotated[LocalPhotoStorage, Depends(get_storage)]):
    pin = photo_service.lock_pin(db, user.id, pin_id)
    photo_service.queue_pin_files(db, pin_id)
    db.delete(pin)
    db.commit()
    photo_service.drain_deletions(db, storage)
    return Response(status_code=204)
