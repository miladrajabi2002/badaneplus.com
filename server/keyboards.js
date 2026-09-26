// تمام کیبوردهای inline ربات — پورت وفادار keyboards.py به grammY
const { InlineKeyboard } = require('grammy');
const { fa, priceFa } = require('./utils');

function kb(...rows) {
  const k = new InlineKeyboard();
  rows.forEach((row, i) => {
    for (const b of row) {
      if (b.url) k.url(b.text, b.url);
      else k.text(b.text, b.data);
    }
    if (i < rows.length - 1) k.row();
  });
  return k;
}

function btn(text, data, url) {
  return url ? { text, url } : { text, data };
}

const CLOSE = btn('🗑 بستن', 'close');
const BACK_MAIN = btn('◀️ منوی اصلی', 'main');
const BACK_PRODUCTS = btn('◀️ محصولات', 'products');
const BACK_SETTINGS = btn('◀️ تنظیمات', 'settings');
const BACK_POSTS = btn('◀️ وبلاگ', 'posts');

// ---------------------------------------------------------------- منوی اصلی
function mainMenu(productCount, postCount) {
  return kb(
    [btn(`📦 محصولات (${fa(productCount)})`, 'products'), btn(`📝 وبلاگ (${fa(postCount)})`, 'posts')],
    [btn('⚙️ تنظیمات سایت', 'settings'), btn('📊 آمار و وضعیت', 'stats')],
    [CLOSE],
  );
}

// ---------------------------------------------------------------- محصولات
function productsMenu(total, visible) {
  return kb(
    [btn('➕ افزودن محصول', 'prod_add')],
    [btn('📋 لیست محصولات', 'prod_list:0')],
    [btn('🚗 مدیریت خودروها', 'cars'), btn('🏷 دسته‌بندی‌ها', 'cats')],
    [BACK_MAIN, CLOSE],
  );
}

function productList(products, page, perPage = 6) {
  const k = new InlineKeyboard();
  const start = page * perPage;
  const chunk = products.slice(start, start + perPage);
  for (const p of chunk) {
    const vis = p.visible !== false ? '🟢' : '⚪️';
    const price = p.price_on_call ? '📞' : '💰';
    k.text(`${vis} ${price} ${String(p.name).slice(0, 38)}`, `prod_view:${p.id}`).row();
  }
  const pages = Math.max(1, Math.ceil(products.length / perPage));
  const nav = [];
  if (page > 0) nav.push(btn('◀️ قبلی', `prod_list:${page - 1}`));
  nav.push(btn(`${fa(page + 1)}/${fa(pages)}`, 'noop'));
  if (page < pages - 1) nav.push(btn('بعدی ▶️', `prod_list:${page + 1}`));
  nav.forEach((b, i) => { k.text(b.text, b.data); if (i < nav.length - 1) k.row(); });
  k.row();
  k.text('➕ افزودن محصول', 'prod_add').row();
  k.text(BACK_PRODUCTS.text, BACK_PRODUCTS.data).text(CLOSE.text, CLOSE.data);
  return k;
}

function productDetail(p) {
  const rows = [
    [btn('✏️ ویرایش', `prod_edit:${p.id}`), btn('🗑 حذف', `prod_del:${p.id}`)],
  ];
  const visTxt = p.visible !== false ? '🙈 مخفی کن' : '👁 نمایش بده';
  rows.push([btn(visTxt, `prod_toggle:${p.id}`)]);
  if (p.image) {
    rows.push([btn('📷 تعویض عکس', `prod_photo:${p.id}`), btn('❌ حذف عکس', `prod_delphoto:${p.id}`)]);
  } else {
    rows.push([btn('📷 افزودن عکس', `prod_photo:${p.id}`)]);
  }
  rows.push([btn('⬆️', `prod_up:${p.id}`), btn('⬇️', `prod_down:${p.id}`), btn(`🔗 ترتیب: ${fa(p.order || 0)}`, 'noop')]);
  rows.push([btn('◀️ لیست', 'prod_list:0'), BACK_MAIN, CLOSE]);
  return kb(...rows);
}

function productEditFields(p) {
  return kb(
    [btn(`📝 نام: ${String(p.name).slice(0, 25)}`, `pf_name:${p.id}`)],
    [btn(`🚗 خودرو: ${p._car_name || '—'}`, `pf_car:${p.id}`)],
    [btn(`🏷 دسته: ${p._cat_name || '—'}`, `pf_cat:${p.id}`)],
    [btn(`💰 قیمت: ${p.price_on_call ? 'استعلام تلفنی' : priceFa(p.price)}`, `pf_price:${p.id}`)],
    [btn(`🎨 برچسب‌ها: ${(p.badges || []).join('، ') || '—'}`, `pf_badges:${p.id}`)],
    [btn(`🖌 رنگ‌ها: ${(p.colors || []).join('، ') || '—'}`, `pf_colors:${p.id}`)],
    [btn('📄 توضیحات', `pf_desc:${p.id}`)],
    [btn(`📦 موجودی: ${p.in_stock !== false ? 'موجود ✅' : 'ناموجود ⛔️'}`, `pf_stock:${p.id}`)],
    [btn('◀️ بازگشت به محصول', `prod_view:${p.id}`)],
  );
}

function carPicker(callbackPrefix, cars, includeNone = false) {
  const rows = [];
  let row = [];
  for (const c of cars) {
    row.push(btn(c.name, `${callbackPrefix}:${c.id}`));
    if (row.length === 2) { rows.push(row); row = []; }
  }
  if (row.length) rows.push(row);
  if (includeNone) rows.push([btn('⛔️ بدون خودرو', `${callbackPrefix}:none`)]);
  rows.push([btn('❌ لغو', 'prod_cancel_add')]);
  return kb(...rows);
}

function catPicker(callbackPrefix, cats) {
  const rows = [];
  let row = [];
  for (const c of cats) {
    row.push(btn(c.name, `${callbackPrefix}:${c.id}`));
    if (row.length === 2) { rows.push(row); row = []; }
  }
  if (row.length) rows.push(row);
  rows.push([btn('❌ لغو', 'prod_cancel_add')]);
  return kb(...rows);
}

const BADGE_OPTIONS = ['فابریک', 'رنگ کوره‌ای', 'اصل', 'آماده رنگ', 'تخفیف‌دار', 'پرفروش'];

function badgePicker(selected, pid = 'new') {
  const k = new InlineKeyboard();
  for (const badge of BADGE_OPTIONS) {
    const mark = selected.includes(badge) ? '✅ ' : '▫️ ';
    k.text(mark + badge, `badge:${pid}:${badge}`).row();
  }
  k.text('✅ ادامه', `badges_done:${pid}`).row();
  k.text('❌ لغو', 'prod_cancel_add');
  return k;
}

function confirmAdd(pid = 'new') {
  return kb(
    [btn('✅ ثبت محصول', `prod_save:${pid}`)],
    [btn('❌ لغو', 'prod_cancel_add')],
  );
}

function confirmDelete(pid) {
  return kb(
    [btn('🗑 بله، حذف کن', `prod_delconfirm:${pid}`), btn('❌ نه، پشیمون شدم', `prod_view:${pid}`)],
  );
}

function cancelKb() {
  return kb([btn('❌ لغو عملیات', 'prod_cancel_add')]);
}

// ---------------------------------------------------------------- خودروها
function carsMenu(cars) {
  const k = new InlineKeyboard();
  for (const c of cars) {
    const mark = c.active ? '🟢' : '⚪️';
    const has = (c._products || []).length;
    k.text(`${mark} ${c.name}${has ? ` · ${fa(has)} قطعه` : ''}`, `car_view:${c.id}`).row();
  }
  k.text('➕ افزودن خودرو', 'car_add').row();
  k.text(BACK_PRODUCTS.text, BACK_PRODUCTS.data).text(CLOSE.text, CLOSE.data);
  return k;
}

function carDetail(car) {
  const delBtn = !['206', 'samand', '405', 'pride'].includes(car.id)
    ? [btn('🗑 حذف خودرو', `car_del:${car.id}`)]
    : [btn('ℹ️ خودرو اصلی — حذف نمی‌شود', 'noop')];
  return kb(
    [btn('✏️ تغییر نام', `car_name:${car.id}`)],
    [btn('📝 ویرایش متن سئو', `car_seo:${car.id}`)],
    [btn(car.active ? '👁 فعال/غیرفعال' : '⚪️ فعال‌سازی', `car_toggle:${car.id}`)],
    delBtn,
    [btn('◀️ خودروها', 'cars'), BACK_MAIN, CLOSE],
  );
}

// ---------------------------------------------------------------- تنظیمات
function settingsMenu() {
  return kb(
    [btn('📞 شماره تماس', 'set:phone'), btn('📱 موبایل', 'set:mobile')],
    [btn('📍 آدرس', 'set:address'), btn('🕐 ساعات کاری', 'set:hours')],
    [btn('🗺 لینک‌های نقشه', 'set:maps')],
    [btn('🖼 عکس هیرو (تصویر اصلی سایت)', 'heroimg')],
    [btn('🌐 سئو و برند', 'set:seo')],
    [BACK_MAIN, CLOSE],
  );
}

function settingsMapsMenu() {
  return kb(
    [btn('🗺 بلد', 'set:map_balad')],
    [btn('🗺 نشان', 'set:map_neshan')],
    [btn('🗺 گوگل‌مپ', 'set:map_google')],
    [btn('📍 مختصات جغرافیایی', 'set:geo')],
    [BACK_SETTINGS, CLOSE],
  );
}

function settingsSeoMenu() {
  return kb(
    [btn('🏷 نام برند', 'set:brand')],
    [btn('🎯 پیشنهادهای عنوان هیرو', 'heropresets')],
    [btn('✨ متن هیرو (دستی)', 'set:hero')],
    [btn('📄 زیرعنوان هیرو', 'set:herosub')],
    [BACK_SETTINGS, CLOSE],
  );
}

function heroPresetsMenu(presets) {
  const rows = presets.map(([t1, t2], i) => [btn(`${fa(i + 1)}. ${t1} ${t2}`, `heropreset:${i}`)]);
  return kb(...rows, [btn('✨ نوشتن دستی', 'set:hero'), BACK_SETTINGS, CLOSE]);
}

/** زیرمنوی ویرایش متن سئوی خودرو (جدید — رفع دکمه مرده) */
function carSeoMenu(cid) {
  return kb(
    [btn('📝 عنوان سئو', `carseo:title:${cid}`)],
    [btn('📄 توضیحات متا', `carseo:desc:${cid}`)],
    [btn('📖 متن معرفی صفحه', `carseo:intro:${cid}`)],
    [btn('◀️ بازگشت به خودرو', `car_view:${cid}`)],
  );
}

function backTo(section) {
  const key = { settings: BACK_SETTINGS, posts: BACK_POSTS, products: BACK_PRODUCTS }[section] || BACK_MAIN;
  return kb([key, CLOSE]);
}

// ---------------------------------------------------------------- پست‌ها
function postsMenu(count) {
  return kb(
    [btn('📋 لیست پست‌ها', 'posts_list:0')],
    [btn('➕ افزودن پست', 'post_add')],
    [BACK_MAIN, CLOSE],
  );
}

function postsList(posts, page, perPage = 5) {
  const k = new InlineKeyboard();
  const start = page * perPage;
  for (const p of posts.slice(start, start + perPage)) {
    const mark = p.visible !== false ? '🟢' : '⚪️';
    k.text(`${mark} ${String(p.title).slice(0, 40)}`, `post_view:${p.slug}`).row();
  }
  const pages = Math.max(1, Math.ceil(posts.length / perPage));
  const nav = [];
  if (page > 0) nav.push(btn('◀️ قبلی', `posts_list:${page - 1}`));
  nav.push(btn(`${fa(page + 1)}/${fa(pages)}`, 'noop'));
  if (page < pages - 1) nav.push(btn('بعدی ▶️', `posts_list:${page + 1}`));
  nav.forEach((b) => k.text(b.text, b.data));
  k.row();
  k.text(BACK_POSTS.text, BACK_POSTS.data).text(CLOSE.text, CLOSE.data);
  return k;
}

function postDetail(p) {
  return kb(
    [btn('👁 نمایش/مخفی در سایت', `post_toggle:${p.slug}`)],
    [btn('✏️ تغییر عنوان', `post_title:${p.slug}`)],
    [btn('🔗 تغییر اسلاگ', `post_slug:${p.slug}`)],
    [btn('🗑 حذف پست', `post_del:${p.slug}`)],
    [btn('◀️ لیست پست‌ها', 'posts_list:0'), CLOSE],
  );
}

function postConfirmDelete(slug) {
  return kb(
    [btn('🗑 بله، حذف کن', `post_delconfirm:${slug}`), btn('❌ نه', `post_view:${slug}`)],
  );
}

function postCatPicker(categories) {
  const k = new InlineKeyboard();
  k.text(categories[0], 'postcat:0').text(categories[1], 'postcat:1').row();
  k.text(categories[2], 'postcat:2');
  return k;
}

// ---------------------------------------------------------------- آمار
function statsMenu() {
  return kb(
    [btn('📈 بازدید سایت (روزانه/ماهانه)', 'visitstats')],
    [btn('📝 بازدید مقاله‌ها', 'postviews')],
    [btn('🔄 بازسازی دستی سایت', 'rebuild')],
    [BACK_MAIN, CLOSE],
  );
}

module.exports = {
  kb, btn, CLOSE, BACK_MAIN, BACK_PRODUCTS, BACK_SETTINGS, BACK_POSTS,
  mainMenu, productsMenu, productList, productDetail, productEditFields,
  carPicker, catPicker, BADGE_OPTIONS, badgePicker, confirmAdd, confirmDelete, cancelKb,
  carsMenu, carDetail, carSeoMenu, settingsMenu, settingsMapsMenu, settingsSeoMenu,
  heroPresetsMenu, backTo, postsMenu, postsList, postDetail, postConfirmDelete, postCatPicker,
  statsMenu,
};
