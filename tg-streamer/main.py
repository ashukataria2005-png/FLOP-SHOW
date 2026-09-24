"""
Telegram File Streaming Bot
===========================
Runs a Pyrogram bot + FastAPI streaming server concurrently in one event loop.

Environment variables (see .env.example):
  API_ID, API_HASH, BOT_TOKEN, BIN_CHANNEL, FQDN, PORT, WEB_SERVER_BIND_ADDRESS
"""

# ---------------------------------------------------------------------------
# EVENT LOOP BOOTSTRAP — must run before importing pyrogram or any async lib.
# Python 3.14 raises RuntimeError("There is no current event loop in thread
# 'MainThread'") if asyncio.get_event_loop() is called with no loop set.
# ---------------------------------------------------------------------------
import asyncio  # noqa: E402 (first stdlib import must stay here)

try:
    asyncio.get_running_loop()
except RuntimeError:
    _loop = asyncio.new_event_loop()
    asyncio.set_event_loop(_loop)

import os
import traceback
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from pyrogram import Client, filters
from pyrogram.errors import FloodWait
from pyrogram.types import Message

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

API_ID: int = int(os.environ["API_ID"])
API_HASH: str = os.environ["API_HASH"]
BOT_TOKEN: str = os.environ["BOT_TOKEN"]
_raw_bin = os.environ.get("BIN_CHANNEL", "").strip()
if _raw_bin.startswith("@"):
    BIN_CHANNEL = _raw_bin          # username string, e.g. "@flopshow_bin_bot"
elif _raw_bin.lstrip("-").isdigit():
    BIN_CHANNEL = int(_raw_bin)     # numeric channel ID, e.g. -1001234567890
else:
    BIN_CHANNEL = _raw_bin          # fallback: pass through as-is
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
# FastAPI lifespan — manages Pyrogram startup/shutdown tied to Uvicorn's loop
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[STARTUP] Starting Telegram Pyrogram client...", flush=True)
    while True:
        try:
            await bot.start()
            print("[STARTUP] Telegram bot started and listening for updates.", flush=True)
            break
        except FloodWait as e:
            wait = e.value + 2
            print(f"[STARTUP] Telegram FloodWait encountered. Sleeping for {wait} seconds...", flush=True)
            await asyncio.sleep(wait)
        except Exception as e:
            print(f"[STARTUP ERROR] Failed to start bot: {type(e).__name__}: {e}", flush=True)
            raise e

    yield

    # Shutdown: Safely stop only if still connected
    print("[SHUTDOWN] Stopping Telegram Pyrogram client...", flush=True)
    try:
        if getattr(bot, "is_connected", False):
            await bot.stop()
            print("[SHUTDOWN] Pyrogram client stopped cleanly.", flush=True)
    except Exception as e:
        print(f"[SHUTDOWN WARNING] {e}", flush=True)


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="TG File Streamer", version="1.0.0", lifespan=lifespan)

# Ensure the lifespan is bound on the router level as well (belt-and-suspenders)
app.router.lifespan_context = lifespan

# Chunk size for range-based streaming: 1 MiB aligned to Pyrogram's chunk grid
CHUNK_SIZE = 1024 * 1024


def _get_media_info(msg: Message) -> dict:
    """Extract content-type, filename, and file size from a Pyrogram message."""
    media = msg.video or msg.document
    if not media:
        return {}

    mime_type: str = getattr(media, "mime_type", "video/mp4")
    file_name: str = getattr(media, "file_name", None) or f"file_{msg.id}"
    file_size: int = getattr(media, "file_size", 0)

    return {
        "mime_type": mime_type,
        "file_name": file_name,
        "file_size": file_size,
    }


async def _ranged_stream(
    msg: Message,
    start: int,
    end: int,
) -> AsyncGenerator[bytes, None]:
    """
    Yield bytes in the range [start, end] inclusive.

    Pyrogram's stream_media() works in fixed 1 MiB chunks internally.
    We align `offset` to the 1 MiB chunk that contains `start`, then
    trim leading bytes so the client receives exactly the requested range.
    """
    chunk_size = 1024 * 1024                      # 1 MiB — matches Pyrogram's grid
    offset     = start // chunk_size              # first chunk index to request
    first_chunk_cut = start % chunk_size          # bytes to discard from chunk[0]
    bytes_remaining = end - start + 1

    try:
        async for chunk in bot.stream_media(msg, limit=chunk_size, offset=offset):
            if first_chunk_cut:
                chunk = chunk[first_chunk_cut:]   # trim leading bytes on first chunk
                first_chunk_cut = 0

            if len(chunk) > bytes_remaining:
                yield chunk[:bytes_remaining]
                break

            yield chunk
            bytes_remaining -= len(chunk)
            if bytes_remaining <= 0:
                break

    except asyncio.CancelledError:
        # Client disconnected mid-stream — not an error, exit cleanly
        pass
    except Exception as exc:
        # Log but do not re-raise: prevents Starlette TaskGroup crash
        print(f"[STREAM] Aborted ({type(exc).__name__}): {exc}", flush=True)


@app.get("/stream/{message_id}", summary="Stream a Telegram media file")
async def stream_media(message_id: int, request: Request) -> StreamingResponse:
    """
    Streams the media for `message_id` from BIN_CHANNEL.
    Supports HTTP Range requests (206 Partial Content) for seekable playback
    in browsers, VLC, and other media players.
    """
    try:
        msg = await bot.get_messages(BIN_CHANNEL, message_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Telegram error: {exc}") from exc

    if not msg or not msg.media:
        raise HTTPException(status_code=404, detail="No media found for this ID")

    info      = _get_media_info(msg)
    mime_type = info.get("mime_type", "video/mp4")
    file_name = info.get("file_name", f"file_{message_id}")
    file_size = info.get("file_size", 0)

    # ── Parse Range header ───────────────────────────────────────────────────
    range_header: str | None = request.headers.get("range")
    start = 0
    end   = max(file_size - 1, 0)

    if range_header:
        try:
            # Format: "bytes=<start>-<end>"  (end is optional)
            range_val = range_header.strip().replace("bytes=", "")
            raw_start, _, raw_end = range_val.partition("-")
            start = int(raw_start) if raw_start else 0
            end   = int(raw_end)   if raw_end   else max(file_size - 1, 0)
            # Clamp to valid bounds
            start = max(0, min(start, file_size - 1))
            end   = max(start, min(end, file_size - 1))
        except ValueError:
            pass  # Malformed header — fall back to full-file response

    content_length = end - start + 1
    status_code    = 206 if range_header else 200

    headers = {
        "Content-Type":        mime_type,
        "Content-Disposition": f'inline; filename="{file_name}"',
        "Content-Length":      str(content_length),
        "Accept-Ranges":       "bytes",
        "Cache-Control":       "no-cache",
    }
    if range_header:
        headers["Content-Range"] = f"bytes {start}-{end}/{file_size}"

    return StreamingResponse(
        _ranged_stream(msg, start, end),
        status_code=status_code,
        headers=headers,
        media_type=mime_type,
    )


@app.api_route("/", methods=["GET", "HEAD"], summary="Health check")
async def root() -> dict:
    return {"status": "ok", "service": "Flopshow Streamer"}


# ---------------------------------------------------------------------------
# Telegram bot handlers
# ---------------------------------------------------------------------------

@bot.on_message(filters.command("start") & filters.private)
async def start_cmd(client: Client, message: Message) -> None:
    """Greet the user and confirm the bot is alive."""
    await message.reply_text(
        "👋 Hello! Bot is alive. Send me any video or document to get a stream link."
    )


@bot.on_message(filters.private & (filters.document | filters.video))
async def handle_media(client: Client, message: Message) -> None:
    """
    Receives a video or document in private chat, copies it to BIN_CHANNEL,
    then replies with a direct streaming URL.
    """
    try:
        print(f"[BOT] Received media from user {message.from_user.id}", flush=True)
        forwarded_msg: Message = await message.copy(chat_id=BIN_CHANNEL)
        stream_url = f"{FQDN}/stream/{forwarded_msg.id}"
        print(f"[BOT] Stored as message {forwarded_msg.id} → {stream_url}", flush=True)

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

    except Exception as e:  # noqa: BLE001
        print(f"[BOT ERROR] handle_media failed: {type(e).__name__}: {e}", flush=True)
        traceback.print_exc()
        await message.reply_text(f"❌ Error processing your file: {e}")


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    print(f"[STARTUP] Launching Uvicorn on 0.0.0.0:{port} ...", flush=True)
    # CRITICAL: Pass import string "main:app" + loop="asyncio" so Uvicorn
    # does NOT create a disconnected worker event loop — fixes the
    # RuntimeError: attached to a different loop on Python 3.14.
    uvicorn.run("main:app", host="0.0.0.0", port=port, loop="asyncio")
