import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # ユーザーが削除されたら散歩データも削除
    walk_logs = relationship("WalkLog", back_populates="user", cascade="all, delete-orphan")

class WalkLog(Base):
    __tablename__ = "walk_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    started_at = Column(DateTime(timezone=True),default=lambda: datetime.now(timezone.utc),nullable=False,)
    ended_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="walk_logs")
    location_points = relationship("LocationPoint", back_populates="walk_log", cascade="all, delete-orphan")


class LocationPoint(Base):
    __tablename__ = "location_points"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    walk_log_id = Column(UUID(as_uuid=True),ForeignKey("walk_logs.id"),nullable=False,index=True,)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    recorded_at = Column(DateTime(timezone=True),default=lambda: datetime.now(timezone.utc),nullable=False,)

    walk_log = relationship("WalkLog", back_populates="location_points")