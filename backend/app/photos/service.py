import hashlib
import logging
from uuid import uuid4
from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.exc import SQLAlchemyError
from app.pins.models import FavoritePin
from app.photos.models import PinPhoto, PhotoDeletion

logger = logging.getLogger(__name__)


def lock_pin(db, user_id, pin_id):
    pin = db.scalar(select(FavoritePin).where(FavoritePin.id == pin_id, FavoritePin.user_id == user_id).with_for_update())
    if pin is None:
        raise HTTPException(404, 'ピンが見つかりません')
    return pin


def description(photo):
    return {key: getattr(photo, key) for key in ('id', 'pin_id', 'width', 'height', 'byte_size', 'created_at')}


def save(db, storage, user_id, pin_id, request_id, original, content, width, height):
    lock_pin(db, user_id, pin_id)
    digest = hashlib.sha256(original).hexdigest()
    existing = db.scalar(select(PinPhoto).where(PinPhoto.pin_id == pin_id, PinPhoto.client_request_id == request_id))
    if existing:
        if existing.content_hash != digest:
            raise HTTPException(409, '同じ再送IDで異なる写真は保存できません')
        result = description(existing)
        db.commit()
        return result, False
    count = db.scalar(select(func.count()).select_from(PinPhoto).where(PinPhoto.pin_id == pin_id))
    if count >= 5:
        raise HTTPException(409, '写真は1つのピンにつき5枚までです')
    photo_id = uuid4()
    key = f'{photo_id}.jpg'
    try:
        storage.write(key, content)
        photo = PinPhoto(id=photo_id, pin_id=pin_id, storage_key=key,
                         client_request_id=request_id, content_hash=digest,
                         width=width, height=height, byte_size=len(content))
        db.add(photo)
        db.flush()
        result = description(photo)
        db.commit()
        return result, True
    except Exception:
        db.rollback()
        # A commit failure may have an unknown outcome (lost DB response).
        # Keep the file in that case; the maintenance command removes aged orphans.
        # Files are only readable through an authorized, committed photo row.
        raise


def find(db, pin_id, photo_id):
    photo = db.scalar(select(PinPhoto).where(PinPhoto.pin_id == pin_id, PinPhoto.id == photo_id))
    if photo is None:
        raise HTTPException(404, '写真が見つかりません')
    return photo


def queue_pin_files(db, pin_id):
    for key in db.scalars(select(PinPhoto.storage_key).where(PinPhoto.pin_id == pin_id)):
        db.add(PhotoDeletion(storage_key=key))


def drain_deletions(db, storage):
    try:
        jobs = db.scalars(select(PhotoDeletion).limit(100).with_for_update(skip_locked=True)).all()
        for job in jobs:
            storage.delete(job.storage_key)
            db.delete(job)
        db.commit()
    except (OSError, SQLAlchemyError):
        db.rollback()
        logger.warning('Photo cleanup pending; retry the maintenance command')
