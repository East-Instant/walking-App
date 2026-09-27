"""Baseline for PR #2, retaining an existing users table."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = '001_users'
down_revision = None


def upgrade():
    if not sa.inspect(op.get_bind()).has_table('users'):
        op.create_table('users',
            sa.Column('id', UUID(as_uuid=True), primary_key=True),
            sa.Column('username', sa.String(50), nullable=False),
            sa.Column('email', sa.String(100), nullable=False),
            sa.Column('password_hash', sa.String(255), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True)),
        )
        op.create_index('ix_users_username', 'users', ['username'], unique=True)
        op.create_index('ix_users_email', 'users', ['email'], unique=True)


def downgrade():
    # Existing user records may predate Alembic. Never delete them on rollback.
    pass
