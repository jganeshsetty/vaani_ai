"""PCM audio adapter for bridging Exotel and Gnani.

Exotel's Connect Voice AI streams 8 kHz 16-bit signed little-endian PCM in
small frames. Gnani Prisma/Timbre expect the same format. This module provides
helpers to convert between raw bytes and numpy arrays and to interleave/
deinterleave stereo pairs when needed.
"""
from __future__ import annotations

import audioop
import logging
from typing import Optional

logger = logging.getLogger("vaani.audio")


# Exotel / Gnani default sample rate.
SAMPLE_RATE = 8000
# 16-bit samples.
SAMPLE_WIDTH = 2
# Mono.
CHANNELS = 1


def bytes_to_frames(data: bytes, sample_width: int = SAMPLE_WIDTH) -> list[int]:
    """Convert raw PCM bytes to a list of signed sample ints."""
    if not data:
        return []
    return list(audioop.lin2lin(data, sample_width, 1))


def frames_to_bytes(frames: list[int], sample_width: int = SAMPLE_WIDTH) -> bytes:
    """Convert a list of signed sample ints back to raw PCM bytes."""
    if not frames:
        return b""
    return _int_list_to_bytes(frames, sample_width)


def _int_list_to_bytes(frames: list[int], sample_width: int) -> bytes:
    """Pack a list of ints into a little-endian PCM byte string."""
    import struct

    fmt = {1: "b", 2: "<h", 4: "<i"}[sample_width]
    return struct.pack(f"<{len(frames)}{fmt[1]}", *frames)


def resample(data: bytes, from_rate: int, to_rate: int, sample_width: int = SAMPLE_WIDTH) -> bytes:
    """Resample PCM audio between sample rates using audioop."""
    if from_rate == to_rate:
        return data
    return audioop.ratecv(data, sample_width, 1, from_rate, to_rate, None)[0]


def mix_stereo(left: bytes, right: bytes, sample_width: int = SAMPLE_WIDTH) -> bytes:
    """Interleave two mono PCM buffers into a single stereo buffer."""
    return audioop.to_stereo(left, sample_width, right, sample_width)


def split_stereo(stereo: bytes, sample_width: int = SAMPLE_WIDTH) -> tuple[bytes, bytes]:
    """Split a stereo PCM buffer into two mono buffers."""
    return audioop.from_stereo(stereo, sample_width)