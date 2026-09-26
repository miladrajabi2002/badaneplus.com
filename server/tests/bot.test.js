// تست جامع ربات تلگرام — تمام عملیات‌ها با آپدیت‌های ماک‌شده
// شامل: ادعای ادمین، محصولات (CRUD کامل)، خودروها، تنظیمات، هیرو، وبلاگ، آمار، امنیت
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { makeTempEnv, seedAdmin, mockBot, msgUpdate, photoUpdate, cbUpdate, lastCall, kbHas, kbButtons, tinyPng } = require('./helpers');

const env = makeTempEnv();
seedAdmin(111); // ادمین از قبل ثبت شده

const { createBot } = require('../bot');
const utils = require('../utils');
const analytics = require('../analytics');
const { createApp } = require('../app');

const ADMIN = 111;
const STRANGER = 999;

let calls;
let drive;

async function setup() {
  const { bot } = createBot({
    downloadPhoto: async () => tinyPng(),
    checkSite: async () => '✅ سایت آنلاین (HTTP 200)',
  });
  calls = await mockBot(bot);
  drive = (update) => bot.handleUpdate(update);
}

// ---------------------------------------------------------------- منو و دسترسی
test('setup', async () => { await setup(); });

test('/start ادمین: خوش‌آمد + منوی اصلی', async () => {
  await drive(msgUpdate(ADMIN, '/start'));
  const p = lastCall(calls, 'sendMessage', ADMIN);
  assert.ok(p.text.includes('پنل مدیریت بدنه پلاس'), 'متن خوش‌آمد');
  assert.ok(p.text.includes('۱۰'), 'تعداد محصولات فارسی');
  assert.ok(kbHas(p.reply_markup ? p : { reply_markup: p.reply_markup }, '📦 محصولات (۱۰)', 'products'));
});

test('/start کاربر غیرمجاز: پیام دسترسی ندارید + شناسه چت', async () => {
  await drive(msgUpdate(STRANGER, '/start'));
  const p = lastCall(calls, 'sendMessage', STRANGER);
  assert.ok(p.text.includes('دسترسی ندارید'));
  assert.ok(p.text.includes(String(STRANGER)));
});

test('ادعای ادمین: اولین /start در نصب تازه', async () => {
  // state فعلی ادمین دارد؛ با فایل تازه (خالی) سناریوی نصب اول را شبیه‌سازی می‌کنیم
  const stateFile = path.join(env.var, 'bot-state.json');
  fs.writeFileSync(stateFile, JSON.stringify({ admin_ids: [] }));
  await drive(msgUpdate(555, '/start'));
  // اولین پیام = خوش‌آمد ادمین (ادعا)، سپس پنل اصلی
  const first = calls.find((c) => c.method === 'sendMessage' && c.payload.chat_id === 555);
  assert.ok(first && first.payload.text.includes('خوش آمدید مدیر'), 'ادعا موفق');
  assert.deepEqual(JSON.parse(fs.readFileSync(stateFile, 'utf8')).admin_ids, [555]);
  seedAdmin(111); // برگرداندن برای ادامه تست‌ها
});

test('/id: برگرداندن شناسه چت', async () => {
  await drive(msgUpdate(ADMIN, '/id'));
  const p = lastCall(calls, 'sendMessage', ADMIN);
  assert.ok(p.text.includes(String(ADMIN)));
});

test('کال‌بک main: ویرایش پیام به منوی اصلی', async () => {
  await drive(cbUpdate(ADMIN, 'main'));
  const p = lastCall(calls, 'editMessageText');
  assert.ok(p.text.includes('پنل مدیریت بدنه پلاس'));
});

test('کال‌بک close: حذف پیام', async () => {
  await drive(cbUpdate(ADMIN, 'close'));
  assert.ok(calls.some((c) => c.method === 'deleteMessage'));
});

test('امنیت: کال‌بک از کاربر غیرمجاز رد می‌شود', async () => {
  await drive(cbUpdate(STRANGER, 'products'));
  const c = calls[calls.length - 1];
  assert.equal(c.method, 'answerCallbackQuery');
  assert.ok(c.payload.text.includes('دسترسی ندارید'));
});

// ---------------------------------------------------------------- محصولات
test('منوی محصولات', async () => {
  await drive(cbUpdate(ADMIN, 'products'));
  const p = lastCall(calls, 'editMessageText');
  assert.ok(p.text.includes('مدیریت محصولات'));
  assert.ok(p.text.includes('۱۰'));
});

test('لیست محصولات صفحه ۰ + صفحه‌بندی', async () => {
  await drive(cbUpdate(ADMIN, 'prod_list:0'));
  const p = lastCall(calls, 'editMessageText');
  const btns = kbButtons(p);
  assert.equal(btns.filter((b) => (b.callback_data || '').startsWith('prod_view:')).length, 6, '۶ محصول در هر صفحه');
  assert.ok(btns.some((b) => b.callback_data === 'prod_list:1'), 'دکمه صفحه بعد');
  await drive(cbUpdate(ADMIN, 'prod_list:1'));
  const p2 = lastCall(calls, 'editMessageText');
  assert.ok(kbButtons(p2).some((b) => b.callback_data === 'prod_list:0'), 'دکمه صفحه قبل');
});

test('مشاهده محصول: کارت + ارسال عکس واقعی (رفع باگ)', async () => {
  await drive(cbUpdate(ADMIN, 'prod_view:p-001'));
  // عکس محصول ارسال شود (رفع باگ نسخه پایتون که فقط متن می‌فرستاد)
  const photo = lastCall(calls, 'sendPhoto', ADMIN);
  assert.ok(photo, 'sendPhoto فراخوانی شد');
  assert.ok(photo.caption.includes('عکس فعلی محصول'));
  const p = lastCall(calls, 'editMessageText');
  assert.ok(p.text.includes('کاپوت پژو ۲۰۶'));
  assert.ok(p.text.includes('۱۴،۸۰۰،۰۰۰'), 'قیمت با فرمت فارسی');
  // دکمه مدیریت زیر عکس
  assert.ok(kbHas(photo, '⬇️ مدیریت این محصول', 'prod_viewtxt:p-001'));
});

test('نمایش/مخفی محصول: فایل واقعی تغییر کند', async () => {
  await drive(cbUpdate(ADMIN, 'prod_toggle:p-001'));
  const doc = utils.loadProducts();
  const p = doc.products.find((x) => x.id === 'p-001');
  assert.equal(p.visible, false, 'مخفی شد');
  await drive(cbUpdate(ADMIN, 'prod_toggle:p-001'));
  assert.equal(utils.loadProducts().products.find((x) => x.id === 'p-001').visible, true, 'نمایش برگشت');
});

test('جابه‌جایی ترتیب بالا/پایین', async () => {
  // ترتیب اولیه: p-001 اول
  let sorted = [...utils.loadProducts().products].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  assert.equal(sorted[0].id, 'p-001');
  assert.equal(sorted[1].id, 'p-002');

  await drive(cbUpdate(ADMIN, 'prod_up:p-002')); // p-002 جای p-001 را بگیرد
  sorted = [...utils.loadProducts().products].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  assert.equal(sorted[0].id, 'p-002', 'p-002 به ابتدا آمد');
  assert.equal(sorted[1].id, 'p-001');

  // p-002 الان اول است → prod_up دیگر کاری نکند
  await drive(cbUpdate(ADMIN, 'prod_up:p-002'));
  sorted = [...utils.loadProducts().products].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  assert.equal(sorted[0].id, 'p-002', 'در ابتدای لیست است');

  await drive(cbUpdate(ADMIN, 'prod_down:p-002')); // برگرداندن
  sorted = [...utils.loadProducts().products].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  assert.equal(sorted[0].id, 'p-001', 'برگشت به حالت اول');
});

test('جریان کامل افزودن محصول (۸ مرحله + عکس)', async () => {
  await drive(cbUpdate(ADMIN, 'prod_add'));
  assert.ok(lastCall(calls, 'editMessageText').text.includes('۱/۸'));

  await drive(msgUpdate(ADMIN, 'کاپوت پژو ۲۰۶ — قرمز'));
  let p = lastCall(calls, 'sendMessage', ADMIN);
  assert.ok(p.text.includes('۲/۸'));
  assert.ok(kbButtons(p).some((b) => b.callback_data === 'addcar:206'));

  await drive(cbUpdate(ADMIN, 'addcar:206'));
  assert.ok(lastCall(calls, 'editMessageText').text.includes('۳/۸'));

  await drive(cbUpdate(ADMIN, 'addcat:hood'));
  assert.ok(lastCall(calls, 'editMessageText').text.includes('۴/۸'));

  await drive(msgUpdate(ADMIN, '۱۲۳۴۵۶۷۸')); // عدد فارسی!
  p = lastCall(calls, 'sendMessage', ADMIN);
  assert.ok(p.text.includes('۵/۸'), 'پارس قیمت فارسی');

  await drive(cbUpdate(ADMIN, 'badge:new:رنگ کوره‌ای'));
  const rp = lastCall(calls, 'editMessageReplyMarkup');
  assert.ok(kbButtons(rp).some((b) => b.text.includes('✅ رنگ کوره‌ای')), 'برچسب تیک خورد');

  await drive(cbUpdate(ADMIN, 'badges_done:new'));
  assert.ok(lastCall(calls, 'editMessageText').text.includes('۶/۸'));

  await drive(msgUpdate(ADMIN, 'قرمز، مشکی'));
  assert.ok(lastCall(calls, 'sendMessage', ADMIN).text.includes('۷/۸'));

  await drive(msgUpdate(ADMIN, 'کاپوت فابریک با رنگ قرمز کوره‌ای.'));
  assert.ok(lastCall(calls, 'sendMessage', ADMIN).text.includes('۸/۸'));

  await drive(photoUpdate(ADMIN)); // عکس (ماک‌شده → tinyPng)
  const preview = lastCall(calls, 'sendMessage', ADMIN);
  assert.ok(preview.text.includes('پیش‌نمایش محصول جدید'));
  assert.ok(preview.text.includes('دارد ✅'), 'عکس ثبت شد');

  await drive(cbUpdate(ADMIN, 'prod_save:new'));
  const done = lastCall(calls, 'editMessageText');
  assert.ok(done.text.includes('محصول ثبت شد'));

  // بررسی فایل واقعی
  const doc = utils.loadProducts();
  const added = doc.products.find((x) => x.name === 'کاپوت پژو ۲۰۶ — قرمز');
  assert.ok(added, 'در فایل ذخیره شد');
  assert.equal(added.price, 12345678, 'قیمت عددی');
  assert.equal(added.price_on_call, false);
  assert.deepEqual(added.badges, ['رنگ کوره‌ای']);
  assert.deepEqual(added.colors, ['قرمز', 'مشکی']);
  assert.ok(added.image, 'کلید عکس');
  assert.equal(added.car, '206');
  assert.equal(added.category, 'hood');
  // عکس‌های WebP واقعا ساخته شده‌اند
  assert.ok(fs.existsSync(path.join(env.assets, 'img', 'products', `${added.image}-full.webp`)));
  assert.ok(fs.existsSync(path.join(env.assets, 'img', 'products', `${added.image}-card.webp`)));
  // منیفست به‌روز شده
  const manifest = utils.loadManifest();
  assert.ok(manifest[added.image].full.startsWith('/assets/'), 'مسیر مطلق در منیفست (رفع باگ)');
});

test('ویرایش محصول: نام و قیمت', async () => {
  await drive(cbUpdate(ADMIN, 'prod_edit:p-001'));
  let p = lastCall(calls, 'editMessageText');
  assert.ok(p.text.includes('ویرایش محصول'));

  await drive(cbUpdate(ADMIN, 'pf_name:p-001'));
  assert.ok(lastCall(calls, 'sendMessage', ADMIN).text.includes('نام جدید'));

  await drive(msgUpdate(ADMIN, 'کاپوت پژو ۲۰۶ — سفید (فابریک)'));
  assert.ok(lastCall(calls, 'sendMessage', ADMIN).text.includes('ذخیره شد'));
  assert.equal(utils.loadProducts().products.find((x) => x.id === 'p-001').name, 'کاپوت پژو ۲۰۶ — سفید (فابریک)');

  await drive(cbUpdate(ADMIN, 'pf_price:p-001'));
  await drive(msgUpdate(ADMIN, 'تماس'));
  const doc = utils.loadProducts();
  const prod = doc.products.find((x) => x.id === 'p-001');
  assert.equal(prod.price, 0);
  assert.equal(prod.price_on_call, true, '«تماس» → استعلام تلفنی');
});

test('ویرایش برچسب‌ها + ادامه → بازگشت به کارت (رفع باگ پایتون)', async () => {
  await drive(cbUpdate(ADMIN, 'prod_edit:p-002'));
  await drive(cbUpdate(ADMIN, 'pf_badges:p-002'));
  await drive(cbUpdate(ADMIN, 'badge:p-002:رنگ کوره‌ای'));
  const rp = lastCall(calls, 'editMessageReplyMarkup');
  assert.ok(kbButtons(rp).some((b) => b.text.includes('✅ رنگ کوره‌ای')));
  await drive(cbUpdate(ADMIN, 'badges_done:p-002'));
  const p = lastCall(calls, 'editMessageText');
  // در نسخه پایتون اینجا اشتباها سراغ «رنگ‌ها» از جریان افزودن می‌رفت!
  assert.ok(p.text.includes('سینی فن پژو ۲۰۶'), 'بازگشت به کارت محصول');
  assert.ok(p.text.includes('برچسب‌ها ذخیره شد'));
  assert.ok(utils.loadProducts().products.find((x) => x.id === 'p-002').badges.includes('رنگ کوره‌ای'));
});

test('موجودی: تغییر به ناموجود و برعکس', async () => {
  await drive(cbUpdate(ADMIN, 'pf_stock:p-003'));
  assert.equal(utils.loadProducts().products.find((x) => x.id === 'p-003').in_stock, false);
  await drive(cbUpdate(ADMIN, 'pf_stock:p-003'));
  assert.equal(utils.loadProducts().products.find((x) => x.id === 'p-003').in_stock, true);
});

test('تغییر خودرو و دسته محصول', async () => {
  await drive(cbUpdate(ADMIN, 'pf_car:p-004'));
  await drive(cbUpdate(ADMIN, 'setcar:p-004:samand'));
  assert.equal(utils.loadProducts().products.find((x) => x.id === 'p-004').car, 'samand');
  await drive(cbUpdate(ADMIN, 'pf_cat:p-004'));
  await drive(cbUpdate(ADMIN, 'setcat:p-004:hood'));
  assert.equal(utils.loadProducts().products.find((x) => x.id === 'p-004').category, 'hood');
});

test('تعویض عکس محصول (آپلود → پردازش → ذخیره)', async () => {
  await drive(cbUpdate(ADMIN, 'prod_photo:p-005'));
  await drive(photoUpdate(ADMIN));
  const doc = utils.loadProducts();
  const key = doc.products.find((x) => x.id === 'p-005').image;
  assert.ok(fs.existsSync(path.join(env.assets, 'img', 'products', `${key}-full.webp`)));
});

test('حذف محصول: تایید → حذف فایل + عکس', async () => {
  const before = utils.loadProducts().products.length;
  await drive(cbUpdate(ADMIN, 'prod_del:p-010'));
  assert.ok(lastCall(calls, 'editMessageText').text.includes('حذف محصول'));
  await drive(cbUpdate(ADMIN, 'prod_delconfirm:p-010'));
  const doc = utils.loadProducts();
  assert.equal(doc.products.length, before - 1);
  assert.ok(!doc.products.some((x) => x.id === 'p-010'));
});

test('لغو عملیات افزودن', async () => {
  await drive(cbUpdate(ADMIN, 'prod_add'));
  await drive(cbUpdate(ADMIN, 'prod_cancel_add'));
  const p = lastCall(calls, 'editMessageText');
  assert.ok(p.text.includes('عملیات لغو شد'));
});

// ---------------------------------------------------------------- خودروها
test('منوی خودروها با تعداد قطعه', async () => {
  await drive(cbUpdate(ADMIN, 'cars'));
  const p = lastCall(calls, 'editMessageText');
  const btns = kbButtons(p);
  assert.ok(btns.some((b) => b.callback_data === 'car_view:206' && b.text.includes('پژو ۲۰۶')));
  assert.ok(btns.some((b) => b.text.includes('قطعه')), 'تعداد قطعه نمایش داده شود');
});

test('مشاهده خودرو + تغییر نام (رفع دکمه مرده)', async () => {
  await drive(cbUpdate(ADMIN, 'car_view:samand'));
  assert.ok(lastCall(calls, 'editMessageText').text.includes('سمند'));
  await drive(cbUpdate(ADMIN, 'car_name:samand'));
  await drive(msgUpdate(ADMIN, 'سمند و سورن پلاس'));
  const car = utils.loadCars().cars.find((c) => c.id === 'samand');
  assert.equal(car.name, 'سمند و سورن پلاس');
  assert.equal(car.name_short, 'سمند و سورن پلاس');
});

test('ویرایش متن سئوی خودرو (رفع دکمه مرده)', async () => {
  await drive(cbUpdate(ADMIN, 'car_seo:206'));
  let p = lastCall(calls, 'editMessageText');
  assert.ok(kbButtons(p).some((b) => b.callback_data === 'carseo:title:206'));
  await drive(cbUpdate(ADMIN, 'carseo:title:206'));
  await drive(msgUpdate(ADMIN, 'عنوان سئوی جدید ۲۰۶'));
  assert.equal(utils.loadCars().cars.find((c) => c.id === '206').seo_title, 'عنوان سئوی جدید ۲۰۶');
});

test('دسته‌بندی‌ها: نمایش آماری (رفع دکمه مرده)', async () => {
  await drive(cbUpdate(ADMIN, 'cats'));
  const p = lastCall(calls, 'editMessageText');
  assert.ok(p.text.includes('دسته‌بندی‌ها'));
  assert.ok(p.text.includes('کاپوت'));
});

test('افزودن خودرو: نام + اسلاگ', async () => {
  await drive(cbUpdate(ADMIN, 'car_add'));
  await drive(msgUpdate(ADMIN, 'رانا'));
  assert.ok(lastCall(calls, 'sendMessage', ADMIN).text.includes('۲/۳'));
  await drive(msgUpdate(ADMIN, 'runna'));
  const doc = utils.loadCars();
  const car = doc.cars.find((c) => c.id === 'runna');
  assert.ok(car, 'خودرو ذخیره شد');
  assert.equal(car.slug, 'runna');
  assert.equal(car.active, true);
  assert.ok(car.seo_title.includes('رانا'));

  // اسلاگ تکراری رد شود
  await drive(cbUpdate(ADMIN, 'car_add'));
  await drive(msgUpdate(ADMIN, 'رانا دوباره'));
  await drive(msgUpdate(ADMIN, 'runna'));
  assert.ok(lastCall(calls, 'sendMessage', ADMIN).text.includes('تکراری'));
});

test('فعال/غیرفعال خودرو', async () => {
  await drive(cbUpdate(ADMIN, 'car_toggle:pride'));
  assert.equal(utils.loadCars().cars.find((c) => c.id === 'pride').active, false);
  await drive(cbUpdate(ADMIN, 'car_toggle:pride'));
  assert.equal(utils.loadCars().cars.find((c) => c.id === 'pride').active, true);
});

test('حذف خودرو دارای محصول → خطا', async () => {
  await drive(cbUpdate(ADMIN, 'car_del:206'));
  const c = calls[calls.length - 1];
  assert.ok(c.payload.text.includes('محصول دارد'));
});

// ---------------------------------------------------------------- تنظیمات
test('منوی تنظیمات با مقادیر فعلی', async () => {
  await drive(cbUpdate(ADMIN, 'settings'));
  const p = lastCall(calls, 'editMessageText');
  assert.ok(p.text.includes('تنظیمات سایت'));
  assert.ok(p.text.includes('02133900802'));
});

test('تغییر شماره تماس: فایل + نمایش فارسی', async () => {
  await drive(cbUpdate(ADMIN, 'set:phone'));
  await drive(msgUpdate(ADMIN, '02112345678'));
  const s = utils.loadSettings();
  assert.equal(s.contact.phone, '02112345678');
  assert.equal(s.contact.phone_display, '۰۲۱-۱۲۳۴۵۶۷۸'.replace(/-/g, ''), 'نمایش با رقم فارسی');
  // برگرداندن مقدار اصلی برای تست‌های بعدی
  await drive(cbUpdate(ADMIN, 'set:phone'));
  await drive(msgUpdate(ADMIN, '02133900802'));
});

test('تغییر آدرس + ساعات کاری + لینک نقشه', async () => {
  await drive(cbUpdate(ADMIN, 'set:address'));
  await drive(msgUpdate(ADMIN, 'تهران، خیابان تست، پلاک ۱'));
  assert.equal(utils.loadSettings().contact.address, 'تهران، خیابان تست، پلاک ۱');

  await drive(cbUpdate(ADMIN, 'set:hours'));
  await drive(msgUpdate(ADMIN, 'شنبه تا چهارشنبه · ۹ تا ۱۸'));
  assert.equal(utils.loadSettings().contact.hours, 'شنبه تا چهارشنبه · ۹ تا ۱۸');

  await drive(cbUpdate(ADMIN, 'set:maps'));
  await drive(cbUpdate(ADMIN, 'set:map_balad'));
  await drive(msgUpdate(ADMIN, 'https://balad.ir/test'));
  assert.equal(utils.loadSettings().contact.map_balad, 'https://balad.ir/test');
});

test('مختصات: فرمت غلط رد شود', async () => {
  await drive(cbUpdate(ADMIN, 'set:geo'));
  await drive(msgUpdate(ADMIN, 'خیابان آزادی'));
  assert.ok(lastCall(calls, 'sendMessage', ADMIN).text.includes('فرمت مختصات'));
});

test('عنوان هیرو دستی با جداکننده |', async () => {
  await drive(cbUpdate(ADMIN, 'set:seo'));
  await drive(cbUpdate(ADMIN, 'set:hero'));
  await drive(msgUpdate(ADMIN, 'خط اول تست | خط دوم تست'));
  const hero = utils.loadSettings().hero;
  assert.equal(hero.title_1, 'خط اول تست');
  assert.equal(hero.title_2, 'خط دوم تست');
});

test('پیشنهادهای عنوان هیرو: لیست + اعمال', async () => {
  await drive(cbUpdate(ADMIN, 'heropresets'));
  let p = lastCall(calls, 'editMessageText');
  assert.ok(p.text.includes('پیشنهادهای عنوان هیرو'));
  assert.ok(kbButtons(p).some((b) => b.callback_data === 'heropreset:2'));

  await drive(cbUpdate(ADMIN, 'heropreset:2'));
  const hero = utils.loadSettings().hero;
  assert.equal(hero.title_1, 'مرجع لوازم بدنه‌ی');
  assert.equal(hero.title_2, 'خودروهای ایرانی');
  p = lastCall(calls, 'editMessageText');
  assert.ok(p.text.includes('عنوان هیرو عوض شد'));
});

test('تعویض عکس هیرو: پردازش ۳:۴ + دو سایز WebP', async () => {
  await drive(cbUpdate(ADMIN, 'heroimg'));
  await drive(photoUpdate(ADMIN));
  const full = path.join(env.assets, 'img', 'site', 'hero-full.webp');
  const card = path.join(env.assets, 'img', 'site', 'hero-card.webp');
  assert.ok(fs.existsSync(full), 'hero-full.webp ساخته شد');
  assert.ok(fs.existsSync(card), 'hero-card.webp ساخته شد');
  const sharp = require('sharp');
  const meta = await sharp(full).metadata();
  assert.equal(meta.width, 864);
  assert.equal(meta.height, 1152);
  const p = lastCall(calls, 'editMessageText');
  assert.ok(p.text.includes('عکس هیرو عوض شد'));
});

test('لغو عکس هیرو با «رد»', async () => {
  await drive(cbUpdate(ADMIN, 'heroimg'));
  await drive(msgUpdate(ADMIN, 'رد'));
  assert.ok(lastCall(calls, 'sendMessage', ADMIN).text.includes('لغو شد'));
});

// ---------------------------------------------------------------- وبلاگ
test('منوی وبلاگ + لیست پست‌ها', async () => {
  await drive(cbUpdate(ADMIN, 'posts'));
  assert.ok(lastCall(calls, 'editMessageText').text.includes('مدیریت وبلاگ'));
  await drive(cbUpdate(ADMIN, 'posts_list:0'));
  const p = lastCall(calls, 'editMessageText');
  // مرتب‌سازی بر اساس تاریخ (جدیدترین اول) → nationwide-shipping-guide (2025-10-03) در صفحه اول
  assert.ok(kbButtons(p).some((b) => b.callback_data === 'post_view:nationwide-shipping-guide'));
  // صفحه دوم هم موجود باشد
  assert.ok(kbButtons(p).some((b) => b.callback_data === 'posts_list:1'));
  await drive(cbUpdate(ADMIN, 'posts_list:1'));
  const p2 = lastCall(calls, 'editMessageText');
  assert.ok(kbButtons(p2).some((b) => b.callback_data === 'post_view:kiln-paint-guide'), 'پست‌های قدیمی‌تر در صفحه ۲');
});

test('مشاهده پست با تاریخ شمسی', async () => {
  await drive(cbUpdate(ADMIN, 'post_view:kiln-paint-guide'));
  const p = lastCall(calls, 'editMessageText');
  assert.ok(p.text.includes('رنگ کوره‌ای چیست'));
  assert.ok(p.text.includes('شهریور'), 'تاریخ شمسی');
});

test('نمایش/مخفی پست (حالا واقعا در سایت اعمال می‌شود — رفع باگ)', async () => {
  await drive(cbUpdate(ADMIN, 'post_toggle:kiln-paint-guide'));
  assert.equal(utils.loadPost('kiln-paint-guide').visible, false);
  await drive(cbUpdate(ADMIN, 'post_toggle:kiln-paint-guide'));
  assert.equal(utils.loadPost('kiln-paint-guide').visible, true);
});

test('تغییر عنوان و اسلاگ پست', async () => {
  await drive(cbUpdate(ADMIN, 'post_title:pride-bumper-guide'));
  await drive(msgUpdate(ADMIN, 'راهنمای خرید سپر پراید (ویرایش شده)'));
  assert.equal(utils.loadPost('pride-bumper-guide').title, 'راهنمای خرید سپر پراید (ویرایش شده)');

  await drive(cbUpdate(ADMIN, 'post_slug:pride-bumper-guide'));
  await drive(msgUpdate(ADMIN, 'pride-bumper-new'));
  assert.ok(utils.loadPost('pride-bumper-new'), 'پست با اسلاگ جدید');
  assert.ok(!utils.loadPost('pride-bumper-guide'), 'اسلاگ قدیمی حذف شد');
});

test('جریان کامل افزودن پست (۶ مرحله + بلوک‌ها)', async () => {
  await drive(cbUpdate(ADMIN, 'post_add'));
  await drive(msgUpdate(ADMIN, 'راهنمای کامل خرید کاپوت ۲۰۶ تیپ ۵'));
  await drive(msgUpdate(ADMIN, '206-hood-guide-new'));
  await drive(cbUpdate(ADMIN, 'postcat:0')); // راهنمای خرید
  await drive(msgUpdate(ADMIN, 'خلاصه دو خطی درباره کاپوت ۲۰۶ تیپ ۵.'));

  // بلوک‌ها
  await drive(msgUpdate(ADMIN, '## چرا کاپوت فابریک؟'));
  await drive(msgUpdate(ADMIN, 'متن پاراگراف اول درباره کیفیت کاپوت.'));
  await drive(msgUpdate(ADMIN, '- مورد اول\n- مورد دوم\n- مورد سوم'));
  await drive(msgUpdate(ADMIN, 'نکته: هنگام خرید حتما کد رنگ خودرو را بگویید.'));
  await drive(msgUpdate(ADMIN, 'جدول: گزینه، توضیح / فابریک، پرس کارخانه / کوره‌ای، رنگ پخت‌شده'));
  await drive(msgUpdate(ADMIN, 'پایان'));

  // عکس کاور
  await drive(photoUpdate(ADMIN));

  const p = lastCall(calls, 'sendMessage', ADMIN);
  assert.ok(p.text.includes('پست منتشر شد'));

  const post = utils.loadPost('206-hood-guide-new');
  assert.ok(post, 'پست ذخیره شد');
  assert.equal(post.category, 'راهنمای خرید');
  assert.ok(post.image, 'عکس کاور ثبت شد');
  const types = post.blocks.map((b) => b.type);
  assert.deepEqual(types, ['h2', 'p', 'list', 'tip', 'table']);
  assert.deepEqual(post.blocks[2].items, ['مورد اول', 'مورد دوم', 'مورد سوم']);
  assert.deepEqual(post.blocks[4].headers, ['گزینه', 'توضیح']);
  assert.equal(post.blocks[4].rows.length, 2);
  assert.ok(post.read_time >= 2);
});

test('حذف پست', async () => {
  await drive(cbUpdate(ADMIN, 'post_del:206-hood-guide-new'));
  assert.ok(lastCall(calls, 'editMessageText').text.includes('حذف شود'));
  await drive(cbUpdate(ADMIN, 'post_delconfirm:206-hood-guide-new'));
  assert.ok(!utils.loadPost('206-hood-guide-new'), 'پست حذف شد');
});

// ---------------------------------------------------------------- آمار
test('منوی آمار و وضعیت', async () => {
  await drive(cbUpdate(ADMIN, 'stats'));
  const p = lastCall(calls, 'editMessageText');
  assert.ok(p.text.includes('آمار و وضعیت'));
  assert.ok(p.text.includes('سایت آنلاین'), 'بررسی سایت (ماک)');
});

test('بازدید سایت: روزانه/ماهانه شمسی + صفحات پربازدید', async () => {
  // ثبت بازدید تستی
  const db = require('../db');
  db.exec('DELETE FROM visits');
  const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile Safari/604.1';
  analytics.recordVisit({ ip: '80.1.1.1', page: '/', ua: UA });
  analytics.recordVisit({ ip: '80.1.1.2', page: '/', ua: UA });
  analytics.recordVisit({ ip: '80.1.1.3', page: '/blog/kiln-paint-guide/', ua: UA });
  analytics.recordVisit({ ip: '80.1.1.4', page: '/peugeot-206/', ua: UA });

  await drive(cbUpdate(ADMIN, 'visitstats'));
  const p = lastCall(calls, 'editMessageText');
  assert.ok(p.text.includes('بازدید سایت'));
  assert.ok(p.text.includes('امروز: <b>۴</b>'), 'شمارش امروز با رقم فارسی');
  assert.ok(p.text.includes('۷ روز اخیر'));
  assert.ok(p.text.includes('ماهانه (شمسی)'));
  assert.ok(p.text.includes('پربازدیدترین صفحه‌ها'));
  assert.ok(p.text.includes('خانه'));
});

test('بازدید مقاله‌ها: مجموع + ماه جاری + تاریخ انتشار', async () => {
  await drive(cbUpdate(ADMIN, 'postviews'));
  const p = lastCall(calls, 'editMessageText');
  assert.ok(p.text.includes('بازدید مقاله‌ها'));
  assert.ok(p.text.includes('رنگ کوره‌ای چیست'));
  assert.ok(p.text.includes('مجموع: <b>۱</b>'));
  assert.ok(p.text.includes('انتشار:'));
});

test('بازسازی دستی سایت', async () => {
  await drive(cbUpdate(ADMIN, 'rebuild'));
  const p = lastCall(calls, 'editMessageText');
  assert.ok(p.text.includes('سایت بازسازی شد'), 'در تست skip می‌شود ولی پیام موفق برمی‌گردد');
});

// ---------------------------------------------------------------- متفرقه
test('کال‌بک ناشناخته: پاسخ خاموش (fallback)', async () => {
  await drive(cbUpdate(ADMIN, 'unknown_action:xyz'));
  const c = calls[calls.length - 1];
  assert.equal(c.method, 'answerCallbackQuery');
});

test('پیام ناشناخته از ادمین: راهنما به /start', async () => {
  await drive(msgUpdate(ADMIN, 'سلام ربات'));
  const p = lastCall(calls, 'sendMessage', ADMIN);
  assert.ok(p.text.includes('دستور را متوجه نشدم'));
});

test('لینک‌ساز داخلی (linkify) برای سئو', async () => {
  const dataMod = await import('../../src/lib/data.js');
  const carsDoc = utils.loadCars();
  const linkify = dataMod.makeLinkifier(carsDoc.cars);
  const out = linkify('برای اطلاعات بیشتر درباره رنگ کوره‌ای چیست به مقاله مراجعه کنید.');
  assert.ok(out.includes('<a href="/blog/kiln-paint-guide/">رنگ کوره‌ای چیست</a>'), 'لینک مقاله تزریق شد');
});
