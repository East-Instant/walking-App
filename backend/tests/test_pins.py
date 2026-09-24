"""Integration tests: TEST_DATABASE_URL must name an isolated PostGIS database.
Each test runs in a unique schema. No application tables are dropped.
"""
import os
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.database import get_db
from app.main import app
from app.models import User
from app.pins import service
from app.routers.auth import create_access_token


@pytest.fixture
def database():
    url = os.getenv('TEST_DATABASE_URL')
    if not url:
        pytest.skip('TEST_DATABASE_URL is required for real PostGIS tests')
    root = create_engine(url)
    schema = 'pin_test_' + uuid.uuid4().hex
    with root.begin() as connection:
        connection.execute(text('CREATE EXTENSION IF NOT EXISTS postgis'))
        connection.execute(text(f'CREATE SCHEMA {schema}'))
    engine = create_engine(url, connect_args={'options': f'-c search_path={schema},public'})
    # Run the actual migrations rather than metadata.create_all().
    import app.database as database_module
    old = database_module.engine
    database_module.engine = engine
    try:
        command.upgrade(Config('alembic.ini'), 'head')
        command.upgrade(Config('alembic.ini'), 'head')
    finally:
        database_module.engine = old
    factory = sessionmaker(bind=engine)
    try:
        yield engine, factory
    finally:
        engine.dispose()
        with root.begin() as connection:
            connection.execute(text(f'DROP SCHEMA {schema} CASCADE'))
        root.dispose()


@pytest.fixture
def api(database):
    engine, factory = database
    ids = [uuid.uuid4(), uuid.uuid4()]
    with factory.begin() as db:
        for i, user_id in enumerate(ids):
            db.add(User(id=user_id, username=f'user{i}', email=f'u{i}@example.com', password_hash='not-used'))

    def session():
        with factory() as db:
            try:
                yield db
            except Exception:
                db.rollback()
                raise

    app.dependency_overrides[get_db] = session
    with TestClient(app) as client:
        headers = [{'Authorization': 'Bearer ' + create_access_token({'sub': str(user_id)})} for user_id in ids]
        yield client, headers, ids
    app.dependency_overrides.clear()


def payload(**changes):
    return dict(latitude=35.6812, longitude=139.7671, title='公園', memo='夕日', client_request_id=str(uuid.uuid4())) | changes


def test_crud_ownership_and_pagination(api):
    client, (owner, other), ids = api
    response = client.post('/pins', json=payload(), headers=owner)
    assert response.status_code == 201, response.text
    pin = response.json()
    assert pin['latitude'] == pytest.approx(35.6812)
    assert pin['longitude'] == pytest.approx(139.7671)
    url = '/pins/' + pin['id']
    for method in ('get', 'patch', 'delete'):
        kwargs = {'json': {'title': '変更'}} if method == 'patch' else {}
        assert getattr(client, method)(url, headers=other, **kwargs).status_code == 404
    assert client.get('/pins', headers=other).json()['items'] == []
    result = client.patch(url, json={'title': 'ベンチ', 'latitude': 36, 'longitude': 140}, headers=owner)
    assert result.status_code == 200
    assert result.json()['title'] == 'ベンチ'
    assert result.json()['latitude'] == 36
    assert client.get(url, headers=owner).json()['memo'] == '夕日'
    client.post('/pins', json=payload(), headers=owner)
    page = client.get('/pins?limit=1', headers=owner).json()
    assert page['next_offset'] == 1
    assert client.get('/pins?limit=1&offset=1', headers=owner).json()['items'][0]['id'] != page['items'][0]['id']
    assert client.delete(url, headers=owner).status_code == 204
    assert client.get(url, headers=owner).status_code == 404


def test_idempotency_concurrent(api):
    client, (owner, other), _ = api
    data = payload()
    with ThreadPoolExecutor(max_workers=4) as executor:
        responses = list(executor.map(lambda _: client.post('/pins', json=data, headers=owner), range(4)))
    assert sorted(r.status_code for r in responses) == [200, 200, 200, 201]
    assert len({r.json()['id'] for r in responses}) == 1
    assert client.post('/pins', json=data | {'title': '別の場所'}, headers=owner).status_code == 409
    assert len(client.get('/pins', headers=owner).json()['items']) == 1
    assert client.post('/pins', json=data, headers=other).status_code == 201


def test_radius_boundary_and_dateline(api, database):
    client, (owner, _), _ = api
    engine, _ = database
    for distance in (499.9, 500.1):
        with engine.connect() as connection:
            row = connection.execute(text('SELECT ST_Y(p::geometry), ST_X(p::geometry) FROM (SELECT ST_Project(ST_SetSRID(ST_MakePoint(179.999, 0),4326)::geography, :d, pi()/2) p) q'), {'d': distance}).one()
        assert client.post('/pins', json=payload(latitude=row[0], longitude=row[1], title=str(distance)), headers=owner).status_code == 201
    result = client.get('/pins?latitude=0&longitude=179.999&radius_m=500', headers=owner)
    assert result.status_code == 200
    assert [p['title'] for p in result.json()['items']] == ['499.9']


@pytest.mark.parametrize('change', [{'latitude': 91}, {'longitude': -181}, {'title': '   '}, {'memo': 'x'*1001}, {'user_id': str(uuid.uuid4())}])
def test_invalid_create(api, change):
    client, (owner, _), _ = api
    assert client.post('/pins', json=payload(**change), headers=owner).status_code == 422


def test_auth_and_invalid_queries(api):
    client, (owner, _), ids = api
    assert client.get('/pins').status_code == 401
    for sub in ('bad-uuid', str(uuid.uuid4())):
        token = create_access_token({'sub': sub})
        assert client.get('/pins', headers={'Authorization': 'Bearer '+token}).status_code == 401
    token = create_access_token({'sub': str(ids[0])}, timedelta(seconds=-1))
    assert client.get('/pins', headers={'Authorization': 'Bearer '+token}).status_code == 401
    assert client.get('/pins', headers={'Authorization': 'Bearer invalid'}).status_code == 401
    for query in ('latitude=35', 'limit=101', 'radius_m=10001&latitude=35&longitude=139', 'latitude=nan&longitude=0&radius_m=500'):
        assert client.get('/pins?'+query, headers=owner).status_code == 422
    pin_id = client.post('/pins', json=payload(), headers=owner).json()['id']
    for body in ({}, {'latitude': 1}, {'memo': None}, {'user_id': str(ids[1])}):
        assert client.patch('/pins/'+pin_id, json=body, headers=owner).status_code == 422


def test_failed_write_rolls_back(api, monkeypatch):
    client, (owner, _), _ = api
    original = service.view
    def fail(*args):
        from sqlalchemy.exc import OperationalError
        raise OperationalError('internal detail', {}, Exception('secret'))
    monkeypatch.setattr(service, 'view', fail)
    data = payload()
    response = client.post('/pins', json=data, headers=owner)
    assert response.status_code == 503
    assert 'secret' not in response.text
    monkeypatch.setattr(service, 'view', original)
    assert client.get('/pins', headers=owner).json()['items'] == []
    assert client.post('/pins', json=data, headers=owner).status_code == 201


def test_registration_login_and_pin(api):
    client, _, _ = api
    response = client.post('/auth/register', json={
        'username': 'walker', 'email': 'walker@example.com',
        'password': 'walking123', 'password_confirm': 'walking123', 'terms_accepted': True,
    })
    assert response.status_code == 201, response.text
    login = client.post('/auth/login', data={'username': 'walker@example.com', 'password': 'walking123'})
    assert login.status_code == 200
    headers = {'Authorization': 'Bearer ' + login.json()['access_token']}
    assert client.get('/auth/me', headers=headers).json()['username'] == 'walker'
    assert client.post('/pins', headers=headers, json=payload()).status_code == 201


def test_migration_preserves_users_and_recreates_indexes(database):
    engine, factory = database
    user_id = uuid.uuid4()
    with factory.begin() as db:
        db.add(User(id=user_id, username='preserved', email='keep@example.com', password_hash='unused'))
    import app.database as database_module
    old = database_module.engine
    database_module.engine = engine
    try:
        command.downgrade(Config('alembic.ini'), 'base')
        command.upgrade(Config('alembic.ini'), 'head')
    finally:
        database_module.engine = old
    with factory() as db:
        assert db.get(User, user_id).username == 'preserved'
        indexes = db.execute(text("SELECT indexdef FROM pg_indexes WHERE schemaname = current_schema() AND tablename = 'favorite_pins'")).scalars().all()
        assert any('USING gist (location)' in i for i in indexes)
        assert any('(user_id, created_at, id)' in i for i in indexes)
