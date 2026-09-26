/* BadanePlus service worker — آفلاین + کش استاتیک (نسخه ۴ — تم روشن) */
const CACHE = 'badaneplus-v4';
const PRECACHE = [
  '/assets/img/logo.svg',
  '/assets/fonts/Vazirmatn-Regular.woff2',
  '/assets/fonts/Vazirmatn-Bold.woff2',
  '/assets/fonts/Estedad-FD-Black.woff2',
  '/manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname === '/t') return; // بیکون بازدید — هرگز کش نشود

  // استاتیک Next و assetها: کش اول (تغییرناپذیر)
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }))
    );
    return;
  }

  // صفحات و تصاویر: شبکه اول، در آفلاین از کش
  e.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || caches.match('/')))
  );
});
