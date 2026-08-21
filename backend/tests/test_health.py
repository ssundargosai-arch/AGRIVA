from fastapi.testclient import TestClient

import app.main as main


def test_health(monkeypatch):
    monkeypatch.setattr(
        main,
        "check_database_connection",
        lambda: True,
    )

    client = TestClient(main.app)

    response = client.get("/api/health")

    assert response.status_code == 200

    assert response.json() == {
        "success": True,
        "service": "AGRIVA Backend",
        "status": "healthy",
    }