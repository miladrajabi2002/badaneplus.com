#!/bin/bash
# BadanePlus deployment script — run ON THE SERVER at /var/www/badaneplus.com
set -e
ROOT="/var/www/badaneplus.com"

echo "=== [1/6] Python environment ==="
if [ ! -d "$ROOT/bot/venv" ]; then
    python3 -m venv "$ROOT/bot/venv"
fi
"$ROOT/bot/venv/bin/pip" install -q --upgrade pip
"$ROOT/bot/venv/bin/pip" install -q -r "$ROOT/bot/requirements.txt"
echo "  venv ready"

echo "=== [2/6] Permissions ==="
chmod 600 "$ROOT/bot/config.json" 2>/dev/null || true

echo "=== [3/6] Build site ==="
"$ROOT/bot/venv/bin/python" "$ROOT/src/build.py" | tail -2

echo "=== [4/6] Nginx ==="
cp "$ROOT/deploy/badaneplus.com.conf" /etc/nginx/sites-available/badaneplus.com
if [ ! -L /etc/nginx/sites-enabled/badaneplus.com ]; then
    ln -s /etc/nginx/sites-available/badaneplus.com /etc/nginx/sites-enabled/badaneplus.com
fi
nginx -t && echo "  nginx config OK"

echo "=== [5/6] Systemd service ==="
cp "$ROOT/deploy/badaneplus-bot.service" /etc/systemd/system/badaneplus-bot.service
systemctl daemon-reload
if [ -f "$ROOT/bot/config.json" ] && grep -q '"token": "[^"]' "$ROOT/bot/config.json"; then
    systemctl enable --now badaneplus-bot
    echo "  bot service started"
else
    echo "  ⚠️ bot token not set yet — run: cd $ROOT/bot && venv/bin/python setup.py"
fi

echo "=== [6/6] Done ==="
echo "Site root: $ROOT/site"
echo "Next: obtain SSL with certbot --nginx -d badaneplus.com"
