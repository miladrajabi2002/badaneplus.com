// تنظیمات و مسیرهای پروژه — قابل‌تحریف برای تست‌ها با متغیرهای محیطی
require('dotenv').config();
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.join(__dirname, '..');

const config = {
  root: ROOT,
  env: process.env.NODE_ENV || 'development',

  // توکن ربات و آدرس‌ها
  token: process.env.BOT_TOKEN || '',
  baseUrl: process.env.BASE_URL || 'https://badaneplus.com',
  port: parseInt(process.env.PORT || '8083', 10),

  // مسیرها (برای تست قابل تغییر)
  dataDir: process.env.BADANEPLUS_DATA_DIR || path.join(ROOT, 'data'),
  assetsDir: process.env.BADANEPLUS_ASSETS_DIR || path.join(ROOT, 'public', 'assets'),
  varDir: process.env.BADANEPLUS_VAR_DIR || path.join(ROOT, 'var'),
  dbPath: process.env.BADANEPLUS_DB_PATH || path.join(process.env.BADANEPLUS_VAR_DIR || path.join(ROOT, 'var'), 'badaneplus.db'),
  statePath: process.env.BADANEPLUS_STATE_PATH || path.join(process.env.BADANEPLUS_VAR_DIR || path.join(ROOT, 'var'), 'bot-state.json'),
  buildScript: process.env.BADANEPLUS_BUILD_SCRIPT || path.join(ROOT, 'scripts', 'build-live.sh'),

  // در تست‌ها بازسازی سایت واقعی انجام نشود
  noRebuild: process.env.BADANEPLUS_NO_REBUILD === '1',
};

config.imgProductsDir = path.join(config.assetsDir, 'img', 'products');
config.imgBlogDir = path.join(config.assetsDir, 'img', 'blog');
config.imgSiteDir = path.join(config.assetsDir, 'img', 'site');
config.postsDir = path.join(config.dataDir, 'posts');

fs.mkdirSync(config.varDir, { recursive: true });

// ---------------------------------------------------------------- وضعیت ادمین‌ها
function readState() {
  try {
    return JSON.parse(fs.readFileSync(config.statePath, 'utf8'));
  } catch {
    return {};
  }
}

function writeState(st) {
  fs.mkdirSync(path.dirname(config.statePath), { recursive: true });
  const tmp = config.statePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(st, null, 2));
  fs.renameSync(tmp, config.statePath);
}

/** شناسه ادمین‌ها: pre-seed از .env + ذخیره‌شده در var/bot-state.json */
function getAdminIds() {
  const st = readState();
  const ids = new Set(st.admin_ids || []);
  (process.env.ADMIN_IDS || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((id) => ids.add(parseInt(id, 10)));
  return [...ids].filter(Number.isFinite);
}

function addAdminId(id) {
  const st = readState();
  const ids = new Set(st.admin_ids || []);
  ids.add(id);
  st.admin_ids = [...ids].sort((a, b) => a - b);
  writeState(st);
  return st.admin_ids;
}

module.exports = { ...config, getAdminIds, addAdminId };
