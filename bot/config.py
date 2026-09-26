"""Bot configuration (bot/config.json)."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent   # /var/www/badaneplus.com
BOT_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BOT_DIR / "config.json"
DATA = ROOT / "data"

DEFAULTS = {
    "token": "",
    "admin_ids": [],
    "site_url": "https://badaneplus.com",
}


def load():
    cfg = dict(DEFAULTS)
    if CONFIG_PATH.exists():
        try:
            cfg.update(json.loads(CONFIG_PATH.read_text(encoding="utf-8")))
        except Exception:
            pass
    return cfg


def save(cfg):
    CONFIG_PATH.write_text(
        json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8"
    )
