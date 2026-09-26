import os

from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import declarative_base, sessionmaker

# Docker Compose の db サービスを標準接続先とする。
# URL のパスワードに特殊文字が含まれても安全に扱う。
DATABASE_URL = os.getenv('DATABASE_URL') or URL.create(
    'postgresql+psycopg2',
    username=os.getenv('POSTGRES_USER', 'walking_app'),
    password=os.getenv('POSTGRES_PASSWORD', 'walking_app_dev'),
    host=os.getenv('POSTGRES_HOST', 'db'),
    port=int(os.getenv('POSTGRES_PORT', '5432')),
    database=os.getenv('POSTGRES_DB', 'walking_app'),
)
engine = create_engine(
    DATABASE_URL, pool_size=5, max_overflow=5, pool_timeout=5,
    pool_pre_ping=True, hide_parameters=True,
    connect_args={'connect_timeout': 5, 'options': '-c statement_timeout=5000'},
)
SessionLocal = sessionmaker(autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    with SessionLocal() as db:
        try:
            yield db
        except Exception:
            db.rollback()
            raise
