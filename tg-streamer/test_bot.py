# -*- coding: utf-8 -*-
"""
tg-streamer/test_bot.py
=======================
Standalone diagnostic script.  Loads credentials from tg-streamer/.env
(if present) or from existing environment variables, then runs several
live checks against the Telegram API and the target BIN_CHANNEL.

Checks performed
----------------
1. Load + validate credentials
2. Pyrogram client login  (get_me)
3. Webhook status via Bot HTTP API  (deleteWebhook if set)
4. BIN_CHANNEL write permission  (send + delete a probe message)
5. Clean client shutdown
"""

import asyncio
import os
import pathlib
import sys
import traceback

import requests  # stdlib fallback; install via pip install requests if missing

# ---------------------------------------------------------------------------
# 1. Load credentials from tg-streamer/.env then fall back to env vars
# ---------------------------------------------------------------------------

ENV_FILE = pathlib.Path(__file__).parent / ".env"

def _load_dotenv(path: pathlib.Path) -> None:
    """Minimal dotenv loader — no external library needed."""
    if not path.exists():
        print(f"[INFO] No .env found at {path} — relying on existing env vars.", flush=True)
        return
    print(f"[INFO] Loading credentials from {path}", flush=True)
    with open(path, encoding="utf-8") as fh:
        for raw_line in fh:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key, value)

_load_dotenv(ENV_FILE)

def _require(name: str) -> str:
    val = os.environ.get(name, "").strip()
    if not val:
        print(f"[FATAL] Missing required env var: {name}", flush=True)
        sys.exit(1)
    return val

API_ID     = int(_require("API_ID"))
API_HASH   = _require("API_HASH")
BOT_TOKEN  = _require("BOT_TOKEN")
_raw_bin = os.environ.get("BIN_CHANNEL", "").strip()
if _raw_bin.startswith("@"):
    BIN_CHANNEL = _raw_bin          # username string, e.g. "@flopshow_bin_bot"
elif _raw_bin.lstrip("-").isdigit():
    BIN_CHANNEL = int(_raw_bin)     # numeric channel ID, e.g. -1001234567890
else:
    BIN_CHANNEL = _raw_bin          # fallback: pass through as-is

print(f"\n{'='*60}", flush=True)
print(f"  Telegram Bot Diagnostic Test", flush=True)
print(f"{'='*60}", flush=True)
print(f"  API_ID      : {API_ID}", flush=True)
print(f"  API_HASH    : {API_HASH[:6]}{'*'*len(API_HASH[6:])}", flush=True)
print(f"  BOT_TOKEN   : {BOT_TOKEN[:10]}...", flush=True)
print(f"  BIN_CHANNEL : {BIN_CHANNEL}", flush=True)
print(f"{'='*60}\n", flush=True)

# ---------------------------------------------------------------------------
# 2. Webhook check + clear (pure HTTP — no Pyrogram needed for this)
# ---------------------------------------------------------------------------

def check_and_clear_webhook(token: str) -> None:
    print("[CHECK 1] Webhook status via Telegram Bot API ...", flush=True)
    try:
        resp = requests.get(
            f"https://api.telegram.org/bot{token}/getWebhookInfo",
            timeout=15,
        )
        data = resp.json()
        webhook_url: str = data.get("result", {}).get("url", "")
        pending: int     = data.get("result", {}).get("pending_update_count", 0)

        if webhook_url:
            print(f"  ⚠️  Active webhook detected: {webhook_url}", flush=True)
            print(f"  ⚠️  Pending updates blocked: {pending}", flush=True)
            print("  → Deleting webhook so Pyrogram long-polling can work ...", flush=True)
            del_resp = requests.get(
                f"https://api.telegram.org/bot{token}/deleteWebhook?drop_pending_updates=true",
                timeout=15,
            )
            del_data = del_resp.json()
            if del_data.get("result"):
                print("  ✅ Webhook deleted successfully.", flush=True)
            else:
                print(f"  ❌ Failed to delete webhook: {del_data}", flush=True)
        else:
            print(f"  ✅ No active webhook.  Pending updates in queue: {pending}", flush=True)

        # Print full webhook info for diagnostics
        result = data.get("result", {})
        if result:
            for k, v in result.items():
                if v not in ("", None, False, 0, []):
                    print(f"     {k}: {v}", flush=True)

    except Exception as exc:
        print(f"  ❌ Webhook check failed: {exc}", flush=True)
        traceback.print_exc()

check_and_clear_webhook(BOT_TOKEN)

# ---------------------------------------------------------------------------
# 3. Pyrogram async checks
# ---------------------------------------------------------------------------

# Bootstrap event loop before importing Pyrogram (needed on Python 3.14)
try:
    asyncio.get_running_loop()
except RuntimeError:
    _loop = asyncio.new_event_loop()
    asyncio.set_event_loop(_loop)

from pyrogram import Client  # noqa: E402


async def run_pyrogram_checks() -> None:
    session_name = "test_session_diag"
    bot = Client(
        name=session_name,
        api_id=API_ID,
        api_hash=API_HASH,
        bot_token=BOT_TOKEN,
    )

    # -- Start client --------------------------------------------------------
    print("\n[CHECK 2] Starting Pyrogram client ...", flush=True)
    try:
        await bot.start()
        print("  ✅ Pyrogram client started.", flush=True)
    except Exception as exc:
        print(f"  ❌ Failed to start Pyrogram client: {exc}", flush=True)
        traceback.print_exc()
        return

    # -- get_me --------------------------------------------------------------
    print("\n[CHECK 3] Fetching bot identity (get_me) ...", flush=True)
    try:
        me = await bot.get_me()
        print(f"  ✅ Bot username : @{me.username}", flush=True)
        print(f"     Bot ID       : {me.id}", flush=True)
        print(f"     Is bot       : {me.is_bot}", flush=True)
        print(f"     First name   : {me.first_name}", flush=True)
    except Exception as exc:
        print(f"  ❌ get_me failed: {exc}", flush=True)
        traceback.print_exc()

    # -- BIN_CHANNEL write/delete probe --------------------------------------
    print(f"\n[CHECK 4] Testing write permission to BIN_CHANNEL ({BIN_CHANNEL}) ...", flush=True)
    try:
        chat = await bot.get_chat(BIN_CHANNEL)
        print(f"   Chat resolved: {chat.title} ({chat.id})", flush=True)
        probe_msg = await bot.send_message(
            chat_id=chat.id,
            text="🔧 [Diagnostic] Connection probe message. Deleting immediately...",
        )
        await bot.delete_messages(chat_id=chat.id, message_ids=probe_msg.id)
        print("  ✅ send_message to BIN_CHANNEL succeeded and test message deleted.", flush=True)
    except Exception as e:
        print(f"  ❌ send_message to BIN_CHANNEL failed: {e}", flush=True)
        traceback.print_exc()

    # -- Stop client ---------------------------------------------------------
    print("\n[CLEANUP] Stopping Pyrogram client ...", flush=True)
    try:
        await bot.stop()
        print("  ✅ Client stopped cleanly.", flush=True)
    except Exception as exc:
        print(f"  ⚠️  Error during stop: {exc}", flush=True)

    # Clean up session file to avoid stale state
    session_file = pathlib.Path(f"{session_name}.session")
    if session_file.exists():
        session_file.unlink()
        print(f"  ✅ Removed session file: {session_file}", flush=True)

    print(f"\n{'='*60}", flush=True)
    print("  Diagnostic complete.", flush=True)
    print(f"{'='*60}\n", flush=True)


# Run
asyncio.run(run_pyrogram_checks())
