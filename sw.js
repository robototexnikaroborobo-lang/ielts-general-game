const CACHE = 'ielts-quest-v9';
const APP_SHELL = ['./', './index.html', './styles.css', './extra.css', './exam.css', './questions.js', './questions-time.js', './questions-extra.js', './app.js', './manifest.webmanifest'];
const SHELL_SUFFIXES = ['/index.html', '/styles.css', '/extra.css', '/exam.css', '/questions.js', '/questions-time.js', '/questions-extra.js', '/app.js', '/manifest.webmanifest'];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('ielts-quest-') && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  const url = new URL(request.url);
  const isShell = url.pathname.endsWith('/') || SHELL_SUFFIXES.some((suffix) => url.pathname.endsWith(suffix));
  if (isShell) {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) { const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(request, copy)); }
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(request, copy)); }
    return response;
  })));
});
