#!/usr/bin/env python3
"""
BadanePlus bot setup wizard.
1. Asks for the Telegram bot token (from @BotFather)
2. Validates it via getMe
3. Writes bot/config.json
4. Instructs how to start the service and claim admin.

Run on the server:  cd /var/www/badaneplus.com/bot && python3 setup.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import config  # noqa: E402


async def test_token(token: str):
    from aiogram import Bot
    bot = Bot(token)
    try:
        me = await bot.get_me()
        return True, me
    except Exception as e:
        return False, str(e)
    finally:
        await bot.session.close()


def main():
    print()
    print("=" * 52)
    print("  🤖  راه‌اندازی ربات مدیریت بدنه پلاس")
    print("=" * 52)
    print()
    cfg = config.load()

    if cfg.get("token"):
        print(f"✅ توکن موجود است (ربات فعلی). برای تغییر، توکن جدید بدهید.")
    print("۱) در تلگرام به @BotFather پیام بدهید")
    print("۲) /newbot بزنید و مراحل ساخت ربات را انجام دهید")
    print("۳) توکن (شبیه 123456:ABC-xxx) را کپی کنید")
    print()
    token = input("🔑 توکن ربات را اینجا بچسبانید: ").strip()
    if not token:
        print("❌ توکن خالی بود.")
        sys.exit(1)

    print("\n⏳ در حال بررسی توکن…")
    ok, info = asyncio.run(test_token(token))
    if not ok:
        print(f"❌ توکن معتبر نیست: {info}")
        sys.exit(1)

    print(f"✅ توکن معتبر است: @{info.username} («{info.full_name}»)")

    cfg["token"] = token
    if not cfg.get("admin_ids"):
        cfg["admin_ids"] = []
    config.save(cfg)
    print("\n💾 تنظیمات ذخیره شد (bot/config.json)")

    print()
    print("=" * 52)
    print("  🚀 راه‌اندازی نهایی")
    print("=" * 52)
    print()
    print("اگر سرویس فعال است:")
    print("   systemctl restart badaneplus-bot")
    print()
    print("اگر اولین بار است:")
    print("   systemctl enable --now badaneplus-bot")
    print()
    print("سپس در تلگرام ربات را باز کنید و /start بزنید.")
    print("👤 اولین نفری که /start بزند، مدیر ربات می‌شود.")
    print()
    print("مشاهده لاگ‌ها:  journalctl -u badaneplus-bot -f")
    print()


if __name__ == "__main__":
    main()
