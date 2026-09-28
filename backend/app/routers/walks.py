from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session, selectinload

from app import models, schemas
from app.database import get_db
from app.dependencies.auth import get_current_user

router = APIRouter(prefix='/walks', tags=['Walks'])


def owned_walk(db, walk_id, user):
    # Serialize location uploads and finish, including requests from other devices.
    walk = db.scalar(select(models.WalkLog).where(
        models.WalkLog.id == walk_id, models.WalkLog.user_id == user.id,
    ).with_for_update())
    if walk is None:
        raise HTTPException(404, '該当する散歩ログが見つかりません')
    return walk


def view(walk):
    walk.location_points.sort(key=lambda point: point.sequence)
    return schemas.WalkLogResponse.model_validate(walk)


@router.post('/start', response_model=schemas.WalkLogResponse, status_code=201)
def start_walk(data: schemas.WalkLogCreate, db: Session = Depends(get_db),
               user: models.User = Depends(get_current_user)):
    db.execute(insert(models.WalkLog).values(user_id=user.id, client_request_id=data.client_request_id)
               .on_conflict_do_nothing(constraint='uq_walk_request'))
    walk = db.scalar(select(models.WalkLog).where(
        models.WalkLog.user_id == user.id, models.WalkLog.client_request_id == data.client_request_id))
    result = view(walk)
    db.commit()
    return result


@router.post('/{walk_id}/locations', status_code=201)
def add_location_points(walk_id: UUID, data: schemas.WalkLogBulkLocationCreate,
                        db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    walk = owned_walk(db, walk_id, user)
    existing = {point.sequence: point for point in walk.location_points}
    added = 0
    for location in data.locations:
        old = existing.get(location.sequence)
        if old is not None:
            if (old.latitude, old.longitude, old.recorded_at) != (
                    location.latitude, location.longitude, location.recorded_at):
                raise HTTPException(409, '同じ連番の位置情報が一致しません')
            continue
        if walk.ended_at is not None:
            raise HTTPException(409, '終了した散歩には位置情報を追加できません')
        point = models.LocationPoint(walk_log_id=walk.id, **location.model_dump())
        db.add(point)
        existing[point.sequence] = point
        added += 1
    db.commit()
    return {'walk_id': str(walk.id), 'added': added}


@router.post('/{walk_id}/finish', response_model=schemas.WalkLogResponse)
def finish_walk(walk_id: UUID, data: schemas.WalkLogFinish,
                db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    walk = owned_walk(db, walk_id, user)
    if walk.ended_at is None:
        # Device clocks may be ahead/behind; never end before the server start time.
        walk.ended_at = max(walk.started_at, min(data.ended_at, datetime.now(timezone.utc)))
    result = view(walk)
    db.commit()
    return result


@router.get('/me', response_model=list[schemas.WalkLogResponse])
def get_my_walks(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    walks = db.scalars(select(models.WalkLog).where(models.WalkLog.user_id == user.id)
                       .options(selectinload(models.WalkLog.location_points))
                       .order_by(models.WalkLog.started_at.desc(), models.WalkLog.id.desc())).all()
    return [view(walk) for walk in walks]
