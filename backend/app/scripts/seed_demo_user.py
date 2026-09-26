import os

from app import models
from app.database import SessionLocal
from app.routers.auth import get_password_hash

DEMO_USERNAME = "demo_walker"
DEMO_EMAIL = "demo@example.com"
DEMO_PASSWORD = "DemoWalk123!"


def seed_demo_user() -> None:
    if os.getenv("APP_ENV", "development").lower() == "production":
        raise RuntimeError("本番環境ではデモユーザーを作成できません")

    with SessionLocal() as db:
        user = db.query(models.User).filter(
            (models.User.username == DEMO_USERNAME) | (models.User.email == DEMO_EMAIL)
        ).first()
        if user:
            print(f"Demo user already exists: {DEMO_EMAIL}")
            return

        db.add(models.User(
            username=DEMO_USERNAME,
            email=DEMO_EMAIL,
            password_hash=get_password_hash(DEMO_PASSWORD),
        ))
        db.commit()
        print(f"Created demo user: {DEMO_EMAIL}")


if __name__ == "__main__":
    seed_demo_user()
