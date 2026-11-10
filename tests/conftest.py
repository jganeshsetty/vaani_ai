"""Shared pytest fixtures."""
from __future__ import annotations

import os
import pytest
import pytest_asyncio

# Use an in-memory or test DB by default; tests that need Mongo can override.
os.environ.setdefault("VAANI_MONGODB_URI", "mongomock://localhost")
os.environ.setdefault("VAANI_MONGODB_DB", "vaani_test")


@pytest.fixture
def event_loop():
    import asyncio

    loop = asyncio.new_event_loop()
    yield loop
    loop.close()