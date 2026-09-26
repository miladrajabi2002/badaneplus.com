// ابزارهای مشترک سرور: IO داده (اتمیک)، پایپ‌لاین تصویر (WebP با sharp)،
// فرمت فارسی/شمسی، slugify، پارس قیمت — پورت utils.py
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { toJalaali } = require('jalaali-js');
const config = require('./config');

// ---------------------------------------------------------------- فرمت فارسی
const FA_MAP = { 0: '۰', 1: '۱', 2: '۲', 3: '۳', 4: '۴', 5: '۵', 6: '۶', 7: '۷', 8: '۸', 9: '۹' };
const EN_MAP = { '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9' };

function fa(value) {
  return String(value).replace(/[0-9]/g, (d) => FA_MAP[+d]);
}

function priceFa(value) {
  if (!value) return '—';
  const s = Math.round(Number(value)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',').replace(/,/g, '،');
  return fa(s);
}

const JMONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

function jdateFa(isoStr) {
  try {
    const m = String(isoStr).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return fa(isoStr);
    const j = toJalaali(+m[1], +m[2], +m[3]);
    return `${fa(j.jd)} ${JMONTHS[j.jm - 1]} ${fa(j.jy)}`;
  } catch {
    return fa(isoStr);
  }
}

// ---------------------------------------------------------------- IO داده (اتمیک)
function readJson(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJsonAtomic(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = p + '.' + crypto.randomBytes(4).toString('hex') + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, p);
}

const P = {
  products: () => path.join(config.dataDir, 'products.json'),
  cars: () => path.join(config.dataDir, 'cars.json'),
  settings: () => path.join(config.dataDir, 'settings.json'),
  manifest: () => path.join(config.dataDir, 'image-manifest.json'),
  post: (slug) => path.join(config.postsDir, `${slug}.json`),
};

const loadProducts = () => readJson(P.products(), { products: [] });
const saveProducts = (doc) => writeJsonAtomic(P.products(), doc);
const loadCars = () => readJson(P.cars(), { categories: [], cars: [] });
const saveCars = (doc) => writeJsonAtomic(P.cars(), doc);
const loadSettings = () => readJson(P.settings(), {});
const saveSettings = (s) => writeJsonAtomic(P.settings(), s);
const loadManifest = () => readJson(P.manifest(), {});
const saveManifest = (m) => writeJsonAtomic(P.manifest(), m);

function loadPosts() {
  let files = [];
  try {
    files = fs.readdirSync(config.postsDir).filter((f) => f.endsWith('.json')).sort();
  } catch {
    return [];
  }
  return files.map((f) => readJson(P.post(f.replace(/\.json$/, '')), null)).filter(Boolean);
}

function loadPost(slug) {
  return readJson(P.post(slug), null);
}

function savePost(post) {
  writeJsonAtomic(P.post(post.slug), post);
}

function deletePost(slug) {
  try { fs.unlinkSync(P.post(slug)); } catch {}
}

// ---------------------------------------------------------------- تصاویر (sharp)
/** مسیر مطلق فایل استاتیک از مسیر منیفست (قدیمی نسبی یا جدید مطلق) */
function absAssetPath(entryPath) {
  const rel = String(entryPath || '').replace(/^\//, '').replace(/^assets\//, '');
  return path.join(config.assetsDir, rel);
}

async function saveProductImage(buffer, key) {
  const sharp = require('sharp');
  key = key || 'b' + crypto.randomBytes(5).toString('hex');

  fs.mkdirSync(config.imgProductsDir, { recursive: true });
  const fullPath = path.join(config.imgProductsDir, `${key}-full.webp`);
  const cardPath = path.join(config.imgProductsDir, `${key}-card.webp`);

  await sharp(buffer).rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 }).toFile(fullPath);
  await sharp(buffer).rotate()
    .resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78 }).toFile(cardPath);

  const lqipBuf = await sharp(buffer).rotate().resize({ width: 28 }).webp({ quality: 35 }).toBuffer();
  const lqip = 'data:image/webp;base64,' + lqipBuf.toString('base64');

  const fullMeta = await sharp(fullPath).metadata();

  const manifest = loadManifest();
  const entry = {
    full: `/assets/img/products/${key}-full.webp`,
    card: `/assets/img/products/${key}-card.webp`,
    w: fullMeta.width,
    h: fullMeta.height,
    lqip,
  };
  manifest[key] = entry;
  saveManifest(manifest);
  return { key, ...entry };
}

function deleteImage(key) {
  const manifest = loadManifest();
  if (!manifest[key]) return;
  for (const p of [absAssetPath(manifest[key].full), absAssetPath(manifest[key].card)]) {
    try { fs.unlinkSync(p); } catch {}
  }
  delete manifest[key];
  saveManifest(manifest);
}

/** عکس هیرو: برش مرکزی افقی ۴:۳ → full 1600×1200 + card 1152×864 (WebP) */
async function saveHeroImage(buffer) {
  const sharp = require('sharp');
  const meta = await sharp(buffer).metadata();
  fs.mkdirSync(config.imgSiteDir, { recursive: true });
  await sharp(buffer).rotate().resize(1600, 1200, { fit: 'cover' }).webp({ quality: 82 })
    .toFile(path.join(config.imgSiteDir, 'hero-full.webp'));
  await sharp(buffer).rotate().resize(1152, 864, { fit: 'cover' }).webp({ quality: 80 })
    .toFile(path.join(config.imgSiteDir, 'hero-card.webp'));
  return { w: meta.width, h: meta.height };
}

// ---------------------------------------------------------------- متفرقه
function slugify(text) {
  let t = String(text || '').trim().toLowerCase().replace(/[\s_]+/g, '-');
  t = t.replace(/[^a-z0-9\u0600-\u06FF-]/g, '');
  t = t.replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
  if (t) return t;
  const now = new Date();
  return 'post-' + now.toISOString().slice(0, 10).replace(/-/g, '');
}

function wordCount(post) {
  let n = 0;
  for (const b of (post.blocks || [])) {
    const t = b.type;
    if (['p', 'h2', 'h3', 'tip', 'cta'].includes(t)) {
      n += String(b.text || '').split(/\s+/).filter(Boolean).length;
    } else if (t === 'list') {
      n += (b.items || []).reduce((s, i) => s + String(i).split(/\s+/).filter(Boolean).length, 0);
    } else if (t === 'table') {
      n += (b.headers || []).reduce((s, h) => s + String(h).split(/\s+/).filter(Boolean).length, 0);
      for (const row of (b.rows || [])) n += row.reduce((s, c) => s + String(c).split(/\s+/).filter(Boolean).length, 0);
    }
  }
  return n;
}

/** پارس قیمت: «۱۲۳۴۵۶» → 123456 ، «تماس» → استعلامی */
function parsePrice(text) {
  const t = String(text || '').trim();
  if (!t || ['تماس', 'استعلام', 'تماسی', 'استعلامی', '-', '0', '۰'].includes(t)) return { price: 0, onCall: true };
  const digits = t.replace(/[۰-۹]/g, (d) => EN_MAP[d]).replace(/[^\d]/g, '');
  return { price: digits ? parseInt(digits, 10) : 0, onCall: false };
}

module.exports = {
  fa, priceFa, jdateFa, JMONTHS,
  loadProducts, saveProducts, loadCars, saveCars,
  loadSettings, saveSettings, loadPosts, loadPost, savePost, deletePost,
  loadManifest, saveManifest,
  saveProductImage, deleteImage, saveHeroImage, absAssetPath,
  slugify, wordCount, parsePrice,
};
