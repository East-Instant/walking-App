import asyncio
from uuid import uuid4
import pytest
from app.photos.storage import LocalPhotoStorage
from app.photos.limits import PhotoUploadLimit


def test_private_storage_and_path_validation(tmp_path):
    storage = LocalPhotoStorage(tmp_path)
    key = f'{uuid4()}.jpg'
    storage.write(key, b'example')
    with pytest.raises(FileExistsError):
        storage.write(key, b'overwrite')
    assert storage.read(key) == b'example'
    for value in ('../../secret.jpg', 'not-a-uuid.jpg', key + '/other'):
        with pytest.raises(ValueError):
            storage.read(value)
    storage.delete(key)
    storage.delete(key)
    assert not list(tmp_path.iterdir())


@pytest.mark.parametrize('maximum, status', [(8, 413), (20, 200)])
def test_chunked_body_limit_and_replay(monkeypatch, maximum, status):
    import app.photos.limits as limits
    monkeypatch.setattr(limits, 'MAX_REQUEST_BYTES', maximum)
    responses = []
    chunks = iter([
        {'type': 'http.request', 'body': b'first', 'more_body': True},
        {'type': 'http.request', 'body': b'second', 'more_body': False},
    ])
    async def receive():
        return next(chunks)
    async def send(message):
        responses.append(message)
    async def downstream(scope, receive_body, send):
        body = bytearray()
        while True:
            message = await receive_body()
            body.extend(message['body'])
            if not message.get('more_body'):
                break
        assert body == b'firstsecond'
        await send({'status': 200})
    scope = {'type': 'http', 'method': 'POST', 'path': '/pins/example/photos', 'headers': []}
    asyncio.run(PhotoUploadLimit(downstream)(scope, receive, send))
    assert responses[0]['status'] == status
