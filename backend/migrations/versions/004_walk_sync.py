"""Create walk tables or preserve and extend tables created by older API startup."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = '004_walk_sync'
down_revision = '003_photos'


def upgrade():
    bind = op.get_bind()
    schema = bind.scalar(sa.text('SELECT current_schema()'))
    tables = sa.inspect(bind).get_table_names(schema=schema)
    if 'walk_logs' not in tables:
        op.create_table('walk_logs',
            sa.Column('id', UUID(as_uuid=True), primary_key=True),
            sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('ended_at', sa.DateTime(timezone=True)),
        )
    if 'location_points' not in tables:
        op.create_table('location_points',
            sa.Column('id', UUID(as_uuid=True), primary_key=True),
            sa.Column('walk_log_id', UUID(as_uuid=True), sa.ForeignKey('walk_logs.id'), nullable=False),
            sa.Column('latitude', sa.Float(), nullable=False),
            sa.Column('longitude', sa.Float(), nullable=False),
            sa.Column('recorded_at', sa.DateTime(timezone=True), nullable=False),
        )
    op.add_column('walk_logs', sa.Column('client_request_id', UUID(as_uuid=True)))
    op.add_column('location_points', sa.Column('sequence', sa.Integer()))
    op.execute('''UPDATE location_points SET sequence = ordered.seq FROM (
        SELECT id, row_number() OVER (PARTITION BY walk_log_id ORDER BY recorded_at, id) - 1 AS seq
        FROM location_points) ordered WHERE location_points.id = ordered.id''')
    op.alter_column('location_points', 'sequence', nullable=False)
    op.create_unique_constraint('uq_walk_request', 'walk_logs', ['user_id', 'client_request_id'])
    op.create_unique_constraint('uq_walk_sequence', 'location_points', ['walk_log_id', 'sequence'])
    for table, column in [('walk_logs', 'user_id'), ('location_points', 'walk_log_id')]:
        name = f'ix_{table}_{column}'
        if name not in {i['name'] for i in sa.inspect(bind).get_indexes(table, schema=schema)}:
            op.create_index(name, table, [column])


def downgrade():
    # Keep existing walk records, just remove synchronization metadata.
    op.drop_constraint('uq_walk_sequence', 'location_points', type_='unique')
    op.drop_constraint('uq_walk_request', 'walk_logs', type_='unique')
    op.drop_column('location_points', 'sequence')
    op.drop_column('walk_logs', 'client_request_id')
