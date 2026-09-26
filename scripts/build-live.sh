#!/usr/bin/env bash
# بازسازی سایت استاتیک Next.js و همگام‌سازی با پوشه live (بدون قطعی سرویس)
# nginx از live/ سرو می‌کند؛ out/ فقط خروجی بیلد است
set -euo pipefail
cd "$(dirname "$0")/.."

echo "[build] next build ..."
rm -rf out
export NODE_ENV=production
npx next build

echo "[build] sync out/ -> live/ ..."
mkdir -p live
rsync -a --delete out/ live/

PAGES=$(find live -name "*.html" | wc -l)
echo "[build] done — ${PAGES} HTML pages in live/"
