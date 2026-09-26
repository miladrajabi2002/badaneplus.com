// سرور Node بدنه پلاس — API آمار (/t و /api/health) + ربات تلگرام
// nginx مسیرهای /t و /api/ را به این پروسه پراکسی می‌کند؛ فقط روی 127.0.0.1 گوش می‌دهد
const config = require('./config');
const { createApp } = require('./app');
const { createBot } = require('./bot');

const app = createApp();
const server = app.listen(config.port, '127.0.0.1', () => {
  console.log(`[server] API listening on 127.0.0.1:${config.port}`);
});

let botInstance = null;

async function startBot() {
  if (!config.token) {
    console.warn('[server] BOT_TOKEN is not set — running in API-only mode (bot disabled)');
    return;
  }
  try {
    const { bot } = createBot({});
    botInstance = bot;
    await bot.api.deleteWebhook({ drop_pending_updates: true });
    const me = await bot.api.getMe();
    // polling در پس‌زمینه (این پرامیس تا توقف ربات resolve نمی‌شود)
    bot.start({ allowed_updates: ['message', 'callback_query'] }).catch((e) => {
      console.error('[bot] polling stopped:', e.message);
      process.exit(1); // PM2 خودش ری‌استارت می‌کند
    });
    console.log(`[bot] @${me.username} started — admins: ${config.getAdminIds().join(', ') || '(none — first /start claims admin)'}`);
  } catch (e) {
    console.error('[bot] failed to start:', e.message);
    process.exit(1);
  }
}

startBot();

async function shutdown(signal) {
  console.log(`[server] ${signal} received — shutting down`);
  try { if (botInstance) await botInstance.stop(); } catch {}
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
