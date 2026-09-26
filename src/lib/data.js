// بارگذاری داده‌ها (data/*.json) در زمان build + ساختارهای کمکی سایت
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'data');

function readJson(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

export function loadSettings() {
  return readJson(path.join(DATA_DIR, 'settings.json'), {});
}

export function loadCarsDoc() {
  return readJson(path.join(DATA_DIR, 'cars.json'), { categories: [], cars: [] });
}

export function loadProductsDoc() {
  return readJson(path.join(DATA_DIR, 'products.json'), { products: [] });
}

export function loadManifest() {
  return readJson(path.join(DATA_DIR, 'image-manifest.json'), {});
}

export function loadPosts() {
  const dir = path.join(DATA_DIR, 'posts');
  let files = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  } catch {
    return [];
  }
  const posts = [];
  for (const f of files) {
    const p = readJson(path.join(dir, f), null);
    if (p) posts.push(p);
  }
  posts.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  return posts;
}

/**
 * ساخت کل داده‌های سایت (معادل load_data در build.py قدیمی)
 * — اتصال محصولات به خودرو/دسته/عکس و محاسبه محصولات هر خودرو
 */
export function buildSiteData() {
  const settings = loadSettings();
  const carsDoc = loadCarsDoc();
  const manifest = loadManifest();
  const posts = loadPosts();
  const cars = (carsDoc.cars || []).filter((c) => c.active !== false);
  const carById = Object.fromEntries(cars.map((c) => [c.id, c]));
  const catById = Object.fromEntries((carsDoc.categories || []).map((c) => [c.id, c]));

  const products = (loadProductsDoc().products || []).map((p) => ({
    ...p,
    _car: carById[p.car] || {},
    _cat: catById[p.category] || {},
    _img: manifest[p.image] || null,
  }));

  for (const c of cars) {
    c._products = products
      .filter((p) => p.car === c.id && p.visible !== false)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }

  return { settings, cars, categories: carsDoc.categories || [], products, posts, manifest };
}

/** پست‌های قابل نمایش (رفع باگ نسخه پایتون: مخفی‌سازی پست واقعاً کار کند) */
export function visiblePosts(posts) {
  return posts.filter((p) => p.visible !== false);
}

// ---------------------------------------------------------------- لینک‌سازی داخلی (SEO)
function buildLinkMap(cars) {
  const m = {};
  for (const car of cars) m[car.name] = `/${car.slug}/`;
  m['لوازم بدنه ۲۰۶'] = '/peugeot-206/';
  m['لوازم بدنه سمند'] = '/samand/';
  m['لوازم بدنه پراید'] = '/pride/';
  m['لوازم بدنه ۴۰۵'] = '/peugeot-405-pars/';
  return m;
}

const POST_LINKS = {
  'رنگ کوره‌ای چیست': '/blog/kiln-paint-guide/',
  'تفاوت رنگ کوره‌ای': '/blog/kiln-paint-guide/',
  'تشخیص قطعه فابریک': '/blog/original-vs-aftermarket-parts/',
  'سینی فن چیست': '/blog/radiator-support-guide/',
  'نگهداری رنگ خودرو': '/blog/car-paint-care-tips/',
  'ضمانت ۵ ساله رنگ': '/blog/paint-warranty-meaning/',
  'ارسال لوازم بدنه': '/blog/nationwide-shipping-guide/',
};

export function makeLinkifier(cars) {
  const fullMap = { ...buildLinkMap(cars), ...POST_LINKS };
  return function linkify(text) {
    let out = String(text);
    const used = new Set();
    const entries = Object.entries(fullMap).sort((a, b) => b[0].length - a[0].length);
    for (const [phrase, href] of entries) {
      if (out.includes(phrase) && !used.has(phrase) && phrase.length > 6) {
        out = out.replace(phrase, `<a href="${href}">${phrase}</a>`);
        used.add(phrase);
      }
    }
    return out;
  };
}

// ---------------------------------------------------------------- JSON-LD
export function localBusinessSchema(s) {
  const c = s.contact || {};
  const site = s.site || {};
  return {
    '@context': 'https://schema.org',
    '@type': 'AutoPartsStore',
    '@id': `${site.url}/#store`,
    name: site.brand_fa || 'بدنه پلاس',
    alternateName: 'بدنه پلاس',
    description: site.description,
    url: site.url,
    telephone: c.phone,
    priceRange: 'IRR',
    image: `${site.url}/assets/img/og-image.webp`,
    logo: `${site.url}/assets/img/logo.svg`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: c.address,
      addressLocality: c.city || 'تهران',
      addressCountry: 'IR',
    },
    geo: { '@type': 'GeoCoordinates', latitude: c.geo_lat, longitude: c.geo_lng },
    openingHours: c.hours_schema,
    areaServed: { '@type': 'Country', name: 'Iran' },
  };
}

export function productSchema(p, url) {
  const offer = {
    '@type': 'Offer',
    availability: p.in_stock === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
    priceCurrency: 'IRR',
    url,
  };
  if (p.price && !p.price_on_call) offer.price = p.price * 10; // تومان → ریال
  return {
    '@type': 'Product',
    name: p.name,
    description: p.description || '',
    category: `لوازم بدنه ${(p._car || {}).name || ''}`,
    brand: { '@type': 'Brand', name: 'بدنه پلاس' },
    offers: offer,
  };
}

export function productsListSchema(products, baseUrl, pageUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: productSchema(p, pageUrl || baseUrl),
    })),
  };
}

export function faqSchema(faqList) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (faqList || []).map((q) => ({
      '@type': 'Question',
      name: q.q,
      acceptedAnswer: { '@type': 'Answer', text: q.a },
    })),
  };
}

export function breadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function blogPostingSchema(post, baseUrl, imgUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.meta_description,
    datePublished: post.date,
    dateModified: post.date,
    inLanguage: 'fa-IR',
    image: imgUrl,
    author: { '@type': 'Organization', name: 'بدنه پلاس', url: baseUrl },
    publisher: { '@type': 'Organization', name: 'بدنه پلاس', url: baseUrl },
    mainEntityOfPage: `${baseUrl}/blog/${post.slug}/`,
  };
}
