// آمار بازدید — ثبت بیکون + خلاصه روزانه/ماهانه (شمسی) + بازدید مقاله‌ها
// معادل پایتونی visit_summary با این تفاوت که منبع داده SQLite است نه لاگ nginx
const db = require('./db');
const { tehranDayKey, jmonthKey } = require('./tz');

const BOT_UA = ['bot', 'spider', 'crawl', 'headless', 'curl', 'wget', 'python-requests', 'facebookexternalhit'];
const DEDUPE_MS = 30 * 60 * 1000; // حذف تکراری: ip+صفحه در بازه ۳۰ دقیقه

function isBotUa(ua) {
  const u = String(ua || '').toLowerCase();
  return BOT_UA.some((b) => u.includes(b));
}

const stmtDup = db.prepare('SELECT 1 FROM visits WHERE ip = ? AND page = ? AND ts > ? LIMIT 1');
const stmtInsert = db.prepare('INSERT INTO visits (ts, day, jmonth, ip, page, ua) VALUES (?, ?, ?, ?, ?, ?)');

/**
 * ثبت یک بازدید. تکراری‌ها (ip+صفحه در ۳۰ دقیقه) و ربات‌ها نادیده گرفته می‌شوند.
 * ts قابل تزریق برای تست.
 */
function recordVisit({ ip, page, ua, ts }) {
  ts = ts ?? Date.now();
  if (!page || !String(page).startsWith('/')) return false;
  if (isBotUa(ua)) return false;
  ip = String(ip || '').trim();
  if (!ip) return false;
  if (stmtDup.get(ip, page, ts - DEDUPE_MS)) return false;
  const d = new Date(ts);
  stmtInsert.run(ts, tehranDayKey(d), jmonthKey(d), ip, page, String(ua || ''));
  return true;
}

/** خلاصه آمار — هم‌ارز visit_summary پایتون */
function visitSummary() {
  const today = tehranDayKey();
  const yesterday = tehranDayKey(new Date(Date.now() - 24 * 3600 * 1000));

  const total = db.prepare('SELECT COUNT(*) AS n FROM visits').get().n;
  const todayRow = db.prepare("SELECT COUNT(*) AS n, COUNT(DISTINCT ip) AS uniq FROM visits WHERE day = ?").get(today);
  const yesterdayN = db.prepare('SELECT COUNT(*) AS n FROM visits WHERE day = ?').get(yesterday).n;

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const dk = tehranDayKey(new Date(Date.now() - i * 24 * 3600 * 1000));
    days.push({ date: dk, count: db.prepare('SELECT COUNT(*) AS n FROM visits WHERE day = ?').get(dk).n });
  }

  const byMonth = {};
  for (const r of db.prepare('SELECT jmonth AS m, COUNT(*) AS n FROM visits GROUP BY jmonth').all()) {
    byMonth[r.m] = r.n;
  }

  const byPage = {};
  for (const r of db.prepare('SELECT page AS p, COUNT(*) AS n FROM visits GROUP BY page').all()) {
    byPage[r.p] = r.n;
  }

  return {
    total,
    today: todayRow.n,
    today_unique: todayRow.uniq,
    yesterday: yesterdayN,
    days,
    by_month: byMonth,
    by_page: byPage,
    has_data: total > 0,
  };
}

/** بازدید مقاله‌ها: مجموع + ماه جاری (شمسی) برای هر پست */
function postViews(postPaths) {
  if (!postPaths.length) return {};
  const mkey = jmonthKey();
  const placeholders = postPaths.map(() => '?').join(',');
  const rows = db.prepare(
    `SELECT page, COUNT(*) AS total,
            SUM(CASE WHEN jmonth = ? THEN 1 ELSE 0 END) AS monthN
     FROM visits WHERE page IN (${placeholders}) GROUP BY page`
  ).all(mkey, ...postPaths);
  const out = {};
  for (const r of rows) out[r.page] = { total: r.total, month: r.monthN || 0 };
  return out;
}

function totalVisits() {
  return db.prepare('SELECT COUNT(*) AS n FROM visits').get().n;
}

module.exports = { recordVisit, visitSummary, postViews, tehranDayKey, jmonthKey, isBotUa, totalVisits };
