// ابزار تست: محیط ایزوله (دیتا/دیتابیس موقت) + ربات ماک‌شده + سازنده آپدیت‌ها
// مهم: قبل از require کردن ماژول‌های server باید صدا زده شود
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Bot } = require('grammy');

/** ساخت محیط موقت + کپی داده‌های واقعی پروژه */
function makeTempEnv() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-test-'));
  const dirs = {
    root,
    data: path.join(root, 'data'),
    assets: path.join(root, 'assets'),
    var: path.join(root, 'var'),
  };
  fs.mkdirSync(path.join(dirs.assets, 'img', 'products'), { recursive: true });
  fs.mkdirSync(path.join(dirs.assets, 'img', 'blog'), { recursive: true });
  fs.mkdirSync(path.join(dirs.assets, 'img', 'site'), { recursive: true });
  fs.mkdirSync(dirs.var, { recursive: true });

  // کپی داده‌های واقعی (محصولات، خودروها، پست‌ها، تنظیمات، منیفست)
  fs.cpSync(path.join(__dirname, '..', '..', 'data'), dirs.data, { recursive: true });

  process.env.BADANEPLUS_DATA_DIR = dirs.data;
  process.env.BADANEPLUS_ASSETS_DIR = dirs.assets;
  process.env.BADANEPLUS_VAR_DIR = dirs.var;
  process.env.BADANEPLUS_NO_REBUILD = '1';
  process.env.BOT_TOKEN = '100:TEST_TOKEN';

  return dirs;
}

function seedAdmin(id = 111) {
  const statePath = path.join(process.env.BADANEPLUS_VAR_DIR, 'bot-state.json');
  fs.writeFileSync(statePath, JSON.stringify({ admin_ids: [id] }));
}

// ---------------------------------------------------------------- ربات ماک
let msgCounter = 500;

function fakeResult(method, payload) {
  msgCounter += 1;
  switch (method) {
    case 'sendMessage':
      return { ok: true, result: { message_id: msgCounter, chat: { id: payload.chat_id }, text: payload.text || '', date: Math.floor(Date.now() / 1000) } };
    case 'sendPhoto':
      return { ok: true, result: { message_id: msgCounter, chat: { id: payload.chat_id }, photo: [] } };
    case 'getMe':
      return { ok: true, result: { id: 42, is_bot: true, first_name: 'BadanePlus', username: 'badaneplusbot' } };
    case 'getFile':
      return { ok: true, result: { file_id: payload.file_id, file_path: 'photos/file_1.jpg' } };
    default:
      return { ok: true, result: true };
  }
}

/** ربات grammY با API ماک — همه فراخوانی‌ها در calls ثبت می‌شوند */
async function mockBot(bot) {
  const calls = [];
  bot.api.config.use(async (prev, method, payload) => {
    calls.push({ method, payload });
    return fakeResult(method, payload);
  });
  await bot.init(); // botInfo از getMe ماک پر می‌شود
  return calls;
}

// ---------------------------------------------------------------- سازنده آپدیت‌ها
let updateCounter = 10000;

function baseFrom(userId) {
  return { id: userId, is_bot: false, first_name: 'Tester', username: 'tester' };
}

function msgUpdate(userId, text) {
  updateCounter += 1;
  // تلگرام دستورات را با entities مشخص می‌کند — grammy بدون آن‌ها command را تشخیص نمی‌دهد
  const entities = text.startsWith('/')
    ? [{ offset: 0, length: text.split(/\s/)[0].length, type: 'bot_command' }]
    : undefined;
  return {
    update_id: updateCounter,
    message: {
      message_id: updateCounter,
      from: baseFrom(userId),
      chat: { id: userId, type: 'private' },
      date: Math.floor(Date.now() / 1000),
      text,
      ...(entities ? { entities } : {}),
    },
  };
}

function photoUpdate(userId) {
  updateCounter += 1;
  return {
    update_id: updateCounter,
    message: {
      message_id: updateCounter,
      from: baseFrom(userId),
      chat: { id: userId, type: 'private' },
      date: Math.floor(Date.now() / 1000),
      photo: [
        { file_id: 'photo_test_1', file_unique_id: 'u1', width: 120, height: 160 },
        { file_id: 'photo_test_2', file_unique_id: 'u2', width: 1200, height: 1600 },
      ],
    },
  };
}

function cbUpdate(userId, data) {
  updateCounter += 1;
  return {
    update_id: updateCounter,
    callback_query: {
      id: `cbq_${updateCounter}`,
      from: baseFrom(userId),
      message: { message_id: 777, chat: { id: userId, type: 'private' }, text: 'menu' },
      data,
    },
  };
}

// ---------------------------------------------------------------- ادعاهای کمکی
function lastCall(calls, method, chatId) {
  for (let i = calls.length - 1; i >= 0; i--) {
    const c = calls[i];
    if (c.method === method && (!chatId || c.payload.chat_id === chatId)) return c.payload;
  }
  return null;
}

function kbButtons(payload) {
  if (!payload || !payload.reply_markup || !payload.reply_markup.inline_keyboard) return [];
  return payload.reply_markup.inline_keyboard.flat();
}

function kbHas(payload, text, data) {
  return kbButtons(payload).some((b) => b.text === text && (data === undefined || b.callback_data === data));
}

/** عکس PNG کوچک برای تست پایپ‌لاین تصویر */
async function tinyPng() {
  const sharp = require('sharp');
  return sharp({ create: { width: 120, height: 160, channels: 3, background: '#8899aa' } }).png().toBuffer();
}

module.exports = {
  makeTempEnv, seedAdmin, mockBot, fakeResult,
  msgUpdate, photoUpdate, cbUpdate,
  lastCall, kbButtons, kbHas, tinyPng,
};
