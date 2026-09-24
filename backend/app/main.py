import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# DBエンジン、Baseモデル、テーブル定義（models）のインポート
from app.database import engine, Base
from app import models
from app.routers import auth

# DB内にテーブルが存在しない場合、models.py の定義に基づいて自動作成
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Walking App API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS", "http://localhost:8081,http://127.0.0.1:8081"
        ).split(",")
        if origin.strip()
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(auth.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}