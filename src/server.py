import asyncio
import json
import logging
from collections.abc import Awaitable

import websockets
from websockets.asyncio.server import ServerConnection
from websockets.exceptions import ConnectionClosed

from src.auth import verify_token
from src.config import HOST, PORT, SECRET_TOKEN
from src.lrclib import search_lyrics
from src.playerctl import (
    PlaybackEvent,
    PlaybackStatus,
    find_player_instance,
    get_position,
    monitor_player,
    send_next,
    send_pause,
    send_play,
    send_play_pause,
    send_previous,
    send_seek,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

clients: set[ServerConnection] = set()
player_instance: str | None = None
last_payload: dict[str, object] | None = None


async def broadcast(payload: dict[str, object]) -> None:
    message = json.dumps(payload)
    disconnected: set[ServerConnection] = set()
    for ws in list(clients):
        try:
            await ws.send(message)
        except ConnectionClosed:
            disconnected.add(ws)
    clients.difference_update(disconnected)


async def build_payload(event: PlaybackEvent, instance: str) -> dict[str, object]:
    payload: dict[str, object] = {
        "status": event.status.value,
        "title": event.track.title,
        "artist": event.track.artist,
        "album": event.track.album,
        "duration_ms": event.track.duration_ms,
        "progress_ms": 0,
        "art_url": event.track.art_url,
        "lyrics": None,
    }
    if event.status != PlaybackStatus.Stopped:
        try:
            payload["progress_ms"] = await get_position(instance)
        except Exception:
            logger.exception("Failed to get player position")
        if event.track.title and event.track.artist:
            try:
                lyrics = await search_lyrics(event.track.title, event.track.artist)
                if lyrics.raw_lrc:
                    payload["lyrics"] = lyrics.raw_lrc
            except Exception:
                logger.exception("Failed to fetch lyrics")
    return payload


async def monitor_and_broadcast(instance: str) -> None:
    global last_payload
    logger.info("Started playback monitor for %s", instance)
    try:
        async for event in monitor_player(instance):
            payload = await build_payload(event, instance)
            last_payload = payload
            await broadcast(payload)
    except Exception:
        logger.exception("Playback monitor crashed")


async def handle_command(
    ws: ServerConnection, data: dict[str, object], instance: str
) -> None:
    token = data.get("token", "")
    if not token or not verify_token(str(token)):
        await ws.send(json.dumps({"error": "Authentication failed"}))
        return

    action = str(data.get("action", ""))
    value = data.get("value")
    position = float(value) if isinstance(value, (int, float)) else 0.0

    command_map: dict[str, Awaitable[None]] = {
        "play": send_play(instance),
        "pause": send_pause(instance),
        "play_pause": send_play_pause(instance),
        "next": send_next(instance),
        "previous": send_previous(instance),
        "seek": send_seek(instance, position),
    }

    cmd = command_map.get(action)
    if cmd is not None:
        await cmd
    else:
        await ws.send(json.dumps({"error": f"Unknown action: {action}"}))


async def handler(websocket: ServerConnection) -> None:
    logger.info("New client connected")
    try:
        raw = await asyncio.wait_for(websocket.recv(), timeout=10)
    except TimeoutError:
        logger.warning("Handshake timeout — no token received")
        await websocket.close(4001, "Handshake timeout")
        return

    try:
        msg = json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("Invalid JSON during handshake")
        await websocket.close(4001, "Invalid JSON")
        return

    token = msg.get("token")
    if not token or not verify_token(token):
        logger.warning("Authentication failed — wrong token")
        await websocket.close(4001, "Authentication failed")
        return

    logger.info("Client authenticated successfully")
    clients.add(websocket)

    if last_payload:
        try:
            await websocket.send(json.dumps(last_payload))
        except ConnectionClosed:
            clients.discard(websocket)
            return

    try:
        async for message in websocket:
            try:
                data = json.loads(message)
            except json.JSONDecodeError:
                continue
            if "action" in data and player_instance is not None:
                await handle_command(websocket, data, player_instance)
    except ConnectionClosed:
        pass
    finally:
        clients.discard(websocket)
        logger.info("Client disconnected")


async def main() -> None:
    global player_instance
    logger.info("Starting MediaControl WebSocket server on %s:%s", HOST, PORT)
    logger.info("SECRET_TOKEN: %s", SECRET_TOKEN)

    player_instance = await find_player_instance()
    if player_instance:
        logger.info("Found player instance: %s", player_instance)
        asyncio.create_task(monitor_and_broadcast(player_instance))
    else:
        logger.warning("No player instance found")

    async with websockets.serve(handler, HOST, PORT):
        await asyncio.get_running_loop().create_future()


if __name__ == "__main__":
    asyncio.run(main())
