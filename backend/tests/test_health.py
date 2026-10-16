import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import app as A  # noqa: E402


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(A, 'ENGINE', 'sqlite')
    monkeypatch.setattr(A, 'SQLITE_PATH', str(tmp_path / 't.db'))
    A.init_sqlite()
    return A.app.test_client()


def test_health_ok_sqlite(client):
    r = client.get('/api/health')
    assert r.status_code == 200
    assert r.get_json()['database'] == 'ok'
    assert r.get_json()['ok'] is True


def test_health_db_down(client, monkeypatch):
    def broken(*a, **k):
        raise Exception('boom')

    monkeypatch.setattr(A, 'db', broken)
    r = client.get('/api/health')
    assert r.status_code == 503
    assert r.get_json()['ok'] is False
    assert 'boom' in r.get_json()['database']
