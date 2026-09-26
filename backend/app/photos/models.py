import uuid
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class PinPhoto(Base):
    __tablename__ = 'pin_photos'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pin_id = Column(UUID(as_uuid=True), ForeignKey('favorite_pins.id', ondelete='CASCADE'), nullable=False, index=True)
    storage_key = Column(String(40), nullable=False, unique=True)
    client_request_id = Column(UUID(as_uuid=True), nullable=False)
    content_hash = Column(String(64), nullable=False)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    byte_size = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    __table_args__ = (UniqueConstraint('pin_id', 'client_request_id', name='uq_photo_request'),)


class PhotoDeletion(Base):
    # Durable outbox: deleting a DB row must not lose track of its file.
    __tablename__ = 'photo_deletions'
    storage_key = Column(String(40), primary_key=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
