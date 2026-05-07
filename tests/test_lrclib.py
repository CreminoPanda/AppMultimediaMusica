import json
from collections.abc import Callable
from unittest.mock import patch

import pytest

from src.lrclib import LyricsResult, _parse_lrc, search_lyrics


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


class TestParseLrc:
    def test_basic_lines(self) -> None:
        lrc = "[00:12.34]Hello world\n[00:56.78]Second line"
        lines = _parse_lrc(lrc)
        assert len(lines) == 2
        assert lines[0].time_ms == 12340
        assert lines[0].text == "Hello world"
        assert lines[1].time_ms == 56780
        assert lines[1].text == "Second line"

    def test_sorted_output(self) -> None:
        lrc = "[01:00.00]Last\n[00:30.00]First"
        lines = _parse_lrc(lrc)
        assert len(lines) == 2
        assert lines[0].text == "First"
        assert lines[1].text == "Last"

    def test_milliseconds_variants(self) -> None:
        lrc = "[00:01.5]Short millis\n[00:02.50]Two digit\n[00:03.500]Three digit"
        lines = _parse_lrc(lrc)
        assert lines[0].time_ms == 1500
        assert lines[1].time_ms == 2500
        assert lines[2].time_ms == 3500

    def test_seconds_only(self) -> None:
        lrc = "[00:05]No millis"
        lines = _parse_lrc(lrc)
        assert len(lines) == 1
        assert lines[0].time_ms == 5000
        assert lines[0].text == "No millis"

    def test_empty_lines_skipped(self) -> None:
        lrc = "[00:01.00]Line 1\n\n[00:02.00]Line 2"
        lines = _parse_lrc(lrc)
        assert len(lines) == 2

    def test_no_timestamp_lines_skipped(self) -> None:
        lrc = "This is metadata\n[00:01.00]Actual lyric"
        lines = _parse_lrc(lrc)
        assert len(lines) == 1
        assert lines[0].text == "Actual lyric"

    def test_whitespace_stripped(self) -> None:
        lrc = "[00:01.00]  Spaced text  "
        lines = _parse_lrc(lrc)
        assert lines[0].text == "Spaced text"

    def test_empty_lrc(self) -> None:
        lines = _parse_lrc("")
        assert lines == []

    def test_minutes_over_60(self) -> None:
        lrc = "[99:59.99]Long song"
        lines = _parse_lrc(lrc)
        assert lines[0].time_ms == 99 * 60 * 1000 + 59 * 1000 + 990


@pytest.mark.asyncio
async def test_search_lyrics_synced() -> None:
    data: dict[str, object] = {
        "id": 123,
        "trackName": "Test Song",
        "artistName": "Test Artist",
        "syncedLyrics": "[00:12.34]Line one\n[00:56.78]Line two",
        "plainLyrics": "Line one\nLine two",
    }
    with patch("urllib.request.urlopen", _mock_urlopen(data)):
        result = await search_lyrics("Test Song", "Test Artist")
    assert result.synced is True
    assert "[00:12.34]Line one" in result.raw_lrc
    assert len(result.lines) == 2
    assert result.lines[0].text == "Line one"


@pytest.mark.asyncio
async def test_search_lyrics_plain_only() -> None:
    data: dict[str, object] = {
        "id": 456,
        "trackName": "No Sync",
        "artistName": "Artist",
        "syncedLyrics": None,
        "plainLyrics": "Line one\nLine two\nLine three",
    }
    with patch("urllib.request.urlopen", _mock_urlopen(data)):
        result = await search_lyrics("No Sync", "Artist")
    assert result.synced is False
    assert result.raw_lrc == "Line one\nLine two\nLine three"
    assert len(result.lines) == 0


@pytest.mark.asyncio
async def test_search_lyrics_no_results() -> None:
    data: dict[str, object] = {
        "id": None,
        "trackName": "Unknown",
        "artistName": "Nonexistent",
        "syncedLyrics": None,
        "plainLyrics": None,
    }
    with patch("urllib.request.urlopen", _mock_urlopen(data)):
        result = await search_lyrics("Unknown", "Nonexistent")
    assert result == LyricsResult()


@pytest.mark.asyncio
async def test_search_lyrics_empty_query() -> None:
    result = await search_lyrics("", "")
    assert result == LyricsResult()


@pytest.mark.asyncio
async def test_search_lyrics_empty_artist() -> None:
    result = await search_lyrics("Title Only", "")
    assert result == LyricsResult()


@pytest.mark.asyncio
async def test_search_lyrics_empty_title() -> None:
    result = await search_lyrics("", "Artist Only")
    assert result == LyricsResult()


@pytest.mark.asyncio
async def test_search_lyrics_timeout() -> None:
    with patch("urllib.request.urlopen", side_effect=TimeoutError("timed out")):
        result = await search_lyrics("Test", "Timeout")
    assert result == LyricsResult()


@pytest.mark.asyncio
async def test_search_lyrics_http_error() -> None:
    with patch("urllib.request.urlopen", side_effect=OSError("connection error")):
        result = await search_lyrics("Test", "Error")
    assert result == LyricsResult()


@pytest.mark.asyncio
async def test_search_lyrics_invalid_json() -> None:
    class InvalidResponse:
        def read(self) -> bytes:
            return b"not json"

        def __enter__(self) -> "InvalidResponse":
            return self

        def __exit__(self, *args: object) -> None:
            pass

    with patch("urllib.request.urlopen", return_value=InvalidResponse()):
        result = await search_lyrics("Test", "Bad JSON")
    assert result == LyricsResult()
