/* AI인간 PWA 서비스워커 — 오프라인 플레이 + 최신 유지 */
// ⚠️ data.js·balance.js·index.html 등 '캐시 자산'을 고치면 이 번호를 반드시 올려라(v2→v3…).
// SW가 스크립트를 '캐시 우선'으로 서빙하므로, 안 올리면 고쳐도 옛 캐시가 나간다(stale). plan.md ④
const CACHE = "aingan-v6";
const CORE = [
  "./", "./index.html", "./manifest.json",
  "./data.js", "./balance.js",            // 전역 데이터·밸런스(인라인보다 먼저 로드) — 오프라인 프리캐시
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
