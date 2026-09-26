from unittest.mock import MagicMock, patch

import pytest

from app.scripts.seed_demo_user import DEMO_EMAIL, DEMO_USERNAME, seed_demo_user


def test_seed_demo_user_creates_account_once(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None
    context = MagicMock()
    context.__enter__.return_value = db

    with patch("app.scripts.seed_demo_user.SessionLocal", return_value=context):
        seed_demo_user()

    user = db.add.call_args.args[0]
    assert user.username == DEMO_USERNAME
    assert user.email == DEMO_EMAIL
    assert user.password_hash != "DemoWalk123!"
    db.commit.assert_called_once()


def test_seed_demo_user_does_not_duplicate(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = object()
    context = MagicMock()
    context.__enter__.return_value = db

    with patch("app.scripts.seed_demo_user.SessionLocal", return_value=context):
        seed_demo_user()

    db.add.assert_not_called()
    db.commit.assert_not_called()


def test_seed_demo_user_refuses_production(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    with pytest.raises(RuntimeError):
        seed_demo_user()
