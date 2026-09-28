"""Walk sync integration tests run in the same isolated PostGIS schemas as pin tests."""
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone, timedelta

from sqlalchemy import text
from alembic import command
from alembic.config import Config

from test_pins import database, api  # noqa: F401


def start(client, headers, request_id=None):
    response = client.post('/walks/start', headers=headers, json={
        'client_request_id': request_id or str(uuid.uuid4()),
    })
    assert response.status_code == 201, response.text
    return response.json()


def point(sequence=0):
    return dict(sequence=sequence, latitude=35.68 + sequence / 10000, longitude=139.76,
                recorded_at='2026-09-28T01:00:00Z')


def test_roundtrip_retry_order_and_ownership(api):
    client, (owner, other), _ = api
    key = str(uuid.uuid4())
    walk = start(client, owner, key)
    assert start(client, owner, key)['id'] == walk['id']
    assert start(client, other, key)['id'] != walk['id']
    url = '/walks/' + walk['id']
    body = {'locations': [point(2), point(0), point(1)]}
    assert client.post(url + '/locations', headers=other, json=body).status_code == 404
    assert client.post(url + '/locations', headers=owner, json=body).json()['added'] == 3
    assert client.post(url + '/locations', headers=owner, json=body).json()['added'] == 0
    data = client.get('/walks/me', headers=owner).json()
    assert len(data) == 1
    assert [p['sequence'] for p in data[0]['locations']] == [0, 1, 2]
    assert data[0]['locations'][0]['recorded_at'].startswith('2026-09-28T01:00:00')
    end = {'ended_at': datetime.now(timezone.utc).isoformat()}
    assert client.post(url + '/finish', headers=other, json=end).status_code == 404
    finished = client.post(url + '/finish', headers=owner, json=end).json()
    later = {'ended_at': (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()}
    assert client.post(url + '/finish', headers=owner, json=later).json()['ended_at'] == finished['ended_at']
    assert len(finished['locations']) == 3
    assert client.post(url + '/locations', headers=owner, json=body).json()['added'] == 0
    assert client.post(url + '/locations', headers=owner, json={'locations': [point(3)]}).status_code == 409
    second = start(client, owner)
    assert second['id'] != walk['id'] and second['locations'] == []


def test_validation_conflicts_and_atomic_batches(api):
    client, (owner, _), _ = api
    url = '/walks/' + start(client, owner)['id'] + '/locations'
    for change in ({'latitude': 91}, {'longitude': -181}, {'sequence': -1},
                   {'sequence': 0.5}, {'recorded_at': '2026-09-28T01:00:00'}):
        assert client.post(url, headers=owner, json={'locations': [point() | change]}).status_code == 422
    for locations in ([], [point()] * 501):
        assert client.post(url, headers=owner, json={'locations': locations}).status_code == 422
    assert client.post(url, headers=owner, json={'locations': [point()]}).status_code == 201
    response = client.post(url, headers=owner, json={'locations': [point(1), point() | {'latitude': 1}]})
    assert response.status_code == 409
    assert len(client.get('/walks/me', headers=owner).json()[0]['locations']) == 1
    assert client.get('/walks/me').status_code == 401
    assert client.get('/walks/me', headers={'Authorization': 'Bearer invalid'}).status_code == 401


def test_concurrent_start_and_upload(api):
    client, (owner, _), _ = api
    key = str(uuid.uuid4())
    with ThreadPoolExecutor(max_workers=4) as pool:
        walks = list(pool.map(lambda _: start(client, owner, key), range(4)))
    assert len({w['id'] for w in walks}) == 1
    url = '/walks/' + walks[0]['id'] + '/locations'
    with ThreadPoolExecutor(max_workers=4) as pool:
        responses = list(pool.map(lambda _: client.post(url, headers=owner, json={'locations': [point()]}), range(4)))
    assert all(r.status_code == 201 for r in responses)
    assert sum(r.json()['added'] for r in responses) == 1


def test_legacy_migration_preserves_walks(api, database):
    client, (owner, _), _ = api
    walk = start(client, owner)
    client.post('/walks/' + walk['id'] + '/locations', headers=owner, json={'locations': [point(0), point(1)]})
    engine, _ = database
    import app.database as module
    old = module.engine
    module.engine = engine
    try:
        command.downgrade(Config('alembic.ini'), '003_photos')
        with engine.connect() as connection:
            assert connection.scalar(text('SELECT count(*) FROM location_points')) == 2
        command.upgrade(Config('alembic.ini'), 'head')
    finally:
        module.engine = old
    restored = client.get('/walks/me', headers=owner).json()[0]
    assert restored['id'] == walk['id']
    assert [p['sequence'] for p in restored['locations']] == [0, 1]


def test_expired_token_cannot_access_walks(api):
    from app.routers.auth import create_access_token
    client, (owner, _), ids = api
    walk = start(client, owner)
    expired = {'Authorization': 'Bearer ' + create_access_token({'sub': str(ids[0])}, timedelta(seconds=-1))}
    assert client.get('/walks/me', headers=expired).status_code == 401
    for path, body in [('/walks/start', {'client_request_id': str(uuid.uuid4())}),
                       ('/walks/' + walk['id'] + '/locations', {'locations': [point()]}),
                       ('/walks/' + walk['id'] + '/finish', {'ended_at': datetime.now(timezone.utc).isoformat()})]:
        assert client.post(path, headers=expired, json=body).status_code == 401


def test_finish_racing_upload_cannot_append_after_end(api):
    client, (owner, _), _ = api
    url = '/walks/' + start(client, owner)['id']
    with ThreadPoolExecutor(max_workers=2) as pool:
        upload = pool.submit(client.post, url + '/locations', headers=owner, json={'locations': [point()]})
        finish = pool.submit(client.post, url + '/finish', headers=owner, json={'ended_at': datetime.now(timezone.utc).isoformat()})
        uploaded, finished = upload.result(), finish.result()
    assert finished.status_code == 200
    assert uploaded.status_code in (201, 409)
    saved = client.get('/walks/me', headers=owner).json()[0]
    assert saved['ended_at'] is not None
    assert len(saved['locations']) == (1 if uploaded.status_code == 201 else 0)
    assert client.post(url + '/locations', headers=owner, json={'locations': [point(1)]}).status_code == 409
