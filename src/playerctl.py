import asyncio
import logging
import re
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from enum import Enum

from src.itunes import search_track

logger = logging.getLogger(__name__)

_DASH_RE = re.compile(r"\s*[—–-]\s+")


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
    proc = await asyncio.create_subprocess_exec(
        "playerctl", "-l",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, _ = await proc.communicate()
    for line in stdout.decode().strip().splitlines():
        stripped = line.strip()
        if stripped.startswith("brave.instance"):
            return stripped
    return None


def parse_metadata(raw: str) -> TrackInfo:
    if not raw:
        return TrackInfo()
    parts = _DASH_RE.split(raw, maxsplit=1)
    if len(parts) == 2:
        return TrackInfo(title=parts[0].strip(), artist=parts[1].strip())
    return TrackInfo(title=raw.strip())


async def get_player_metadata(instance: str) -> TrackInfo:
    proc = await asyncio.create_subprocess_exec(
        "playerctl", "--player", instance, "metadata", "--format", "{{title}} — {{artist}}",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, _ = await proc.communicate()
    track = parse_metadata(stdout.decode().strip())

    proc_album = await asyncio.create_subprocess_exec(
        "playerctl", "--player", instance, "metadata", "--format", "{{album}}",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout_album, _ = await proc_album.communicate()
    track.album = stdout_album.decode().strip()

    if track.title:
        enriched = await search_track(track.title, track.artist)
        track.art_url = enriched.art_url
        track.duration_ms = enriched.duration_ms
    return track


async def get_player_status(instance: str) -> PlaybackStatus:
    proc = await asyncio.create_subprocess_exec(
        "playerctl", "--player", instance, "status",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, _ = await proc.communicate()
    status_str = stdout.decode().strip()
    try:
        return PlaybackStatus(status_str)
    except ValueError:
        return PlaybackStatus.Stopped


async def monitor_player(instance: str) -> AsyncIterator[PlaybackEvent]:
    proc = await asyncio.create_subprocess_exec(
        "playerctl", "--player", instance, "follow",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    assert proc.stdout is not None

    status = await get_player_status(instance)
    track = await get_player_metadata(instance)
    yield PlaybackEvent(status=status, track=track)

    while True:
        raw = await proc.stdout.readline()
        if not raw:
            break
        line = raw.decode().strip()
        if not line or ":" not in line:
            continue

        _, _, payload = line.partition(":")
        payload = payload.strip()

        if payload in ("Playing", "Paused"):
            track = await get_player_metadata(instance)
            yield PlaybackEvent(status=PlaybackStatus(payload), track=track)
        elif payload == "Stopped":
            yield PlaybackEvent(status=PlaybackStatus.Stopped)
        elif payload.startswith("Metadata"):
            status = await get_player_status(instance)
            track = await get_player_metadata(instance)
            yield PlaybackEvent(status=status, track=track)

    await proc.wait()


async def get_position(instance: str) -> int:
    proc = await asyncio.create_subprocess_exec(
        "playerctl", "--player", instance, "position",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, _ = await proc.communicate()
    raw = stdout.decode().strip()
    try:
        return int(float(raw) * 1000)
    except (ValueError, TypeError):
        return 0


async def send_command(instance: str, *args: str) -> None:
    await asyncio.create_subprocess_exec(
        "playerctl", "--player", instance, *args,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.DEVNULL,
    )


async def send_play(instance: str) -> None:
    await send_command(instance, "play")


async def send_pause(instance: str) -> None:
    await send_command(instance, "pause")


async def send_play_pause(instance: str) -> None:
    await send_command(instance, "play-pause")


async def send_next(instance: str) -> None:
    await send_command(instance, "next")


async def send_previous(instance: str) -> None:
    await send_command(instance, "previous")


async def send_seek(instance: str, position_sec: float) -> None:
    await send_command(instance, "position", str(position_sec))
