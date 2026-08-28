/* 李小欣工作台 - 轻量 Service Worker
 * 目的：让「添加到程序坞」的 Web App 能自动更新，不用每次手动重加。
 * 策略：HTML/导航请求走 network-first（永远先拉最新版，成功即返回并更新缓存，
 *       离线才回退缓存）；其他静态资源走 cache-first。
 */
const CACHE = 'lxk-workbench-v2';
const APP_SHELL = ['./', './index.html'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL).catch(() => {})).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isNav = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/';
  if (isNav) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((r) => r || fetch(req))
  );
});
