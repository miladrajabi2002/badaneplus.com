// تست آمار بازدید: ثبت، حذف تکراری، فیلتر ربات، تجمیع روزانه/ماهانه شمسی
const test = require('node:test');
const assert = require('node:assert');
const { makeTempEnv } = require('./helpers');

makeTempEnv();
const analytics = require('../analytics');

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';

test('recordVisit: ثبت بازدید عادی', () => {
  assert.equal(analytics.recordVisit({ ip: '1.1.1.1', page: '/', ua: UA }), true);
  assert.equal(analytics.recordVisit({ ip: '1.1.1.2', page: '/blog/kiln-paint-guide/', ua: UA }), true);
});

test('recordVisit: حذف تکراری ip+صفحه در بازه ۳۰ دقیقه', () => {
  const t0 = Date.UTC(2026, 8, 20, 10, 0); // 2026-09-20
  assert.equal(analytics.recordVisit({ ip: '2.2.2.2', page: '/a/', ua: UA, ts: t0 }), true);
  assert.equal(analytics.recordVisit({ ip: '2.2.2.2', page: '/a/', ua: UA, ts: t0 + 10 * 60000 }), false); // ۱۰ دقیقه بعد → تکراری
  assert.equal(analytics.recordVisit({ ip: '2.2.2.2', page: '/a/', ua: UA, ts: t0 + 29 * 60000 }), false); // ۲۹ دقیقه → تکراری
  assert.equal(analytics.recordVisit({ ip: '2.2.2.2', page: '/a/', ua: UA, ts: t0 + 31 * 60000 }), true);  // ۳۱ دقیقه → جدید
  assert.equal(analytics.recordVisit({ ip: '2.2.2.2', page: '/b/', ua: UA, ts: t0 + 5 * 60000 }), true);   // صفحه دیگر → جدید
});

test('recordVisit: فیلتر ربات‌ها و مسیر نامعتبر', () => {
  assert.equal(analytics.recordVisit({ ip: '3.3.3.3', page: '/', ua: 'Mozilla/5.0 (compatible; Googlebot/2.1)' }), false);
  assert.equal(analytics.recordVisit({ ip: '3.3.3.3', page: '/', ua: 'curl/8.0' }), false);
  assert.equal(analytics.recordVisit({ ip: '3.3.3.3', page: 'not-a-path', ua: UA }), false);
  assert.equal(analytics.recordVisit({ ip: '', page: '/', ua: UA }), false);
});

test('visitSummary: تجمیع روزانه/یکتا/ماهانه شمسی', () => {
  // پاک‌سازی و ثبت کنترل‌شده با ts
  const db = require('../db');
  db.exec('DELETE FROM visits');

  const now = Date.now();
  // امروز: ۳ بازدید از ۲ IP یکتا + ۱ ربات (فیلتر) + ۱ تکراری
  analytics.recordVisit({ ip: '10.0.0.1', page: '/', ua: UA, ts: now - 60000 });
  analytics.recordVisit({ ip: '10.0.0.1', page: '/x/', ua: UA, ts: now - 50000 }); // ip دیگر ولی صفحه دیگر → ثبت
  analytics.recordVisit({ ip: '10.0.0.2', page: '/', ua: UA, ts: now - 40000 });
  analytics.recordVisit({ ip: '10.0.0.3', page: '/', ua: 'Googlebot', ts: now - 30000 }); // ربات
  analytics.recordVisit({ ip: '10.0.0.2', page: '/', ua: UA, ts: now - 20000 }); // تکراری (۱ دقیقه بعد)

  const s = analytics.visitSummary();
  assert.equal(s.today, 3);
  assert.equal(s.today_unique, 2);
  assert.equal(s.total, 3);
  assert.ok(s.has_data);
  assert.equal(s.days[6].count, 3); // آخرین روز آرایه = امروز

  // دیروز
  analytics.recordVisit({ ip: '10.0.0.9', page: '/blog/a/', ua: UA, ts: now - 24 * 3600 * 1000 - 60000 });
  const s2 = analytics.visitSummary();
  assert.equal(s2.yesterday, 1);
});

test('visitSummary: تفکیک ماه شمسی در مرز شهریور/مهر ۱۴۰۵', () => {
  const db = require('../db');
  db.exec('DELETE FROM visits');
  // ۲۰۲۶-۰۹-۲۲ (۳۱ شهریور ۱۴۰۵) و ۲۰۲۶-۰۹-۲۳ (۱ مهر ۱۴۰۵)
  analytics.recordVisit({ ip: '20.0.0.1', page: '/', ua: UA, ts: Date.UTC(2026, 8, 22, 10, 0) });
  analytics.recordVisit({ ip: '20.0.0.2', page: '/', ua: UA, ts: Date.UTC(2026, 8, 23, 10, 0) });
  const s = analytics.visitSummary();
  assert.equal(s.by_month['1405-06'], 1); // شهریور
  assert.equal(s.by_month['1405-07'], 1); // مهر
});

test('postViews: مجموع و بازدید ماه جاری هر مقاله', () => {
  const db = require('../db');
  db.exec('DELETE FROM visits');
  const now = Date.now();
  analytics.recordVisit({ ip: '30.0.0.1', page: '/blog/x/', ua: UA, ts: now - 60000 });
  analytics.recordVisit({ ip: '30.0.0.2', page: '/blog/x/', ua: UA, ts: now - 50000 });
  analytics.recordVisit({ ip: '30.0.0.3', page: '/blog/y/', ua: UA, ts: now - 40000 });
  const views = analytics.postViews(['/blog/x/', '/blog/y/', '/blog/z/']);
  assert.equal(views['/blog/x/'].total, 2);
  assert.equal(views['/blog/x/'].month, 2);
  assert.equal(views['/blog/y/'].total, 1);
  assert.equal(views['/blog/z/'], undefined);
});
