// ماژول محصولات و خودروها — پورت کامل بخش PRODUCTS + CARS از bot.py
const crypto = require('node:crypto');

module.exports = function registerProducts({ route, msgRoute, h }) {
  const { utils, k, editOrAnswer, rebuildAndReport, getProductsSorted, productCardText } = h;

  // ================================================================ محصولات: منو و لیست
  route({ exact: 'products' }, async (ctx) => {
    h.clearState(ctx.from.id);
    const { prods } = getProductsSorted();
    const visible = prods.filter((p) => p.visible !== false).length;
    const text =
      `📦 <b>مدیریت محصولات</b>\n\n` +
      `تعداد کل: <b>${utils.fa(prods.length)}</b>\n` +
      `نمایش در سایت: <b>${utils.fa(visible)}</b>\n\n` +
      `برای ویرایش، از لیست محصول را انتخاب کنید:`;
    await editOrAnswer(ctx, text, k.productsMenu(prods.length, visible));
  });

  route({ prefix: 'prod_list:' }, async (ctx) => {
    const page = parseInt(ctx.callbackQuery.data.split(':')[1], 10) || 0;
    const { prods } = getProductsSorted();
    if (!prods.length) {
      return editOrAnswer(
        ctx,
        '📋 هنوز محصولی ثبت نشده است.\nبا دکمه «افزودن محصول» شروع کنید 👇',
        k.kb([k.btn('➕ افزودن محصول', 'prod_add')], [k.BACK_PRODUCTS, k.CLOSE]),
      );
    }
    const text = `📋 <b>محصولات</b> (${utils.fa(prods.length)})\n\n🟢 نمایش · ⚪️ مخفی · 💰 قیمت دارد · 📢 استعلام تلفنی\nبرای مدیریت، محصول را انتخاب کنید:`;
    await editOrAnswer(ctx, text, k.productList(prods, page));
  });

  route({ prefix: 'prod_view:' }, async (ctx) => {
    const pid = ctx.callbackQuery.data.split(':')[1];
    const { prods } = getProductsSorted();
    const p = prods.find((x) => x.id === pid);
    if (!p) return ctx.answerCallbackQuery('⚠️ محصول پیدا نشد', { show_alert: true });
    const manifest = utils.loadManifest();
    // رفع باگ نسخه قبل: عکس واقعی محصول ارسال می‌شود (نه فقط متن)
    if (p.image && manifest[p.image]) {
      try {
        const abs = utils.absAssetPath(manifest[p.image].full);
        await ctx.replyWithPhoto(new h.InputFile(abs), {
          caption: '📷 عکس فعلی محصول 👇',
          reply_markup: k.kb([k.btn('⬇️ مدیریت این محصول', `prod_viewtxt:${pid}`)]),
        });
      } catch (e) {
        h.log.error('sendPhoto failed:', e.message);
      }
    }
    await editOrAnswer(ctx, productCardText(p), k.productDetail(p));
    await ctx.answerCallbackQuery();
  });

  route({ prefix: 'prod_viewtxt:' }, async (ctx) => {
    const pid = ctx.callbackQuery.data.split(':')[1];
    const { prods } = getProductsSorted();
    const p = prods.find((x) => x.id === pid);
    if (!p) return ctx.answerCallbackQuery('⚠️ محصول پیدا نشد', { show_alert: true });
    await editOrAnswer(ctx, productCardText(p), k.productDetail(p));
    await ctx.answerCallbackQuery();
  });

  route({ prefix: 'prod_toggle:' }, async (ctx) => {
    const pid = ctx.callbackQuery.data.split(':')[1];
    const doc = utils.loadProducts();
    const p = (doc.products || []).find((x) => x.id === pid);
    if (!p) return ctx.answerCallbackQuery('⚠️ پیدا نشد', { show_alert: true });
    p.visible = p.visible === false;
    utils.saveProducts(doc);
    const report = await rebuildAndReport(ctx);
    const { prods } = getProductsSorted();
    const p2 = prods.find((x) => x.id === pid);
    await editOrAnswer(ctx, `${productCardText(p2)}\n\n${report}`, k.productDetail(p2));
    await ctx.answerCallbackQuery('✅ تغییر کرد و سایت به‌روز شد');
  });

  route({ prefix: 'prod_up:' }, async (ctx) => {
    const pid = ctx.callbackQuery.data.split(':')[1];
    const doc = utils.loadProducts();
    const prods = [...(doc.products || [])].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    const idx = prods.findIndex((x) => x.id === pid);
    if (idx <= 0) return ctx.answerCallbackQuery('در ابتدای لیست است');
    const a = prods[idx], b = prods[idx - 1];
    const t = a.order; a.order = b.order; b.order = t;
    utils.saveProducts(doc);
    await ctx.answerCallbackQuery('⬆️ جابه‌جا شد (بعد از ثبت نهایی تغییرات، سایت بازسازی می‌شود)');
    const { prods: prods2 } = getProductsSorted();
    const p = prods2.find((x) => x.id === pid);
    await editOrAnswer(ctx, productCardText(p), k.productDetail(p));
  });

  route({ prefix: 'prod_down:' }, async (ctx) => {
    const pid = ctx.callbackQuery.data.split(':')[1];
    const doc = utils.loadProducts();
    const prods = [...(doc.products || [])].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    const idx = prods.findIndex((x) => x.id === pid);
    if (idx === -1 || idx === prods.length - 1) return ctx.answerCallbackQuery('در انتهای لیست است');
    const a = prods[idx], b = prods[idx + 1];
    const t = a.order; a.order = b.order; b.order = t;
    utils.saveProducts(doc);
    await ctx.answerCallbackQuery('⬇️ جابه‌جا شد (بعد از ثبت نهایی تغییرات، سایت بازسازی می‌شود)');
    const { prods: prods2 } = getProductsSorted();
    const p = prods2.find((x) => x.id === pid);
    await editOrAnswer(ctx, productCardText(p), k.productDetail(p));
  });

  // ---------- حذف
  route({ prefix: 'prod_del:' }, async (ctx) => {
    const pid = ctx.callbackQuery.data.split(':')[1];
    const { prods } = getProductsSorted();
    const p = prods.find((x) => x.id === pid);
    if (!p) return ctx.answerCallbackQuery('⚠️ پیدا نشد', { show_alert: true });
    await editOrAnswer(
      ctx,
      `⚠️ <b>حذف محصول</b>\n\n«${p.name}» برای همیشه حذف شود؟\nاین عمل قابل بازگشت نیست!`,
      k.confirmDelete(pid),
    );
  });

  route({ prefix: 'prod_delconfirm:' }, async (ctx) => {
    const pid = ctx.callbackQuery.data.split(':')[1];
    const doc = utils.loadProducts();
    const p = (doc.products || []).find((x) => x.id === pid);
    if (!p) return ctx.answerCallbackQuery('⚠️ پیدا نشد', { show_alert: true });
    if (p.image) utils.deleteImage(p.image);
    doc.products = (doc.products || []).filter((x) => x.id !== pid);
    utils.saveProducts(doc);
    const report = await rebuildAndReport(ctx);
    const { prods } = getProductsSorted();
    const visible = prods.filter((x) => x.visible !== false).length;
    await editOrAnswer(
      ctx,
      `🗑 محصول حذف شد.\n\n📦 <b>مدیریت محصولات</b>\nکل: ${utils.fa(prods.length)} · نمایش: ${utils.fa(visible)}\n\n${report}`,
      k.productsMenu(prods.length, visible),
    );
    await ctx.answerCallbackQuery('✅ حذف شد و سایت به‌روز شد');
  });

  // ---------- جریان افزودن (۸ مرحله)
  route({ exact: 'prod_add' }, async (ctx) => {
    h.setState(ctx.from.id, 'addProduct_name', { newProduct: { ...h.NEW_PRODUCT_DEFAULTS } });
    await editOrAnswer(
      ctx,
      '➕ <b>افزودن محصول (۱/۸)</b>\n\n📝 نام محصول را بفرستید.\n\nمثال: <code>کاپوت پژو ۲۰۶ — سفید</code>',
      k.cancelKb(),
    );
    await ctx.answerCallbackQuery();
  });

  msgRoute('addProduct_name', async (ctx, s) => {
    const name = (ctx.message.text || '').trim();
    if (!name || name.length < 3) {
      return ctx.reply('⚠️ نام باید حداقل ۳ حرف باشد. دوباره بفرستید:');
    }
    s.data.newProduct.name = name;
    h.setState(ctx.from.id, 'addProduct_car', s.data);
    const cars = utils.loadCars().cars;
    return ctx.reply('➕ <b>افزودن محصول (۲/۸)</b>\n\n🚗 برای کدام خودرو؟', {
      reply_markup: k.carPicker('addcar', cars), parse_mode: 'HTML',
    });
  });

  route({ prefix: 'addcar:' }, async (ctx, s) => {
    const carId = ctx.callbackQuery.data.split(':')[1];
    s.data.newProduct.car = carId;
    h.setState(ctx.from.id, 'addProduct_category', s.data);
    const cats = utils.loadCars().categories;
    await editOrAnswer(ctx, '➕ <b>افزودن محصول (۳/۸)</b>\n\n🏷 دسته‌بندی قطعه چیست؟', k.catPicker('addcat', cats));
    await ctx.answerCallbackQuery();
  });

  route({ prefix: 'addcat:' }, async (ctx, s) => {
    const catId = ctx.callbackQuery.data.split(':')[1];
    s.data.newProduct.category = catId;
    h.setState(ctx.from.id, 'addProduct_price', s.data);
    await editOrAnswer(
      ctx,
      '➕ <b>افزودن محصول (۴/۸)</b>\n\n💰 قیمت را به تومان بفرستید (فقط عدد).\nاگر قیمت ندارید بنویسید: <code>تماس</code>',
      k.cancelKb(),
    );
    await ctx.answerCallbackQuery();
  });

  msgRoute('addProduct_price', async (ctx, s) => {
    const { price, onCall } = utils.parsePrice(ctx.message.text);
    s.data.newProduct.price = price;
    s.data.newProduct.price_on_call = onCall;
    h.setState(ctx.from.id, 'addProduct_badges', s.data);
    return ctx.reply('➕ <b>افزودن محصول (۵/۸)</b>\n\n🎨 برچسب‌ها را انتخاب کنید (چندتایی):', {
      reply_markup: k.badgePicker(s.data.newProduct.badges, 'new'), parse_mode: 'HTML',
    });
  });

  route({ prefix: 'badge:new:' }, async (ctx, s) => {
    const badge = ctx.callbackQuery.data.split(':').slice(2).join(':');
    const selected = s.data.newProduct.badges;
    const i = selected.indexOf(badge);
    if (i >= 0) selected.splice(i, 1); else selected.push(badge);
    h.setState(ctx.from.id, s.state, s.data);
    try { await ctx.editMessageReplyMarkup({ reply_markup: k.badgePicker(selected, 'new') }); } catch {}
    await ctx.answerCallbackQuery();
  });

  route({ prefix: 'badges_done:new' }, async (ctx, s) => {
    h.setState(ctx.from.id, 'addProduct_colors', s.data);
    await editOrAnswer(
      ctx,
      '➕ <b>افزودن محصول (۶/۸)</b>\n\n🖌 رنگ‌های موجود را با «،» جدا بفرستید.\nمثال: <code>سفید، مشکی، نقره‌ای</code>\nاگر رنگ خاصی نیست بنویسید: <code>رد</code>',
      k.cancelKb(),
    );
    await ctx.answerCallbackQuery();
  });

  msgRoute('addProduct_colors', async (ctx, s) => {
    const text = (ctx.message.text || '').trim();
    const colors = ['رد', '-', 'no'].includes(text) ? [] : text.split('،').map((x) => x.trim()).filter(Boolean);
    s.data.newProduct.colors = colors;
    h.setState(ctx.from.id, 'addProduct_desc', s.data);
    return ctx.reply('➕ <b>افزودن محصول (۷/۸)</b>\n\n📄 توضیحات محصول را بنویسید (۲-۴ جمله).\nبرای رد کردن بنویسید: <code>رد</code>', { parse_mode: 'HTML' });
  });

  msgRoute('addProduct_desc', async (ctx, s) => {
    const text = (ctx.message.text || '').trim();
    s.data.newProduct.desc = text === 'رد' ? '' : text;
    h.setState(ctx.from.id, 'addProduct_photo', s.data);
    return ctx.reply(
      '➕ <b>افزودن محصول (۸/۸)</b>\n\n📷 عکس محصول را بفرستید (پیشنهاد: عکس با نور خوب و پس‌زمینه ساده).\nعکس به‌صورت خودکار به WebP سبک تبدیل می‌شود.\nاگر فعلاً عکس ندارید بنویسید: <code>رد</code>',
      { parse_mode: 'HTML', reply_markup: k.cancelKb() },
    );
  });

  msgRoute('addProduct_photo', async (ctx, s) => {
    if (ctx.message.photo) {
      const wait = await ctx.reply('⏳ در حال پردازش عکس…');
      try {
        const buf = await h.downloadPhoto(ctx, ctx.message.photo[ctx.message.photo.length - 1].file_id);
        const entry = await utils.saveProductImage(buf);
        s.data.newProduct.image = entry.key;
        h.setState(ctx.from.id, s.state, s.data);
      } finally {
        try { await ctx.api.deleteMessage(wait.chat.id, wait.message_id); } catch {}
      }
    }
    return previewProduct(ctx, s);
  });

  async function previewProduct(ctx, s) {
    const p = s.data.newProduct;
    h.setState(ctx.from.id, 'addProduct_confirm', s.data);
    const price = p.price_on_call ? '📞 استعلام تلفنی' : `💰 ${utils.priceFa(p.price)} تومان`;
    const carsDoc = utils.loadCars();
    const carName = (carsDoc.cars.find((c) => c.id === p.car) || {}).name || '—';
    const catName = (carsDoc.categories.find((c) => c.id === p.category) || {}).name || '—';
    const text =
      `✅ <b>پیش‌نمایش محصول جدید</b>\n\n` +
      `📦 ${p.name || '—'}\n` +
      `🚗 خودرو: ${carName}\n` +
      `🏷 دسته: ${catName}\n` +
      `${price}\n` +
      `🎨 برچسب‌ها: ${(p.badges || []).join('، ') || '—'}\n` +
      `🖌 رنگ‌ها: ${(p.colors || []).join('، ') || '—'}\n` +
      `📷 عکس: ${p.image ? 'دارد ✅' : 'ندارد'}\n\n` +
      `ثبت نهایی کنیم؟`;
    return ctx.reply(text, { parse_mode: 'HTML', reply_markup: k.confirmAdd('new') });
  }

  route({ exact: 'prod_cancel_add' }, async (ctx) => {
    h.clearState(ctx.from.id);
    const { prods } = getProductsSorted();
    const visible = prods.filter((x) => x.visible !== false).length;
    await editOrAnswer(ctx, '❌ عملیات لغو شد.\n\n📦 <b>مدیریت محصولات</b>', k.productsMenu(prods.length, visible));
  });

  route({ prefix: 'prod_save:' }, async (ctx, s) => {
    const p = s.data && s.data.newProduct;
    if (!p || !p.name) return ctx.answerCallbackQuery('⚠️ داده‌ای برای ثبت نیست', { show_alert: true });
    const doc = utils.loadProducts();
    const maxOrder = (doc.products || []).reduce((m, x) => Math.max(m, x.order || 0), 0);
    const product = {
      id: 'p-' + crypto.randomBytes(4).toString('hex'),
      name: p.name,
      car: p.car || 'other',
      category: p.category || 'other',
      price: p.price || 0,
      price_on_call: p.price_on_call !== false,
      badges: p.badges || [],
      colors: p.colors || [],
      description: p.desc || '',
      image: p.image || null,
      visible: true,
      in_stock: true,
      order: maxOrder + 1,
      created_at: new Date().toISOString().slice(0, 10),
    };
    doc.products.push(product);
    utils.saveProducts(doc);
    h.clearState(ctx.from.id);
    const report = await rebuildAndReport(ctx);
    await editOrAnswer(
      ctx,
      `✅ <b>محصول ثبت شد!</b>\n\n📦 ${product.name}\n${report}`,
      k.kb([k.btn('👁 مشاهده در لیست', 'prod_list:0')], [k.BACK_MAIN, k.CLOSE]),
    );
    await ctx.answerCallbackQuery('🎉 ثبت شد');
  });

  // ---------- جریان ویرایش
  route({ prefix: 'prod_edit:' }, async (ctx) => {
    const pid = ctx.callbackQuery.data.split(':')[1];
    const { prods } = getProductsSorted();
    const p = prods.find((x) => x.id === pid);
    if (!p) return ctx.answerCallbackQuery('⚠️ پیدا نشد', { show_alert: true });
    await editOrAnswer(
      ctx,
      `✏️ <b>ویرایش محصول</b>\n\n${productCardText(p)}\n\nکدام فیلد را ویرایش می‌کنید؟`,
      k.productEditFields(p),
    );
  });

  async function editFieldPrompt(ctx, pid, field, prompt, current = '') {
    h.setState(ctx.from.id, 'editField_value', { editPid: pid, editField: field });
    await ctx.reply(
      `✏️ ${prompt}\n\nمقدار فعلی:\n<blockquote>${current || '—'}</blockquote>\n\nمقدار جدید را بفرستید:`,
      { parse_mode: 'HTML', reply_markup: k.kb([k.btn('◀️ بازگشت به محصول', `prod_view:${pid}`)]) },
    );
    await ctx.answerCallbackQuery();
  }

  route({ prefix: 'pf_name:' }, async (ctx) => {
    const pid = ctx.callbackQuery.data.split(':')[1];
    const { prods } = getProductsSorted();
    const p = prods.find((x) => x.id === pid);
    await editFieldPrompt(ctx, pid, 'name', '📝 نام جدید محصول را بنویسید:', p ? p.name : '');
  });

  route({ prefix: 'pf_price:' }, async (ctx) => {
    const pid = ctx.callbackQuery.data.split(':')[1];
    const { prods } = getProductsSorted();
    const p = prods.find((x) => x.id === pid);
    const cur = p && p.price_on_call ? 'استعلام تلفنی' : utils.priceFa(p ? p.price : 0);
    await editFieldPrompt(ctx, pid, 'price', '💰 قیمت جدید به تومان (فقط عدد) یا بنویسید «تماس»:', cur);
  });

  route({ prefix: 'pf_colors:' }, async (ctx) => {
    const pid = ctx.callbackQuery.data.split(':')[1];
    const { prods } = getProductsSorted();
    const p = prods.find((x) => x.id === pid);
    await editFieldPrompt(ctx, pid, 'colors', '🖌 رنگ‌های جدید با «،» (یا «رد» برای خالی کردن):', (p ? p.colors : []).join('، '));
  });

  route({ prefix: 'pf_desc:' }, async (ctx) => {
    const pid = ctx.callbackQuery.data.split(':')[1];
    const { prods } = getProductsSorted();
    const p = prods.find((x) => x.id === pid);
    await editFieldPrompt(ctx, pid, 'desc', '📄 توضیحات جدید (یا «رد»):', p ? p.description : '');
  });

  route({ prefix: 'pf_car:' }, async (ctx) => {
    const pid = ctx.callbackQuery.data.split(':')[1];
    const cars = utils.loadCars().cars;
    try {
      await ctx.editMessageText('🚗 خودروی جدید را انتخاب کنید:', { reply_markup: k.carPicker(`setcar:${pid}`, cars) });
    } catch {}
    await ctx.answerCallbackQuery();
  });

  route({ prefix: 'setcar:' }, async (ctx) => {
    const [, pid, carId] = ctx.callbackQuery.data.split(':');
    const doc = utils.loadProducts();
    const p = (doc.products || []).find((x) => x.id === pid);
    if (!p) return ctx.answerCallbackQuery('⚠️ پیدا نشد', { show_alert: true });
    p.car = carId;
    utils.saveProducts(doc);
    const report = await rebuildAndReport(ctx);
    const { prods } = getProductsSorted();
    const p2 = prods.find((x) => x.id === pid);
    await editOrAnswer(ctx, `${productCardText(p2)}\n\n✅ خودرو تغییر کرد و سایت به‌روز شد\n\n${report}`, k.productEditFields(p2));
    await ctx.answerCallbackQuery('✅ تغییر کرد');
  });

  route({ prefix: 'pf_cat:' }, async (ctx) => {
    const pid = ctx.callbackQuery.data.split(':')[1];
    const cats = utils.loadCars().categories;
    try {
      await ctx.editMessageText('🏷 دسته‌بندی جدید را انتخاب کنید:', { reply_markup: k.catPicker(`setcat:${pid}`, cats) });
    } catch {}
    await ctx.answerCallbackQuery();
  });

  route({ prefix: 'setcat:' }, async (ctx) => {
    const [, pid, catId] = ctx.callbackQuery.data.split(':');
    const doc = utils.loadProducts();
    const p = (doc.products || []).find((x) => x.id === pid);
    if (!p) return ctx.answerCallbackQuery('⚠️ پیدا نشد', { show_alert: true });
    p.category = catId;
    utils.saveProducts(doc);
    const report = await rebuildAndReport(ctx);
    const { prods } = getProductsSorted();
    const p2 = prods.find((x) => x.id === pid);
    await editOrAnswer(ctx, `${productCardText(p2)}\n\n✅ دسته تغییر کرد و سایت به‌روز شد\n\n${report}`, k.productEditFields(p2));
    await ctx.answerCallbackQuery('✅ تغییر کرد');
  });

  route({ prefix: 'pf_badges:' }, async (ctx) => {
    const pid = ctx.callbackQuery.data.split(':')[1];
    const { prods } = getProductsSorted();
    const p = prods.find((x) => x.id === pid);
    h.setState(ctx.from.id, 'addProduct_badges', { editPid: pid });
    try {
      await ctx.editMessageText('🎨 برچسب‌ها را انتخاب کنید:', { reply_markup: k.badgePicker((p ? p.badges : []) || [], pid) });
    } catch {}
    await ctx.answerCallbackQuery();
  });

  route({ prefix: 'badge:p-' }, async (ctx, s) => {
    const parts = ctx.callbackQuery.data.split(':');
    const pid = parts[1];
    const badge = parts.slice(2).join(':');
    const doc = utils.loadProducts();
    const p = (doc.products || []).find((x) => x.id === pid);
    if (!p) return ctx.answerCallbackQuery('⚠️ پیدا نشد', { show_alert: true });
    const badges = p.badges || [];
    const i = badges.indexOf(badge);
    if (i >= 0) badges.splice(i, 1); else badges.push(badge);
    p.badges = badges;
    utils.saveProducts(doc);
    try { await ctx.editMessageReplyMarkup({ reply_markup: k.badgePicker(badges, pid) }); } catch {}
    await ctx.answerCallbackQuery();
  });

  // رفع باگ نسخه پایتون: «ادمه» ویرایش برچسب حالا به‌درستی به کارت محصول برمی‌گردد
  route({ prefix: 'badges_done:p-' }, async (ctx, s) => {
    const pid = ctx.callbackQuery.data.split(':')[1];
    h.clearState(ctx.from.id);
    const report = await rebuildAndReport(ctx);
    const { prods } = getProductsSorted();
    const p = prods.find((x) => x.id === pid);
    await editOrAnswer(ctx, `${productCardText(p)}\n\n✅ برچسب‌ها ذخیره شد\n\n${report}`, k.productEditFields(p));
    await ctx.answerCallbackQuery('✅ ذخیره شد');
  });

  route({ prefix: 'pf_stock:' }, async (ctx) => {
    const pid = ctx.callbackQuery.data.split(':')[1];
    const doc = utils.loadProducts();
    const p = (doc.products || []).find((x) => x.id === pid);
    if (!p) return ctx.answerCallbackQuery('⚠️ پیدا نشد', { show_alert: true });
    p.in_stock = p.in_stock === false;
    utils.saveProducts(doc);
    const report = await rebuildAndReport(ctx);
    const { prods } = getProductsSorted();
    const p2 = prods.find((x) => x.id === pid);
    await editOrAnswer(ctx, `${productCardText(p2)}\n\n${report}`, k.productEditFields(p2));
    await ctx.answerCallbackQuery('✅ موجودی تغییر کرد');
  });

  route({ prefix: 'prod_photo:' }, async (ctx) => {
    const pid = ctx.callbackQuery.data.split(':')[1];
    h.setState(ctx.from.id, 'editField_value', { editPid: pid, editField: 'photo' });
    await ctx.reply('📷 عکس جدید محصول را بفرستید:', {
      reply_markup: k.kb([k.btn('◀️ بازگشت', `prod_view:${pid}`)]),
    });
    await ctx.answerCallbackQuery();
  });

  route({ prefix: 'prod_delphoto:' }, async (ctx) => {
    const pid = ctx.callbackQuery.data.split(':')[1];
    const doc = utils.loadProducts();
    const p = (doc.products || []).find((x) => x.id === pid);
    if (!p) return ctx.answerCallbackQuery('⚠️ پیدا نشد', { show_alert: true });
    if (p.image) {
      utils.deleteImage(p.image);
      p.image = null;
    }
    utils.saveProducts(doc);
    const report = await rebuildAndReport(ctx);
    const { prods } = getProductsSorted();
    const p2 = prods.find((x) => x.id === pid);
    await editOrAnswer(ctx, `${productCardText(p2)}\n\n${report}`, k.productDetail(p2));
    await ctx.answerCallbackQuery('✅ عکس حذف شد');
  });

  // ---------- پیام در حالت ویرایش فیلد (عکس یا متن)
  msgRoute('editField_value', async (ctx, s) => {
    const pid = s.data.editPid;
    const field = s.data.editField;
    if (!pid || !field) { h.clearState(ctx.from.id); return; }

    if (field === 'photo') {
      if (!ctx.message.photo) {
        return ctx.reply('⚠️ فقط عکس بفرستید (یا از دکمه بازگشت استفاده کنید).');
      }
      const wait = await ctx.reply('⏳ پردازش عکس…');
      try {
        const buf = await h.downloadPhoto(ctx, ctx.message.photo[ctx.message.photo.length - 1].file_id);
        const entry = await utils.saveProductImage(buf);
        const doc = utils.loadProducts();
        const p = (doc.products || []).find((x) => x.id === pid);
        if (p) {
          if (p.image) utils.deleteImage(p.image);
          p.image = entry.key;
          utils.saveProducts(doc);
        }
      } finally {
        try { await ctx.api.deleteMessage(wait.chat.id, wait.message_id); } catch {}
      }
      h.clearState(ctx.from.id);
      const report = await rebuildAndReport(ctx);
      return ctx.reply(`✅ عکس محصول به‌روز شد.\n${report}`, {
        reply_markup: k.kb([k.btn('👁 مشاهده محصول', `prod_view:${pid}`)]),
      });
    }

    const doc = utils.loadProducts();
    const p = (doc.products || []).find((x) => x.id === pid);
    if (!p) { h.clearState(ctx.from.id); return ctx.reply('⚠️ محصول پیدا نشد.'); }
    const text = (ctx.message.text || '').trim();
    if (field === 'name') p.name = text;
    else if (field === 'price') {
      const { price, onCall } = utils.parsePrice(text);
      p.price = price; p.price_on_call = onCall;
    } else if (field === 'colors') {
      p.colors = text === 'رد' ? [] : text.split('،').map((x) => x.trim()).filter(Boolean);
    } else if (field === 'desc') {
      p.description = text === 'رد' ? '' : text;
    }
    utils.saveProducts(doc);
    h.clearState(ctx.from.id);
    const report = await rebuildAndReport(ctx);
    return ctx.reply(`✅ فیلد «${field}» ذخیره شد.\n${report}`, {
      reply_markup: k.kb([k.btn('👁 مشاهده محصول', `prod_view:${pid}`)]),
    });
  });

  // ================================================================ خودروها
  route({ exact: 'cars' }, async (ctx) => {
    h.clearState(ctx.from.id);
    const carsDoc = utils.loadCars();
    const prods = utils.loadProducts().products || [];
    for (const c of carsDoc.cars) {
      c._products = prods.filter((p) => p.car === c.id);
    }
    const text =
      '🚗 <b>مدیریت خودروها</b>\n\n' +
      'برای هر خودرویی که حداقل یک محصول داشته باشد، یک صفحه سئو اختصاصی در سایت ساخته می‌شود.\n🟢 فعال · ⚪️ غیرفعال';
    await editOrAnswer(ctx, text, k.carsMenu(carsDoc.cars));
  });

  async function showCarView(ctx, carId) {
    const carsDoc = utils.loadCars();
    const car = carsDoc.cars.find((c) => c.id === carId);
    if (!car) return ctx.answerCallbackQuery('⚠️ پیدا نشد', { show_alert: true });
    const text =
      `🚗 <b>${car.name}</b>\n\n` +
      `🔗 آدرس سایت: /${car.slug || ''}/\n` +
      `🏷 تیپ‌ها: ${(car.variants || []).join('، ') || '—'}\n` +
      `👁 وضعیت: ${car.active !== false ? 'فعال' : 'غیرفعال'}`;
    await editOrAnswer(ctx, text, k.carDetail(car));
  }

  route({ prefix: 'car_view:' }, async (ctx) => {
    await showCarView(ctx, ctx.callbackQuery.data.split(':')[1]);
    await ctx.answerCallbackQuery();
  });

  route({ prefix: 'car_toggle:' }, async (ctx) => {
    const cid = ctx.callbackQuery.data.split(':')[1];
    const doc = utils.loadCars();
    const car = doc.cars.find((c) => c.id === cid);
    if (!car) return ctx.answerCallbackQuery('⚠️ پیدا نشد', { show_alert: true });
    car.active = car.active === false;
    utils.saveCars(doc);
    await rebuildAndReport(ctx);
    await ctx.answerCallbackQuery('✅ تغییر کرد و سایت به‌روز شد');
    await showCarView(ctx, cid);
  });

  route({ prefix: 'car_del:' }, async (ctx) => {
    const cid = ctx.callbackQuery.data.split(':')[1];
    const doc = utils.loadCars();
    const prods = (utils.loadProducts().products || []).filter((p) => p.car === cid);
    if (prods.length) {
      return ctx.answerCallbackQuery(`⚠️ این خودرو ${utils.fa(prods.length)} محصول دارد؛ اول محصولات را جابه‌جا یا حذف کنید.`, { show_alert: true });
    }
    doc.cars = doc.cars.filter((c) => c.id !== cid);
    utils.saveCars(doc);
    await rebuildAndReport(ctx);
    // نمایش مجدد منوی خودروها
    const carsDoc = utils.loadCars();
    const allProds = utils.loadProducts().products || [];
    for (const c of carsDoc.cars) c._products = allProds.filter((p) => p.car === c.id);
    await editOrAnswer(ctx, '🚗 <b>مدیریت خودروها</b>\n\n🟢 فعال · ⚪️ غیرفعال', k.carsMenu(carsDoc.cars));
  });

  // رفع باگ نسخه پایتون: این دکمه‌ها قبلا هیچ کاری نمی‌کردند
  route({ prefix: 'car_name:' }, async (ctx) => {
    const cid = ctx.callbackQuery.data.split(':')[1];
    const car = utils.loadCars().cars.find((c) => c.id === cid);
    if (!car) return ctx.answerCallbackQuery('⚠️ پیدا نشد', { show_alert: true });
    h.setState(ctx.from.id, 'car_field', { cid, field: 'name' });
    await ctx.reply(
      `✏️ نام جدید خودرو:\n<blockquote>${car.name}</blockquote>`,
      { parse_mode: 'HTML', reply_markup: k.kb([k.btn('◀️ بازگشت', `car_view:${cid}`)]) },
    );
    await ctx.answerCallbackQuery();
  });

  route({ prefix: 'car_seo:' }, async (ctx) => {
    const cid = ctx.callbackQuery.data.split(':')[1];
    await editOrAnswer(ctx, '🌐 <b>ویرایش متن سئو</b>\nکدام بخش را ویرایش می‌کنید؟', k.carSeoMenu(cid));
    await ctx.answerCallbackQuery();
  });

  route({ prefix: 'carseo:' }, async (ctx) => {
    const [, field, cid] = ctx.callbackQuery.data.split(':');
    const car = utils.loadCars().cars.find((c) => c.id === cid);
    if (!car) return ctx.answerCallbackQuery('⚠️ پیدا نشد', { show_alert: true });
    const labels = {
      title: ['📝 عنوان سئو (title صفحه)', car.seo_title],
      desc: ['📄 توضیحات متا (meta description)', car.meta_description],
      intro: ['📖 متن معرفی صفحه', car.intro],
    };
    const [label, current] = labels[field] || labels.title;
    h.setState(ctx.from.id, 'car_field', { cid, field: `seo_${field}` });
    await ctx.reply(
      `✏️ ${label}\n\nمقدار فعلی:\n<blockquote>${(current || '—').slice(0, 400)}</blockquote>\n\nمقدار جدید را بفرستید:`,
      { parse_mode: 'HTML', reply_markup: k.kb([k.btn('◀️ بازگشت', `car_view:${cid}`)]) },
    );
    await ctx.answerCallbackQuery();
  });

  msgRoute('car_field', async (ctx, s) => {
    const { cid, field } = s.data;
    const text = (ctx.message.text || '').trim();
    if (!text || text === 'رد') {
      h.clearState(ctx.from.id);
      return ctx.reply('❌ لغو شد.', { reply_markup: k.kb([k.btn('🚗 خودروها', 'cars')]) });
    }
    const doc = utils.loadCars();
    const car = doc.cars.find((c) => c.id === cid);
    if (!car) { h.clearState(ctx.from.id); return ctx.reply('⚠️ خودرو پیدا نشد.'); }
    if (field === 'name') {
      car.name = text;
      car.name_short = text;
    } else if (field === 'seo_title') car.seo_title = text;
    else if (field === 'seo_desc') car.meta_description = text;
    else if (field === 'seo_intro') car.intro = text;
    utils.saveCars(doc);
    h.clearState(ctx.from.id);
    const report = await rebuildAndReport(ctx);
    return ctx.reply(`✅ ذخیره شد.\n${report}`, {
      reply_markup: k.kb([k.btn('🚗 مشاهده خودرو', `car_view:${cid}`)]),
    });
  });

  // رفع باگ نسخه پایتون: دکمه «دسته‌بندی‌ها» قبلا کاری نمی‌کرد
  route({ exact: 'cats' }, async (ctx) => {
    const carsDoc = utils.loadCars();
    const prods = utils.loadProducts().products || [];
    const lines = carsDoc.categories.map((c) => {
      const n = prods.filter((p) => p.category === c.id).length;
      return `${n > 0 ? '🟢' : '⚪️'} ${c.name} — ${utils.fa(n)} محصول`;
    });
    await editOrAnswer(
      ctx,
      `🏷 <b>دسته‌بندی‌ها</b>\n\n${lines.join('\n')}\n\nℹ️ دسته‌بندی‌ها ثابت هستند؛ هنگام افزودن/ویرایش محصول انتخاب می‌شوند.`,
      k.kb([k.BACK_PRODUCTS, k.CLOSE]),
    );
    await ctx.answerCallbackQuery();
  });

  route({ exact: 'car_add' }, async (ctx) => {
    h.setState(ctx.from.id, 'addCar_name', {});
    await editOrAnswer(ctx, '🚗 <b>افزودن خودرو (۱/۳)</b>\n\nنام فارسی خودرو؟\nمثال: <code>رانا</code>', k.cancelKb());
    await ctx.answerCallbackQuery();
  });

  msgRoute('addCar_name', async (ctx, s) => {
    const name = (ctx.message.text || '').trim();
    if (name.length < 2) return ctx.reply('⚠️ نام معتبر نیست، دوباره:');
    s.data.carName = name;
    h.setState(ctx.from.id, 'addCar_slug', s.data);
    return ctx.reply('🚗 <b>افزودن خودرو (۲/۳)</b>\n\nآدرس انگلیسی (اسلاگ)؟ فقط حروف انگلیسی و خط تیره.\nمثال: <code>runna</code>', { parse_mode: 'HTML' });
  });

  msgRoute('addCar_slug', async (ctx, s) => {
    const slug = utils.slugify(ctx.message.text);
    const name = s.data.carName;
    h.clearState(ctx.from.id);
    const doc = utils.loadCars();
    const cid = slug.replace(/-/g, '_').slice(0, 20);
    if (doc.cars.some((c) => c.id === cid)) {
      return ctx.reply('⚠️ این اسلاگ تکراری است.', { reply_markup: k.kb([k.btn('🚗 خودروها', 'cars')]) });
    }
    doc.cars.push({
      id: cid, name, name_short: name, slug, variants: [], active: true,
      seo_title: `لوازم بدنه ${name} | خرید کاپوت، سپر، گلگیر — بدنه پلاس`,
      meta_description: `خرید لوازم بدنه ${name} با رنگ کوره‌ای شرکتی، ۵ سال ضمانت رنگ و ارسال به سراسر کشور از بدنه پلاس.`,
      intro: `در بدنه پلاس، لوازم بدنه ${name} را با کیفیت عرضه می‌کنیم: قطعه فابریک یا رنگ کوره‌ای شرکتی، هر دو با ۵ سال ضمانت رنگ و ارسال به سراسر کشور.`,
      parts_intro: `قطعات موجود ${name}:`,
      body: [{ h2: 'کیفیت بدنه پلاس', text: 'تمام قطعات با کنترل کیفیت پرس و رنگ عرضه می‌شوند و مشمول ۵ سال ضمانت رنگ هستند.' }],
      faq: [{ q: 'قیمت قطعات چقدر است؟', a: 'برای اطلاع از قیمت روز تماس بگیرید تا مشاوره تلفنی رایگان دریافت کنید.' }],
    });
    utils.saveCars(doc);
    const report = await rebuildAndReport(ctx);
    return ctx.reply(
      `✅ خودرو «${name}» اضافه شد.\n${report}\n\n💡 با افزودن محصول برای این خودرو، صفحه سئوی آن فعال می‌شود.`,
      { reply_markup: k.kb([k.btn('🚗 مدیریت خودروها', 'cars')]) },
    );
  });
};
