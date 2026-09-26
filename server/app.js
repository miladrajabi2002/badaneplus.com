// اپلیکیشن Express — جدا از index.js تا در تست‌ها بدون listen/ربات قابل‌استفاده باشد
const express = require('express');
const analytics = require('./analytics');

function clientIp(req) {
  // ترافیک از ArvanCloud می‌آید؛ IP واقعی = اولین مدخل X-Forwarded-For
  const xff = req.headers['x-forwarded-for'] || '';
  const first = String(xff).split(',')[0].trim();
  if (first) return first;
  return req.socket.remoteAddress || '';
}

// محدودیت نرخ ساده: حداکثر ۶۰ بیکون در دقیقه برای هر IP
const rateBucket = new Map();
function rateLimited(ip) {
  const now = Date.now();
  let b = rateBucket.get(ip);
  if (!b || b.resetAt < now) {
    b = { count: 0, resetAt: now + 60000 };
    rateBucket.set(ip, b);
  }
  b.count += 1;
  if (rateBucket.size > 5000) {
    for (const [k, v] of rateBucket) if (v.resetAt < now) rateBucket.delete(k);
  }
  return b.count > 60;
}

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true);

  function beaconHandler(req, res) {
    const ip = clientIp(req);
    const page = String(req.query.p || '');
    const ua = req.headers['user-agent'] || '';
    try {
      if (!rateLimited(ip)) {
        analytics.recordVisit({ ip, page, ua });
      }
    } catch (e) {
      console.error('[beacon] error:', e.message);
    }
    res.set('Cache-Control', 'no-store, no-cache');
    res.set('Access-Control-Allow-Origin', 'https://badaneplus.com');
    res.status(204).end();
  }
  app.get('/t', beaconHandler);
  app.post('/t', beaconHandler);
  app.head('/t', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache');
    res.status(204).end();
  });

  app.get('/api/health', (req, res) => {
    res.json({
      ok: true,
      uptime: Math.round(process.uptime()),
      visits: analytics.totalVisits(),
      time: new Date().toISOString(),
    });
  });

  app.use((req, res) => {
    res.status(404).json({ ok: false, error: 'not found' });
  });

  return app;
}

module.exports = { createApp, clientIp, rateLimited };
