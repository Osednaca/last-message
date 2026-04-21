"""Verify that the test infrastructure is working."""


def test_pytest_works():
    """Sanity check that pytest can discover and run tests."""
    assert True


def test_fastapi_app_imports():
    """Verify the FastAPI app can be imported."""
    from main import app

    assert app is not None
    assert app.title == "Last Message - Echoes from the Future"
