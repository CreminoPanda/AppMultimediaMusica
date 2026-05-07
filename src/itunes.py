import asyncio
import json
import logging
import urllib.request
from dataclasses import dataclass
from urllib.parse import quote

logger = logging.getLogger(__name__)

SEARCH_URL = "https://itunes.apple.com/search?term={term}&limit=1&entity=song"
TIMEOUT = 10


@dataclass
class EnrichedTrack:
    art_url: str = ""
    duration_ms: int = 0


async def search_track(title: str, artist: str) -> EnrichedTrack:
    query = f"{title} {artist}".strip()
    if not query:
        return EnrichedTrack()

    url = SEARCH_URL.format(term=quote(query))

    loop = asyncio.get_running_loop()

    def _fetch() -> str:
        with urllib.request.urlopen(url, timeout=TIMEOUT) as resp:
            raw: str = resp.read().decode()
            return raw

    try:
        raw = await asyncio.wait_for(
            loop.run_in_executor(None, _fetch),
            timeout=TIMEOUT + 2,
        )
    except TimeoutError:
        logger.warning("iTunes API timeout for query: %s", query)
        return EnrichedTrack()
    except Exception:
        logger.exception("iTunes API error for query: %s", query)
        return EnrichedTrack()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("iTunes API invalid JSON for query: %s", query)
        return EnrichedTrack()

    results = data.get("results", [])
    if not results:
        logger.info("No iTunes results for query: %s", query)
        return EnrichedTrack()

    result = results[0]
    art_url = result.get("artworkUrl100", "")
    if art_url:
        art_url = art_url.replace("100x100", "600x600")
    duration_ms = result.get("trackTimeMillis", 0) or 0

    return EnrichedTrack(art_url=art_url, duration_ms=duration_ms)
