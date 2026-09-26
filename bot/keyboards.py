"""All inline keyboards for the BadanePlus management bot."""
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

import utils


def kb(*rows) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for row in rows:
        b.row(*row)
    return b.as_markup()


def btn(text, callback_data=None, url=None):
    kwargs = {"text": text}
    if callback_data:
        kwargs["callback_data"] = callback_data
    if url:
        kwargs["url"] = url
    return InlineKeyboardButton(**kwargs)


CLOSE = InlineKeyboardButton(text="🗑 بستن", callback_data="close")
BACK_MAIN = InlineKeyboardButton(text="◀️ منوی اصلی", callback_data="main")
BACK_PRODUCTS = InlineKeyboardButton(text="◀️ محصولات", callback_data="products")
BACK_SETTINGS = InlineKeyboardButton(text="◀️ تنظیمات", callback_data="settings")
BACK_POSTS = InlineKeyboardButton(text="◀️ وبلاگ", callback_data="posts")


# ---------------------------------------------------------------- main
def main_menu(product_count, post_count):
    return kb(
        [btn(f"📦 محصولات ({utils.fa(product_count)})", "products"),
         btn(f"📝 وبلاگ ({utils.fa(post_count)})", "posts")],
        [btn("⚙️ تنظیمات سایت", "settings"), btn("📊 آمار و وضعیت", "stats")],
        [CLOSE],
    )


# ---------------------------------------------------------------- products
def products_menu(total, visible):
    return kb(
        [btn("➕ افزودن محصول", "prod_add")],
        [btn("📋 لیست محصولات", f"prod_list:0")],
        [btn("🚗 مدیریت خودروها", "cars"), btn("🏷 دسته‌بندی‌ها", "cats")],
        [BACK_MAIN, CLOSE],
    )


def product_list(products, page, per_page=6):
    b = InlineKeyboardBuilder()
    start = page * per_page
    chunk = products[start:start + per_page]
    for p in chunk:
        vis = "🟢" if p.get("visible", True) else "⚪️"
        price = "📞" if p.get("price_on_call") else "💰"
        name = p["name"][:38]
        b.row(btn(f"{vis} {price} {name}", f"prod_view:{p['id']}"))
    pages = max(1, (len(products) + per_page - 1) // per_page)
    nav = []
    if page > 0:
        nav.append(btn("◀️ قبلی", f"prod_list:{page-1}"))
    nav.append(btn(f"{utils.fa(page+1)}/{utils.fa(pages)}", "noop"))
    if page < pages - 1:
        nav.append(btn("بعدی ▶️", f"prod_list:{page+1}"))
    b.row(*nav)
    b.row(btn("➕ افزودن محصول", "prod_add"))
    b.row(BACK_PRODUCTS, CLOSE)
    return b.as_markup()


def product_detail(p):
    car = p.get("_car_name", "")
    rows = [
        [btn("✏️ ویرایش", f"prod_edit:{p['id']}"),
         btn("🗑 حذف", f"prod_del:{p['id']}")],
    ]
    vis_txt = "🙈 مخفی کن" if p.get("visible", True) else "👁 نمایش بده"
    rows.append([btn(vis_txt, f"prod_toggle:{p['id']}")])
    if p.get("image"):
        rows.append([btn("📷 تعویض عکس", f"prod_photo:{p['id']}"),
                     btn("❌ حذف عکس", f"prod_delphoto:{p['id']}")])
    else:
        rows.append([btn("📷 افزودن عکس", f"prod_photo:{p['id']}")])
    rows.append([btn("⬆️", f"prod_up:{p['id']}"), btn("⬇️", f"prod_down:{p['id']}"),
                 btn(f"🔗 ترتیب: {utils.fa(p.get('order', 0))}", "noop")])
    rows.append([btn("◀️ لیست", "prod_list:0"), BACK_MAIN, CLOSE])
    return kb(*rows)


def product_edit_fields(p):
    return kb(
        [btn(f"📝 نام: {p['name'][:25]}", f"pf_name:{p['id']}")],
        [btn(f"🚗 خودرو: {p.get('_car_name','—')}", f"pf_car:{p['id']}")],
        [btn(f"🏷 دسته: {p.get('_cat_name','—')}", f"pf_cat:{p['id']}")],
        [btn(f"💰 قیمت: {utils.price_fa(p.get('price')) if not p.get('price_on_call') else 'استعلام تلفنی'}",
             f"pf_price:{p['id']}")],
        [btn(f"🎨 برچسب‌ها: {'، '.join(p.get('badges', [])) or '—'}", f"pf_badges:{p['id']}")],
        [btn(f"🖌 رنگ‌ها: {'، '.join(p.get('colors', [])) or '—'}", f"pf_colors:{p['id']}")],
        [btn(f"📄 توضیحات", f"pf_desc:{p['id']}")],
        [btn(f"📦 موجودی: {'موجود ✅' if p.get('in_stock', True) else 'ناموجود ⛔️'}", f"pf_stock:{p['id']}")],
        [btn("◀️ بازگشت به محصول", f"prod_view:{p['id']}")],
    )


def car_picker(callback_prefix, cars, include_none=False):
    rows = []
    row = []
    for c in cars:
        row.append(btn(c["name"], f"{callback_prefix}:{c['id']}"))
        if len(row) == 2:
            rows.append(row); row = []
    if row:
        rows.append(row)
    if include_none:
        rows.append([btn("⛔️ بدون خودرو", f"{callback_prefix}:none")])
    rows.append([btn("❌ لغو", "prod_cancel_add")])
    return kb(*rows)


def cat_picker(callback_prefix, cats):
    rows = []
    row = []
    for c in cats:
        row.append(btn(c["name"], f"{callback_prefix}:{c['id']}"))
        if len(row) == 2:
            rows.append(row); row = []
    if row:
        rows.append(row)
    rows.append([btn("❌ لغو", "prod_cancel_add")])
    return kb(*rows)


BADGE_OPTIONS = ["فابریک", "رنگ کوره‌ای", "اصل", "آماده رنگ", "تخفیف‌دار", "پرفروش"]


def badge_picker(selected, pid="new"):
    b = InlineKeyboardBuilder()
    for badge in BADGE_OPTIONS:
        mark = "✅ " if badge in selected else "▫️ "
        b.row(btn(mark + badge, f"badge:{pid}:{badge}"))
    b.row(btn("✅ ادامه", f"badges_done:{pid}"))
    b.row(btn("❌ لغو", "prod_cancel_add"))
    return b.as_markup()


def confirm_add(pid="new"):
    return kb(
        [btn("✅ ثبت محصول", f"prod_save:{pid}")],
        [{"text": "❌ لغو", "callback_data": "prod_cancel_add"}],
    )


def confirm_delete(pid):
    return kb(
        [btn("🗑 بله، حذف کن", f"prod_delconfirm:{pid}"),
         btn("❌ نه، پشیمون شدم", f"prod_view:{pid}")],
    )


def cancel_kb():
    return kb([btn("❌ لغو عملیات", "prod_cancel_add")])


def cars_menu(cars):
    b = InlineKeyboardBuilder()
    for c in cars:
        mark = "🟢" if c.get("active") else "⚪️"
        has = len(c.get("_products", [])) or ""
        b.row(btn(f"{mark} {c['name']} {('· ' + utils.fa(has) + ' قطعه') if has != '' else ''}",
                  f"car_view:{c['id']}"))
    b.row(btn("➕ افزودن خودرو", "car_add"))
    b.row(BACK_PRODUCTS, CLOSE)
    return b.as_markup()


def car_detail(car):
    return kb(
        [btn("✏️ تغییر نام", f"car_name:{car['id']}")],
        [btn("📝 ویرایش متن سئو", f"car_seo:{car['id']}")],
        [btn("👁 فعال/غیرفعال" if car.get("active") else "⚪️ فعال‌سازی", f"car_toggle:{car['id']}")],
        [btn("🗑 حذف خودرو", f"car_del:{car['id']}") if car["id"] not in ("206", "samand", "405", "pride")
         else btn("ℹ️ خودرو اصلی — حذف نمی‌شود", "noop")],
        [btn("◀️ خودروها", "cars"), BACK_MAIN, CLOSE],
    )


# ---------------------------------------------------------------- settings
def settings_menu():
    return kb(
        [btn("📞 شماره تماس", "set:phone"), btn("📱 موبایل", "set:mobile")],
        [btn("📍 آدرس", "set:address"), btn("🕐 ساعات کاری", "set:hours")],
        [btn("🗺 لینک‌های نقشه", "set:maps")],
        [btn("🖼 عکس هیرو (تصویر اصلی سایت)", "heroimg")],
        [btn("🌐 سئو و برند", "set:seo")],
        [BACK_MAIN, CLOSE],
    )


def settings_maps_menu():
    return kb(
        [btn("🗺 بلد", "set:map_balad")],
        [btn("🗺 نشان", "set:map_neshan")],
        [btn("🗺 گوگل‌مپ", "set:map_google")],
        [btn("📍 مختصات جغرافیایی", "set:geo")],
        [BACK_SETTINGS, CLOSE],
    )


def settings_seo_menu():
    return kb(
        [btn("🏷 نام برند", "set:brand")],
        [btn("🎯 پیشنهادهای عنوان هیرو", "heropresets")],
        [btn("✨ متن هیرو (دستی)", "set:hero")],
        [btn("📄 زیرعنوان هیرو", "set:herosub")],
        [BACK_SETTINGS, CLOSE],
    )


def hero_presets_menu(presets):
    rows = [[btn(f"{i + 1}. {t1} {t2}", f"heropreset:{i}")] for i, (t1, t2) in enumerate(presets)]
    return kb(*rows, [btn("✨ نوشتن دستی", "set:hero"), BACK_SETTINGS, CLOSE])


def back_to(section):
    key = {"settings": BACK_SETTINGS, "posts": BACK_POSTS, "products": BACK_PRODUCTS}.get(section, BACK_MAIN)
    return kb([key, CLOSE])


# ---------------------------------------------------------------- posts
def posts_menu(count):
    return kb(
        [btn("📋 لیست پست‌ها", "posts_list:0")],
        [btn("➕ افزودن پست", "post_add")],
        [BACK_MAIN, CLOSE],
    )


def posts_list(posts, page, per_page=5):
    b = InlineKeyboardBuilder()
    start = page * per_page
    for p in posts[start:start + per_page]:
        mark = "🟢" if p.get("visible", True) else "⚪️"
        b.row(btn(f"{mark} {p['title'][:40]}", f"post_view:{p['slug']}"))
    pages = max(1, (len(posts) + per_page - 1) // per_page)
    nav = []
    if page > 0:
        nav.append(btn("◀️ قبلی", f"posts_list:{page-1}"))
    nav.append(btn(f"{utils.fa(page+1)}/{utils.fa(pages)}", "noop"))
    if page < pages - 1:
        nav.append(btn("بعدی ▶️", f"posts_list:{page+1}"))
    b.row(*nav)
    b.row(BACK_POSTS, CLOSE)
    return b.as_markup()


def post_detail(p):
    return kb(
        [btn("👁 نمایش/مخفی در سایت", f"post_toggle:{p['slug']}")],
        [btn("✏️ تغییر عنوان", f"post_title:{p['slug']}")],
        [btn("🔗 تغییر اسلاگ", f"post_slug:{p['slug']}")],
        [btn("🗑 حذف پست", f"post_del:{p['slug']}")],
        [btn("◀️ لیست پست‌ها", "posts_list:0"), CLOSE],
    )


def post_confirm_delete(slug):
    return kb(
        [btn("🗑 بله، حذف کن", f"post_delconfirm:{slug}"),
         btn("❌ نه", f"post_view:{slug}")],
    )


# ---------------------------------------------------------------- stats
def stats_menu():
    return kb(
        [btn("📈 بازدید سایت (روزانه/ماهانه)", "visitstats")],
        [btn("📝 بازدید مقاله‌ها", "postviews")],
        [btn("🔄 بازسازی دستی سایت", "rebuild")],
        [BACK_MAIN, CLOSE],
    )
