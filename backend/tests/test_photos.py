"""Real DB/storage API tests. Reuses the isolated PostGIS fixtures."""
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
import os
import time
from uuid import uuid4

import pytest
from PIL import Image
from sqlalchemy import select

from app.main import app
from app.photos import service
from app.photos.cleanup import cleanup_orphans
from app.photos.images import normalize_image
from app.photos.models import PhotoDeletion, PinPhoto
from app.photos.storage import LocalPhotoStorage, get_storage
from test_pins import api, database, payload  # noqa: F401 (pytest fixtures)


def picture(color='red', size=(64, 48), fmt='JPEG', exif=None):
    out = BytesIO()
    kwargs = {'exif': exif} if exif else {}
    Image.new('RGB', size, color).save(out, format=fmt, **kwargs)
    return out.getvalue()


@pytest.fixture
def photos(api, tmp_path):
    client, headers, _ = api
    store = LocalPhotoStorage(tmp_path)
    app.dependency_overrides[get_storage] = lambda: store
    pin_id = client.post('/pins', json=payload(), headers=headers[0]).json()['id']
    yield client, headers, pin_id, store
    app.dependency_overrides.pop(get_storage, None)


def upload(client, owner, pin_id, content=None, request_id=None):
    return client.post(f'/pins/{pin_id}/photos', headers=owner,
                       files={'file': ('../../untrusted.jpg', picture() if content is None else content, 'image/jpeg')},
                       data={'client_request_id': str(request_id or uuid4())})


def test_normalization_strips_metadata_and_resizes():
    exif = Image.Exif()
    exif[0x010E] = 'private metadata'
    exif[0x0112] = 6  # Rotate 90 degrees before resize.
    content, width, height = normalize_image(picture(size=(2000, 1000), exif=exif))
    assert (width, height) == (800, 1600)
    with Image.open(BytesIO(content)) as result:
        assert result.format == 'JPEG'
        assert not result.getexif()
        assert 'private metadata' not in str(result.info)


def test_photo_crud_and_pin_cleanup(photos):
    client, (owner, other), pin_id, store = photos
    response = upload(client, owner, pin_id)
    assert response.status_code == 201, response.text
    photo = response.json()
    assert 'storage_key' not in photo
    assert photo['width'] == 64
    url = f'/pins/{pin_id}/photos/{photo["id"]}'
    assert client.get(f'/pins/{pin_id}/photos', headers=owner).json() == [photo]
    result = client.get(url, headers=owner)
    assert result.status_code == 200
    assert result.headers['content-type'] == 'image/jpeg'
    assert result.headers['cache-control'] == 'no-store'
    assert client.get(url).status_code == 401
    for suffix in ('', '/'+photo['id']):
        assert client.get(f'/pins/{pin_id}/photos'+suffix, headers=other).status_code == 404
    assert client.delete(url, headers=other).status_code == 404
    assert upload(client, other, pin_id).status_code == 404
    assert client.delete(url, headers=owner).status_code == 204
    assert not list(store.root.glob('*.jpg'))
    assert client.get(url, headers=owner).status_code == 404
    assert upload(client, owner, pin_id).status_code == 201
    assert client.delete('/pins/'+pin_id, headers=owner).status_code == 204
    assert not list(store.root.glob('*.jpg'))


def test_concurrent_limits_and_retries(photos):
    client, (owner, _), pin_id, store = photos
    request_id = uuid4()
    with ThreadPoolExecutor(max_workers=3) as executor:
        responses = list(executor.map(lambda _: upload(client, owner, pin_id, request_id=request_id), range(3)))
    assert sorted(r.status_code for r in responses) == [200, 200, 201]
    assert len(list(store.root.glob('*.jpg'))) == 1
    assert upload(client, owner, pin_id, picture('blue'), request_id).status_code == 409
    with ThreadPoolExecutor(max_workers=6) as executor:
        responses = list(executor.map(lambda _: upload(client, owner, pin_id), range(6)))
    assert sorted(r.status_code for r in responses) == [201, 201, 201, 201, 409, 409]
    assert len(client.get(f'/pins/{pin_id}/photos', headers=owner).json()) == 5
    # An already completed upload can be retried even when the album is full.
    assert upload(client, owner, pin_id, request_id=request_id).status_code == 200


def test_bad_and_oversized_uploads(photos):
    client, (owner, _), pin_id, store = photos
    assert upload(client, owner, pin_id, b'<svg>not an image</svg>').status_code == 415
    assert upload(client, owner, pin_id, b'').status_code == 422
    assert upload(client, owner, pin_id, b'x' * (10 * 1024 * 1024 + 1)).status_code == 413
    assert upload(client, owner, pin_id, picture(fmt='GIF')).status_code == 415
    response = client.post(f'/pins/{pin_id}/photos', headers=owner | {'Content-Length': str(11 * 1024 * 1024)}, content=b'x')
    assert response.status_code == 413
    assert not list(store.root.glob('*.jpg'))


def test_delete_failure_is_queued(photos, database, monkeypatch):
    client, (owner, _), pin_id, store = photos
    photo_id = upload(client, owner, pin_id).json()['id']
    original = store.delete
    def fail(key):
        raise OSError('disk unavailable')
    monkeypatch.setattr(store, 'delete', fail)
    url = f'/pins/{pin_id}/photos/{photo_id}'
    assert client.delete(url, headers=owner).status_code == 204
    assert client.get(url, headers=owner).status_code == 404
    _, factory = database
    with factory() as db:
        assert len(db.scalars(select(PhotoDeletion)).all()) == 1
        monkeypatch.setattr(store, 'delete', original)
        service.drain_deletions(db, store)
        assert not db.scalars(select(PhotoDeletion)).all()
    assert not list(store.root.glob('*.jpg'))


def test_orphan_cleanup_keeps_live_and_new_files(photos, database):
    client, (owner, _), pin_id, store = photos
    assert upload(client, owner, pin_id).status_code == 201
    orphan, new = f'{uuid4()}.jpg', f'{uuid4()}.jpg'
    store.write(orphan, picture())
    store.write(new, picture())
    old = time.time() - 90000
    os.utime(store.path(orphan), (old, old))
    _, factory = database
    with factory() as db:
        photo = db.scalar(select(PinPhoto))
        os.utime(store.path(photo.storage_key), (old, old))
        cleanup_orphans(db, store)
        assert store.path(photo.storage_key).exists()
    assert not store.path(orphan).exists()
    assert store.path(new).exists()


def test_storage_failure_does_not_create_row(photos, monkeypatch):
    client, (owner, _), pin_id, store = photos
    def fail(*args):
        raise OSError('private disk detail')
    monkeypatch.setattr(store, 'write', fail)
    result = upload(client, owner, pin_id)
    assert result.status_code == 503
    assert 'private disk detail' not in result.text
    assert client.get(f'/pins/{pin_id}/photos', headers=owner).json() == []
