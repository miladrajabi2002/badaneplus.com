"""Shared utilities: data IO (atomic), image pipeline (WebP), site rebuild, formatting."""
import asyncio
import base64
import io
import json
import os
import re
import subprocess
import sys
import tempfile
import uuid
from datetime import date
from pathlib import Path

from config import ROOT, DATA

ASSETS = ROOT / "assets"
IMG_PRODUCTS = ASSETS / "img" / "products"
IMG_BLOG = ASSETS / "img" / "blog"
MANIFEST_PATH = DATA / "image-manifest.json"

FA = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")


def fa(value) -> str:
    return str(value).translate(FA)


def price_fa(value) -> str:
    if not value:
        return "—"
    return fa(f"{int(value):,}".replace(",", "،"))


def jdate_fa(iso_str: str) -> str:
    import jdatetime
    try:
        g = jdatetime.date.fromgregorian(
            date=jdatetime.datetime.strptime(str(iso_str)[:10], "%Y-%m-%d").date()
        )
        months = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
                  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"]
        return f"{fa(g.day)} {months[g.month-1]} {fa(g.year)}"
    except Exception:
        return fa(iso_str)


# ---------------------------------------------------------------- data IO
def _read(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _write(path: Path, data):
    """Atomic write: temp file + rename."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp, path)
    except Exception:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


def load_products():
    return _read(DATA / "products.json", {"products": []})


def save_products(doc):
    _write(DATA / "products.json", doc)


def load_cars():
    return _read(DATA / "cars.json", {"categories": [], "cars": []})


def save_cars(doc):
    _write(DATA / "cars.json", doc)


def load_settings():
    return _read(DATA / "settings.json", {})


def save_settings(s):
    _write(DATA / "settings.json", s)


def load_posts():
    posts = []
    pdir = DATA / "posts"
    if pdir.exists():
        for f in sorted(pdir.glob("*.json")):
            try:
                posts.append(json.loads(f.read_text(encoding="utf-8")))
            except Exception:
                pass
    return posts


def load_post(slug):
    p = DATA / "posts" / f"{slug}.json"
    return _read(p, None)


def save_post(post):
    _write(DATA / "posts" / f"{post['slug']}.json", post)


def delete_post(slug):
    p = DATA / "posts" / f"{slug}.json"
    if p.exists():
        p.unlink()


def load_manifest():
    return _read(MANIFEST_PATH, {})


def save_manifest(m):
    _write(MANIFEST_PATH, m)


# ---------------------------------------------------------------- images
def save_product_image(image_bytes: bytes, key: str = None) -> dict:
    """Convert raw image bytes -> optimized WebP (full+card) + LQIP manifest entry."""
    from PIL import Image

    key = key or "b" + uuid.uuid4().hex[:10]
    img = Image.open(io.BytesIO(image_bytes))
    img = img.convert("RGB")
    w, h = img.size

    def resized(max_edge):
        ratio = min(max_edge / max(w, h), 1.0)
        return img.resize((round(w * ratio), round(h * ratio)), Image.LANCZOS)

    full = resized(1600)
    card = resized(900)
    lqip = img.resize((28, max(1, round(h * 28 / w))), Image.BOX)

    IMG_PRODUCTS.mkdir(parents=True, exist_ok=True)
    full_path = IMG_PRODUCTS / f"{key}-full.webp"
    card_path = IMG_PRODUCTS / f"{key}-card.webp"
    full.save(full_path, "WEBP", quality=82, method=6)
    card.save(card_path, "WEBP", quality=78, method=6)

    buf = io.BytesIO()
    lqip.save(buf, "WEBP", quality=35, method=6)
    lqip_b64 = "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()

    manifest = load_manifest()
    entry = {
        "full": f"assets/img/products/{full_path.name}",
        "card": f"assets/img/products/{card_path.name}",
        "w": full.width, "h": full.height,
        "lqip": lqip_b64,
    }
    manifest[key] = entry
    save_manifest(manifest)
    return {"key": key, **entry}


def delete_image(key: str):
    manifest = load_manifest()
    if key in manifest:
        for p in [ROOT / manifest[key]["full"], ROOT / manifest[key]["card"]]:
            try:
                p.unlink(missing_ok=True)
            except Exception:
                pass
        del manifest[key]
        save_manifest(manifest)


def save_hero_image(image_bytes: bytes) -> dict:
    """Replace hero image: center-crop to 3:4, save full (864×1152) + card (648×864)."""
    from PIL import Image

    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    w, h = img.size
    target = 3 / 4
    if w / h > target:                     # too wide -> crop width
        nw = round(h * target)
        x0 = (w - nw) // 2
        img = img.crop((x0, 0, x0 + nw, h))
    else:                                   # too tall -> crop height
        nh = round(w / target)
        y0 = (h - nh) // 2
        img = img.crop((0, y0, w, y0 + nh))

    site_dir = ASSETS / "img" / "site"
    site_dir.mkdir(parents=True, exist_ok=True)
    full = img.resize((864, 1152), Image.LANCZOS)
    card = img.resize((648, 864), Image.LANCZOS)
    full.save(site_dir / "hero-full.webp", "WEBP", quality=82, method=6)
    card.save(site_dir / "hero-card.webp", "WEBP", quality=78, method=6)
    return {"w": w, "h": h}


# ---------------------------------------------------------------- visit analytics
VISIT_LOGS = [
    Path("/var/log/nginx/badaneplus-visit.log"),
    Path("/var/log/nginx/badaneplus-visit.log.1"),
]
_BOT_UA = ("bot", "spider", "crawl", "headless", "curl", "wget", "python-requests", "facebookexternalhit")


def _tehran():
    from zoneinfo import ZoneInfo
    return ZoneInfo("Asia/Tehran")


def load_visits(dedupe_minutes: int = 30) -> list:
    """Parse nginx visit logs -> [{ts, ip, page}] (Tehran tz), bots filtered,
    (ip, page) deduped inside a sliding window.
    Log format: msec|remote_addr|status|page|x_forwarded_for|user_agent
    When traffic comes via CDN (ArvanCloud), the real client IP is the first
    entry of X-Forwarded-For."""
    raw = []
    for p in VISIT_LOGS:
        if not p.exists():
            continue
        try:
            lines = p.read_text(encoding="utf-8", errors="replace").splitlines()
        except Exception:
            continue
        for ln in lines:
            parts = ln.split("|", 5)
            if len(parts) < 6:
                # backward compat: old 5-column format (no XFF)
                parts = ln.split("|", 4)
                if len(parts) < 5:
                    continue
                parts = parts[:3] + [parts[3], "", parts[4]]
            try:
                ts = float(parts[0])
            except ValueError:
                continue
            status = parts[2]
            if status not in ("204", "200"):
                continue
            page = parts[3]
            xff = parts[4]
            ua = parts[5].lower()
            # real client ip: first hop of XFF, else direct remote_addr
            ip = (xff.split(",")[0].strip() if xff.strip() else "") or parts[1]
            if not page.startswith("/"):
                continue
            if any(b in ua for b in _BOT_UA):
                continue
            raw.append((ts, ip, page))
    raw.sort()
    # dedupe same ip+page within window
    out, last = [], {}
    window = dedupe_minutes * 60
    for ts, ip, page in raw:
        key = (ip, page)
        if key in last and ts - last[key] < window:
            continue
        last[key] = ts
        out.append({"ts": ts, "ip": ip, "page": page})
    return out


def visit_summary() -> dict:
    """Aggregate visits: daily (Tehran), monthly (Shamsi), top pages, per-post."""
    import datetime as _dt
    import jdatetime

    visits = load_visits()
    tz = _tehran()
    by_day, by_month, by_page, by_ip_today = {}, {}, {}, {}
    today_key = _dt.datetime.now(tz).date().isoformat()

    for v in visits:
        try:
            local = _dt.datetime.fromtimestamp(v["ts"], tz)
        except Exception:
            continue
        gdate = local.date()
        dkey = gdate.isoformat()
        by_day[dkey] = by_day.get(dkey, 0) + 1
        if dkey == today_key:
            by_ip_today[v["ip"]] = 1
        jd = jdatetime.date.fromgregorian(date=gdate)
        mkey = f"{jd.year:04d}-{jd.month:02d}"
        by_month[mkey] = by_month.get(mkey, 0) + 1
        by_page[v["page"]] = by_page.get(v["page"], 0) + 1

    # last 7 days (inclusive of today)
    days = []
    base = _dt.date.fromisoformat(today_key)
    for i in range(6, -1, -1):
        d = base - _dt.timedelta(days=i)
        days.append({"date": d.isoformat(), "count": by_day.get(d.isoformat(), 0)})
    return {
        "total": len(visits),
        "today": by_day.get(today_key, 0),
        "today_unique": len(by_ip_today),
        "yesterday": by_day.get((base - _dt.timedelta(days=1)).isoformat(), 0),
        "days": days,
        "by_month": by_month,
        "by_page": by_page,
        "has_data": bool(visits),
    }


def _now_ts() -> float:
    import time as _t
    return _t.time()


# ---------------------------------------------------------------- site build
async def rebuild_site() -> tuple:
    """Run the static site builder. Returns (ok, output)."""
    try:
        proc = await asyncio.create_subprocess_exec(
            sys.executable, str(ROOT / "src" / "build.py"),
            cwd=str(ROOT),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        out, _ = await asyncio.wait_for(proc.communicate(), timeout=180)
        text = out.decode("utf-8", errors="replace") if out else ""
        return proc.returncode == 0, text
    except asyncio.TimeoutError:
        return False, "timeout after 180s"
    except Exception as e:
        return False, str(e)


async def check_site(url: str) -> str:
    try:
        proc = await asyncio.create_subprocess_exec(
            "curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "-m", "10",
            url,
            stdout=asyncio.subprocess.PIPE,
        )
        out, _ = await asyncio.wait_for(proc.communicate(), timeout=15)
        code = out.decode().strip()
        return f"✅ سایت آنلاین (HTTP {code})" if code == "200" else f"⚠️ پاسخ سایت: {code}"
    except Exception:
        return "⚠️ بررسی سایت ناموفق"


# ---------------------------------------------------------------- helpers
def slugify(text: str) -> str:
    text = re.sub(r"[\s_]+", "-", (text or "").strip().lower())
    text = re.sub(r"[^a-z0-9\u0600-\u06FF-]", "", text)
    text = re.sub(r"-{2,}", "-", text).strip("-")
    return text or f"post-{date.today().strftime('%Y%m%d')}"


def word_count(post: dict) -> int:
    n = 0
    for b in post.get("blocks", []):
        t = b.get("type")
        if t in ("p", "h2", "h3", "tip", "cta"):
            n += len(str(b.get("text", "")).split())
        elif t == "list":
            n += sum(len(str(i).split()) for i in b.get("items", []))
        elif t == "table":
            n += sum(len(str(h).split()) for h in b.get("headers", []))
            for row in b.get("rows", []):
                n += sum(len(str(c).split()) for c in row)
    return n


def parse_price(text: str):
    """Parse price input. Returns (price:int|0, on_call:bool)."""
    t = (text or "").strip()
    if not t or t in ("تماس", "استعلام", "تماسی", "استعلامی", "-", "0", "۰"):
        return 0, True
    digits = re.sub(r"[^\d]", "", t.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")))
    return (int(digits) if digits else 0), False
