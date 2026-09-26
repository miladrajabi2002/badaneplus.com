#!/usr/bin/env python3
"""
BadanePlus Telegram Management Bot
_full site management with inline (glass) keyboards:
products CRUD, cars, categories, settings, blog posts, stats, auto site rebuild.
Run: python3 bot.py   (or systemd service badaneplus-bot)
"""
import asyncio
import io
import logging
import sys
import uuid
from datetime import date
from pathlib import Path

from aiogram import Bot, Dispatcher, F, Router
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import (
    CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message,
)

sys.path.insert(0, str(Path(__file__).resolve().parent))
import config  # noqa: E402
import keyboards as k  # noqa: E402
import utils  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("badaneplus")

router = Router()
CFG = config.load()
ADMIN_IDS = set(CFG.get("admin_ids") or [])

TEXTS = {
    "welcome": (
        "🏠 <b>پنل مدیریت بدنه پلاس</b>\n\n"
        "به مرکز کنترل سایت خوش آمدید.\n"
        "هر تغییری اینجا ثبت کنید، سایت به‌صورت خودکار بازسازی می‌شود. ⚡️"
    ),
    "unauthorized": (
        "⛔️ <b>دسترسی ندارید</b>\n\n"
        "این ربات فقط برای مدیران بدنه پلاس است.\n"
        f"شناسه چت شما: <code>%s</code>\n"
        "برای دریافت دسترسی، این شناسه را به مدیر سایت بدهید."
    ),
    "claimed": (
        "🎉 <b>خوش آمدید مدیر!</b>\n\n"
        "شما به‌عنوان مدیر اول این ربات ثبت شدید.\n"
        "برای افزودن مدیرهای دیگر، شناسه او را در فایل config.json اضافه کنید."
    ),
    "closed": "پنجره بسته شد. 🗑",
}


# ================================================================ guards
def is_admin(uid: int) -> bool:
    return uid in ADMIN_IDS


async def guard(event) -> bool:
    """Returns True & continues if event.from_user is admin."""
    uid = event.from_user.id
    if not ADMIN_IDS:
        # first user claims admin on fresh install
        ADMIN_IDS.add(uid)
        CFG["admin_ids"] = sorted(ADMIN_IDS)
        config.save(CFG)
        log.warning("ADMIN CLAIMED by %s (%s)", uid, event.from_user.full_name)
        if isinstance(event, Message):
            await event.answer(TEXTS["claimed"])
        else:
            await event.answer("🎉 شما مدیر این ربات شدید.", show_alert=True)
        return True
    return uid in ADMIN_IDS


# ================================================================ helpers
def get_products_sorted():
    doc = utils.load_products()
    cars = utils.load_cars()
    car_by_id = {c["id"]: c for c in cars["cars"]}
    prods = doc.get("products", [])
    for p in prods:
        p["_car_name"] = car_by_id.get(p.get("car"), {}).get("name", "—")
        p["_cat_name"] = next((c["name"] for c in cars["categories"] if c["id"] == p.get("category")), "—")
    prods.sort(key=lambda p: p.get("order", 999))
    return doc, prods


def product_card_text(p):
    price = "📞 استعلام تلفنی" if p.get("price_on_call") else f"💰 {utils.price_fa(p.get('price'))} تومان"
    badges = "، ".join(p.get("badges", [])) or "—"
    colors = "، ".join(p.get("colors", [])) or "—"
    vis = "🟢 نمایش در سایت" if p.get("visible", True) else "⚪️ مخفی"
    stock = "✅ موجود" if p.get("in_stock", True) else "⛔️ ناموجود"
    img = "📷 دارد" if p.get("image") else "—"
    return (
        f"📦 <b>{p['name']}</b>\n\n"
        f"🚗 خودرو: {p['_car_name']}\n"
        f"🏷 دسته: {p['_cat_name']}\n"
        f"{price}\n"
        f"🎨 برچسب‌ها: {badges}\n"
        f"🖌 رنگ‌ها: {colors}\n"
        f"📷 عکس: {img}\n"
        f"📦 موجودی: {stock}\n"
        f"👁 وضعیت: {vis}\n"
        f"📅 ثبت: {utils.jdate_fa(p.get('created_at', ''))}"
    )


async def edit_or_answer(cb: CallbackQuery, text: str, reply_markup=None):
    """Glass navigation: always edit the message instead of sending new ones."""
    try:
        await cb.message.edit_text(text, reply_markup=reply_markup, parse_mode="HTML")
    except Exception:
        # message too old / not modified — send fresh
        try:
            await cb.message.answer(text, reply_markup=reply_markup, parse_mode="HTML")
        except Exception:
            pass


async def rebuild_and_report(cb_or_msg, extra=""):
    ok, out = await utils.rebuild_site()
    if ok:
        msg = f"✅ سایت با موفقیت به‌روزرسانی شد. {extra}"
        log.info("site rebuilt OK")
    else:
        msg = "⚠️ بازسازی سایت با خطا مواجه شد. لاگ را بررسی کنید."
        log.error("rebuild failed:\n%s", out[-1500:])
    return msg


# ================================================================ FSM states
class AddProduct(StatesGroup):
    name = State(); car = State(); category = State(); price = State()
    badges = State(); colors = State(); desc = State(); photo = State(); confirm = State()


class EditField(StatesGroup):
    value = State()


class AddCar(StatesGroup):
    name = State(); slug = State(); active = State()


class CarSEO(StatesGroup):
    field = State()


class AddPost(StatesGroup):
    title = State(); slug = State(); category = State(); excerpt = State()
    content = State(); image = State()


class PostEdit(StatesGroup):
    value = State()


class SettingsInput(StatesGroup):
    value = State()


class HeroImageUpload(StatesGroup):
    photo = State()


# 5 hero title presets — user picks from bot UI (or writes custom)
HERO_PRESETS = [
    ("بدنه‌ی خودرویت،", "مثل روزِ اولِ کارخانه"),
    ("قطعه‌ی اصلی،", "خریدِ مطمئن"),
    ("مرجع لوازم بدنه‌ی", "خودروهای ایرانی"),
    ("فابریک، رنگ کوره‌ای،", "با ضمانت"),
    ("خرید یک‌بار،", "خیال راحتِ سال‌ها"),
]


NEW_PRODUCT_DEFAULTS = {
    "badges": [], "colors": [], "desc": "", "image": None,
}


# ================================================================ /start & main
@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext):
    if not await guard(message):
        await message.answer(TEXTS["unauthorized"] % message.from_user.id)
        return
    await state.clear()
    doc, prods = get_products_sorted()
    posts = utils.load_posts()
    visible = len([p for p in prods if p.get("visible", True)])
    text = (TEXTS["welcome"] +
            f"\n\n📦 محصولات: {utils.fa(len(prods))} ({utils.fa(visible)} نمایش)"
            f"\n📝 پست‌ها: {utils.fa(len(posts))}")
    await message.answer(text, reply_markup=k.main_menu(len(prods), len(posts)), parse_mode="HTML")


@router.message(Command("id"))
async def cmd_id(message: Message):
    await message.answer(f"🆔 شناسه چت شما: <code>{message.from_user.id}</code>", parse_mode="HTML")


@router.callback_query(F.data == "main")
async def cb_main(cb: CallbackQuery, state: FSMContext):
    if not is_admin(cb.from_user.id):
        return await cb.answer("⛔️ دسترسی ندارید", show_alert=True)
    await state.clear()
    doc, prods = get_products_sorted()
    posts = utils.load_posts()
    await edit_or_answer(cb, TEXTS["welcome"] +
                         f"\n\n📦 محصولات: {utils.fa(len(prods))}"
                         f"\n📝 پست‌ها: {utils.fa(len(posts))}",
                         k.main_menu(len(prods), len(posts)))


@router.callback_query(F.data == "close")
async def cb_close(cb: CallbackQuery, state: FSMContext):
    await state.clear()
    try:
        await cb.message.delete()
    except Exception:
        pass
    await cb.answer(TEXTS["closed"])


@router.callback_query(F.data == "noop")
async def cb_noop(cb: CallbackQuery):
    await cb.answer()


# ================================================================ PRODUCTS
@router.callback_query(F.data == "products")
async def cb_products(cb: CallbackQuery, state: FSMContext):
    if not is_admin(cb.from_user.id):
        return await cb.answer("⛔️ دسترسی ندارید", show_alert=True)
    await state.clear()
    doc, prods = get_products_sorted()
    visible = len([p for p in prods if p.get("visible", True)])
    text = (f"📦 <b>مدیریت محصولات</b>\n\n"
            f"تعداد کل: <b>{utils.fa(len(prods))}</b>\n"
            f"نمایش در سایت: <b>{utils.fa(visible)}</b>\n\n"
            "برای ویرایش، از لیست محصول را انتخاب کنید:")
    await edit_or_answer(cb, text, k.products_menu(len(prods), visible))


@router.callback_query(F.data.startswith("prod_list:"))
async def cb_prod_list(cb: CallbackQuery):
    page = int(cb.data.split(":")[1])
    doc, prods = get_products_sorted()
    if not prods:
        return await edit_or_answer(cb, "📋 هنوز محصولی ثبت نشده است.\nبا دکمه «افزودن محصول» شروع کنید 👇",
                                    k.kb([k.btn("➕ افزودن محصول", "prod_add")], [k.BACK_PRODUCTS, k.CLOSE]))
    text = f"📋 <b>محصولات</b> ({utils.fa(len(prods))})\n\n🟢 نمایش · ⚪️ مخفی · 💰 قیمت دارد · 📢 استعلام تلفنی\nبرای مدیریت، محصول را انتخاب کنید:"
    await edit_or_answer(cb, text, k.product_list(prods, page))


@router.callback_query(F.data.startswith("prod_view:"))
async def cb_prod_view(cb: CallbackQuery):
    pid = cb.data.split(":")[1]
    doc, prods = get_products_sorted()
    p = next((x for x in prods if x["id"] == pid), None)
    if not p:
        return await cb.answer("⚠️ محصول پیدا نشد", show_alert=True)
    manifest = utils.load_manifest()
    markup = k.product_detail(p)
    if p.get("image") and p["image"] in manifest:
        # send photo message for visual products
        await cb.message.answer(
            "📷 عکس فعلی محصول 👇", reply_markup=InlineKeyboardMarkup(
                inline_keyboard=[[InlineKeyboardButton(
                    text="⬇️ مدیریت این محصول", callback_data=f"prod_viewtxt:{pid}")]]))
    await edit_or_answer(cb, product_card_text(p), markup)
    await cb.answer()


@router.callback_query(F.data.startswith("prod_viewtxt:"))
async def cb_prod_viewtxt(cb: CallbackQuery):
    pid = cb.data.split(":")[1]
    doc, prods = get_products_sorted()
    p = next((x for x in prods if x["id"] == pid), None)
    if not p:
        return await cb.answer("⚠️ محصول پیدا نشد", show_alert=True)
    await edit_or_answer(cb, product_card_text(p), k.product_detail(p))
    await cb.answer()


@router.callback_query(F.data.startswith("prod_toggle:"))
async def cb_prod_toggle(cb: CallbackQuery):
    pid = cb.data.split(":")[1]
    doc = utils.load_products()
    p = next((x for x in doc["products"] if x["id"] == pid), None)
    if not p:
        return await cb.answer("⚠️ پیدا نشد", show_alert=True)
    p["visible"] = not p.get("visible", True)
    utils.save_products(doc)
    await rebuild_and_report(cb)
    doc, prods = get_products_sorted()
    p = next((x for x in prods if x["id"] == pid), None)
    await edit_or_answer(cb, product_card_text(p), k.product_detail(p))
    await cb.answer("✅ تغییر کرد و سایت به‌روز شد")


@router.callback_query(F.data.startswith("prod_up:"))
async def cb_prod_up(cb: CallbackQuery):
    pid = cb.data.split(":")[1]
    doc = utils.load_products()
    prods = sorted(doc["products"], key=lambda x: x.get("order", 999))
    idx = next((i for i, x in enumerate(prods) if x["id"] == pid), None)
    if idx is None or idx == 0:
        return await cb.answer("در ابتدای لیست است")
    prods[idx]["order"], prods[idx-1]["order"] = prods[idx-1]["order"], prods[idx]["order"]
    utils.save_products(doc)
    await cb.answer("⬆️ جابه‌جا شد (بعد از ثبت نهایی تغییرات، سایت بازسازی می‌شود)")
    doc2, prods2 = get_products_sorted()
    p = next((x for x in prods2 if x["id"] == pid), None)
    await edit_or_answer(cb, product_card_text(p), k.product_detail(p))


@router.callback_query(F.data.startswith("prod_down:"))
async def cb_prod_down(cb: CallbackQuery):
    pid = cb.data.split(":")[1]
    doc = utils.load_products()
    prods = sorted(doc["products"], key=lambda x: x.get("order", 999))
    idx = next((i for i, x in enumerate(prods) if x["id"] == pid), None)
    if idx is None or idx == len(prods) - 1:
        return await cb.answer("در انتهای لیست است")
    prods[idx]["order"], prods[idx+1]["order"] = prods[idx+1]["order"], prods[idx]["order"]
    utils.save_products(doc)
    await cb.answer("⬇️ جابه‌جا شد (بعد از ثبت نهایی تغییرات، سایت بازسازی می‌شود)")
    doc2, prods2 = get_products_sorted()
    p = next((x for x in prods2 if x["id"] == pid), None)
    await edit_or_answer(cb, product_card_text(p), k.product_detail(p))


# ---------- delete
@router.callback_query(F.data.startswith("prod_del:"))
async def cb_prod_del(cb: CallbackQuery):
    pid = cb.data.split(":")[1]
    doc, prods = get_products_sorted()
    p = next((x for x in prods if x["id"] == pid), None)
    if not p:
        return await cb.answer("⚠️ پیدا نشد", show_alert=True)
    await edit_or_answer(cb, f"⚠️ <b>حذف محصول</b>\n\n«{p['name']}» برای همیشه حذف شود؟\nاین عمل قابل بازگشت نیست!",
                         k.confirm_delete(pid))


@router.callback_query(F.data.startswith("prod_delconfirm:"))
async def cb_prod_delconfirm(cb: CallbackQuery):
    pid = cb.data.split(":")[1]
    doc = utils.load_products()
    p = next((x for x in doc["products"] if x["id"] == pid), None)
    if not p:
        return await cb.answer("⚠️ پیدا نشد", show_alert=True)
    if p.get("image"):
        utils.delete_image(p["image"])
    doc["products"] = [x for x in doc["products"] if x["id"] != pid]
    utils.save_products(doc)
    await rebuild_and_report(cb)
    doc, prods = get_products_sorted()
    visible = len([x for x in prods if x.get("visible", True)])
    await edit_or_answer(cb, f"🗑 محصول حذف شد.\n\n📦 <b>مدیریت محصولات</b>\nکل: {utils.fa(len(prods))} · نمایش: {utils.fa(visible)}",
                         k.products_menu(len(prods), visible))
    await cb.answer("✅ حذف شد و سایت به‌روز شد")


# ---------- add flow
@router.callback_query(F.data == "prod_add")
async def cb_prod_add(cb: CallbackQuery, state: FSMContext):
    await state.set_state(AddProduct.name)
    await state.update_data(new_product=dict(NEW_PRODUCT_DEFAULTS), pid="new")
    await edit_or_answer(cb, "➕ <b>افزودن محصول (۱/۸)</b>\n\n📝 نام محصول را بفرستید.\n\nمثال: <code>کاپوت پژو ۲۰۶ — سفید</code>",
                         k.cancel_kb())
    await cb.answer()


@router.message(AddProduct.name)
async def add_name(message: Message, state: FSMContext):
    name = (message.text or "").strip()
    if not name or len(name) < 3:
        return await message.answer("⚠️ نام باید حداقل ۳ حرف باشد. دوباره بفرستید:")
    data = await state.get_data()
    data["new_product"]["name"] = name
    await state.update_data(new_product=data["new_product"])
    cars = utils.load_cars()["cars"]
    await state.set_state(AddProduct.car)
    await message.answer("➕ <b>افزودن محصول (۲/۸)</b>\n\n🚗 برای کدام خودرو؟", reply_markup=k.car_picker("addcar", cars), parse_mode="HTML")


@router.callback_query(AddProduct.car, F.data.startswith("addcar:"))
async def add_car(cb: CallbackQuery, state: FSMContext):
    car_id = cb.data.split(":")[1]
    data = await state.get_data()
    data["new_product"]["car"] = car_id
    await state.update_data(new_product=data["new_product"])
    cats = utils.load_cars()["categories"]
    await state.set_state(AddProduct.category)
    await edit_or_answer(cb, "➕ <b>افزودن محصول (۳/۸)</b>\n\n🏷 دسته‌بندی قطعه چیست؟", k.cat_picker("addcat", cats))
    await cb.answer()


@router.callback_query(AddProduct.category, F.data.startswith("addcat:"))
async def add_cat(cb: CallbackQuery, state: FSMContext):
    cat_id = cb.data.split(":")[1]
    data = await state.get_data()
    data["new_product"]["category"] = cat_id
    await state.update_data(new_product=data["new_product"])
    await state.set_state(AddProduct.price)
    await edit_or_answer(cb,
        "➕ <b>افزودن محصول (۴/۸)</b>\n\n💰 قیمت را به تومان بفرستید (فقط عدد).\n"
        "اگر قیمت ندارید بنویسید: <code>تماس</code>", k.cancel_kb())
    await cb.answer()


@router.message(AddProduct.price)
async def add_price(message: Message, state: FSMContext):
    price, on_call = utils.parse_price(message.text)
    data = await state.get_data()
    data["new_product"]["price"] = price
    data["new_product"]["price_on_call"] = on_call
    await state.update_data(new_product=data["new_product"])
    await state.set_state(AddProduct.badges)
    await message.answer(
        "➕ <b>افزودن محصول (۵/۸)</b>\n\n🎨 برچسب‌ها را انتخاب کنید (چندتایی):",
        reply_markup=k.badge_picker(data["new_product"]["badges"], "new"), parse_mode="HTML")


@router.callback_query(AddProduct.badges, F.data.startswith("badge:new:"))
async def add_badge_toggle(cb: CallbackQuery, state: FSMContext):
    badge = cb.data.split(":", 2)[2]
    data = await state.get_data()
    selected = data["new_product"]["badges"]
    if badge in selected:
        selected.remove(badge)
    else:
        selected.append(badge)
    await state.update_data(new_product=data["new_product"])
    await cb.message.edit_reply_markup(reply_markup=k.badge_picker(selected, "new"))
    await cb.answer()


@router.callback_query(AddProduct.badges, F.data.startswith("badges_done:"))
async def add_badges_done(cb: CallbackQuery, state: FSMContext):
    await state.set_state(AddProduct.colors)
    await edit_or_answer(cb,
        "➕ <b>افزودن محصول (۶/۸)</b>\n\n🖌 رنگ‌های موجود را با «،» جدا بفرستید.\n"
        "مثال: <code>سفید، مشکی، نقره‌ای</code>\nاگر رنگ خاصی نیست بنویسید: <code>رد</code>", k.cancel_kb())
    await cb.answer()


@router.message(AddProduct.colors)
async def add_colors(message: Message, state: FSMContext):
    text = (message.text or "").strip()
    colors = [] if text in ("رد", "-", "no") else [c.strip() for c in text.split("،") if c.strip()]
    data = await state.get_data()
    data["new_product"]["colors"] = colors
    await state.update_data(new_product=data["new_product"])
    await state.set_state(AddProduct.desc)
    await message.answer(
        "➕ <b>افزودن محصول (۷/۸)</b>\n\n📄 توضیحات محصول را بنویسید (۲-۴ جمله).\nبرای رد کردن بنویسید: <code>رد</code>",
        parse_mode="HTML")


@router.message(AddProduct.desc)
async def add_desc(message: Message, state: FSMContext):
    text = (message.text or "").strip()
    data = await state.get_data()
    data["new_product"]["desc"] = "" if text == "رد" else text
    await state.update_data(new_product=data["new_product"])
    await state.set_state(AddProduct.photo)
    await message.answer(
        "➕ <b>افزودن محصول (۸/۸)</b>\n\n📷 عکس محصول را بفرستید (پیشنهاد: عکس با نور خوب و پس‌زمینه ساده).\n"
        "عکس به‌صورت خودکار به WebP سبک تبدیل می‌شود.\nاگر فعلاً عکس ندارید بنویسید: <code>رد</code>",
        parse_mode="HTML", reply_markup=k.cancel_kb())


@router.message(AddProduct.photo, F.photo)
async def add_photo(message: Message, state: FSMContext):
    status = await message.answer("⏳ در حال پردازش عکس…")
    file = await message.bot.get_file(message.photo[-1].file_id)
    buf = await message.bot.download_file(file.file_path)
    entry = utils.save_product_image(buf.read())
    data = await state.get_data()
    data["new_product"]["image"] = entry["key"]
    await state.update_data(new_product=data["new_product"])
    await status.delete()
    await preview_product(message, state)


@router.message(AddProduct.photo)
async def add_photo_skip(message: Message, state: FSMContext):
    await preview_product(message, state)


async def preview_product(message: Message, state: FSMContext):
    data = await state.get_data()
    p = data["new_product"]
    await state.set_state(AddProduct.confirm)
    price = "📞 استعلام تلفنی" if p.get("price_on_call") else f"💰 {utils.price_fa(p.get('price'))} تومان"
    text = (f"✅ <b>پیش‌نمایش محصول جدید</b>\n\n"
            f"📦 {p.get('name')}\n"
            f"🚗 خودرو: {p.get('car', '—')}\n"
            f"🏷 دسته: {p.get('category', '—')}\n"
            f"{price}\n"
            f"🎨 برچسب‌ها: {'، '.join(p.get('badges', [])) or '—'}\n"
            f"🖌 رنگ‌ها: {'، '.join(p.get('colors', [])) or '—'}\n"
            f"📷 عکس: {'دارد ✅' if p.get('image') else 'ندارد'}\n\n"
            "ثبت نهایی کنیم؟")
    await message.answer(text, parse_mode="HTML", reply_markup=k.confirm_add("new"))


@router.callback_query(F.data == "prod_cancel_add")
async def cb_cancel_add(cb: CallbackQuery, state: FSMContext):
    await state.clear()
    doc, prods = get_products_sorted()
    visible = len([x for x in prods if x.get("visible", True)])
    await edit_or_answer(cb, "❌ عملیات لغو شد.\n\n📦 <b>مدیریت محصولات</b>",
                         k.products_menu(len(prods), visible))


@router.callback_query(F.data.startswith("prod_save:"))
async def cb_prod_save(cb: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    p = data.get("new_product")
    if not p or not p.get("name"):
        return await cb.answer("⚠️ داده‌ای برای ثبت نیست", show_alert=True)
    doc = utils.load_products()
    max_order = max([x.get("order", 0) for x in doc["products"]], default=0)
    product = {
        "id": "p-" + uuid.uuid4().hex[:8],
        "name": p["name"],
        "car": p.get("car", "other"),
        "category": p.get("category", "other"),
        "price": p.get("price", 0),
        "price_on_call": p.get("price_on_call", True),
        "badges": p.get("badges", []),
        "colors": p.get("colors", []),
        "description": p.get("desc", ""),
        "image": p.get("image"),
        "visible": True,
        "in_stock": True,
        "order": max_order + 1,
        "created_at": date.today().isoformat(),
    }
    doc["products"].append(product)
    utils.save_products(doc)
    await state.clear()
    report = await rebuild_and_report(cb)
    await edit_or_answer(cb,
        f"✅ <b>محصول ثبت شد!</b>\n\n📦 {product['name']}\n{report}",
        k.kb([k.btn("👁 مشاهده در لیست", "prod_list:0")], [k.BACK_MAIN, k.CLOSE]))
    await cb.answer("🎉 ثبت شد")


# ---------- edit flow
@router.callback_query(F.data.startswith("prod_edit:"))
async def cb_prod_edit(cb: CallbackQuery, state: FSMContext):
    pid = cb.data.split(":")[1]
    doc, prods = get_products_sorted()
    p = next((x for x in prods if x["id"] == pid), None)
    if not p:
        return await cb.answer("⚠️ پیدا نشد", show_alert=True)
    await edit_or_answer(cb, f"✏️ <b>ویرایش محصول</b>\n\n{product_card_text(p)}\n\nکدام فیلد را ویرایش می‌کنید؟",
                         k.product_edit_fields(p))


async def _edit_field_prompt(cb, state, pid, field, prompt, current=""):
    await state.set_state(EditField.value)
    await state.update_data(edit_pid=pid, edit_field=field)
    await cb.message.answer(
        f"✏️ {prompt}\n\nمقدار فعلی:\n<blockquote>{current or '—'}</blockquote>\n\nمقدار جدید را بفرستید:",
        parse_mode="HTML", reply_markup=k.kb([k.btn("◀️ بازگشت به محصول", f"prod_view:{pid}")]))
    await cb.answer()


@router.callback_query(F.data.startswith("pf_name:"))
async def cb_pf_name(cb: CallbackQuery, state: FSMContext):
    pid = cb.data.split(":")[1]
    doc, prods = get_products_sorted()
    p = next((x for x in prods if x["id"] == pid), None)
    await _edit_field_prompt(cb, state, pid, "name", "📝 نام جدید محصول را بنویسید:", p["name"] if p else "")


@router.callback_query(F.data.startswith("pf_price:"))
async def cb_pf_price(cb: CallbackQuery, state: FSMContext):
    pid = cb.data.split(":")[1]
    doc, prods = get_products_sorted()
    p = next((x for x in prods if x["id"] == pid), None)
    cur = "استعلام تلفنی" if p.get("price_on_call") else utils.price_fa(p.get("price"))
    await _edit_field_prompt(cb, state, pid, "price",
                             "💰 قیمت جدید به تومان (فقط عدد) یا بنویسید «تماس»:", cur)


@router.callback_query(F.data.startswith("pf_colors:"))
async def cb_pf_colors(cb: CallbackQuery, state: FSMContext):
    pid = cb.data.split(":")[1]
    doc, prods = get_products_sorted()
    p = next((x for x in prods if x["id"] == pid), None)
    await _edit_field_prompt(cb, state, pid, "colors",
                             "🖌 رنگ‌های جدید با «،» (یا «رد» برای خالی کردن):", "، ".join(p.get("colors", [])))


@router.callback_query(F.data.startswith("pf_desc:"))
async def cb_pf_desc(cb: CallbackQuery, state: FSMContext):
    pid = cb.data.split(":")[1]
    doc, prods = get_products_sorted()
    p = next((x for x in prods if x["id"] == pid), None)
    await _edit_field_prompt(cb, state, pid, "desc", "📄 توضیحات جدید (یا «رد»):", p.get("description", ""))


@router.callback_query(F.data.startswith("pf_car:"))
async def cb_pf_car(cb: CallbackQuery):
    pid = cb.data.split(":")[1]
    cars = utils.load_cars()["cars"]
    await cb.message.edit_text("🚗 خودروی جدید را انتخاب کنید:",
                               reply_markup=k.car_picker(f"setcar:{pid}", cars))
    await cb.answer()


@router.callback_query(F.data.startswith("setcar:"))
async def cb_setcar(cb: CallbackQuery):
    _, pid, car_id = cb.data.split(":")
    doc = utils.load_products()
    p = next((x for x in doc["products"] if x["id"] == pid), None)
    if not p:
        return await cb.answer("⚠️ پیدا نشد", show_alert=True)
    p["car"] = car_id
    utils.save_products(doc)
    await rebuild_and_report(cb)
    doc, prods = get_products_sorted()
    p = next((x for x in prods if x["id"] == pid), None)
    await cb.message.edit_text(product_card_text(p) + "\n\n✅ خودرو تغییر کرد و سایت به‌روز شد",
                                reply_markup=k.product_edit_fields(p), parse_mode="HTML")
    await cb.answer("✅ تغییر کرد")


@router.callback_query(F.data.startswith("pf_cat:"))
async def cb_pf_cat(cb: CallbackQuery):
    pid = cb.data.split(":")[1]
    cats = utils.load_cars()["categories"]
    await cb.message.edit_text("🏷 دسته‌بندی جدید را انتخاب کنید:",
                               reply_markup=k.cat_picker(f"setcat:{pid}", cats))
    await cb.answer()


@router.callback_query(F.data.startswith("setcat:"))
async def cb_setcat(cb: CallbackQuery):
    _, pid, cat_id = cb.data.split(":")
    doc = utils.load_products()
    p = next((x for x in doc["products"] if x["id"] == pid), None)
    if not p:
        return await cb.answer("⚠️ پیدا نشد", show_alert=True)
    p["category"] = cat_id
    utils.save_products(doc)
    await rebuild_and_report(cb)
    doc, prods = get_products_sorted()
    p = next((x for x in prods if x["id"] == pid), None)
    await cb.message.edit_text(product_card_text(p) + "\n\n✅ دسته تغییر کرد و سایت به‌روز شد",
                                reply_markup=k.product_edit_fields(p), parse_mode="HTML")
    await cb.answer("✅ تغییر کرد")


@router.callback_query(F.data.startswith("pf_badges:"))
async def cb_pf_badges(cb: CallbackQuery, state: FSMContext):
    pid = cb.data.split(":")[1]
    doc, prods = get_products_sorted()
    p = next((x for x in prods if x["id"] == pid), None)
    await state.set_state(AddProduct.badges)
    await state.update_data(edit_pid=pid)
    await cb.message.edit_text("🎨 برچسب‌ها را انتخاب کنید:",
                               reply_markup=k.badge_picker(p.get("badges", []), pid))
    await cb.answer()


@router.callback_query(AddProduct.badges, F.data.startswith("badge:p-"))
async def edit_badge_toggle(cb: CallbackQuery, state: FSMContext):
    parts = cb.data.split(":", 2)
    pid, badge = parts[1], parts[2]
    doc = utils.load_products()
    p = next((x for x in doc["products"] if x["id"] == pid), None)
    if not p:
        return await cb.answer("⚠️ پیدا نشد", show_alert=True)
    if badge in p["badges"]:
        p["badges"].remove(badge)
    else:
        p["badges"].append(badge)
    utils.save_products(doc)
    await cb.message.edit_reply_markup(reply_markup=k.badge_picker(p["badges"], pid))
    await cb.answer()


@router.callback_query(AddProduct.badges, F.data.startswith("badges_done:p-"))
async def edit_badges_done(cb: CallbackQuery, state: FSMContext):
    pid = cb.data.split(":")[1]
    await state.clear()
    await rebuild_and_report(cb)
    doc, prods = get_products_sorted()
    p = next((x for x in prods if x["id"] == pid), None)
    await cb.message.edit_text(product_card_text(p) + "\n\n✅ برچسب‌ها ذخیره شد",
                               reply_markup=k.product_edit_fields(p), parse_mode="HTML")
    await cb.answer("✅ ذخیره شد")


@router.callback_query(F.data.startswith("pf_stock:"))
async def cb_pf_stock(cb: CallbackQuery):
    pid = cb.data.split(":")[1]
    doc = utils.load_products()
    p = next((x for x in doc["products"] if x["id"] == pid), None)
    if not p:
        return await cb.answer("⚠️ پیدا نشد", show_alert=True)
    p["in_stock"] = not p.get("in_stock", True)
    utils.save_products(doc)
    await rebuild_and_report(cb)
    doc, prods = get_products_sorted()
    p = next((x for x in prods if x["id"] == pid), None)
    await cb.message.edit_text(product_card_text(p), reply_markup=k.product_edit_fields(p), parse_mode="HTML")
    await cb.answer("✅ موجودی تغییر کرد")


@router.callback_query(F.data.startswith("prod_photo:"))
async def cb_prod_photo(cb: CallbackQuery, state: FSMContext):
    pid = cb.data.split(":")[1]
    await state.set_state(EditField.value)
    await state.update_data(edit_pid=pid, edit_field="photo")
    await cb.message.answer("📷 عکس جدید محصول را بفرستید:", reply_markup=k.kb([k.btn("◀️ بازگشت", f"prod_view:{pid}")]))
    await cb.answer()


@router.callback_query(F.data.startswith("prod_delphoto:"))
async def cb_prod_delphoto(cb: CallbackQuery):
    pid = cb.data.split(":")[1]
    doc = utils.load_products()
    p = next((x for x in doc["products"] if x["id"] == pid), None)
    if not p:
        return await cb.answer("⚠️ پیدا نشد", show_alert=True)
    if p.get("image"):
        utils.delete_image(p["image"])
        p["image"] = None
    utils.save_products(doc)
    await rebuild_and_report(cb)
    doc, prods = get_products_sorted()
    p = next((x for x in prods if x["id"] == pid), None)
    await cb.message.edit_text(product_card_text(p), reply_markup=k.product_detail(p), parse_mode="HTML")
    await cb.answer("✅ عکس حذف شد")


@router.message(EditField.value, F.photo)
async def edit_photo_msg(message: Message, state: FSMContext):
    data = await state.get_data()
    if data.get("edit_field") != "photo":
        return
    pid = data["edit_pid"]
    status = await message.answer("⏳ پردازش عکس…")
    file = await message.bot.get_file(message.photo[-1].file_id)
    buf = await message.bot.download_file(file.file_path)
    entry = utils.save_product_image(buf.read())
    doc = utils.load_products()
    p = next((x for x in doc["products"] if x["id"] == pid), None)
    if p:
        if p.get("image"):
            utils.delete_image(p["image"])
        p["image"] = entry["key"]
        utils.save_products(doc)
    await state.clear()
    await status.delete()
    report = await rebuild_and_report(message)
    await message.answer(f"✅ عکس محصول به‌روز شد.\n{report}",
                         reply_markup=k.kb([k.btn("👁 مشاهده محصول", f"prod_view:{pid}")]))


@router.message(EditField.value)
async def edit_field_msg(message: Message, state: FSMContext):
    data = await state.get_data()
    pid = data.get("edit_pid")
    field = data.get("edit_field")
    if not pid or not field:
        await state.clear()
        return
    doc = utils.load_products()
    p = next((x for x in doc["products"] if x["id"] == pid), None)
    if not p:
        await state.clear()
        return await message.answer("⚠️ محصول پیدا نشد.")
    text = (message.text or "").strip()
    if field == "name":
        p["name"] = text
    elif field == "price":
        price, on_call = utils.parse_price(text)
        p["price"] = price
        p["price_on_call"] = on_call
    elif field == "colors":
        p["colors"] = [] if text == "رد" else [c.strip() for c in text.split("،") if c.strip()]
    elif field == "desc":
        p["description"] = "" if text == "رد" else text
    utils.save_products(doc)
    await state.clear()
    report = await rebuild_and_report(message)
    doc, prods = get_products_sorted()
    p = next((x for x in prods if x["id"] == pid), None)
    await message.answer(
        f"✅ فیلد «{field}» ذخیره شد.\n{report}",
        reply_markup=k.kb([k.btn("👁 مشاهده محصول", f"prod_view:{pid}")]))


# ================================================================ CARS
@router.callback_query(F.data == "cars")
async def cb_cars(cb: CallbackQuery, state: FSMContext):
    if not is_admin(cb.from_user.id):
        return await cb.answer("⛔️ دسترسی ندارید", show_alert=True)
    await state.clear()
    cars_doc = utils.load_cars()
    prods = utils.load_products()["products"]
    for c in cars_doc["cars"]:
        c["_products"] = [p for p in prods if p.get("car") == c["id"]]
    text = ("🚗 <b>مدیریت خودروها</b>\n\n"
            "برای هر خودرویی که حداقل یک محصول داشته باشد، یک صفحه سئو اختصاصی در سایت ساخته می‌شود.\n"
            "🟢 فعال · ⚪️ غیرفعال")
    await edit_or_answer(cb, text, k.cars_menu(cars_doc["cars"]))


@router.callback_query(F.data.startswith("car_view:"))
async def cb_car_view(cb: CallbackQuery):
    cid = cb.data.split(":")[1]
    cars_doc = utils.load_cars()
    car = next((c for c in cars_doc["cars"] if c["id"] == cid), None)
    if not car:
        return await cb.answer("⚠️ پیدا نشد", show_alert=True)
    text = (f"🚗 <b>{car['name']}</b>\n\n"
            f"🔗 آدرس سایت: /{car.get('slug', '')}/\n"
            f"🏷 تیپ‌ها: {'، '.join(car.get('variants', [])) or '—'}\n"
            f"👁 وضعیت: {'فعال' if car.get('active') else 'غیرفعال'}")
    await edit_or_answer(cb, text, k.car_detail(car))


@router.callback_query(F.data.startswith("car_toggle:"))
async def cb_car_toggle(cb: CallbackQuery):
    cid = cb.data.split(":")[1]
    doc = utils.load_cars()
    car = next((c for c in doc["cars"] if c["id"] == cid), None)
    if not car:
        return await cb.answer("⚠️ پیدا نشد", show_alert=True)
    car["active"] = not car.get("active", True)
    utils.save_cars(doc)
    await rebuild_and_report(cb)
    await cb.answer("✅ تغییر کرد و سایت به‌روز شد")
    await cb_car_view(cb)


@router.callback_query(F.data.startswith("car_del:"))
async def cb_car_del(cb: CallbackQuery):
    cid = cb.data.split(":")[1]
    doc = utils.load_cars()
    prods = [p for p in utils.load_products()["products"] if p.get("car") == cid]
    if prods:
        return await cb.answer(f"⚠️ این خودرو {len(prods)} محصول دارد؛ اول محصولات را جابه‌جا یا حذف کنید.", show_alert=True)
    doc["cars"] = [c for c in doc["cars"] if c["id"] != cid]
    utils.save_cars(doc)
    await rebuild_and_report(cb)
    await cb_cars(cb)


@router.callback_query(F.data == "car_add")
async def cb_car_add(cb: CallbackQuery, state: FSMContext):
    await state.set_state(AddCar.name)
    await edit_or_answer(cb,
        "🚗 <b>افزودن خودرو (۱/۳)</b>\n\nنام فارسی خودرو؟\nمثال: <code>رانا</code>", k.cancel_kb())


@router.message(AddCar.name)
async def car_add_name(message: Message, state: FSMContext):
    name = (message.text or "").strip()
    if len(name) < 2:
        return await message.answer("⚠️ نام معتبر نیست، دوباره:")
    await state.update_data(car_name=name)
    await state.set_state(AddCar.slug)
    await message.answer("🚗 <b>افزودن خودرو (۲/۳)</b>\n\nآدرس انگلیسی (اسلاگ)؟ فقط حروف انگلیسی و خط تیره.\nمثال: <code>runna</code>", parse_mode="HTML")


@router.message(AddCar.slug)
async def car_add_slug(message: Message, state: FSMContext):
    slug = utils.slugify(message.text)
    data = await state.get_data()
    await state.clear()
    doc = utils.load_cars()
    cid = slug.replace("-", "_")[:20]
    if any(c["id"] == cid for c in doc["cars"]):
        return await message.answer("⚠️ این اسلاگ تکراری است.", reply_markup=k.kb([k.btn("🚗 خودروها", "cars")]))
    doc["cars"].append({
        "id": cid, "name": data["car_name"], "name_short": data["car_name"],
        "slug": slug, "variants": [], "active": True,
        "seo_title": f"لوازم بدنه {data['car_name']} | خرید کاپوت، سپر، گلگیر — بدنه پلاس",
        "meta_description": f"خرید لوازم بدنه {data['car_name']} با رنگ کوره‌ای شرکتی، ۵ سال ضمانت رنگ و ارسال به سراسر کشور از بدنه پلاس.",
        "intro": f"در بدنه پلاس، لوازم بدنه {data['car_name']} را با کیفیت عرضه می‌کنیم: قطعه فابریک یا رنگ کوره‌ای شرکتی، هر دو با ۵ سال ضمانت رنگ و ارسال به سراسر کشور.",
        "parts_intro": f"قطعات موجود {data['car_name']}:",
        "body": [{"h2": "کیفیت بدنه پلاس", "text": "تمام قطعات با کنترل کیفیت پرس و رنگ عرضه می‌شوند و مشمول ۵ سال ضمانت رنگ هستند."}],
        "faq": [{"q": "قیمت قطعات چقدر است؟", "a": "برای اطلاع از قیمت روز تماس بگیرید تا مشاوره تلفنی رایگان دریافت کنید."}],
    })
    utils.save_cars(doc)
    report = await utils.rebuild_site()
    await message.answer(
        f"✅ خودرو «{data['car_name']}» اضافه شد.\n{'✅' if report[0] else '⚠️'} سایت به‌روز شد.\n\n💡 با افزودن محصول برای این خودرو، صفحه سئوی آن فعال می‌شود.",
        reply_markup=k.kb([k.btn("🚗 مدیریت خودروها", "cars")]))


# ================================================================ SETTINGS
SETTING_LABELS = {
    "phone": ("📞 شماره تماس ثابت", "قالب: 02112345678"),
    "mobile": ("📱 شماره موبایل", "قالب: 09121234567 — خالی می‌گذارید اگر ندارید"),
    "address": ("📍 آدرس فروشگاه", "آدرس کامل را بنویسید"),
    "hours": ("🕐 ساعات کاری", "مثال: شنبه تا پنجشنبه · ۹ صبح تا ۷ عصر"),
    "hours_schema": ("🕐 کد ساعات (اسکیما)", "مثال: Sa-Th 09:00-19:00"),
    "map_balad": ("🗺 لینک بلد", "https://balad.ir/..."),
    "map_neshan": ("🗺 لینک نشان", "https://neshan.org/..."),
    "map_google": ("🗺 لینک گوگل‌مپ", "https://maps.app.google.com/..."),
    "geo": ("📍 مختصات", "قالب: 35.6892,51.3890"),
    "brand": ("🏷 نام برند فارسی", "مثال: بدنه پلاس"),
    "hero": ("✨ عنوان هیرو", "عنوان بزرگ صفحه اصلی — دو خط را با | جدا کنید"),
    "herosub": ("📄 زیرعنوان هیرو", "متن توضیحیه زیر عنوان"),
}


def display_phone(number: str) -> str:
    n = (number or "").strip()
    return utils.fa(n)


@router.callback_query(F.data == "settings")
async def cb_settings(cb: CallbackQuery, state: FSMContext):
    if not is_admin(cb.from_user.id):
        return await cb.answer("⛔️ دسترسی ندارید", show_alert=True)
    await state.clear()
    s = utils.load_settings()
    c = s.get("contact", {})
    text = ("⚙️ <b>تنظیمات سایت</b>\n\n"
            f"📞 ثابت: <code>{c.get('phone', '')}</code>\n"
            f"📱 موبایل: <code>{c.get('mobile', '')}</code>\n"
            f"📍 آدرس: {c.get('address', '')}\n"
            f"🕐 ساعت: {c.get('hours', '')}\n\n"
            "هر مورد را که می‌خواهید تغییر دهید انتخاب کنید:")
    await edit_or_answer(cb, text, k.settings_menu())


@router.callback_query(F.data == "set:maps")
async def cb_set_maps(cb: CallbackQuery):
    await edit_or_answer(cb, "🗺 <b>لینک‌های نقشه</b>\n\nلینک هر سرویس را انتخاب و وارد کنید:", k.settings_maps_menu())


@router.callback_query(F.data == "set:seo")
async def cb_set_seo(cb: CallbackQuery):
    await edit_or_answer(cb, "🌐 <b>سئو و برند</b>", k.settings_seo_menu())


@router.callback_query(F.data.startswith("set:"))
async def cb_set_field(cb: CallbackQuery, state: FSMContext):
    key = cb.data.split(":", 1)[1]
    if key in ("maps", "seo"):
        return
    label, hint = SETTING_LABELS.get(key, (key, ""))
    s = utils.load_settings()
    current = ""
    if key in ("brand",):
        current = s.get("site", {}).get("brand_fa", "")
    elif key in ("hero",):
        current = s.get("hero", {}).get("title_1", "") + " " + s.get("hero", {}).get("title_2", "")
    elif key in ("herosub",):
        current = s.get("hero", {}).get("subtitle", "")
    elif key == "geo":
        current = f"{s.get('contact', {}).get('geo_lat', '')},{s.get('contact', {}).get('geo_lng', '')}"
    else:
        current = s.get("contact", {}).get(key, "")
    await state.set_state(SettingsInput.value)
    await state.update_data(set_key=key)
    await cb.message.answer(
        f"{label}\n\n{hint}\n\nمقدار فعلی:\n<blockquote>{current or '—'}</blockquote>\n\nمقدار جدید را بفرستید (یا «رد»):",
        parse_mode="HTML", reply_markup=k.kb([k.btn("◀️ بازگشت به تنظیمات", "settings")]))
    await cb.answer()


@router.message(SettingsInput.value)
async def set_field_value(message: Message, state: FSMContext):
    data = await state.get_data()
    key = data.get("set_key")
    await state.clear()
    if not key:
        return
    text = (message.text or "").strip()
    if text == "رد":
        return await message.answer("❌ لغو شد.", reply_markup=k.kb([k.btn("⚙️ تنظیمات", "settings")]))
    s = utils.load_settings()
    s.setdefault("contact", {})
    s.setdefault("site", {})
    s.setdefault("hero", {})
    if key == "brand":
        s["site"]["brand_fa"] = text
    elif key == "hero":
        parts = text.split("|", 1)
        s["hero"]["title_1"] = parts[0].strip()
        s["hero"]["title_2"] = parts[1].strip() if len(parts) > 1 else s["hero"].get("title_2", "")
    elif key == "herosub":
        s["hero"]["subtitle"] = text
    elif key == "geo":
        try:
            lat, lng = [x.strip() for x in text.split(",")]
            s["contact"]["geo_lat"] = float(lat)
            s["contact"]["geo_lng"] = float(lng)
        except Exception:
            return await message.answer("⚠️ فرمت مختصات درست نیست. مثال: <code>35.6892,51.3890</code>")
    elif key == "phone":
        s["contact"]["phone"] = text
        s["contact"]["phone_display"] = display_phone(text)
    elif key == "mobile":
        if text in ("", "-", "خالی"):
            s["contact"]["mobile"] = ""
            s["contact"]["mobile_display"] = ""
        else:
            s["contact"]["mobile"] = text
            s["contact"]["mobile_display"] = display_phone(text)
    else:
        s["contact"][key] = text
    utils.save_settings(s)
    report = await rebuild_and_report(message)
    await message.answer(
        f"✅ تنظیم ذخیره شد.\n{report}",
        reply_markup=k.kb([k.btn("⚙️ تنظیمات سایت", "settings"), k.btn("🏠 منوی اصلی", "main")]))


# ================================================================ HERO: presets + image
@router.callback_query(F.data == "heropresets")
async def cb_hero_presets(cb: CallbackQuery):
    if not is_admin(cb.from_user.id):
        return await cb.answer("⛔️ دسترسی ندارید", show_alert=True)
    lines = "\n".join(f"{i + 1}️⃣ {t1} {t2}" for i, (t1, t2) in enumerate(HERO_PRESETS))
    await edit_or_answer(cb,
        f"🎯 <b>پیشنهادهای عنوان هیرو</b>\n\n{lines}\n\nیکی را انتخاب کنید تا جایگزین عنوان فعلی شود:",
        k.hero_presets_menu(HERO_PRESETS))


@router.callback_query(F.data.startswith("heropreset:"))
async def cb_hero_preset_apply(cb: CallbackQuery):
    if not is_admin(cb.from_user.id):
        return await cb.answer("⛔️ دسترسی ندارید", show_alert=True)
    try:
        idx = int(cb.data.split(":", 1)[1])
        t1, t2 = HERO_PRESETS[idx]
    except Exception:
        return await cb.answer("⚠️ گزینه نامعتبر است", show_alert=True)
    s = utils.load_settings()
    s.setdefault("hero", {})
    s["hero"]["title_1"] = t1
    s["hero"]["title_2"] = t2
    utils.save_settings(s)
    report = await rebuild_and_report(cb)
    await edit_or_answer(cb,
        f"✅ عنوان هیرو عوض شد:\n\n«{t1} {t2}»\n\n{report}",
        k.kb([k.btn("🎯 پیشنهادهای دیگر", "heropresets"), k.btn("⚙️ تنظیمات سایت", "settings")]))
    await cb.answer("✅ انجام شد")


@router.callback_query(F.data == "heroimg")
async def cb_set_heroimg(cb: CallbackQuery, state: FSMContext):
    if not is_admin(cb.from_user.id):
        return await cb.answer("⛔️ دسترسی ندارید", show_alert=True)
    await state.set_state(HeroImageUpload.photo)
    await cb.message.answer(
        "🖼 <b>عکس جدید هیرو</b>\n\n"
        "عکس را همینجا بفرستید. 📐 نسبت تصویر عمودی <b>۳:۴</b> است (مثل ۱۰۸۰×۱۴۴۰).\n"
        "اگر نسبت عکس فرق کند، به‌صورت خودکار برش وسط (center-crop) می‌شود.\n\n"
        "💡 پیشنهاد: عکس باکیفیت از یک قطعه بدنه با نورپردازی خوب — پس‌زمینه‌ی تیره با سایت هماهنگ‌تر است.\n\n"
        "برای انصراف «رد» را بفرستید.",
        parse_mode="HTML",
        reply_markup=k.kb([k.btn("◀️ بازگشت به تنظیمات", "settings")]))
    await cb.answer()


@router.message(HeroImageUpload.photo, F.photo)
async def hero_image_received(message: Message, state: FSMContext):
    await state.clear()
    wait = await message.answer("⏳ در حال پردازش عکس…")
    try:
        photo = message.photo[-1]
        file = await message.bot.get_file(photo.file_id)
        buf = io.BytesIO()
        await message.bot.download_file(file.file_path, buf)
        info = utils.save_hero_image(buf.getvalue())
    except Exception as e:
        return await wait.edit_text(f"⚠️ خطا در پردازش عکس:\n<code>{str(e)[:200]}</code>", parse_mode="HTML")
    report = await rebuild_and_report(message)
    await wait.edit_text(
        f"✅ عکس هیرو عوض شد!\n"
        f"📐 ابعاد دریافتی: {utils.fa(info['w'])}×{utils.fa(info['h'])}\n"
        f"🔄 تبدیل خودکار به WebP (۸۶۴×۱۱۵۲ + ۶۴۸×۸۶۴) انجام شد.\n\n{report}",
        parse_mode="HTML",
        reply_markup=k.kb([k.btn("⚙️ تنظیمات سایت", "settings"), k.btn("🏠 منوی اصلی", "main")]))


@router.message(HeroImageUpload.photo)
async def hero_image_invalid(message: Message, state: FSMContext):
    text = (message.text or "").strip()
    if text == "رد":
        await state.clear()
        return await message.answer("❌ لغو شد.", reply_markup=k.kb([k.btn("⚙️ تنظیمات", "settings")]))
    await message.answer("⚠️ فقط عکس بفرستید (یا «رد» برای انصراف).")


# ================================================================ POSTS
POST_CATEGORIES = ["راهنمای خرید", "آموزش", "دانش خودرو"]


@router.callback_query(F.data == "posts")
async def cb_posts(cb: CallbackQuery, state: FSMContext):
    if not is_admin(cb.from_user.id):
        return await cb.answer("⛔️ دسترسی ندارید", show_alert=True)
    await state.clear()
    posts = utils.load_posts()
    await edit_or_answer(cb,
        f"📝 <b>مدیریت وبلاگ</b>\n\nتعداد پست‌ها: {utils.fa(len(posts))}",
        k.posts_menu(len(posts)))


@router.callback_query(F.data.startswith("posts_list:"))
async def cb_posts_list(cb: CallbackQuery):
    page = int(cb.data.split(":")[1])
    posts = utils.load_posts()
    posts.sort(key=lambda p: p.get("date", ""), reverse=True)
    await edit_or_answer(cb,
        f"📋 <b>پست‌های وبلاگ</b> ({utils.fa(len(posts))})\n\n🟢 نمایش · ⚪️ مخفی",
        k.posts_list(posts, page))


@router.callback_query(F.data.startswith("post_view:"))
async def cb_post_view(cb: CallbackQuery):
    slug = cb.data.split(":")[1]
    p = utils.load_post(slug)
    if not p:
        return await cb.answer("⚠️ پیدا نشد", show_alert=True)
    vis = "🟢 نمایش" if p.get("visible", True) else "⚪️ مخفی"
    await edit_or_answer(cb,
        f"📝 <b>{p['title']}</b>\n\n"
        f"🔗 /blog/{p['slug']}/\n"
        f"🗓 {utils.jdate_fa(p.get('date', ''))}\n"
        f"⏱ {utils.fa(p.get('read_time', 5))} دقیقه · {utils.fa(utils.word_count(p))} کلمه\n"
        f"👁 {vis}",
        k.post_detail(p))


@router.callback_query(F.data.startswith("post_toggle:"))
async def cb_post_toggle(cb: CallbackQuery):
    slug = cb.data.split(":")[1]
    p = utils.load_post(slug)
    if not p:
        return await cb.answer("⚠️ پیدا نشد", show_alert=True)
    p["visible"] = not p.get("visible", True)
    utils.save_post(p)
    await rebuild_and_report(cb)
    await cb.answer("✅ تغییر کرد و سایت به‌روز شد")
    await cb_post_view(cb)


@router.callback_query(F.data.startswith("post_del:"))
async def cb_post_del(cb: CallbackQuery):
    slug = cb.data.split(":")[1]
    p = utils.load_post(slug)
    if not p:
        return await cb.answer("⚠️ پیدا نشد", show_alert=True)
    await edit_or_answer(cb, f"⚠️ پست «{p['title'][:60]}» برای همیشه حذف شود؟", k.post_confirm_delete(slug))


@router.callback_query(F.data.startswith("post_delconfirm:"))
async def cb_post_delconfirm(cb: CallbackQuery):
    slug = cb.data.split(":")[1]
    utils.delete_post(slug)
    await rebuild_and_report(cb)
    posts = utils.load_posts()
    await edit_or_answer(cb,
        f"🗑 پست حذف شد.\n\n📝 <b>مدیریت وبلاگ</b> — {utils.fa(len(posts))} پست",
        k.posts_menu(len(posts)))
    await cb.answer("✅ حذف شد")


@router.callback_query(F.data.startswith("post_title:"))
async def cb_post_title(cb: CallbackQuery, state: FSMContext):
    slug = cb.data.split(":")[1]
    p = utils.load_post(slug)
    await state.set_state(PostEdit.value)
    await state.update_data(post_slug=slug, post_field="title")
    await cb.message.answer(
        f"✏️ عنوان جدید پست:\n<blockquote>{p['title']}</blockquote>",
        parse_mode="HTML", reply_markup=k.kb([k.btn("◀️ بازگشت", f"post_view:{slug}")]))
    await cb.answer()


@router.callback_query(F.data.startswith("post_slug:"))
async def cb_post_slug(cb: CallbackQuery, state: FSMContext):
    slug = cb.data.split(":")[1]
    await state.set_state(PostEdit.value)
    await state.update_data(post_slug=slug, post_field="slug")
    await cb.message.answer(
        "🔗 اسلاگ انگلیسی جدید (فقط a-z و خط تیره):",
        reply_markup=k.kb([k.btn("◀️ بازگشت", f"post_view:{slug}")]))
    await cb.answer()


@router.message(PostEdit.value)
async def post_edit_value(message: Message, state: FSMContext):
    data = await state.get_data()
    slug, field = data.get("post_slug"), data.get("post_field")
    await state.clear()
    p = utils.load_post(slug) if slug else None
    if not p:
        return await message.answer("⚠️ پست پیدا نشد.")
    text = (message.text or "").strip()
    if field == "title":
        p["title"] = text
        p["h1"] = text
    elif field == "slug":
        new_slug = utils.slugify(text)
        if new_slug != slug:
            utils.delete_post(slug)
            p["slug"] = new_slug
            slug = new_slug
    utils.save_post(p)
    report = await rebuild_and_report(message)
    await message.answer(
        f"✅ ذخیره شد.\n{report}",
        reply_markup=k.kb([k.btn("👁 مشاهده پست", f"post_view:{slug}")]))


# ---------- add post flow
@router.callback_query(F.data == "post_add")
async def cb_post_add(cb: CallbackQuery, state: FSMContext):
    await state.set_state(AddPost.title)
    await state.update_data(new_post={})
    await edit_or_answer(cb,
        "📝 <b>افزودن پست (۱/۶)</b>\n\nعنوان پست را بنویسید (شامل کلمه کلیدی):",
        k.cancel_kb())


@router.message(AddPost.title)
async def post_title(message: Message, state: FSMContext):
    title = (message.text or "").strip()
    if len(title) < 8:
        return await message.answer("⚠️ عنوان باید کامل‌تر باشد. دوباره:")
    data = await state.get_data()
    data["new_post"]["title"] = title
    await state.update_data(new_post=data["new_post"])
    await state.set_state(AddPost.slug)
    await message.answer("📝 <b>افزودن پست (۲/۶)</b>\n\n🔗 اسلاگ انگلیسی (یا «خودکار»):", parse_mode="HTML")


@router.message(AddPost.slug)
async def post_slug(message: Message, state: FSMContext):
    text = (message.text or "").strip()
    data = await state.get_data()
    data["new_post"]["slug"] = utils.slugify(text) if text not in ("خودکار", "auto") else utils.slugify(data["new_post"]["title"])
    await state.update_data(new_post=data["new_post"])
    await state.set_state(AddPost.category)
    b = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=cat, callback_data=f"postcat:{i}") for i, cat in enumerate(POST_CATEGORIES[:2])],
        [InlineKeyboardButton(text=POST_CATEGORIES[2], callback_data="postcat:2")],
    ])
    await message.answer("📝 <b>افزودن پست (۳/۶)</b>\n\n🗂 دسته پست؟", reply_markup=b, parse_mode="HTML")


@router.callback_query(AddPost.category, F.data.startswith("postcat:"))
async def post_cat(cb: CallbackQuery, state: FSMContext):
    idx = int(cb.data.split(":")[1])
    data = await state.get_data()
    data["new_post"]["category"] = POST_CATEGORIES[idx]
    await state.update_data(new_post=data["new_post"])
    await state.set_state(AddPost.excerpt)
    await cb.message.edit_text("📝 <b>افزودن پست (۴/۶)</b>\n\n📋 خلاصه ۲ خطی پست (برای کارت وبلاگ):", parse_mode="HTML")
    await cb.answer()


@router.message(AddPost.excerpt)
async def post_excerpt(message: Message, state: FSMContext):
    data = await state.get_data()
    data["new_post"]["excerpt"] = (message.text or "").strip()
    await state.update_data(new_post=data["new_post"])
    await state.set_state(AddPost.content)
    await message.answer(
        "📝 <b>افزودن پست (۵/۶)</b>\n\n📄 محتوا: هر پیام = یک بلوک.\n"
        "— متن ساده = پاراگراف\n"
        "— <code>## تیتر</code> = تیتر بخش\n"
        "— <code>- مورد</code> = لیست (چند خط پشت هم)\n"
        "— <code>نکته: متن</code> = باکس نکته\n"
        "— <code>جدول: الف، ب / ۱،۲ / ۳،۴</code> = جدول\n\n"
        "وقتی تمام شد بنویسید: <code>پایان</code>", parse_mode="HTML")


@router.message(AddPost.content)
async def post_content(message: Message, state: FSMContext):
    text = (message.text or "").strip()
    data = await state.get_data()
    post = data["new_post"]
    post.setdefault("blocks", [])
    if text in ("پایان", "done", "end"):
        await state.set_state(AddPost.image)
        return await message.answer(
            "📝 <b>افزودن پست (۶/۶)</b>\n\n📷 عکس کاور پست را بفرستید یا بنویسید: <code>رد</code>",
            parse_mode="HTML", reply_markup=k.cancel_kb())
    if text.startswith("## "):
        post["blocks"].append({"type": "h2", "text": text[3:].strip()})
    elif text.startswith("### "):
        post["blocks"].append({"type": "h3", "text": text[4:].strip()})
    elif text.startswith("- "):
        items = [line[2:].strip() for line in text.split("\n") if line.startswith("- ")]
        post["blocks"].append({"type": "list", "items": items})
    elif text.startswith("نکته:"):
        post["blocks"].append({"type": "tip", "title": "نکته بدنه پلاس", "text": text[5:].strip()})
    elif text.startswith("جدول:"):
        rows_raw = [r.strip() for r in text[6:].split("/") if r.strip()]
        parsed = [[c.strip() for c in r.split("،")] for r in rows_raw]
        if parsed:
            post["blocks"].append({"type": "table", "headers": parsed[0], "rows": parsed[1:]})
    else:
        post["blocks"].append({"type": "p", "text": text})
    await state.update_data(new_post=post)
    await message.answer(f"✅ بلوک شماره {utils.fa(len(post['blocks']))} ثبت شد. بلوک بعدی یا «پایان»:")


@router.message(AddPost.image, F.photo)
async def post_image(message: Message, state: FSMContext):
    status = await message.answer("⏳ پردازش عکس…")
    file = await message.bot.get_file(message.photo[-1].file_id)
    buf = await message.bot.download_file(file.file_path)
    entry = utils.save_product_image(buf.read())
    data = await state.get_data()
    data["new_post"]["image"] = entry["key"]
    await state.update_data(new_post=data["new_post"])
    await status.delete()
    await finish_post(message, state)


@router.message(AddPost.image)
async def post_image_skip(message: Message, state: FSMContext):
    await finish_post(message, state)


async def finish_post(message: Message, state: FSMContext):
    data = await state.get_data()
    post = data["new_post"]
    await state.clear()
    words = utils.word_count({"blocks": post.get("blocks", [])})
    full_post = {
        "slug": post.get("slug") or utils.slugify(post.get("title", "post")),
        "title": post.get("title", ""),
        "meta_description": post.get("excerpt", "")[:150],
        "h1": post.get("title", ""),
        "category": post.get("category", "دانش خودرو"),
        "date": date.today().isoformat(),
        "read_time": max(2, round(words / 200)),
        "image": post.get("image") or "",
        "keywords": [],
        "excerpt": post.get("excerpt", ""),
        "blocks": post.get("blocks", []),
        "visible": True,
    }
    utils.save_post(full_post)
    report = await utils.rebuild_site()
    await message.answer(
        f"🎉 <b>پست منتشر شد!</b>\n\n📝 {full_post['title']}\n"
        f"🔗 /blog/{full_post['slug']}/\n"
        f"⏱ {utils.fa(full_post['read_time'])} دقیقه · {utils.fa(words)} کلمه\n"
        f"{'✅' if report[0] else '⚠️'} سایت به‌روز شد",
        reply_markup=k.kb([k.btn("📝 وبلاگ", "posts")]), parse_mode="HTML")


# ================================================================ STATS
@router.callback_query(F.data == "stats")
async def cb_stats(cb: CallbackQuery):
    if not is_admin(cb.from_user.id):
        return await cb.answer("⛔️ دسترسی ندارید", show_alert=True)
    doc, prods = get_products_sorted()
    cars = utils.load_cars()["cars"]
    posts = utils.load_posts()
    manifest = utils.load_manifest()
    visible = len([p for p in prods if p.get("visible", True)])
    site_status = await utils.check_site(config.load()["site_url"])
    await edit_or_answer(cb,
        "📊 <b>آمار و وضعیت</b>\n\n"
        f"📦 محصولات: {utils.fa(len(prods))} ({utils.fa(visible)} نمایش)\n"
        f"🚗 خودروها: {utils.fa(len(cars))}\n"
        f"📝 پست‌ها: {utils.fa(len(posts))}\n"
        f"🖼 عکس‌های بهینه: {utils.fa(len(manifest))}\n\n"
        f"🌐 {site_status}",
        k.stats_menu())


@router.callback_query(F.data == "visitstats")
async def cb_visit_stats(cb: CallbackQuery):
    """Site visit analytics: daily / monthly (Shamsi) + top pages."""
    if not is_admin(cb.from_user.id):
        return await cb.answer("⛔️ دسترسی ندارید", show_alert=True)
    await cb.answer("⏳ در حال محاسبه…")
    try:
        s = utils.visit_summary()
    except Exception as e:
        return await edit_or_answer(cb, f"⚠️ خطا در خواندن آمار:\n<code>{str(e)[:200]}</code>", k.stats_menu())
    if not s["has_data"]:
        return await edit_or_answer(cb,
            "📈 <b>بازدید سایت</b>\n\nهنوز آماری ثبت نشده است.\n"
            "سیستم آمار از الان فعال است و بازدیدها را ثبت می‌کند؛"
            "چند ساعتی بعد دوباره اینجا را باز کنید.",
            k.stats_menu())

    months_fa = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
                 "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"]
    day_lines = "\n".join(
        f"{utils.jdate_fa(d['date'])}: <b>{utils.fa(d['count'])}</b>"
        for d in s["days"])
    month_lines = "\n".join(
        f"{months_fa[int(m.split('-')[1]) - 1]} {utils.fa(m.split('-')[0])}: <b>{utils.fa(c)}</b>"
        for m, c in sorted(s["by_month"].items(), reverse=True)[:4])
    top_lines = "\n".join(
        f"{p.replace('/', ' › ').strip(' › ') or 'خانه'}: <b>{utils.fa(c)}</b>"
        for p, c in sorted(s["by_page"].items(), key=lambda x: -x[1])[:6])
    await edit_or_answer(cb,
        "📈 <b>بازدید سایت</b>\n\n"
        f" امروز: <b>{utils.fa(s['today'])}</b> ({utils.fa(s['today_unique'])} بازدیدکننده‌ی یکتا)\n"
        f" دیروز: <b>{utils.fa(s['yesterday'])}</b>\n"
        f" مجموع کل: <b>{utils.fa(s['total'])}</b>\n\n"
        f"📅 <b>۷ روز اخیر</b>\n{day_lines}\n\n"
        f"🗓 <b>ماهانه (شمسی)</b>\n{month_lines}\n\n"
        f"🔥 <b>پربازدیدترین صفحه‌ها</b>\n{top_lines}",
        k.stats_menu())


@router.callback_query(F.data == "postviews")
async def cb_post_views(cb: CallbackQuery):
    """Per-article views with Shamsi dates."""
    if not is_admin(cb.from_user.id):
        return await cb.answer("⛔️ دسترسی ندارید", show_alert=True)
    await cb.answer("⏳ در حال محاسبه…")
    posts = utils.load_posts()
    post_by_path = {f"/blog/{p['slug']}/": p for p in posts}
    try:
        s = utils.visit_summary()
    except Exception as e:
        return await edit_or_answer(cb, f"⚠️ خطا در خواندن آمار:\n<code>{str(e)[:200]}</code>", k.stats_menu())

    blog_views = {p: c for p, c in s["by_page"].items() if p in post_by_path}
    if not blog_views:
        return await edit_or_answer(cb,
            "📝 <b>بازدید مقاله‌ها</b>\n\n"
            f"امروز {utils.jdate_fa(__import__('datetime').date.today().isoformat())} — هنوز بازدیدی از مقاله‌ها ثبت نشده است.",
            k.stats_menu())

    # this Shamsi month key
    import datetime as _dt
    import jdatetime
    today_j = jdatetime.date.fromgregorian(date=_dt.date.today())
    mkey = f"{today_j.year:04d}-{today_j.month:02d}"
    # per-post views for current month need per-post-day aggregation:
    per_post = {}
    per_post_month = {}
    for v in utils.load_visits():
        try:
            local = _dt.datetime.fromtimestamp(v["ts"], utils._tehran())
        except Exception:
            continue
        if v["page"] not in post_by_path:
            continue
        per_post[v["page"]] = per_post.get(v["page"], 0) + 1
        jd = jdatetime.date.fromgregorian(date=local.date())
        if f"{jd.year:04d}-{jd.month:02d}" == mkey:
            per_post_month[v["page"]] = per_post_month.get(v["page"], 0) + 1

    months_fa = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
                 "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"]
    lines = []
    for path, total in sorted(per_post.items(), key=lambda x: -x[1]):
        p = post_by_path[path]
        m_count = per_post_month.get(path, 0)
        lines.append(
            f"\n📖 <b>{p['title'][:44]}</b>\n"
            f"   مجموع: <b>{utils.fa(total)}</b> · این ماه ({months_fa[today_j.month - 1]}): <b>{utils.fa(m_count)}</b> · انتشار: {utils.jdate_fa(p['date'])}")
    await edit_or_answer(cb,
        "📝 <b>بازدید مقاله‌ها</b>\n"
        f"🗓 امروز: {utils.jdate_fa(_dt.date.today().isoformat())}\n"
        f"مجموع بازدید همه‌ی مقاله‌ها: <b>{utils.fa(sum(per_post.values()))}</b>\n"
        + "\n".join(lines),
        k.stats_menu())


@router.callback_query(F.data == "rebuild")
async def cb_rebuild(cb: CallbackQuery):
    await cb.answer("⏳ در حال بازسازی…")
    ok, out = await utils.rebuild_site()
    await edit_or_answer(cb,
        "✅ سایت بازسازی شد." if ok else f"⚠️ خطا در بازسازی:\n<code>{out[-300:]}</code>",
        k.stats_menu())
    if ok:
        await cb.answer("✅ انجام شد")


# ================================================================ fallback
@router.callback_query()
async def cb_fallback(cb: CallbackQuery):
    await cb.answer()


@router.message()
async def msg_fallback(message: Message, state: FSMContext):
    current = await state.get_state()
    if current:
        return  # active FSM handlers already matched; ignore others silently
    if not await guard(message):
        return await message.answer(TEXTS["unauthorized"] % message.from_user.id)
    await message.answer(
        "🤖 دستور را متوجه نشدم.\nبرای باز کردن پنل مدیریت /start را بزنید.",
        reply_markup=k.main_menu(0, 0))


# ================================================================ main
async def main():
    global CFG
    CFG = config.load()
    token = CFG.get("token")
    if not token:
        print("❌ توکن یافت نشد! اول setup.py را اجرا کنید یا bot/config.json را ویرایش کنید.")
        sys.exit(1)
    bot = Bot(token)
    dp = Dispatcher(storage=MemoryStorage())
    dp.include_router(router)
    await bot.delete_webhook(drop_pending_updates=True)
    me = await bot.get_me()
    log.info("Bot @%s started — admins: %s", me.username, CFG.get("admin_ids"))
    await dp.start_polling(bot, allowed_updates=["message", "callback_query"])


if __name__ == "__main__":
    asyncio.run(main())
