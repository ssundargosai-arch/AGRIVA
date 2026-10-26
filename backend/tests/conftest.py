import pytest


@pytest.fixture(autouse=True)
def disable_live_mandi_api(
    monkeypatch,
):
    """
    Disable external data.gov.in calls
    during normal unit tests.

    Tests which specifically test mandi
    integration can enable the API again
    using monkeypatch.
    """

    monkeypatch.setenv(
        "MANDI_API_ENABLED",
        "false",
    )

    monkeypatch.setenv(
        "DEMO_MODE",
        "true",
    )