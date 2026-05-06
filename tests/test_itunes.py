import json
from collections.abc import Callable
from unittest.mock import patch

import pytest

from src.itunes import EnrichedTrack, search_track


class MockResponse:
    def __init__(self, data: dict[str, object]) -> None:
        self._data = json.dumps(data).encode()

    def read(self) -> bytes:
        return self._data

    def __enter__(self) -> "MockResponse":
        return self

    def __exit__(self, *args: object) -> None:
        pass


def _mock_urlopen(data: dict[str, object]) -> Callable[..., MockResponse]:
    def factory(*args: object, **kwargs: object) -> MockResponse:
        return MockResponse(data)
    return factory


@pytest.mark.asyncio
async def test_search_track_found() -> None:
    data: dict[str, object] = {
        "resultCount": 1,
        "results": [
            {
                "trackName": "Test Song",
                "artistName": "Test Artist",
                "artworkUrl100": "https://example.com/100x100.jpg",
                "trackTimeMillis": 200000,
            }
        ],
    }
    with patch("urllib.request.urlopen", _mock_urlopen(data)):
        result = await search_track("Test Song", "Test Artist")
    assert result.art_url == "https://example.com/600x600.jpg"
    assert result.duration_ms == 200000


@pytest.mark.asyncio
async def test_search_track_no_results() -> None:
    data: dict[str, object] = {"resultCount": 0, "results": []}
    with patch("urllib.request.urlopen", _mock_urlopen(data)):
        result = await search_track("Unknown", "Nonexistent")
    assert result == EnrichedTrack()


@pytest.mark.asyncio
async def test_search_track_empty_query() -> None:
    result = await search_track("", "")
    assert result == EnrichedTrack()


@pytest.mark.asyncio
async def test_search_track_timeout() -> None:
    with patch("urllib.request.urlopen", side_effect=TimeoutError("timed out")):
        result = await search_track("Test", "Timeout")
    assert result == EnrichedTrack()


@pytest.mark.asyncio
async def test_search_track_no_artwork() -> None:
    data: dict[str, object] = {
        "resultCount": 1,
        "results": [
            {
                "trackName": "No Art",
                "artistName": "No Artist",
                "artworkUrl100": "",
                "trackTimeMillis": 180000,
            }
        ],
    }
    with patch("urllib.request.urlopen", _mock_urlopen(data)):
        result = await search_track("No Art", "No Artist")
    assert result.art_url == ""
    assert result.duration_ms == 180000


@pytest.mark.asyncio
async def test_search_track_zero_duration() -> None:
    data: dict[str, object] = {
        "resultCount": 1,
        "results": [
            {
                "trackName": "No Duration",
                "artistName": "Artist",
                "artworkUrl100": "https://example.com/100x100.jpg",
                "trackTimeMillis": 0,
            }
        ],
    }
    with patch("urllib.request.urlopen", _mock_urlopen(data)):
        result = await search_track("No Duration", "Artist")
    assert result.art_url == "https://example.com/600x600.jpg"
    assert result.duration_ms == 0
