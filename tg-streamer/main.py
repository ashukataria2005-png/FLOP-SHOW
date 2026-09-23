"""
Telegram File Streaming Bot
===========================
Runs a Pyrogram bot + FastAPI streaming server concurrently in one event loop.

Environment variables (see .env.example):
  API_ID, API_HASH, BOT_TOKEN, BIN_CHANNEL, FQDN, PORT, WEB_SERVER_BIND_ADDRESS
"""

import asyncio
import os
from typing import AsyncGenerator

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from pyrogram import Client, filters
from pyrogram.types import Message

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

API_ID: int = int(os.environ["API_ID"])
API_HASH: str = os.environ["API_HASH"]
BOT_TOKEN: str = os.environ["BOT_TOKEN"]
BIN_CHANNEL: int = int(os.environ["BIN_CHANNEL"])
FQDN: str = os.environ["FQDN"].rstrip("/")
PORT: int = int(os.environ.get("PORT", 8080))
BIND_ADDRESS: str = os.environ.get("WEB_SERVER_BIND_ADDRESS", "0.0.0.0")

# ---------------------------------------------------------------------------
# Pyrogram client
# ---------------------------------------------------------------------------

bot = Client(
    name="tg_file_streamer",
    api_id=API_ID,
    api_hash=API_HASH,
    bot_token=BOT_TOKEN,
)

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="TG File Streamer", version="1.0.0")

# Default chunk size for streaming (512 KiB)
CHUNK_SIZE = 512 * 1024


async def _media_stream(message_id: int) -> AsyncGenerator[bytes, None]:
    """Async generator that yields raw media bytes from a Telegram message."""
    msg = await bot.get_messages(BIN_CHANNEL, message_id)
    if not msg or not msg.media:
        raise HTTPException(status_code=404, detail="Media not found")

    async for chunk in bot.stream_media(msg, limit=CHUNK_SIZE):
        yield chunk


def _get_media_info(msg: Message) -> dict:
    """Extract content-type, filename, and file size from a Pyrogram message."""
    media = msg.video or msg.document
    if not media:
        return {}

    mime_type: str = getattr(media, "mime_type", "application/octet-stream")
    file_name: str = getattr(media, "file_name", None) or f"file_{msg.id}"
    file_size: int = getattr(media, "file_size", 0)

    return {
        "mime_type": mime_type,
        "file_name": file_name,
        "file_size": file_size,
    }


@app.get("/stream/{message_id}", summary="Stream a Telegram media file")
async def stream_media(message_id: int, request: Request) -> StreamingResponse:
    """
    Streams the media associated with `message_id` from the BIN_CHANNEL.
    Supports inline playback via proper Content-Disposition header.
    """
    try:
        msg = await bot.get_messages(BIN_CHANNEL, message_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Telegram error: {exc}") from exc

    if not msg or not msg.media:
        raise HTTPException(status_code=404, detail="No media found for this ID")

    info = _get_media_info(msg)
    mime_type = info.get("mime_type", "application/octet-stream")
    file_name = info.get("file_name", f"file_{message_id}")
    file_size = info.get("file_size", 0)

    headers = {
        "Content-Type": mime_type,
        "Content-Disposition": f'inline; filename="{file_name}"',
        "Content-Length": str(file_size),
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache",
    }

    return StreamingResponse(
        _media_stream(message_id),
        status_code=200,
        headers=headers,
        media_type=mime_type,
    )


@app.get("/", summary="Health check")
async def health_check() -> dict:
    return {"status": "ok", "service": "TG File Streamer"}


# ---------------------------------------------------------------------------
# Telegram bot handlers
# ---------------------------------------------------------------------------

@bot.on_message(filters.private & (filters.video | filters.document))
async def handle_media(client: Client, message: Message) -> None:
    """
    Receives a video or document in private chat, copies it to BIN_CHANNEL,
    then replies with a streaming URL and file metadata.
    """
    # Forward/copy to the bin channel
    copied: Message = await message.copy(chat_id=BIN_CHANNEL)

    stream_url = f"{FQDN}/stream/{copied.id}"

    # Gather metadata for the reply
    media = message.video or message.document
    file_name: str = getattr(media, "file_name", "Unknown") or "Unknown"
    file_size: int = getattr(media, "file_size", 0)
    mime_type: str = getattr(media, "mime_type", "Unknown")
    size_mb: str = f"{file_size / (1024 * 1024):.2f} MB" if file_size else "Unknown"

    reply_text = (
        f"✅ **File Stored & Ready to Stream**\n\n"
        f"📄 **Name:** `{file_name}`\n"
        f"📦 **Size:** `{size_mb}`\n"
        f"🎞 **Type:** `{mime_type}`\n\n"
        f"🔗 **Streaming URL:**\n{stream_url}"
    )

    await message.reply_text(reply_text, quote=True)


# ---------------------------------------------------------------------------
# Entrypoint — run bot + web server concurrently in one event loop
# ---------------------------------------------------------------------------

async def main() -> None:
    """Start Pyrogram client and Uvicorn server in the same event loop."""
    # Configure Uvicorn without its own event-loop management
    config = uvicorn.Config(
        app=app,
        host=BIND_ADDRESS,
        port=PORT,
        loop="none",           # we supply the loop ourselves
        log_level="info",
    )
    server = uvicorn.Server(config)

    await asyncio.gather(
        bot.start(),
        server.serve(),
    )


if __name__ == "__main__":
    asyncio.run(main())
