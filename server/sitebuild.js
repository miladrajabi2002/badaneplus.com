// بازسازی سایت — next build + همگام‌سازی استاتیک با پوشه live (بدون قطعی سرویس)
// صف‌بندی: اگر چند تغییر پشت‌سرهم بیاید، فقط یک بیلد نهایی اجرا می‌شود
const { spawn } = require('node:child_process');
const config = require('./config');

const log = (...a) => console.log('[sitebuild]', ...a);

function execBuild() {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn('bash', [config.buildScript], { cwd: config.root });
    } catch (e) {
      return resolve({ ok: false, out: String(e) });
    }
    let out = '';
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch {}
      out += '\n[timeout after 300s]';
    }, 300000);
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { out += d.toString(); });
    child.on('error', (e) => { clearTimeout(timer); resolve({ ok: false, out: out + String(e) }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ ok: code === 0, out }); });
  });
}

let building = false;
let pendingRequested = false;
let pendingWaiters = [];

async function rebuildSite() {
  if (config.noRebuild) return { ok: true, out: 'rebuild skipped (BADANEPLUS_NO_REBUILD=1)' };
  if (building) {
    pendingRequested = true;
    return new Promise((res) => pendingWaiters.push(res));
  }
  building = true;
  const t0 = Date.now();
  let r = await execBuild();
  building = false;
  log(`build done in ${((Date.now() - t0) / 1000).toFixed(1)}s ok=${r.ok}`);
  if (pendingRequested) {
    pendingRequested = false;
    r = await rebuildSite(); // یک اجرای نهایی با تازه‌ترین داده
  }
  const waiters = pendingWaiters;
  pendingWaiters = [];
  waiters.forEach((w) => w(r));
  return r;
}

/** بررسی آنلاین بودن سایت */
async function checkSite(url) {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 10000);
    const res = await fetch(url, { signal: ctl.signal, redirect: 'manual' });
    clearTimeout(t);
    return res.status === 200 ? '✅ سایت آنلاین (HTTP 200)' : `⚠️ پاسخ سایت: ${res.status}`;
  } catch {
    return '⚠️ بررسی سایت ناموفق';
  }
}

module.exports = { rebuildSite, checkSite };
