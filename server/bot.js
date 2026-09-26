// ربات مدیریت بدنه پلاس — هسته (grammY)
// پورت کامل bot.py (aiogram) به جاوااسکریپت با معماری ماژولار
const { Bot, InputFile } = require('grammy');
const config = require('./config');
const utils = require('./utils');
const k = require('./keyboards');
const analytics = require('./analytics');
const sitebuild = require('./sitebuild');
const registerProducts = require('./bot.products');
const registerContent = require('./bot.content');

const TEXTS = {
  welcome: '🏠 <b>پنل مدیریت بدنه پلاس</b>\n\nبه مرکز کنترل سایت خوش آمدید.\nهر تغییری اینجا ثبت کنید، سایت به‌صورت خودکار بازسازی می‌شود. ⚡️',
  unauthorized: '⛔️ <b>دسترسی ندارید</b>\n\nاین ربات فقط برای مدیران بدنه پلاس است.\nشناسه چت شما: <code>%s</code>\nبرای دریافت دسترسی، این شناسه را به مدیر سایت بدهید.',
  claimed: '🎉 <b>خوش آمدید مدیر!</b>\n\nشما به‌عنوان مدیر اول و مالک این ربات ثبت شدید.\nبرای افزودن مدیرهای دیگر: ⚙️ تنظیمات ← 👤 مدیران ربات.',
  closed: 'پنجره بسته شد. 🗑',
};

// ۵ پیشنهاد عنوان هیرو — از منوی ربات با یک لمس اعمال می‌شود (اولی = عنوان فعلی)
const HERO_PRESETS = [
  ['مرجع لوازم بدنه‌ی', 'خودروهای ایرانی'],
  ['قطعه‌ی اصلی،', 'خریدِ مطمئن'],
  ['بدنه‌ی خودرویت،', 'مثل روزِ اولِ کارخانه'],
  ['فابریک، رنگ کوره‌ای،', 'با ضمانت'],
  ['خرید یک‌بار،', 'خیال راحتِ سال‌ها'],
];

const NEW_PRODUCT_DEFAULTS = { badges: [], colors: [], desc: '', image: null };

async function defaultDownloadPhoto(ctx, fileId) {
  const f = await ctx.api.getFile(fileId);
  const url = `https://api.telegram.org/file/bot${config.token}/${f.file_path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function createBot(deps = {}) {
  const log = {
    info: (...a) => console.log('[bot]', ...a),
    warn: (...a) => console.warn('[bot]', ...a),
    error: (...a) => console.error('[bot]', ...a),
  };
  const downloadPhoto = deps.downloadPhoto || defaultDownloadPhoto;

  // ---------------------------------------------------------------- سشن‌ها (معادل FSM)
  const sessions = new Map(); // userId -> {state, data}
  const getState = (uid) => sessions.get(uid) || { state: null, data: {} };
  const setState = (uid, state, data = {}) => sessions.set(uid, { state, data });
  const clearState = (uid) => sessions.delete(uid);

  // ---------------------------------------------------------------- ادمین
  const isAdmin = (uid) => config.getAdminIds().includes(uid);

  /** اولین /start ادمین را ثبت می‌کند (claim) + نام ادمین‌ها را به‌روز نگه می‌دارد */
  async function guard(ctx) {
    const uid = ctx.from.id;
    const admins = config.getAdminIds();
    if (!admins.length) {
      config.addAdminId(uid);
      config.setOwnerIfEmpty(uid);
      config.saveAdminName(uid, ctx.from.first_name || ctx.from.username);
      log.warn(`ADMIN CLAIMED by ${uid} (${ctx.from.first_name}) — owner`);
      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery('🎉 شما مدیر و مالک این ربات شدید.', { show_alert: true });
      } else {
        await ctx.reply(TEXTS.claimed, { parse_mode: 'HTML' });
      }
      return true;
    }
    if (admins.includes(uid)) {
      config.saveAdminName(uid, ctx.from.first_name || ctx.from.username);
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- کمک‌تابع‌ها
  function getProductsSorted() {
    const doc = utils.loadProducts();
    const carsDoc = utils.loadCars();
    const carById = Object.fromEntries(carsDoc.cars.map((c) => [c.id, c]));
    const catById = Object.fromEntries(carsDoc.categories.map((c) => [c.id, c]));
    const prods = doc.products || [];
    for (const p of prods) {
      p._car_name = (carById[p.car] || {}).name || '—';
      p._cat_name = (catById[p.category] || {}).name || '—';
    }
    prods.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    return { doc, prods };
  }

  function productCardText(p) {
    const price = p.price_on_call ? '📞 استعلام تلفنی' : `💰 ${utils.priceFa(p.price)} تومان`;
    const badges = (p.badges || []).join('، ') || '—';
    const colors = (p.colors || []).join('، ') || '—';
    const vis = p.visible !== false ? '🟢 نمایش در سایت' : '⚪️ مخفی';
    const stock = p.in_stock !== false ? '✅ موجود' : '⛔️ ناموجود';
    const img = p.image ? '📷 دارد' : '—';
    return (
      `📦 <b>${p.name}</b>\n\n` +
      `🚗 خودرو: ${p._car_name}\n` +
      `🏷 دسته: ${p._cat_name}\n` +
      `${price}\n` +
      `🎨 برچسب‌ها: ${badges}\n` +
      `🖌 رنگ‌ها: ${colors}\n` +
      `📷 عکس: ${img}\n` +
      `📦 موجودی: ${stock}\n` +
      `👁 وضعیت: ${vis}\n` +
      `📅 ثبت: ${utils.jdateFa(p.created_at || '')}`
    );
  }

  /** ناوبری شیشه‌ای: همیشه پیام را ویرایش کن؛ در خطا پیام جدید بفرست */
  async function editOrAnswer(ctx, text, replyMarkup) {
    try {
      await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: replyMarkup });
    } catch (e1) {
      try {
        await ctx.reply(text, { parse_mode: 'HTML', reply_markup: replyMarkup });
      } catch (e2) { /* پیام خیلی قدیمی */ }
    }
  }

  /** بازسازی سایت + پیام وضعیت (بیلد Next حدود نیم دقیقه) */
  async function rebuildAndReport(ctx, extra = '') {
    let waitMsg = null;
    try {
      waitMsg = await ctx.reply('⏳ در حال ذخیره و به‌روزرسانی سایت… (حدود نیم دقیقه)');
    } catch {}
    const { ok, out } = await sitebuild.rebuildSite();
    if (waitMsg) {
      try { await ctx.api.deleteMessage(waitMsg.chat.id, waitMsg.message_id); } catch {}
    }
    if (ok) {
      log.info('site rebuilt OK');
      return `✅ سایت با موفقیت به‌روزرسانی شد.${extra ? ' ' + extra : ''}`;
    }
    log.error('rebuild failed:\n', String(out).slice(-1500));
    return '⚠️ بازسازی سایت با خطا مواجه شد. لاگ را بررسی کنید.';
  }

  // ---------------------------------------------------------------- مسیریابی
  const cbRoutes = [];
  const msgRoutes = {};
  const route = (def, handler) => cbRoutes.push({ ...def, handler });
  const msgRoute = (state, handler) => { msgRoutes[state] = handler; };

  const h = {
    sessions, getState, setState, clearState,
    isAdmin, guard, TEXTS, HERO_PRESETS, NEW_PRODUCT_DEFAULTS,
    getProductsSorted, productCardText, editOrAnswer, rebuildAndReport,
    utils, k, analytics, sitebuild, config, log, downloadPhoto, InputFile,
    checkSite: deps.checkSite || sitebuild.checkSite,
  };

  // ---------------------------------------------------------------- هسته: منوها
  route({ exact: 'main' }, async (ctx) => {
    clearState(ctx.from.id);
    const { prods } = getProductsSorted();
    const posts = utils.loadPosts();
    await editOrAnswer(
      ctx,
      TEXTS.welcome + `\n\n📦 محصولات: ${utils.fa(prods.length)}\n📝 پست‌ها: ${utils.fa(posts.length)}`,
      k.mainMenu(prods.length, posts.length),
    );
  });

  route({ exact: 'close' }, async (ctx) => {
    clearState(ctx.from.id);
    try { await ctx.deleteMessage(); } catch {}
    await ctx.answerCallbackQuery(TEXTS.closed);
  });

  route({ exact: 'noop' }, async (ctx) => {
    await ctx.answerCallbackQuery();
  });

  // ---------------------------------------------------------------- ماژول‌ها
  registerProducts({ route, msgRoute, h });
  registerContent({ route, msgRoute, h });

  // ---------------------------------------------------------------- ساخت بات
  const bot = new Bot(config.token);
  bot.catch((err) => log.error('unhandled:', err.error || err));

  bot.command('start', async (ctx) => {
    const ok = await guard(ctx);
    if (!ok) {
      return ctx.reply(TEXTS.unauthorized.replace('%s', ctx.from.id), { parse_mode: 'HTML' });
    }
    clearState(ctx.from.id);
    const { prods } = getProductsSorted();
    const posts = utils.loadPosts();
    const visible = prods.filter((p) => p.visible !== false).length;
    const text = TEXTS.welcome +
      `\n\n📦 محصولات: ${utils.fa(prods.length)} (${utils.fa(visible)} نمایش)` +
      `\n📝 پست‌ها: ${utils.fa(posts.length)}`;
    return ctx.reply(text, { reply_markup: k.mainMenu(prods.length, posts.length), parse_mode: 'HTML' });
  });

  bot.command('id', async (ctx) => {
    const isAdminNow = isAdmin(ctx.from.id);
    await ctx.reply(
      `🆔 شناسه چت شما: <code>${ctx.from.id}</code>${isAdminNow ? '\n✅ شما مدیر ربات هستید.' : ''}`,
      { parse_mode: 'HTML' },
    );
  });

  bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data || '';
    const uid = ctx.from.id;
    // گارد امنیتی: همه دکمه‌ها جز بستن فقط برای ادمین
    if (!isAdmin(uid) && data !== 'close' && data !== 'noop') {
      return ctx.answerCallbackQuery('⛔️ دسترسی ندارید', { show_alert: true });
    }
    const s = getState(uid);
    for (const r of cbRoutes) {
      const stateOk = !r.state || s.state === r.state;
      const match = r.exact ? data === r.exact : r.prefix ? data.startsWith(r.prefix) : (r.re ? r.re.test(data) : false);
      if (stateOk && match) {
        try {
          return await r.handler(ctx, s);
        } catch (e) {
          log.error(`handler error [${data}]:`, e.message);
          try { await ctx.answerCallbackQuery(); } catch {}
          return;
        }
      }
    }
    try { await ctx.answerCallbackQuery(); } catch {}
  });

  bot.on('message', async (ctx) => {
    const uid = ctx.from.id;
    const s = getState(uid);
    if (s.state && msgRoutes[s.state]) {
      try {
        return await msgRoutes[s.state](ctx, s);
      } catch (e) {
        log.error(`msg handler error [${s.state}]:`, e.message);
        return;
      }
    }
    if (s.state) return; // حالت فعال بدون هندلر متنی — نادیده بگیر
    const ok = await guard(ctx);
    if (!ok) {
      return ctx.reply(TEXTS.unauthorized.replace('%s', uid), { parse_mode: 'HTML' });
    }
    return ctx.reply('🤖 دستور را متوجه نشدم.\nبرای باز کردن پنل مدیریت /start را بزنید.', {
      reply_markup: k.mainMenu(0, 0),
    });
  });

  return { bot, h };
}

module.exports = { createBot, TEXTS, HERO_PRESETS };
