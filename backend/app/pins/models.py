import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Index, UniqueConstraint, CheckConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geography
from app.database import Base


class FavoritePin(Base):
    __tablename__ = 'favorite_pins'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    location = Column(Geography('POINT', srid=4326), nullable=False)
    title = Column(String(100), nullable=False)
    memo = Column(String(1000), nullable=False, default='')
    client_request_id = Column(UUID(as_uuid=True), nullable=False)
    request_hash = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    __table_args__ = (
        UniqueConstraint('user_id', 'client_request_id', name='uq_pin_request'),
        CheckConstraint('length(trim(title)) > 0', name='ck_pin_title'),
        Index('ix_pins_user_created', 'user_id', 'created_at', 'id'),
    )
