"""Run: python -m app.photos.cleanup [--orphans]
Retry queued deletions; optionally remove unreferenced files older than 24h.
Use the same DB and PHOTO_STORAGE_DIR configuration as the API.
"""
import argparse
import time
from sqlalchemy import select
from app.database import SessionLocal
from app.photos.models import PinPhoto, PhotoDeletion
from app.photos.service import drain_deletions
from app.photos.storage import get_storage


def cleanup_orphans(db, storage):
    # Query first. If DB is unreachable, never infer that its photos are orphans.
    referenced = set(db.scalars(select(PinPhoto.storage_key)))
    referenced.update(db.scalars(select(PhotoDeletion.storage_key)))
    cutoff = time.time() - 86400
    for path in storage.root.glob('*.jpg'):
        try:
            storage.path(path.name)  # Validate our own filename namespace.
        except ValueError:
            continue
        if path.name not in referenced and path.stat().st_mtime < cutoff:
            storage.delete(path.name)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--orphans', action='store_true')
    args = parser.parse_args()
    with SessionLocal() as db:
        storage = get_storage()
        drain_deletions(db, storage)
        if args.orphans:
            cleanup_orphans(db, storage)


if __name__ == '__main__':
    main()
