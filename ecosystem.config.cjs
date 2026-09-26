// PM2 — مدیریت پروسه سرور بدنه پلاس (API آمار + ربات تلگرام)
module.exports = {
  apps: [
    {
      name: 'badaneplus',
      cwd: __dirname,
      script: 'server/index.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '400M',
      env: { NODE_ENV: 'production' },
    },
  ],
};
