import os
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/walks", tags=["Walks"])

SECRET_KEY = os.getenv("SECRET_KEY","your-super-secret-key-change-this-in-production")
ALGORITHM = os.getenv("ALGORITHM","HS256")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="トークンが無効または期限切れです",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception

        # 文字列から UUID オブジェクトへ安全にキャスト
        user_id = uuid.UUID(user_id_str)
    except (JWTError, ValueError):
        # トークン不正、または UUID フォーマット違反時は 401 を返す
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user


# 1. 散歩開始 API
@router.post(
    "/start",
    response_model=schemas.WalkLogResponse,
    status_code=status.HTTP_201_CREATED,
)
def start_walk(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    new_walk = models.WalkLog(user_id=current_user.id)
    db.add(new_walk)
    db.commit()
    db.refresh(new_walk)
    return new_walk


# 2. 軌跡の一括追加 API
@router.post("/{walk_id}/locations", status_code=status.HTTP_201_CREATED)
def add_location_points(
    walk_id: str,
    location_data: schemas.WalkLogBulkLocationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        target_walk_uuid = uuid.UUID(walk_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="該当する散歩ログが見つかりません",
        )

    walk_log = (
        db.query(models.WalkLog)
        .filter(
            models.WalkLog.id == target_walk_uuid,
            models.WalkLog.user_id == current_user.id,
        )
        .first()
    )

    if not walk_log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="該当する散歩ログが見つかりません",
        )

    new_points = [
        models.LocationPoint(
            walk_log_id=walk_log.id,
            latitude=loc.latitude,
            longitude=loc.longitude,
        )
        for loc in location_data.locations
    ]

    db.add_all(new_points)
    db.commit()

    return {
        "message": f"{len(new_points)} 件の位置情報を追加しました",
        "walk_id": walk_id,
    }


# 3. 散歩終了 API
@router.post("/{walk_id}/finish", response_model=schemas.WalkLogResponse)
def finish_walk(
    walk_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        target_walk_uuid = uuid.UUID(walk_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="該当する散歩ログが見つかりません",
        )

    walk_log = (
        db.query(models.WalkLog)
        .filter(
            models.WalkLog.id == target_walk_uuid,
            models.WalkLog.user_id == current_user.id,
        )
        .first()
    )

    if not walk_log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="該当する散歩ログが見つかりません",
        )

    walk_log.ended_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(walk_log)
    return walk_log


# 4. 自分の散歩履歴一覧取得 API
@router.get("/me", response_model=List[schemas.WalkLogResponse])
def get_my_walks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    walks = (
        db.query(models.WalkLog)
        .filter(models.WalkLog.user_id == current_user.id)
        .all()
    )

    result = []
    for walk in walks:
        locations = (
            db.query(models.LocationPoint)
            .filter(models.LocationPoint.walk_log_id == walk.id)
            .order_by(models.LocationPoint.recorded_at.asc())
            .all()
        )
        walk.locations = locations
        result.append(walk)

    return result