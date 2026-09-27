import os
from uuid import UUID
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User

SECRET_KEY = os.getenv('SECRET_KEY', '')
ALGORITHM = 'HS256'
oauth2_scheme = OAuth2PasswordBearer(tokenUrl='auth/login')


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    denied = HTTPException(401, 'トークンが無効または期限切れです', headers={'WWW-Authenticate': 'Bearer'})
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={'require_exp': True, 'require_sub': True})
        user_id = UUID(payload['sub'])
    except (JWTError, ValueError, TypeError, KeyError):
        raise denied
    user = db.get(User, user_id)
    if user is None:
        raise denied
    return user
