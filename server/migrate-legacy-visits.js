// یک‌بار اجرا: مهاجرت آمار بازدید قدیمی از لاگ nginx به SQLite
// فرمت قدیمی: msec|remote_addr|status|page|x_forwarded_for|user_agent
const fs = require('node:fs');
const config = require('./config');
const analytics = require('./analytics');

const LOGS = [
  '/var/log/nginx/badaneplus-visit.log.1',
  '/var/log/nginx/badaneplus-visit.log',
];

let migrated = 0;
let skipped = 0;

for (const p of LOGS) {
  if (!fs.existsSync(p)) continue;
  console.log('reading', p);
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  for (const ln of lines) {
    let parts = ln.split('|');
    if (parts.length < 5) continue;
    // سازگاری با فرمت ۵ ستونه قدیمی (بدون XFF)
    if (parts.length === 5) parts = [parts[0], parts[1], parts[2], parts[3], '', parts[4]];
    const [ts, remote, status, page, xff, ua] = parts;
    if (status !== '204' && status !== '200') continue;
    const ip = (String(xff).split(',')[0] || '').trim() || remote;
    const ok = analytics.recordVisit({ ip, page, ua, ts: parseFloat(ts) });
    if (ok) migrated++; else skipped++;
  }
}

console.log(`migrated: ${migrated} visits (skipped ${skipped} — bots/duplicates)`);
console.log(`total in db: ${analytics.totalVisits()}`);
