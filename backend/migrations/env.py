from alembic import context
from app.database import Base, engine
from app import models  # noqa: F401
from app.photos import models as photo_models  # noqa: F401
from app.pins import models as pin_models  # noqa: F401

with engine.connect() as connection:
    context.configure(connection=connection, target_metadata=Base.metadata)
    with context.begin_transaction():
        context.run_migrations()
