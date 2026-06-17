/* AI인간 PWA 서비스워커 — 오프라인 플레이 + 최신 유지 */
const CACHE = "aingan-v1";
const CORE = [
  "./", "./index.html", "./manifest.json",
  "./vendor/supabase.js",
  "./icon-192.png", "./icon-512.png", "./icon.svg"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;                 // 세이브/로그인 등 POST는 건드리지 않음
  const url = new URL(req.url);
  if (url.hostname.includes("supabase")) return;     // Supabase API/Auth는 항상 네트워크

  // 문서(내비게이션)는 네트워크 우선 → 항상 최신 index, 오프라인이면 캐시 폴백
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put("./index.html", copy));
        return res;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // 그 외(스크립트·폰트·아이콘)는 캐시 우선 + 런타임 캐시
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok && (url.origin === location.origin || url.hostname.includes("fonts."))) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
