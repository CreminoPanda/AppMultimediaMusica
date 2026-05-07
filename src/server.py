import asyncio
import json
import logging
from collections.abc import Awaitable, Callable

import websockets
from websockets.asyncio.server import ServerConnection
from websockets.exceptions import ConnectionClosed

from src.auth import verify_token
from src.config import HOST, PORT, SECRET_TOKEN
from src.lrclib import search_lyrics
from src.player_backend import (
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

_PLAYER_POLL_INTERVAL = 10

clients: set[ServerConnection] = set()
player_instance: str | None = None
last_payload: dict[str, object] | None = None
monitor_task: asyncio.Task[None] | None = None


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
    while True:
        try:
            async for event in monitor_player(instance):
                payload = await build_payload(event, instance)
                last_payload = payload
                await broadcast(payload)
        except asyncio.CancelledError:
            raise
        except FileNotFoundError:
            logger.warning("playerctl not found, monitor stopped")
            return
        except Exception:
            logger.exception("Playback monitor crashed, restarting in 5s")
            await asyncio.sleep(5)


async def start_monitor(instance: str) -> None:
    global monitor_task, player_instance
    stop_monitor()
    player_instance = instance
    monitor_task = asyncio.create_task(monitor_and_broadcast(instance))


def stop_monitor() -> None:
    global monitor_task, player_instance
    if monitor_task is not None:
        monitor_task.cancel()
        monitor_task = None
    player_instance = None


async def _watch_player() -> None:
    global player_instance
    while True:
        try:
            await asyncio.sleep(_PLAYER_POLL_INTERVAL)
            instance = await find_player_instance()
            if instance and instance != player_instance:
                logger.info("Found new player instance: %s", instance)
                await start_monitor(instance)
            elif not instance and player_instance is not None:
                logger.info("Player instance lost, stopping monitor")
                stop_monitor()
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Player watcher error")


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

    command_map: dict[str, Callable[..., Awaitable[None]]] = {
        "play": send_play,
        "pause": send_pause,
        "play_pause": send_play_pause,
        "next": send_next,
        "previous": send_previous,
        "seek": send_seek,
    }

    cmd_fn = command_map.get(action)
    if cmd_fn is not None:
        if action == "seek":
            await cmd_fn(instance, position)
        else:
            await cmd_fn(instance)
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

    instance = await find_player_instance()
    if instance:
        logger.info("Found player instance: %s", instance)
        await start_monitor(instance)
    else:
        logger.warning("No player instance found, will poll periodically")

    watcher_task = asyncio.create_task(_watch_player())

    try:
        async with websockets.serve(handler, HOST, PORT):
            await asyncio.get_running_loop().create_future()
    finally:
        watcher_task.cancel()
        stop_monitor()


if __name__ == "__main__":
    asyncio.run(main())
