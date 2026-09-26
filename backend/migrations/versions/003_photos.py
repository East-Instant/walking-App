"""Private pin photos and durable file deletion queue."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = '003_photos'
down_revision = '002_pins'


def upgrade():
    op.create_table('pin_photos',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('pin_id', UUID(as_uuid=True), sa.ForeignKey('favorite_pins.id', ondelete='CASCADE'), nullable=False),
        sa.Column('storage_key', sa.String(40), nullable=False, unique=True),
        sa.Column('client_request_id', UUID(as_uuid=True), nullable=False),
        sa.Column('content_hash', sa.String(64), nullable=False),
        sa.Column('width', sa.Integer(), nullable=False),
        sa.Column('height', sa.Integer(), nullable=False),
        sa.Column('byte_size', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('pin_id', 'client_request_id', name='uq_photo_request'),
    )
    op.create_index('ix_pin_photos_pin_id', 'pin_photos', ['pin_id'])
    op.create_table('photo_deletions',
        sa.Column('storage_key', sa.String(40), primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade():
    # Downgrading metadata cannot safely delete photo files. Export/clean up first.
    op.drop_table('pin_photos')
    op.drop_table('photo_deletions')
