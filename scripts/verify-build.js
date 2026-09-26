#!/usr/bin/env node
// صحت‌سنجی خروجی بیلد: همه صفحات/استت‌های ضروری باید در live/ باشند
const fs = require('node:fs');
const path = require('node:path');

const LIVE = path.join(__dirname, '..', 'live');
const DATA = path.join(__dirname, '..', 'data');

function readJson(p, d) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return d; } }

const errors = [];
const okFiles = [];

function check(rel) {
  const p = path.join(LIVE, rel);
  if (fs.existsSync(p)) okFiles.push(rel);
  else errors.push(`MISSING: ${rel}`);
}

// صفحات اصلی
['index.html', '404.html', 'sitemap.xml', 'robots.txt', 'sw.js', 'manifest.webmanifest',
  'favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png',
  'blog/index.html'].forEach(check);

// صفحات خودرو (فقط خودروهای دارای محصول)
const carsDoc = readJson(path.join(DATA, 'cars.json'), { cars: [] });
const products = readJson(path.join(DATA, 'products.json'), { products: [] });
for (const car of carsDoc.cars || []) {
  if (car.active === false) continue;
  const has = (products.products || []).some((p) => p.car === car.id && p.visible !== false);
  if (has) check(`${car.slug}/index.html`);
}

// پست‌های وبلاگ (فقط قابل نمایش)
const postsDir = path.join(DATA, 'posts');
for (const f of fs.readdirSync(postsDir).filter((x) => x.endsWith('.json'))) {
  const post = readJson(path.join(postsDir, f), null);
  if (post && post.visible !== false) check(`blog/${post.slug}/index.html`);
}

// استت‌های حیاتی
['assets/img/site/hero-card.webp', 'assets/img/site/hero-full.webp',
  'assets/img/logo.svg', 'assets/img/og-image.webp',
  'assets/fonts/Vazirmatn-Regular.woff2', 'assets/fonts/Vazirmatn-Bold.woff2',
  'assets/fonts/Estedad-FD-Black.woff2'].forEach(check);

// CSS باندل‌شده Next
const cssDir = path.join(LIVE, '_next', 'static', 'css');
if (!fs.existsSync(cssDir) || !fs.readdirSync(cssDir).some((f) => f.endsWith('.css'))) {
  errors.push('MISSING: _next/static/css/*.css');
} else {
  okFiles.push('_next/static/css/*.css');
}

// بررسی محتوای صفحه اصلی
const home = fs.readFileSync(path.join(LIVE, 'index.html'), 'utf8');
if (!home.includes('dir="rtl"')) errors.push('HOME: dir=rtl missing');
if (!home.includes('application/ld+json')) errors.push('HOME: JSON-LD missing');
if (!home.includes('hero-card.webp')) errors.push('HOME: hero image missing');
if (!home.includes('بدنه پلاس')) errors.push('HOME: brand missing');
const productImgs = home.match(/data-src="\/assets\/img\/products\//g) || [];
if (productImgs.length < 5) errors.push(`HOME: expected product images, found ${productImgs.length}`);

console.log(`✓ ${okFiles.length} items OK`);
for (const e of errors) console.error('✗ ' + e);
if (errors.length) {
  console.error(`\n${errors.length} problem(s) found!`);
  process.exit(1);
}
console.log('All build checks passed ✔');
