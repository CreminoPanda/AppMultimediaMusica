import asyncio
import json
import logging
import re
import urllib.request
from dataclasses import dataclass, field
from urllib.parse import quote

logger = logging.getLogger(__name__)

SEARCH_URL = "https://lrclib.net/api/get?artist_name={artist}&track_name={title}"
TIMEOUT = 10

LRC_LINE_RE = re.compile(r"\[(\d+):(\d+(?:\.\d+)?)\](.*)")


@dataclass
class LrcLine:
    time_ms: int
    text: str


@dataclass
class LyricsResult:
    raw_lrc: str = ""
    synced: bool = False
    lines: list[LrcLine] = field(default_factory=list)


def _parse_lrc(raw: str) -> list[LrcLine]:
    lines: list[LrcLine] = []
    for line in raw.strip().splitlines():
        m = LRC_LINE_RE.match(line.strip())
        if m is None:
            continue
        minutes = int(m.group(1))
        sec_str = m.group(2)
        if "." in sec_str:
            seconds, millis_part = sec_str.split(".")
            millis = int(millis_part.ljust(3, "0")[:3])
        else:
            seconds = sec_str
            millis = 0
        total_ms = (minutes * 60 + int(seconds)) * 1000 + millis
        text = m.group(3).strip()
        lines.append(LrcLine(time_ms=total_ms, text=text))
    lines.sort(key=lambda x: x.time_ms)
    return lines


async def search_lyrics(title: str, artist: str) -> LyricsResult:
    query_title = title.strip()
    query_artist = artist.strip()
    if not query_title or not query_artist:
        return LyricsResult()

    url = SEARCH_URL.format(artist=quote(query_artist), title=quote(query_title))

    loop = asyncio.get_running_loop()

    def _fetch() -> str:
        req = urllib.request.Request(url, headers={"User-Agent": "MediaControl/1.0"})
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            raw: str = resp.read().decode()
            return raw

    try:
        raw = await asyncio.wait_for(
            loop.run_in_executor(None, _fetch),
            timeout=TIMEOUT + 2,
        )
    except TimeoutError:
        logger.warning("LRCLIB API timeout for: %s — %s", query_artist, query_title)
        return LyricsResult()
    except Exception:
        logger.exception("LRCLIB API error for: %s — %s", query_artist, query_title)
        return LyricsResult()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("LRCLIB API invalid JSON for: %s — %s", query_artist, query_title)
        return LyricsResult()

    raw_lrc = (data.get("syncedLyrics") or data.get("plainLyrics") or "")
    if not raw_lrc:
        logger.info("No lyrics found for: %s — %s", query_artist, query_title)
        return LyricsResult()

    synced = bool(data.get("syncedLyrics"))
    lines = _parse_lrc(raw_lrc)

    return LyricsResult(raw_lrc=raw_lrc, synced=synced, lines=lines)
