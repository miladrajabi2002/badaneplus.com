// دیتابیس SQLite — آمار بازدید (بهتر از پارس لاگ nginx: قابل‌کوئری، اتمیک، قابل‌بکاپ)
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const config = require('./config');

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

db.exec(`
CREATE TABLE IF NOT EXISTS visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  day TEXT NOT NULL,
  jmonth TEXT NOT NULL,
  ip TEXT NOT NULL,
  page TEXT NOT NULL,
  ua TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_visits_day ON visits (day);
CREATE INDEX IF NOT EXISTS idx_visits_jmonth ON visits (jmonth);
CREATE INDEX IF NOT EXISTS idx_visits_page ON visits (page);
CREATE INDEX IF NOT EXISTS idx_visits_ip_page ON visits (ip, page, ts);
`);

module.exports = db;
