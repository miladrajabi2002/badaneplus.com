#!/usr/bin/env bash
# راه‌اندازی کامل سرور بدنه پلاس (نسخه ۳ — جاوااسکریپت) روی سرور
# اجرا: bash deploy/setup-server.sh
set -euo pipefail
ROOT="/var/www/badaneplus.com"
cd "$ROOT"

echo "=== [1/7] بررسی Node.js ==="
if ! command -v node > /dev/null; then
    echo "❌ Node نصب نیست. نصب Node 22 LTS:"
    echo "   curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs"
    exit 1
fi
echo "Node: $(node -v) | npm: $(npm -v)"

echo "=== [2/7] نصب وابستگی‌ها ==="
npm install --no-audit --no-fund

echo "=== [3/7] بررسی .env ==="
if [ ! -f .env ]; then
    echo "❌ فایل .env وجود ندارد!"
    echo "   cp .env.example .env"
    echo "   سپس BOT_TOKEN را از @BotFather در آن قرار دهید."
    exit 1
fi
grep -q '^BOT_TOKEN=..' .env || { echo "❌ BOT_TOKEN در .env خالی است!"; exit 1; }

echo "=== [4/7] بیلد سایت استاتیک ==="
bash scripts/build-live.sh
node scripts/verify-build.js

echo "=== [5/7] PM2 ==="
if ! command -v pm2 > /dev/null; then
    npm install -g pm2
fi
pm2 delete badaneplus 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
echo "(اگر اولین بار است: دستور 'pm2 startup' را اجرا و خروجی آن را دنبال کنید تا بعد از ریبوت هم فعال بماند)"

echo "=== [6/7] Nginx ==="
cp deploy/badaneplus.com.conf /etc/nginx/sites-available/badaneplus.com
ln -sf /etc/nginx/sites-available/badaneplus.com /etc/nginx/sites-enabled/badaneplus.com
nginx -t
systemctl reload nginx

echo "=== [7/7] بررسی نهایی ==="
sleep 2
curl -s -o /dev/null -w "سایت (local): HTTP %{http_code}\n" -H "Host: badaneplus.com" http://127.0.0.1/ || true
curl -s http://127.0.0.1:8083/api/health && echo
pm2 status badaneplus
echo
echo "✅ راه‌اندازی کامل شد: https://badaneplus.com"
