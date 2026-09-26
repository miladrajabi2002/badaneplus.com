// ماژول تنظیمات + هیرو + وبلاگ + آمار — پورت کامل از bot.py
module.exports = function registerContent({ route, msgRoute, h }) {
  const { utils, k, editOrAnswer, rebuildAndReport } = h;

  // ================================================================ تنظیمات
  const SETTING_LABELS = {
    phone: ['📞 شماره تماس ثابت', 'قالب: 02112345678'],
    mobile: ['📱 شماره موبایل', 'قالب: 09121234567 — خالی می‌گذارید اگر ندارید'],
    address: ['📍 آدرس فروشگاه', 'آدرس کامل را بنویسید'],
    hours: ['🕐 ساعات کاری', 'مثال: شنبه تا پنجشنبه · ۹ صبح تا ۷ عصر'],
    hours_schema: ['🕐 کد ساعات (اسکیما)', 'مثال: Sa-Th 09:00-19:00'],
    map_balad: ['🗺 لینک بلد', 'https://balad.ir/...'],
    map_neshan: ['🗺 لینک نشان', 'https://neshan.org/...'],
    map_google: ['🗺 لینک گوگل‌مپ', 'https://maps.app.google.com/...'],
    geo: ['📍 مختصات', 'قالب: 35.6892,51.3890'],
    brand: ['🏷 نام برند فارسی', 'مثال: بدنه پلاس'],
    hero: ['✨ عنوان هیرو', 'عنوان بزرگ صفحه اصلی — دو خط را با | جدا کنید'],
    herosub: ['📄 زیرعنوان هیرو', 'متن توضیحیه زیر عنوان'],
  };

  function displayPhone(number) {
    return utils.fa(String(number || '').trim());
  }

  route({ exact: 'settings' }, async (ctx) => {
    h.clearState(ctx.from.id);
    const s = utils.loadSettings();
    const c = s.contact || {};
    const text =
      '⚙️ <b>تنظیمات سایت</b>\n\n' +
      `📞 ثابت: <code>${c.phone || ''}</code>\n` +
      `📱 موبایل: <code>${c.mobile || ''}</code>\n` +
      `📍 آدرس: ${c.address || ''}\n` +
      `🕐 ساعت: ${c.hours || ''}\n\n` +
      'هر مورد را که می‌خواهید تغییر دهید انتخاب کنید:';
    await editOrAnswer(ctx, text, k.settingsMenu());
  });

  route({ exact: 'set:maps' }, async (ctx) => {
    await editOrAnswer(ctx, '🗺 <b>لینک‌های نقشه</b>\n\nلینک هر سرویس را انتخاب و وارد کنید:', k.settingsMapsMenu());
    await ctx.answerCallbackQuery();
  });

  route({ exact: 'set:seo' }, async (ctx) => {
    await editOrAnswer(ctx, '🌐 <b>سئو و برند</b>', k.settingsSeoMenu());
    await ctx.answerCallbackQuery();
  });

  route({ prefix: 'set:' }, async (ctx) => {
    const key = ctx.callbackQuery.data.split(':').slice(1).join(':');
    if (key === 'maps' || key === 'seo') return;
    const [label, hint] = SETTING_LABELS[key] || [key, ''];
    const s = utils.loadSettings();
    let current = '';
    if (key === 'brand') current = (s.site || {}).brand_fa || '';
    else if (key === 'hero') current = `${(s.hero || {}).title_1 || ''} ${(s.hero || {}).title_2 || ''}`.trim();
    else if (key === 'herosub') current = (s.hero || {}).subtitle || '';
    else if (key === 'geo') current = `${(s.contact || {}).geo_lat || ''},${(s.contact || {}).geo_lng || ''}`;
    else current = (s.contact || {})[key] || '';
    h.setState(ctx.from.id, 'settingsInput_value', { setKey: key });
    await ctx.reply(
      `${label}\n\n${hint}\n\nمقدار فعلی:\n<blockquote>${current || '—'}</blockquote>\n\nمقدار جدید را بفرستید (یا «رد»):`,
      { parse_mode: 'HTML', reply_markup: k.kb([k.btn('◀️ بازگشت به تنظیمات', 'settings')]) },
    );
    await ctx.answerCallbackQuery();
  });

  msgRoute('settingsInput_value', async (ctx, s) => {
    const key = s.data.setKey;
    h.clearState(ctx.from.id);
    if (!key) return;
    const text = (ctx.message.text || '').trim();
    if (text === 'رد') {
      return ctx.reply('❌ لغو شد.', { reply_markup: k.kb([k.btn('⚙️ تنظیمات', 'settings')]) });
    }
    const st = utils.loadSettings();
    st.contact = st.contact || {};
    st.site = st.site || {};
    st.hero = st.hero || {};
    if (key === 'brand') st.site.brand_fa = text;
    else if (key === 'hero') {
      const parts = text.split('|');
      st.hero.title_1 = parts[0].trim();
      st.hero.title_2 = parts.length > 1 ? parts[1].trim() : (st.hero.title_2 || '');
    } else if (key === 'herosub') st.hero.subtitle = text;
    else if (key === 'geo') {
      const m = text.split(',').map((x) => x.trim());
      if (m.length !== 2 || isNaN(parseFloat(m[0])) || isNaN(parseFloat(m[1]))) {
        return ctx.reply('⚠️ فرمت مختصات درست نیست. مثال: <code>35.6892,51.3890</code>', { parse_mode: 'HTML' });
      }
      st.contact.geo_lat = parseFloat(m[0]);
      st.contact.geo_lng = parseFloat(m[1]);
    } else if (key === 'phone') {
      st.contact.phone = text;
      st.contact.phone_display = displayPhone(text);
    } else if (key === 'mobile') {
      if (['', '-', 'خالی'].includes(text)) {
        st.contact.mobile = '';
        st.contact.mobile_display = '';
      } else {
        st.contact.mobile = text;
        st.contact.mobile_display = displayPhone(text);
      }
    } else {
      st.contact[key] = text;
    }
    utils.saveSettings(st);
    const report = await rebuildAndReport(ctx);
    return ctx.reply(`✅ تنظیم ذخیره شد.\n${report}`, {
      reply_markup: k.kb([k.btn('⚙️ تنظیمات سایت', 'settings'), k.btn('🏠 منوی اصلی', 'main')]),
    });
  });

  // ================================================================ هیرو: پیشنهادها + عکس
  route({ exact: 'heropresets' }, async (ctx) => {
    const lines = h.HERO_PRESETS.map(([t1, t2], i) => `${utils.fa(i + 1)}️⃣ ${t1} ${t2}`).join('\n');
    await editOrAnswer(
      ctx,
      `🎯 <b>پیشنهادهای عنوان هیرو</b>\n\n${lines}\n\nیکی را انتخاب کنید تا جایگزین عنوان فعلی شود:`,
      k.heroPresetsMenu(h.HERO_PRESETS),
    );
    await ctx.answerCallbackQuery();
  });

  route({ prefix: 'heropreset:' }, async (ctx) => {
    let idx = parseInt(ctx.callbackQuery.data.split(':')[1], 10);
    if (!(idx >= 0 && idx < h.HERO_PRESETS.length)) {
      return ctx.answerCallbackQuery('⚠️ گزینه نامعتبر است', { show_alert: true });
    }
    const [t1, t2] = h.HERO_PRESETS[idx];
    const st = utils.loadSettings();
    st.hero = st.hero || {};
    st.hero.title_1 = t1;
    st.hero.title_2 = t2;
    utils.saveSettings(st);
    const report = await rebuildAndReport(ctx);
    await editOrAnswer(
      ctx,
      `✅ عنوان هیرو عوض شد:\n\n«${t1} ${t2}»\n\n${report}`,
      k.kb([k.btn('🎯 پیشنهادهای دیگر', 'heropresets'), k.btn('⚙️ تنظیمات سایت', 'settings')]),
    );
    await ctx.answerCallbackQuery('✅ انجام شد');
  });

  route({ exact: 'heroimg' }, async (ctx) => {
    h.setState(ctx.from.id, 'heroPhoto_photo', {});
    await ctx.reply(
      '🖼 <b>عکس جدید هیرو</b>\n\n' +
      'عکس را همینجا بفرستید. 📐 نسبت تصویر عمودی <b>۳:۴</b> است (مثل ۱۰۸۰×۱۴۴۰).\n' +
      'اگر نسبت عکس فرق کند، به‌صورت خودکار برش وسط (center-crop) می‌شود.\n\n' +
      '💡 پیشنهاد: عکس باکیفیت از یک قطعه بدنه با نورپردازی خوب — پس‌زمینه‌ی تیره با سایت هماهنگ‌تر است.\n\n' +
      'برای انصراف «رد» را بفرستید.',
      { parse_mode: 'HTML', reply_markup: k.kb([k.btn('◀️ بازگشت به تنظیمات', 'settings')]) },
    );
    await ctx.answerCallbackQuery();
  });

  msgRoute('heroPhoto_photo', async (ctx) => {
    if (!ctx.message.photo) {
      const text = (ctx.message.text || '').trim();
      if (text === 'رد') {
        h.clearState(ctx.from.id);
        return ctx.reply('❌ لغو شد.', { reply_markup: k.kb([k.btn('⚙️ تنظیمات', 'settings')]) });
      }
      return ctx.reply('⚠️ فقط عکس بفرستید (یا «رد» برای انصراف).');
    }
    h.clearState(ctx.from.id);
    const wait = await ctx.reply('⏳ در حال پردازش عکس…');
    try {
      const buf = await h.downloadPhoto(ctx, ctx.message.photo[ctx.message.photo.length - 1].file_id);
      const info = await utils.saveHeroImage(buf);
      const report = await rebuildAndReport(ctx);
      return ctx.api.editMessageText(
        wait.chat.id, wait.message_id,
        `✅ عکس هیرو عوض شد!\n📐 ابعاد دریافتی: ${utils.fa(info.w)}×${utils.fa(info.h)}\n🔄 تبدیل خودکار به WebP (۸۶۴×۱۱۵۲ + ۶۴۸×۸۶۴) انجام شد.\n\n${report}`,
        { parse_mode: 'HTML', reply_markup: k.kb([k.btn('⚙️ تنظیمات سایت', 'settings'), k.btn('🏠 منوی اصلی', 'main')]) },
      );
    } catch (e) {
      return ctx.api.editMessageText(
        wait.chat.id, wait.message_id,
        `⚠️ خطا در پردازش عکس:\n<code>${String(e.message || e).slice(0, 200)}</code>`,
        { parse_mode: 'HTML' },
      );
    }
  });

  // ================================================================ وبلاگ
  const POST_CATEGORIES = ['راهنمای خرید', 'آموزش', 'دانش خودرو'];

  route({ exact: 'posts' }, async (ctx) => {
    h.clearState(ctx.from.id);
    const posts = utils.loadPosts();
    await editOrAnswer(ctx, `📝 <b>مدیریت وبلاگ</b>\n\nتعداد پست‌ها: ${utils.fa(posts.length)}`, k.postsMenu(posts.length));
  });

  route({ prefix: 'posts_list:' }, async (ctx) => {
    const page = parseInt(ctx.callbackQuery.data.split(':')[1], 10) || 0;
    const posts = utils.loadPosts().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    await editOrAnswer(ctx, `📋 <b>پست‌های وبلاگ</b> (${utils.fa(posts.length)})\n\n🟢 نمایش · ⚪️ مخفی`, k.postsList(posts, page));
  });

  async function showPostView(ctx, slug) {
    const p = utils.loadPost(slug);
    if (!p) return ctx.answerCallbackQuery('⚠️ پیدا نشد', { show_alert: true });
    const vis = p.visible !== false ? '🟢 نمایش' : '⚪️ مخفی';
    await editOrAnswer(
      ctx,
      `📝 <b>${p.title}</b>\n\n` +
      `🔗 /blog/${p.slug}/\n` +
      `🗓 ${utils.jdateFa(p.date || '')}\n` +
      `⏱ ${utils.fa(p.read_time || 5)} دقیقه · ${utils.fa(utils.wordCount(p))} کلمه\n` +
      `👁 ${vis}`,
      k.postDetail(p),
    );
  }

  route({ prefix: 'post_view:' }, async (ctx) => {
    await showPostView(ctx, ctx.callbackQuery.data.split(':')[1]);
    await ctx.answerCallbackQuery();
  });

  route({ prefix: 'post_toggle:' }, async (ctx) => {
    const slug = ctx.callbackQuery.data.split(':')[1];
    const p = utils.loadPost(slug);
    if (!p) return ctx.answerCallbackQuery('⚠️ پیدا نشد', { show_alert: true });
    p.visible = p.visible === false;
    utils.savePost(p);
    await rebuildAndReport(ctx);
    await ctx.answerCallbackQuery('✅ تغییر کرد و سایت به‌روز شد');
    await showPostView(ctx, slug);
  });

  route({ prefix: 'post_del:' }, async (ctx) => {
    const slug = ctx.callbackQuery.data.split(':')[1];
    const p = utils.loadPost(slug);
    if (!p) return ctx.answerCallbackQuery('⚠️ پیدا نشد', { show_alert: true });
    await editOrAnswer(ctx, `⚠️ پست «${String(p.title).slice(0, 60)}» برای همیشه حذف شود؟`, k.postConfirmDelete(slug));
  });

  route({ prefix: 'post_delconfirm:' }, async (ctx) => {
    const slug = ctx.callbackQuery.data.split(':')[1];
    utils.deletePost(slug);
    await rebuildAndReport(ctx);
    const posts = utils.loadPosts();
    await editOrAnswer(ctx, `🗑 پست حذف شد.\n\n📝 <b>مدیریت وبلاگ</b> — ${utils.fa(posts.length)} پست`, k.postsMenu(posts.length));
    await ctx.answerCallbackQuery('✅ حذف شد');
  });

  route({ prefix: 'post_title:' }, async (ctx) => {
    const slug = ctx.callbackQuery.data.split(':')[1];
    const p = utils.loadPost(slug);
    if (!p) return ctx.answerCallbackQuery('⚠️ پیدا نشد', { show_alert: true });
    h.setState(ctx.from.id, 'postEdit_value', { postSlug: slug, postField: 'title' });
    await ctx.reply(
      `✏️ عنوان جدید پست:\n<blockquote>${p.title}</blockquote>`,
      { parse_mode: 'HTML', reply_markup: k.kb([k.btn('◀️ بازگشت', `post_view:${slug}`)]) },
    );
    await ctx.answerCallbackQuery();
  });

  route({ prefix: 'post_slug:' }, async (ctx) => {
    const slug = ctx.callbackQuery.data.split(':')[1];
    h.setState(ctx.from.id, 'postEdit_value', { postSlug: slug, postField: 'slug' });
    await ctx.reply('🔗 اسلاگ انگلیسی جدید (فقط a-z و خط تیره):', {
      reply_markup: k.kb([k.btn('◀️ بازگشت', `post_view:${slug}`)]),
    });
    await ctx.answerCallbackQuery();
  });

  msgRoute('postEdit_value', async (ctx, s) => {
    const { postSlug: slug, postField: field } = s.data;
    h.clearState(ctx.from.id);
    let p = slug ? utils.loadPost(slug) : null;
    if (!p) return ctx.reply('⚠️ پست پیدا نشد.');
    const text = (ctx.message.text || '').trim();
    let finalSlug = slug;
    if (field === 'title') {
      p.title = text;
      p.h1 = text;
    } else if (field === 'slug') {
      const newSlug = utils.slugify(text);
      if (newSlug !== slug) {
        utils.deletePost(slug);
        p.slug = newSlug;
        finalSlug = newSlug;
      }
    }
    utils.savePost(p);
    const report = await rebuildAndReport(ctx);
    return ctx.reply(`✅ ذخیره شد.\n${report}`, {
      reply_markup: k.kb([k.btn('👁 مشاهده پست', `post_view:${finalSlug}`)]),
    });
  });

  // ---------- افزودن پست (۶ مرحله)
  route({ exact: 'post_add' }, async (ctx) => {
    h.setState(ctx.from.id, 'addPost_title', { newPost: {} });
    await editOrAnswer(ctx, '📝 <b>افزودن پست (۱/۶)</b>\n\nعنوان پست را بنویسید (شامل کلمه کلیدی):', k.cancelKb());
    await ctx.answerCallbackQuery();
  });

  msgRoute('addPost_title', async (ctx, s) => {
    const title = (ctx.message.text || '').trim();
    if (title.length < 8) return ctx.reply('⚠️ عنوان باید کامل‌تر باشد. دوباره:');
    s.data.newPost.title = title;
    h.setState(ctx.from.id, 'addPost_slug', s.data);
    return ctx.reply('📝 <b>افزودن پست (۲/۶)</b>\n\n🔗 اسلاگ انگلیسی (یا «خودکار»):', { parse_mode: 'HTML' });
  });

  msgRoute('addPost_slug', async (ctx, s) => {
    const text = (ctx.message.text || '').trim();
    s.data.newPost.slug = !['خودکار', 'auto'].includes(text) ? utils.slugify(text) : utils.slugify(s.data.newPost.title);
    h.setState(ctx.from.id, 'addPost_category', s.data);
    return ctx.reply('📝 <b>افزودن پست (۳/۶)</b>\n\n🗂 دسته پست؟', {
      reply_markup: k.postCatPicker(POST_CATEGORIES), parse_mode: 'HTML',
    });
  });

  route({ prefix: 'postcat:' }, async (ctx, s) => {
    const idx = parseInt(ctx.callbackQuery.data.split(':')[1], 10) || 0;
    s.data.newPost.category = POST_CATEGORIES[idx];
    h.setState(ctx.from.id, 'addPost_excerpt', s.data);
    try {
      await ctx.editMessageText('📝 <b>افزودن پست (۴/۶)</b>\n\n📋 خلاصه ۲ خطی پست (برای کارت وبلاگ):', { parse_mode: 'HTML' });
    } catch {}
    await ctx.answerCallbackQuery();
  });

  msgRoute('addPost_excerpt', async (ctx, s) => {
    s.data.newPost.excerpt = (ctx.message.text || '').trim();
    h.setState(ctx.from.id, 'addPost_content', s.data);
    return ctx.reply(
      '📝 <b>افزودن پست (۵/۶)</b>\n\n📄 محتوا: هر پیام = یک بلوک.\n' +
      '— متن ساده = پاراگراف\n' +
      '— <code>## تیتر</code> = تیتر بخش\n' +
      '— <code>- مورد</code> = لیست (چند خط پشت هم)\n' +
      '— <code>نکته: متن</code> = باکس نکته\n' +
      '— <code>جدول: الف، ب / ۱،۲ / ۳،۴</code> = جدول\n\n' +
      'وقتی تمام شد بنویسید: <code>پایان</code>',
      { parse_mode: 'HTML' },
    );
  });

  msgRoute('addPost_content', async (ctx, s) => {
    const text = (ctx.message.text || '').trim();
    const post = s.data.newPost;
    post.blocks = post.blocks || [];
    if (['پایان', 'done', 'end'].includes(text)) {
      h.setState(ctx.from.id, 'addPost_image', s.data);
      return ctx.reply('📝 <b>افزودن پست (۶/۶)</b>\n\n📷 عکس کاور پست را بفرستید یا بنویسید: <code>رد</code>', {
        parse_mode: 'HTML', reply_markup: k.cancelKb(),
      });
    }
    if (text.startsWith('## ')) {
      post.blocks.push({ type: 'h2', text: text.slice(3).trim() });
    } else if (text.startsWith('### ')) {
      post.blocks.push({ type: 'h3', text: text.slice(4).trim() });
    } else if (text.startsWith('- ')) {
      const items = text.split('\n').filter((l) => l.startsWith('- ')).map((l) => l.slice(2).trim());
      post.blocks.push({ type: 'list', items });
    } else if (text.startsWith('نکته:')) {
      post.blocks.push({ type: 'tip', title: 'نکته بدنه پلاس', text: text.slice(5).trim() });
    } else if (text.startsWith('جدول:')) {
      const rowsRaw = text.slice(6).split('/').map((r) => r.trim()).filter(Boolean);
      const parsed = rowsRaw.map((r) => r.split('،').map((c) => c.trim()));
      if (parsed.length) post.blocks.push({ type: 'table', headers: parsed[0], rows: parsed.slice(1) });
    } else {
      post.blocks.push({ type: 'p', text });
    }
    h.setState(ctx.from.id, s.state, s.data);
    return ctx.reply(`✅ بلوک شماره ${utils.fa(post.blocks.length)} ثبت شد. بلوک بعدی یا «پایان»:`);
  });

  msgRoute('addPost_image', async (ctx, s) => {
    if (ctx.message.photo) {
      const wait = await ctx.reply('⏳ پردازش عکس…');
      try {
        const buf = await h.downloadPhoto(ctx, ctx.message.photo[ctx.message.photo.length - 1].file_id);
        const entry = await utils.saveProductImage(buf);
        s.data.newPost.image = entry.key;
      } finally {
        try { await ctx.api.deleteMessage(wait.chat.id, wait.message_id); } catch {}
      }
    }
    return finishPost(ctx, s);
  });

  async function finishPost(ctx, s) {
    const post = s.data.newPost;
    h.clearState(ctx.from.id);
    const words = utils.wordCount({ blocks: post.blocks || [] });
    const fullPost = {
      slug: post.slug || utils.slugify(post.title || 'post'),
      title: post.title || '',
      meta_description: (post.excerpt || '').slice(0, 150),
      h1: post.title || '',
      category: post.category || 'دانش خودرو',
      date: new Date().toISOString().slice(0, 10),
      read_time: Math.max(2, Math.round(words / 200)),
      image: post.image || '',
      keywords: [],
      excerpt: post.excerpt || '',
      blocks: post.blocks || [],
      visible: true,
    };
    utils.savePost(fullPost);
    const report = await rebuildAndReport(ctx);
    return ctx.reply(
      `🎉 <b>پست منتشر شد!</b>\n\n📝 ${fullPost.title}\n` +
      `🔗 /blog/${fullPost.slug}/\n` +
      `⏱ ${utils.fa(fullPost.read_time)} دقیقه · ${utils.fa(words)} کلمه\n${report}`,
      { reply_markup: k.kb([k.btn('📝 وبلاگ', 'posts')]), parse_mode: 'HTML' },
    );
  }

  // ================================================================ آمار
  route({ exact: 'stats' }, async (ctx) => {
    const { prods } = h.getProductsSorted();
    const cars = utils.loadCars().cars;
    const posts = utils.loadPosts();
    const manifest = utils.loadManifest();
    const visible = prods.filter((p) => p.visible !== false).length;
    const siteStatus = await h.checkSite(h.config.baseUrl);
    await editOrAnswer(
      ctx,
      '📊 <b>آمار و وضعیت</b>\n\n' +
      `📦 محصولات: ${utils.fa(prods.length)} (${utils.fa(visible)} نمایش)\n` +
      `🚗 خودروها: ${utils.fa(cars.length)}\n` +
      `📝 پست‌ها: ${utils.fa(posts.length)}\n` +
      `🖼 عکس‌های بهینه: ${utils.fa(Object.keys(manifest).length)}\n\n` +
      `🌐 ${siteStatus}`,
      k.statsMenu(),
    );
  });

  route({ exact: 'visitstats' }, async (ctx) => {
    await ctx.answerCallbackQuery('⏳ در حال محاسبه…');
    let s;
    try {
      s = h.analytics.visitSummary();
    } catch (e) {
      return editOrAnswer(ctx, `⚠️ خطا در خواندن آمار:\n<code>${String(e.message).slice(0, 200)}</code>`, k.statsMenu());
    }
    if (!s.has_data) {
      return editOrAnswer(
        ctx,
        '📈 <b>بازدید سایت</b>\n\nهنوز آماری ثبت نشده است.\nسیستم آمار از الان فعال است و بازدیدها را ثبت می‌کند؛ چند ساعتی بعد دوباره اینجا را باز کنید.',
        k.statsMenu(),
      );
    }
    const dayLines = s.days.map((d) => `${utils.jdateFa(d.date)}: <b>${utils.fa(d.count)}</b>`).join('\n');
    const monthLines = Object.entries(s.by_month).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 4)
      .map(([m, c]) => `${utils.JMONTHS[parseInt(m.split('-')[1], 10) - 1]} ${utils.fa(m.split('-')[0])}: <b>${utils.fa(c)}</b>`)
      .join('\n');
    const topLines = Object.entries(s.by_page).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([p, c]) => `${p.split('/').filter(Boolean).join(' › ') || 'خانه'}: <b>${utils.fa(c)}</b>`)
      .join('\n');
    await editOrAnswer(
      ctx,
      '📈 <b>بازدید سایت</b>\n\n' +
      ` امروز: <b>${utils.fa(s.today)}</b> (${utils.fa(s.today_unique)} بازدیدکننده‌ی یکتا)\n` +
      ` دیروز: <b>${utils.fa(s.yesterday)}</b>\n` +
      ` مجموع کل: <b>${utils.fa(s.total)}</b>\n\n` +
      `📅 <b>۷ روز اخیر</b>\n${dayLines}\n\n` +
      `🗓 <b>ماهانه (شمسی)</b>\n${monthLines}\n\n` +
      `🔥 <b>پربازدیدترین صفحه‌ها</b>\n${topLines}`,
      k.statsMenu(),
    );
  });

  route({ exact: 'postviews' }, async (ctx) => {
    await ctx.answerCallbackQuery('⏳ در حال محاسبه…');
    const posts = utils.loadPosts();
    const postByPath = Object.fromEntries(posts.map((p) => [`/blog/${p.slug}/`, p]));
    const views = h.analytics.postViews(Object.keys(postByPath));
    const pathsWithData = Object.keys(views).filter((p) => views[p].total > 0);

    if (!pathsWithData.length) {
      return editOrAnswer(
        ctx,
        `📝 <b>بازدید مقاله‌ها</b>\n\nامروز ${utils.jdateFa(new Date().toISOString().slice(0, 10))} — هنوز بازدیدی از مقاله‌ها ثبت نشده است.`,
        k.statsMenu(),
      );
    }

    const mkey = h.analytics.jmonthKey();
    const monthName = utils.JMONTHS[parseInt(mkey.split('-')[1], 10) - 1];
    const lines = pathsWithData
      .sort((a, b) => views[b].total - views[a].total)
      .map((path) => {
        const p = postByPath[path];
        return `\n📖 <b>${String(p.title).slice(0, 44)}</b>\n` +
          `   مجموع: <b>${utils.fa(views[path].total)}</b> · این ماه (${monthName}): <b>${utils.fa(views[path].month)}</b> · انتشار: ${utils.jdateFa(p.date)}`;
      });
    const totalAll = pathsWithData.reduce((sum, p) => sum + views[p].total, 0);
    await editOrAnswer(
      ctx,
      '📝 <b>بازدید مقاله‌ها</b>\n' +
      `🗓 امروز: ${utils.jdateFa(new Date().toISOString().slice(0, 10))}\n` +
      `مجموع بازدید همه‌ی مقاله‌ها: <b>${utils.fa(totalAll)}</b>\n` +
      lines.join(''),
      k.statsMenu(),
    );
  });

  route({ exact: 'rebuild' }, async (ctx) => {
    await ctx.answerCallbackQuery('⏳ در حال بازسازی…');
    const { ok, out } = await h.sitebuild.rebuildSite();
    await editOrAnswer(
      ctx,
      ok ? '✅ سایت بازسازی شد.' : `⚠️ خطا در بازسازی:\n<code>${String(out).slice(-300)}</code>`,
      k.statsMenu(),
    );
  });
};
