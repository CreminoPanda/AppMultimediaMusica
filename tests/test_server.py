import json
from unittest.mock import AsyncMock, patch

import pytest

from src.playerctl import PlaybackEvent, PlaybackStatus, TrackInfo
from src.server import build_payload, handle_command


@pytest.mark.asyncio
async def test_build_payload_playing() -> None:
    event = PlaybackEvent(
        status=PlaybackStatus.Playing,
        track=TrackInfo(
            title="Test Song",
            artist="Test Artist",
            album="Test Album",
            art_url="https://example.com/art.jpg",
            duration_ms=200000,
        ),
    )
    with (
        patch("src.server.get_position", return_value=50000),
        patch("src.server.search_lyrics", return_value=AsyncMock(raw_lrc="")),
    ):
        payload = await build_payload(event, "brave.instance1234")

    assert payload["status"] == "Playing"
    assert payload["title"] == "Test Song"
    assert payload["artist"] == "Test Artist"
    assert payload["album"] == "Test Album"
    assert payload["duration_ms"] == 200000
    assert payload["progress_ms"] == 50000
    assert payload["art_url"] == "https://example.com/art.jpg"
    assert payload["lyrics"] is None


@pytest.mark.asyncio
async def test_build_payload_stopped() -> None:
    event = PlaybackEvent(status=PlaybackStatus.Stopped)
    payload = await build_payload(event, "brave.instance1234")

    assert payload["status"] == "Stopped"
    assert payload["title"] == ""
    assert payload["progress_ms"] == 0
    assert payload["lyrics"] is None


@pytest.mark.asyncio
async def test_build_payload_with_lyrics() -> None:
    event = PlaybackEvent(
        status=PlaybackStatus.Playing,
        track=TrackInfo(title="Song", artist="Artist"),
    )
    mock_lyrics = AsyncMock()
    mock_lyrics.raw_lrc = "[00:01.00]Line one\n[00:02.00]Line two"
    with (
        patch("src.server.get_position", return_value=1000),
        patch("src.server.search_lyrics", return_value=mock_lyrics),
    ):
        payload = await build_payload(event, "brave.instance1234")

    assert payload["lyrics"] == "[00:01.00]Line one\n[00:02.00]Line two"


@pytest.mark.asyncio
async def test_build_payload_position_error() -> None:
    event = PlaybackEvent(
        status=PlaybackStatus.Playing,
        track=TrackInfo(title="Song", artist="Artist"),
    )
    with (
        patch("src.server.get_position", side_effect=Exception("no playerctl")),
        patch("src.server.search_lyrics", return_value=AsyncMock(raw_lrc="")),
    ):
        payload = await build_payload(event, "brave.instance1234")

    assert payload["progress_ms"] == 0


@pytest.mark.asyncio
async def test_handle_command_play() -> None:
    ws = AsyncMock()
    with patch("src.server.send_play") as mock_play:
        await handle_command(
            ws, {"token": "media_control_secret", "action": "play"}, "brave.instance1234"
        )
    mock_play.assert_awaited_once_with("brave.instance1234")
    ws.send.assert_not_called()


@pytest.mark.asyncio
async def test_handle_command_pause() -> None:
    ws = AsyncMock()
    with patch("src.server.send_pause") as mock_pause:
        await handle_command(
            ws,
            {"token": "media_control_secret", "action": "pause"},
            "brave.instance1234",
        )
    mock_pause.assert_awaited_once_with("brave.instance1234")


@pytest.mark.asyncio
async def test_handle_command_play_pause() -> None:
    ws = AsyncMock()
    with patch("src.server.send_play_pause") as mock_toggle:
        await handle_command(
            ws,
            {"token": "media_control_secret", "action": "play_pause"},
            "brave.instance1234",
        )
    mock_toggle.assert_awaited_once_with("brave.instance1234")


@pytest.mark.asyncio
async def test_handle_command_next() -> None:
    ws = AsyncMock()
    with patch("src.server.send_next") as mock_next:
        await handle_command(
            ws,
            {"token": "media_control_secret", "action": "next"},
            "brave.instance1234",
        )
    mock_next.assert_awaited_once_with("brave.instance1234")


@pytest.mark.asyncio
async def test_handle_command_previous() -> None:
    ws = AsyncMock()
    with patch("src.server.send_previous") as mock_prev:
        await handle_command(
            ws,
            {"token": "media_control_secret", "action": "previous"},
            "brave.instance1234",
        )
    mock_prev.assert_awaited_once_with("brave.instance1234")


@pytest.mark.asyncio
async def test_handle_command_seek() -> None:
    ws = AsyncMock()
    with patch("src.server.send_seek") as mock_seek:
        await handle_command(
            ws,
            {"token": "media_control_secret", "action": "seek", "value": 90.5},
            "brave.instance1234",
        )
    mock_seek.assert_awaited_once_with("brave.instance1234", 90.5)


@pytest.mark.asyncio
async def test_handle_command_invalid_token() -> None:
    ws = AsyncMock()
    with patch("src.config.SECRET_TOKEN", "correct_token"):
        await handle_command(
            ws,
            {"token": "wrong_token", "action": "play"},
            "brave.instance1234",
        )
    ws.send.assert_awaited_once()
    args = ws.send.call_args[0][0]
    data = json.loads(args)
    assert data["error"] == "Authentication failed"


@pytest.mark.asyncio
async def test_handle_command_unknown_action() -> None:
    ws = AsyncMock()
    await handle_command(
        ws,
        {"token": "media_control_secret", "action": "unknown"},
        "brave.instance1234",
    )
    ws.send.assert_awaited_once()
    args = ws.send.call_args[0][0]
    data = json.loads(args)
    assert data["error"] == "Unknown action: unknown"
