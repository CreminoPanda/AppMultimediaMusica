import asyncio
import json
import logging

import websockets
from websockets.asyncio.server import ServerConnection
from websockets.exceptions import ConnectionClosed

from src.auth import verify_token
from src.config import HOST, PORT, SECRET_TOKEN

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


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
    try:
        async for message in websocket:
            logger.debug("Received: %s", message)
    except ConnectionClosed:
        pass
    finally:
        logger.info("Client disconnected")


async def main() -> None:
    logger.info("Starting MediaControl WebSocket server on %s:%s", HOST, PORT)
    logger.info("SECRET_TOKEN: %s", SECRET_TOKEN)
    async with websockets.serve(handler, HOST, PORT):
        await asyncio.get_running_loop().create_future()


if __name__ == "__main__":
    asyncio.run(main())
