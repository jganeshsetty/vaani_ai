"""Shared pytest fixtures."""
from __future__ import annotations

import asyncio
import os
import pytest

os.environ.setdefault("VAANI_MONGODB_URI", "mongodb://localhost:27017")
os.environ.setdefault("VAANI_MONGODB_DB", "vaani_test")


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()
