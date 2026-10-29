// 오프라인에서도 앱이 열리도록 파일을 저장해 두는 서비스 워커.
// 인터넷이 되면 항상 최신 파일을 먼저 받고, 안 되면 저장해 둔 파일을 쓴다.
const CACHE = 'geonsu-v4';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      // 열려 있는 화면에 저장할 파일 목록을 다시 보내 달라고 한다
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((list) => list.forEach((c) => c.postMessage('need-precache'))),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com');
  if (!sameOrigin && !isFont) return;

  // 페이지와 앱 설정 파일은 항상 서버에 새 버전이 있는지 확인한다
  const fresh = req.mode === 'navigate' || url.pathname.endsWith('.webmanifest');
  event.respondWith(
    fetch(fresh ? new Request(req, { cache: 'no-cache' }) : req)
      .then((res) => {
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./') : undefined)),
      ),
  );
});

// 앱이 처음 열렸을 때 쓴 파일 목록을 받아 미리 저장한다 (다음부터 인터넷 없이도 열리게)
self.addEventListener('message', (event) => {
  const urls = event.data && event.data.precache;
  if (!Array.isArray(urls)) return;
  event.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(urls.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {}))),
    ),
  );
});
