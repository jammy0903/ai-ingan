/* AI인간 PWA 서비스워커 — 오프라인 플레이 + 최신 유지 */
// ⚠️ 버전 = 앱 버전(semver). data.js·balance.js·index.html 등 '캐시 자산'을 고치면 반드시 올려라(1.0.6→1.0.7…).
// SW가 스크립트를 '캐시 우선'으로 서빙하므로, 안 올리면 고쳐도 옛 캐시가 나간다(stale). plan.md ④
// 🔢 버전 올릴 때 3곳 동기화: 이 CACHE · manifest.json "version" · index.html #appVer 표시.
const CACHE = "aingan-1.0.38";
const CORE = [
  "./", "./index.html", "./styles.css", "./manifest.json",
  "./data.js", "./balance.js",            // 전역 데이터·밸런스(인라인보다 먼저 로드) — 오프라인 프리캐시
  // 🆕 구조 분리(2026-06-22): 인라인 JS를 전역 스크립트 여러 개로 추출(로드 순서 = 원본 순서).
  "./engine.js", "./view.js", "./save-auth.js", "./onboarding.js", "./main.js",
  "./vendor/supabase.js",
  "./icon-192.png", "./icon-512.png", "./icon.svg",
  // 감정27 일러스트(누끼 webp) — 오프라인 프리캐시
  "./art/emo/adore.webp","./art/emo/beauty.webp","./art/emo/admire.webp","./art/emo/attract.webp",
  "./art/emo/joy.webp","./art/emo/amuse.webp","./art/emo/excite.webp","./art/emo/flutter.webp",
  "./art/emo/curious.webp","./art/emo/awe.webp","./art/emo/relief.webp","./art/emo/crave.webp",
  "./art/emo/triumph.webp","./art/emo/fear.webp","./art/emo/anxiety.webp","./art/emo/awkward.webp",
  "./art/emo/disgust.webp","./art/emo/horror.webp","./art/emo/confuse.webp","./art/emo/bored.webp",
  "./art/emo/sorrow.webp","./art/emo/empathy.webp","./art/emo/longing.webp","./art/emo/compassion.webp",
  "./art/emo/calm.webp","./art/emo/satisfy.webp","./art/emo/trance.webp"
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

  // ⚠️ 핵심 코드(index.html + data.js + balance.js)는 '함께' 네트워크 우선 → 항상 일관된 최신, 오프라인이면 캐시 폴백.
  // (옛 버그: index는 network-first인데 data/balance는 cache-first라 배포마다 버전 엇갈림 → 새 index가 옛 balance의 없는 심볼 참조 → reachCost ReferenceError로 지도 크래시. 함께 network-first로 일관화해 차단.)
  const isCode = req.mode === "navigate" ||
                 (url.origin === location.origin && /\/(index\.html|styles\.css|data\.js|balance\.js|engine\.js|view\.js|save-auth\.js|onboarding\.js|main\.js)$/.test(url.pathname));
  if (isCode) {
    const key = req.mode === "navigate" ? "./index.html" : req;
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(key, copy));
        return res;
      }).catch(() => caches.match(key))
    );
    return;
  }

  // 그 외(폰트·아이콘·vendor)는 캐시 우선 + 런타임 캐시
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
