import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine
from app.pins.router import router as pins_router
from app.photos.router import router as photos_router
from app.photos.limits import PhotoUploadLimit
from app.dependencies.auth import SECRET_KEY
from contextlib import asynccontextmanager
from sqlalchemy.exc import SQLAlchemyError
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.routers import auth, walks


@asynccontextmanager
async def lifespan(app):
    if len(SECRET_KEY) < 32 or SECRET_KEY in {'your-super-secret-key-change-this-in-production'}:
        raise RuntimeError('SECRET_KEY に32文字以上のランダムな秘密鍵を設定してください')
    try:
        yield
    finally:
        engine.dispose()


app = FastAPI(title="Walking App API", lifespan=lifespan)


@app.exception_handler(SQLAlchemyError)
async def database_error(request, exc):
    return JSONResponse(status_code=503, content={'detail': 'データベース処理を完了できませんでした'})


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    # Do not echo coordinates or credentials in validation responses.
    return JSONResponse(status_code=422, content={'detail': [
        {'loc': list(e['loc']), 'msg': e['msg'], 'type': e['type']} for e in exc.errors()
    ]})


app.add_middleware(PhotoUploadLimit)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS", "http://localhost:8081,http://127.0.0.1:8081"
        ).split(",")
        if origin.strip()
    ],
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(walks.router)
app.include_router(pins_router)
app.include_router(photos_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
