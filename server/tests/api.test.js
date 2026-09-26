// تست API: بیکون /t، سلامت /api/health، رفتار 404
const test = require('node:test');
const assert = require('node:assert');
const { makeTempEnv } = require('./helpers');

makeTempEnv();
const { createApp } = require('../app');
const analytics = require('../analytics');

const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36';

async function withServer(fn) {
  const app = createApp();
  const server = app.listen(0, '127.0.0.1');
  await new Promise((res) => server.once('listening', res));
  const port = server.address().port;
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((res) => server.close(res));
  }
}

test('GET /t: بیکون با ۲۰۴ ثبت می‌شود', async () => {
  await withServer(async (base) => {
    const before = analytics.totalVisits();
    const res = await fetch(`${base}/t?p=${encodeURIComponent('/')}`, {
      headers: { 'user-agent': UA, 'x-forwarded-for': '91.99.1.1' },
    });
    assert.equal(res.status, 204);
    assert.equal(analytics.totalVisits(), before + 1);
    const s = analytics.visitSummary();
    assert.ok(s.today >= 1);
  });
});

test('POST /t: sendBeacon هم ثبت می‌شود', async () => {
  await withServer(async (base) => {
    const before = analytics.totalVisits();
    const res = await fetch(`${base}/t?p=${encodeURIComponent('/blog/kiln-paint-guide/')}`, {
      method: 'POST',
      headers: { 'user-agent': UA, 'x-forwarded-for': '91.99.1.2' },
    });
    assert.equal(res.status, 204);
    assert.equal(analytics.totalVisits(), before + 1);
  });
});

test('حذف تکراری: دو بیکون یک IP در یک دقیقه فقط یکی شمرده می‌شود', async () => {
  await withServer(async (base) => {
    const before = analytics.totalVisits();
    const opts = { headers: { 'user-agent': UA, 'x-forwarded-for': '91.99.1.3' } };
    await fetch(`${base}/t?p=${encodeURIComponent('/dup/')}`, opts);
    await fetch(`${base}/t?p=${encodeURIComponent('/dup/')}`, opts);
    assert.equal(analytics.totalVisits(), before + 1);
  });
});

test('UA ربات ثبت نمی‌شود', async () => {
  await withServer(async (base) => {
    const before = analytics.totalVisits();
    await fetch(`${base}/t?p=${encodeURIComponent('/bot/')}`, {
      headers: { 'user-agent': 'curl/8.1.2', 'x-forwarded-for': '91.99.1.4' },
    });
    assert.equal(analytics.totalVisits(), before);
  });
});

test('/api/health: پاسخ ok', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/health`);
    assert.equal(res.status, 200);
    const j = await res.json();
    assert.equal(j.ok, true);
    assert.ok(typeof j.visits === 'number');
  });
});

test('مسیر ناشناخته: 404', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/unknown`);
    assert.equal(res.status, 404);
    const j = await res.json();
    assert.equal(j.ok, false);
  });
});
