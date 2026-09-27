from datetime import datetime
from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from pydantic import BaseModel
from sqlalchemy import select
from app.pins.router import DB, CurrentUser
from app.pins.service import owned
from app.photos import service
from app.photos.images import normalize_image, MAX_FILE_BYTES
from app.photos.models import PinPhoto, PhotoDeletion
from app.photos.storage import LocalPhotoStorage, get_storage

router = APIRouter(prefix='/pins/{pin_id}/photos', tags=['Pin photos'])
Storage = Annotated[LocalPhotoStorage, Depends(get_storage)]


class PhotoResponse(BaseModel):
    id: UUID
    pin_id: UUID
    width: int
    height: int
    byte_size: int
    created_at: datetime


@router.post('', response_model=PhotoResponse, status_code=201)
def upload_photo(pin_id: UUID, db: DB, user: CurrentUser, storage: Storage, response: Response,
                 file: Annotated[UploadFile, File()], client_request_id: Annotated[UUID, Form()]):
    # Check ownership before spending CPU decoding an image.
    owned(db, user.id, pin_id)
    original = file.file.read(MAX_FILE_BYTES + 1)
    # Release the read transaction/connection while processing pixels.
    user_id = user.id
    db.rollback()
    content, width, height = normalize_image(original)
    try:
        result, created = service.save(db, storage, user_id, pin_id, client_request_id, original, content, width, height)
    except OSError:
        raise HTTPException(503, '写真を保存できませんでした。もう一度お試しください')
    response.status_code = 201 if created else 200
    response.headers['Cache-Control'] = 'no-store'
    return result


@router.get('', response_model=list[PhotoResponse])
def list_photos(pin_id: UUID, db: DB, user: CurrentUser, response: Response):
    owned(db, user.id, pin_id)
    response.headers['Cache-Control'] = 'no-store'
    return [service.description(p) for p in db.scalars(select(PinPhoto).where(PinPhoto.pin_id == pin_id).order_by(PinPhoto.created_at, PinPhoto.id))]


@router.get('/{photo_id}')
def read_photo(pin_id: UUID, photo_id: UUID, db: DB, user: CurrentUser, storage: Storage):
    owned(db, user.id, pin_id)
    photo = service.find(db, pin_id, photo_id)
    try:
        content = storage.read(photo.storage_key)
    except FileNotFoundError:
        raise HTTPException(404, '写真が見つかりません')
    except OSError:
        raise HTTPException(503, '写真を読み込めませんでした')
    return Response(content, media_type='image/jpeg', headers={
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'inline; filename="photo.jpg"',
    })


@router.delete('/{photo_id}', status_code=204)
def delete_photo(pin_id: UUID, photo_id: UUID, db: DB, user: CurrentUser, storage: Storage):
    service.lock_pin(db, user.id, pin_id)
    photo = service.find(db, pin_id, photo_id)
    db.add(PhotoDeletion(storage_key=photo.storage_key))
    db.delete(photo)
    db.commit()
    service.drain_deletions(db, storage)
    return Response(status_code=204)
