"""Private favorite pins with a spatial index."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geography

revision = '002_pins'
down_revision = '001_users'


def upgrade():
    op.execute('CREATE EXTENSION IF NOT EXISTS postgis')
    op.create_table('favorite_pins',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('location', Geography('POINT', srid=4326, spatial_index=False), nullable=False),
        sa.Column('title', sa.String(100), nullable=False),
        sa.Column('memo', sa.String(1000), nullable=False),
        sa.Column('client_request_id', UUID(as_uuid=True), nullable=False),
        sa.Column('request_hash', sa.String(64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('user_id', 'client_request_id', name='uq_pin_request'),
        sa.CheckConstraint('length(trim(title)) > 0', name='ck_pin_title'),
    )
    op.create_index('idx_favorite_pins_location', 'favorite_pins', ['location'], postgresql_using='gist')
    op.create_index('ix_pins_user_created', 'favorite_pins', ['user_id', 'created_at', 'id'])


def downgrade():
    op.drop_table('favorite_pins')
    # PostGIS may be shared by other tables; retain the extension.
