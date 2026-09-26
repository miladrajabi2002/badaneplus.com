#!/usr/bin/env python3
"""BadanePlus static site builder.
Reads data/ + templates/ + static assets and generates the full static site into site/.
The Telegram bot calls this script after every data change.
"""
import json
import re
import shutil
from pathlib import Path

import jdatetime
from jinja2 import Environment, FileSystemLoader
from markupsafe import Markup, escape

ROOT = Path(__file__).resolve().parent.parent          # project root
DATA = ROOT / "data"
TEMPLATES = ROOT / "templates"
STATIC = ROOT / "assets"
OUT = ROOT / "site"

# ---------------------------------------------------------------- helpers
FA_DIGITS = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")


def fa_num(value):
    return str(value).translate(FA_DIGITS)


def price_fmt(value):
    if not value:
        return ""
    s = f"{int(value):,}".replace(",", "،")
    return fa_num(s)


def jdate(iso_str):
    try:
        g = jdatetime.date.fromgregorian(date=jdatetime.datetime.strptime(iso_str[:10], "%Y-%m-%d").date())
    except Exception:
        return fa_num(iso_str[:10])
    months = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
              "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"]
    return f"{fa_num(g.day)} {months[g.month - 1]} {fa_num(g.year)}"


def build_link_map(cars):
    m = {}
    for car in cars:
        m[car["name"]] = f"/{car['slug']}/"
    m["لوازم بدنه ۲۰۶"] = "/peugeot-206/"
    m["لوازم بدنه سمند"] = "/samand/"
    m["لوازم بدنه پراید"] = "/pride/"
    m["لوازم بدنه ۴۰۵"] = "/peugeot-405-pars/"
    return m


def make_linkifier(link_map):
    post_links = {
        "رنگ کوره‌ای چیست": "/blog/kiln-paint-guide/",
        "تفاوت رنگ کوره‌ای": "/blog/kiln-paint-guide/",
        "تشخیص قطعه فابریک": "/blog/original-vs-aftermarket-parts/",
        "سینی فن چیست": "/blog/radiator-support-guide/",
        "نگهداری رنگ خودرو": "/blog/car-paint-care-tips/",
        "ضمانت ۵ ساله رنگ": "/blog/paint-warranty-meaning/",
        "ارسال لوازم بدنه": "/blog/nationwide-shipping-guide/",
    }
    full_map = {**link_map, **post_links}

    def linkify(text):
        out = str(text)
        used = set()
        for phrase, href in sorted(full_map.items(), key=lambda kv: -len(kv[0])):
            if phrase in out and phrase not in used and len(phrase) > 6:
                out = out.replace(phrase, f'<a href="{href}">{phrase}</a>', 1)
                used.add(phrase)
        return out

    return linkify


def env_factory(linkify):
    def filter_linkify(text):
        return Markup(linkify(str(text)))

    e = Environment(
        loader=FileSystemLoader(str(TEMPLATES)),
        autoescape=True,
        trim_blocks=True,
        lstrip_blocks=True,
        extensions=["jinja2.ext.do"],
    )
    e.filters["fa_num"] = fa_num
    e.filters["price_fmt"] = price_fmt
    e.filters["jdate"] = jdate
    e.filters["linkify"] = filter_linkify
    return e


# ---------------------------------------------------------------- data
def load_data():
    settings = json.loads((DATA / "settings.json").read_text(encoding="utf-8"))
    cars_data = json.loads((DATA / "cars.json").read_text(encoding="utf-8"))
    products_doc = json.loads((DATA / "products.json").read_text(encoding="utf-8"))
    manifest = json.loads((DATA / "image-manifest.json").read_text(encoding="utf-8"))

    posts = []
    for f in sorted((DATA / "posts").glob("*.json")):
        posts.append(json.loads(f.read_text(encoding="utf-8")))
    posts.sort(key=lambda p: p["date"], reverse=True)

    cars = [c for c in cars_data["cars"] if c.get("active")]
    categories = cars_data["categories"]

    car_by_id = {c["id"]: c for c in cars}
    cat_by_id = {c["id"]: c for c in categories}
    for p in products_doc["products"]:
        p["_car"] = car_by_id.get(p.get("car"), {})
        p["_cat"] = cat_by_id.get(p.get("category"), {})
        p["_img"] = manifest.get(p.get("image", ""), None)

    for c in cars:
        c["_products"] = [p for p in products_doc["products"]
                          if p.get("car") == c["id"] and p.get("visible", True)]
        c["_products"].sort(key=lambda p: p.get("order", 999))

    return settings, cars, categories, products_doc["products"], posts, manifest


# ---------------------------------------------------------------- json-ld
def localbusiness_schema(s):
    c = s["contact"]
    return {
        "@context": "https://schema.org",
        "@type": "AutoPartsStore",
        "@id": f"{s['site']['url']}/#store",
        "name": f"{s['site']['brand_fa']} | {s['site']['brand_en']}",
        "alternateName": s["site"]["brand_en"],
        "description": s["site"]["description"],
        "url": s["site"]["url"],
        "telephone": c["phone"],
        "priceRange": "$$",
        "image": f"{s['site']['url']}/assets/img/og-image.webp",
        "logo": f"{s['site']['url']}/assets/img/logo.svg",
        "address": {
            "@type": "PostalAddress",
            "streetAddress": c["address"],
            "addressLocality": c.get("city", "تهران"),
            "addressCountry": "IR",
        },
        "geo": {"@type": "GeoCoordinates", "latitude": c["geo_lat"], "longitude": c["geo_lng"]},
        "openingHours": c["hours_schema"],
        "areaServed": {"@type": "Country", "name": "Iran"},
    }


def product_schema(p, url):
    offer = {
        "@type": "Offer",
        "availability": "https://schema.org/InStock" if p.get("in_stock", True) else "https://schema.org/OutOfStock",
        "priceCurrency": "IRR",
        "url": url,
    }
    if p.get("price") and not p.get("price_on_call"):
        offer["price"] = p["price"] * 10  # toman -> rial
    return {
        "@type": "Product",
        "name": p["name"],
        "description": p.get("description", ""),
        "category": f"لوازم بدنه {p['_car'].get('name', '')}",
        "brand": {"@type": "Brand", "name": "بدنه پلاس"},
        "offers": offer,
    }


def faq_schema(faq_list):
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": q["q"],
             "acceptedAnswer": {"@type": "Answer", "text": q["a"]}}
            for q in faq_list
        ],
    }


# ---------------------------------------------------------------- build
def build():
    settings, cars, categories, products, posts, manifest = load_data()
    link_map = build_link_map(cars)
    linkify = make_linkifier(link_map)
    env = env_factory(linkify)

    s = settings
    base_url = s["site"]["url"]
    visible_products = [p for p in products if p.get("visible", True)]

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    shutil.copytree(STATIC, OUT / "assets", ignore=shutil.ignore_patterns("*.raw", "*.HEIC"))
    # PWA files must live at site root
    shutil.copy(STATIC / "manifest.webmanifest", OUT / "manifest.webmanifest")
    shutil.copy(STATIC / "sw.js", OUT / "sw.js")
    (OUT / "assets" / "manifest.webmanifest").unlink(missing_ok=True)
    (OUT / "assets" / "sw.js").unlink(missing_ok=True)

    ctx = {
        "s": s,
        "c": s["contact"],
        "cars": cars,
        "categories": categories,
        "all_products": visible_products,
        "posts": posts,
        "manifest": manifest,
        "base_url": base_url,
        "lb_schema": json.dumps(localbusiness_schema(s), ensure_ascii=False),
    }

    def render(template, out_path, extra=None):
        c = dict(ctx)
        if extra:
            c.update(extra)
        html = env.get_template(template).render(**c)
        path = OUT / out_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(html, encoding="utf-8")
        print(f"  + {out_path}")

    print("Building pages:")
    faq_main = [
        {"q": "لوازم بدنه پلاس برای چه خودروهایی قطعه دارد؟",
         "a": "تمرکز ما روی خودروهای ایرانی است: پژو ۲۰۶، سمند و سورن، پژو ۴۰۵ و پارس، پراید و تیبا. برای خودروهایی مثل دنا، رانا و شاهین هم با تماس قبلی قطعه تأمین می‌کنیم."},
        {"q": "چرا سفارش فقط تلفنی است؟",
         "a": "قیمت قطعات بدنه با نوسان بازار تغییر می‌کند و موجودی روزانه به‌روز می‌شود. با تماس تلفنی، قیمت روز، موجودی دقیق و مشاوره فنی رایگان در همان تماس به شما اعلام می‌شود تا مطمئن‌ترین خرید را داشته باشید."},
        {"q": "رنگ کوره‌ای شرکتی چه تفاوتی با رنگ معمولی دارد؟",
         "a": "رنگ کوره‌ای در دمای کنترل‌شده و کوره پخت می‌شود؛ چسبندگی آن به فلز چند برابر رنگ اسپری معمولی است و در برابر آفتاب، شست‌وشو و رطوبت سال‌ها بدون برفک و ترک باقی می‌ماند. به همین دلیل می‌توانیم ۵ سال ضمانت رنگ بدهیم."},
        {"q": "ضمانت ۵ ساله رنگ دقیقا شامل چه چیزی می‌شود؟",
         "a": "ضمانت ۵ ساله شامل برفک‌زدگی، تغییر رنگ، ترک خوردن و جوش‌زدگی سطح رنگ است و روی فاکتور خرید درج می‌شود."},
        {"q": "آیا ارسال به شهرستان دارید؟",
         "a": "بله؛ تمام قطعات با بسته‌بندی حرفه‌ای و پوشش محافظ به همه استان‌های کشور ارسال می‌شوند. کاپوت، سپر و گلگیر با بسته‌بندی مخصوص ارسال می‌شوند تا سالم به دست شما برسند."},
        {"q": "قطعه فابریک و رنگ کوره‌ای چه تفاوتی دارند؟",
         "a": "قطعه فابریک با پرس و قالب اصلی کارخانه تولید می‌شود و معمولا با رنگ اولیه عرضه می‌شود. گزینه رنگ کوره‌ای یعنی قطعه باکیفیت که با رنگ شرکتی و پخت کوره‌ای آماده نصب روی خودروی شما شده است. هر دو گزینه در بدنه پلاس با ۵ سال ضمانت رنگ عرضه می‌شوند."},
    ]
    render("index.html", "index.html", {
        "page_title": "بدنه پلاس | لوازم بدنه خودروهای ایرانی — رنگ کوره‌ای + ۵ سال ضمانت رنگ",
        "page_desc": s["site"]["description"],
        "canonical": f"{base_url}/",
        "faq_main": faq_main,
        "faq_schema": json.dumps(faq_schema(faq_main), ensure_ascii=False),
        "products_schema": json.dumps({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "itemListElement": [
                {"@type": "ListItem", "position": i + 1,
                 "item": product_schema(p, base_url + "/")}
                for i, p in enumerate(visible_products)
            ],
        }, ensure_ascii=False),
    })

    for car in cars:
        if not car.get("_products"):
            continue
        slug = car["slug"]
        render("car.html", f"{slug}/index.html", {
            "page_title": car["seo_title"],
            "page_desc": car["meta_description"],
            "canonical": f"{base_url}/{slug}/",
            "car": car,
            "car_products": car["_products"],
            "faq_schema": json.dumps(faq_schema(car["faq"]), ensure_ascii=False),
            "products_schema": json.dumps({
                "@context": "https://schema.org",
                "@type": "ItemList",
                "itemListElement": [
                    {"@type": "ListItem", "position": i + 1,
                     "item": product_schema(p, f"{base_url}/{slug}/")}
                    for i, p in enumerate(car["_products"])
                ],
            }, ensure_ascii=False),
            "breadcrumb_schema": json.dumps({
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "خانه", "item": base_url + "/"},
                    {"@type": "ListItem", "position": 2, "name": car["name"], "item": f"{base_url}/{slug}/"},
                ],
            }, ensure_ascii=False),
        })

    render("blog-index.html", "blog/index.html", {
        "page_title": "وبلاگ بدنه پلاس | راهنمای خرید لوازم بدنه و دانش خودرو",
        "page_desc": "مقالات تخصصی لوازم بدنه خودروهای ایرانی؛ راهنمای خرید کاپوت، سپر، گلگیر و سینی فن، تفاوت رنگ کوره‌ای و نکات نگهداری رنگ خودرو.",
        "canonical": f"{base_url}/blog/",
    })
    for post in posts:
        slug = post["slug"]
        img_dir = "blog" if post["image"].startswith("b-") else "products"
        img_name = post["image"]
        render("post.html", f"blog/{slug}/index.html", {
            "page_title": post["title"],
            "page_desc": post["meta_description"],
            "canonical": f"{base_url}/blog/{slug}/",
            "post": post,
            "related": [p for p in posts if p["slug"] != slug][:3],
            "post_schema": json.dumps({
                "@context": "https://schema.org",
                "@type": "BlogPosting",
                "headline": post["title"],
                "description": post["meta_description"],
                "datePublished": post["date"],
                "dateModified": post["date"],
                "inLanguage": "fa-IR",
                "image": f"{base_url}/assets/img/{img_dir}/{img_name}-card.webp",
                "author": {"@type": "Organization", "name": "بدنه پلاس", "url": base_url},
                "publisher": {"@type": "Organization", "name": "بدنه پلاس", "url": base_url},
                "mainEntityOfPage": f"{base_url}/blog/{slug}/",
            }, ensure_ascii=False),
            "breadcrumb_schema": json.dumps({
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "خانه", "item": base_url + "/"},
                    {"@type": "ListItem", "position": 2, "name": "وبلاگ", "item": base_url + "/blog/"},
                    {"@type": "ListItem", "position": 3, "name": post["title"], "item": f"{base_url}/blog/{slug}/"},
                ],
            }, ensure_ascii=False),
        })

    render("404.html", "404.html", {
        "page_title": "صفحه پیدا نشد | بدنه پلاس",
        "page_desc": "صفحه مورد نظر پیدا نشد.",
        "canonical": f"{base_url}/404.html",
    })

    urls = [f"{base_url}/", f"{base_url}/blog/"]
    urls += [f"{base_url}/{c['slug']}/" for c in cars if c.get("_products")]
    urls += [f"{base_url}/blog/{p['slug']}/" for p in posts]
    from datetime import date as _date
    today = _date.today().isoformat()
    sitemap = ['<?xml version="1.0" encoding="UTF-8"?>',
               '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        sitemap.append(f"<url><loc>{u}</loc><lastmod>{today}</lastmod>"
                       f"<changefreq>weekly</changefreq><priority>0.8</priority></url>")
    sitemap.append("</urlset>")
    (OUT / "sitemap.xml").write_text("\n".join(sitemap), encoding="utf-8")
    print("  + sitemap.xml")

    (OUT / "robots.txt").write_text(
        f"User-agent: *\nAllow: /\n\nSitemap: {base_url}/sitemap.xml\n", encoding="utf-8")
    print("  + robots.txt")

    # ---------- icons (pre-rendered, no server deps) ----------
    icons_src = STATIC / "img" / "icons"
    if icons_src.exists():
        for name in ["favicon-48.png", "apple-touch-icon.png", "icon-192.png", "icon-512.png"]:
            src = icons_src / name
            if src.exists():
                shutil.copy(src, OUT / name)
        shutil.copy(STATIC / "img" / "logo.svg", OUT / "favicon.svg")
        print("  + icons")
    else:
        print("  ! icons dir missing")

    print("\nBuild complete:", len(list(OUT.rglob("*.html"))), "HTML files")


if __name__ == "__main__":
    build()
