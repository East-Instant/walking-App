import hashlib
import json
from uuid import UUID, uuid4
from fastapi import HTTPException
from geoalchemy2 import Geography, Geometry
from sqlalchemy import cast, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session
from app.pins.models import FavoritePin as Pin
from app.pins.schemas import PinCreate, PinUpdate


def point(latitude, longitude):
    return cast(func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326), Geography('POINT', srid=4326))


def view(pin, db):
    latitude, longitude = db.execute(select(
        func.ST_Y(cast(Pin.location, Geometry)),
        func.ST_X(cast(Pin.location, Geometry)),
    ).where(Pin.id == pin.id)).one()
    return dict(id=pin.id, latitude=latitude, longitude=longitude, title=pin.title,
                memo=pin.memo, created_at=pin.created_at, updated_at=pin.updated_at)


def owned(db: Session, user_id: UUID, pin_id: UUID):
    pin = db.scalar(select(Pin).where(Pin.id == pin_id, Pin.user_id == user_id))
    if pin is None:
        raise HTTPException(404, 'ピンが見つかりません')
    return pin


def create(db, user_id, data: PinCreate):
    payload = data.model_dump(mode='json', exclude={'client_request_id'})
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    # Unique constraint arbitrates concurrent retries without a check-then-insert race.
    pin_id = db.scalar(insert(Pin).values(
        id=uuid4(), user_id=user_id, location=point(data.latitude, data.longitude),
        title=data.title, memo=data.memo, client_request_id=data.client_request_id,
        request_hash=digest,
    ).on_conflict_do_nothing(constraint='uq_pin_request').returning(Pin.id))
    created = pin_id is not None
    pin = db.scalar(select(Pin).where(Pin.user_id == user_id, Pin.client_request_id == data.client_request_id))
    if pin is None or pin.request_hash != digest:
        raise HTTPException(409, '同じ再送IDで異なる内容は登録できません')
    result = view(pin, db)
    db.commit()
    return result, created


def listing(db, user_id, latitude, longitude, radius_m, limit, offset):
    geometry = cast(Pin.location, Geometry)
    query = select(Pin.id, Pin.title, Pin.memo, Pin.created_at, Pin.updated_at,
                   func.ST_Y(geometry).label('latitude'), func.ST_X(geometry).label('longitude')).where(Pin.user_id == user_id)
    if latitude is not None:
        query = query.where(func.ST_DWithin(Pin.location, point(latitude, longitude), radius_m))
    rows = db.execute(query.order_by(Pin.created_at.desc(), Pin.id.desc()).limit(limit + 1).offset(offset)).mappings().all()
    return {'items': [dict(row) for row in rows[:limit]],
            'next_offset': offset + limit if len(rows) > limit and offset + limit <= 10000 else None}


def update(db, user_id, pin_id, data: PinUpdate):
    # Lock before updating so concurrent PATCH requests cannot overwrite unrelated fields.
    pin = db.scalar(select(Pin).where(Pin.id == pin_id, Pin.user_id == user_id).with_for_update())
    if pin is None:
        raise HTTPException(404, 'ピンが見つかりません')
    changes = data.model_dump(exclude_unset=True)
    for key in ('title', 'memo'):
        if key in changes:
            setattr(pin, key, changes[key])
    if 'latitude' in changes:
        pin.location = point(data.latitude, data.longitude)
    db.flush()
    result = view(pin, db)
    db.commit()
    return result
