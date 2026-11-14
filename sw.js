/* Офлайн и установка как приложение. Страница — сначала из сети (чтобы обновления приходили сразу),
   без сети или при медленной сети — из кэша. Иконки и шрифты — из кэша, обновляются в фоне. */
const P = 'mizan-', V = P + 'f27d3385b';
const CORE = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'fonts/jost-cyrillic-880f7b.woff2', 'fonts/jost-latin-b58a58.woff2', 'fonts/noto-naskh-arabic-arabic-6db390.woff2', 'fonts/noto-naskh-arabic-latin-cbf017.woff2', 'fonts/reem-kufi-arabic-e75323.woff2', 'fonts/reem-kufi-latin-0f10f2.woff2'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  /* на одном github.io живут оба курса: удаляем только свои старые кэши */
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith(P) && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const isPage = u => u.origin === location.origin && (u.pathname.endsWith('/') || u.pathname.endsWith('/index.html'));
async function page(req) {
  const c = await caches.open(V);
  const net = fetch(req).then(res => { if (res.ok) c.put('./', res.clone()); return res; });
  const cached = await c.match('./');
  if (!cached) return net;
  /* сеть успела за 3 секунды — свежая версия, нет — сохранённая; свежая всё равно ляжет в кэш */
  return Promise.race([net.catch(() => cached), new Promise(r => setTimeout(() => r(cached), 3000))]);
}
async function asset(req) {
  const c = await caches.open(V), hit = await c.match(req);
  const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit || Response.error());
  return hit || net;
}
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (req.mode === 'navigate' && isPage(u)) return e.respondWith(page(req));
  if (u.origin === location.origin || u.host === 'fonts.googleapis.com' || u.host === 'fonts.gstatic.com') e.respondWith(asset(req));
});
