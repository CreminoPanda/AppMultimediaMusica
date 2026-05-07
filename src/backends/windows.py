import asyncio
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

try:
    from winrt.windows.foundation import TimeSpan  # type: ignore[import-not-found]
    from winrt.windows.media.control import (  # type: ignore[import-not-found]
        GlobalSystemMediaTransportControlsSessionManager as SessionManager,
    )
    from winrt.windows.media.control import (
        GlobalSystemMediaTransportControlsSessionPlaybackStatus as WStatus,
    )
    HAS_WINRT = True
except ImportError:
    HAS_WINRT = False

logger = __import__("logging").getLogger(__name__)


class PlaybackStatus(Enum):
    Playing = "Playing"
    Paused = "Paused"
    Stopped = "Stopped"


@dataclass
class TrackInfo:
    title: str = ""
    artist: str = ""
    album: str = ""
    art_url: str = ""
    duration_ms: int = 0


@dataclass
class PlaybackEvent:
    status: PlaybackStatus
    track: TrackInfo = field(default_factory=TrackInfo)


async def find_player_instance() -> str | None:
    if not HAS_WINRT:
        return None

    manager = await SessionManager.request_async()
    session = manager.get_current_session()
    if session is not None:
        return "windows_smtc"
    return None


async def _get_session() -> Any | None:
    if not HAS_WINRT:
        return None

    manager = await SessionManager.request_async()
    return manager.get_current_session()


async def get_player_status(_instance: str) -> PlaybackStatus:
    session = await _get_session()
    if session is None:
        return PlaybackStatus.Stopped

    try:
        info = session.get_playback_info()
        status = info.playback_status
        if status == WStatus.PLAYING:
            return PlaybackStatus.Playing
        elif status == WStatus.PAUSED:
            return PlaybackStatus.Paused
        else:
            return PlaybackStatus.Stopped
    except Exception:
        return PlaybackStatus.Stopped


async def get_player_metadata(_instance: str) -> TrackInfo:
    from src.itunes import search_track

    session = await _get_session()
    if session is None:
        return TrackInfo()

    try:
        props = await session.try_get_media_properties_async()
        track = TrackInfo(
            title=props.title or "",
            artist=props.artist or "",
            album=props.album_title or "",
        )
        if track.title:
            enriched = await search_track(track.title, track.artist)
            track.art_url = enriched.art_url
            track.duration_ms = enriched.duration_ms
        return track
    except Exception:
        return TrackInfo()


async def get_position(_instance: str) -> int:
    session = await _get_session()
    if session is None:
        return 0

    try:
        timeline = session.get_timeline_properties()
        pos = timeline.position
        return int(pos.total_seconds() * 1000)
    except Exception:
        return 0


async def monitor_player(_instance: str) -> AsyncIterator[PlaybackEvent]:
    if not HAS_WINRT:
        return

    manager = await SessionManager.request_async()
    session = manager.get_current_session()
    if session is None:
        return

    queue: asyncio.Queue[None] = asyncio.Queue()

    def _on_changed(_sender: Any, _args: Any) -> None:
        try:
            loop = asyncio.get_running_loop()
            loop.call_soon_threadsafe(queue.put_nowait, None)
        except RuntimeError:
            pass

    session.add_media_properties_changed(_on_changed)
    session.add_playback_info_changed(_on_changed)

    _session = session

    try:
        status = await get_player_status(_instance)
        track = await get_player_metadata(_instance)
        yield PlaybackEvent(status=status, track=track)

        while True:
            try:
                await asyncio.wait_for(queue.get(), timeout=30)
            except TimeoutError:
                current = manager.get_current_session()
                if current is None:
                    break
                continue

            current = manager.get_current_session()
            if current is None:
                break

            status = await get_player_status(_instance)
            track = await get_player_metadata(_instance)
            yield PlaybackEvent(status=status, track=track)
    finally:
        try:
            _session.remove_media_properties_changed(_on_changed)
            _session.remove_playback_info_changed(_on_changed)
        except Exception:
            pass


async def send_command(_instance: str, *args: str) -> None:
    pass


async def send_play(_instance: str) -> None:
    session = await _get_session()
    if session is not None:
        try:
            await session.try_play_async()
        except Exception as e:
            logger.warning("Failed to play: %s", e)


async def send_pause(_instance: str) -> None:
    session = await _get_session()
    if session is not None:
        try:
            await session.try_pause_async()
        except Exception as e:
            logger.warning("Failed to pause: %s", e)


async def send_play_pause(_instance: str) -> None:
    status = await get_player_status(_instance)
    if status == PlaybackStatus.Playing:
        await send_pause(_instance)
    else:
        await send_play(_instance)


async def send_next(_instance: str) -> None:
    session = await _get_session()
    if session is not None:
        try:
            await session.try_skip_next_async()
        except Exception as e:
            logger.warning("Failed to skip next: %s", e)


async def send_previous(_instance: str) -> None:
    session = await _get_session()
    if session is not None:
        try:
            await session.try_skip_previous_async()
        except Exception as e:
            logger.warning("Failed to skip previous: %s", e)


async def send_seek(_instance: str, position_sec: float) -> None:
    session = await _get_session()
    if session is not None:
        try:
            ts = TimeSpan()
            ts.duration = int(position_sec * 10_000_000)
            await session.try_change_playback_position_async(ts)
        except Exception as e:
            logger.warning("Failed to seek: %s", e)
