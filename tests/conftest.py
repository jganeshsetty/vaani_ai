

"""Shared pytest fixtures."""
from __future__ import annotations

import os
import pytest

os.environ["VAANI_MONGODB_URI"] = "mongodb://localhost:27017"
os.environ["VAANI_MONGODB_DB"] = "vaani_test"
os.environ["VAANI_MOCK_MONGO"] = "true"
