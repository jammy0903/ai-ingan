// background.js — 진실의 원천(single source of truth).
// 모든 탭/패널이 여기 저장된 상태 하나를 공유한다.
//
// 게임(v2): 강아지가 주인공. 키보드 한 글자 = 한 걸음. 걸음을 돈으로 환전 → 꾸미기.
// ⚠️ idle(자동 걷기) 없음 — **키보드 칠 때만** 걷는다.
//
// 저장: local(빠름·이 기기 권위) + sync(구글 계정에 묶여 기기끼리 동기화·15초 throttle).
//   시작 시 reconcile(): taps(항상 증가)가 더 큰 쪽을 채택해 병합.
//
// 모든 쓰기(걷기/환전/구매/착용)는 여기로 모은다 = 단일 작성자(레이스 방지).

const KEY = "g";

// 꾸미기 상점 (권위 = 여기). game.js는 "shop" 메시지로 받아 그린다.
const SHOP = [
  { id: "ribbon", name: "리본", emoji: "🎀", price: 50 },
  { id: "cap", name: "모자", emoji: "🧢", price: 120 },
  { id: "glasses", name: "선글라스", emoji: "🕶️", price: 200 },
  { id: "scarf", name: "목도리", emoji: "🧣", price: 350 },
  { id: "crown", name: "왕관", emoji: "👑", price: 1000 },
];
const priceOf = (id) => (SHOP.find((i) => i.id === id) || {}).price;

function fresh() {
  return {
    steps: 0, // 현재 걸음 (환전 가능 잔액)
    taps: 0, // 평생 친 키 수 (단조 증가 → 병합 기준)
    coins: 0, // 환전한 돈 (꾸미기 구매에 씀)
    stepPerKey: 1, // 키 1번당 걸음 (추후 '신발' 업글로 ↑)
    owned: [], // 산 꾸미기 id
    equipped: [], // 착용 중인 꾸미기 id
  };
}

async function load() {
  const o = await chrome.storage.local.get(KEY);
  return Object.assign(fresh(), o[KEY] || {}); // 옛 세이브에 새 필드 보강
}

async function save(s) {
  await chrome.storage.local.set({ [KEY]: s });
  queueSync(s);
}

// ── sync 저장 throttle (쓰기 쿼터 보호: 15초 1회) ─────────────────
let syncTimer = null;
function queueSync(s) {
  if (syncTimer) return;
  syncTimer = setTimeout(async () => {
    syncTimer = null;
    try {
      await chrome.storage.sync.set({ [KEY]: s });
    } catch (_) {} // 쿼터/오프라인이면 조용히 패스 (reconcile이 메움)
  }, 15000);
}

// ── 계정 병합: local vs sync 중 taps 큰 쪽으로 맞춘다 ─────────────
let reconciled = false;
async function reconcile() {
  reconciled = true;
  try {
    const [l, sy] = await Promise.all([
      chrome.storage.local.get(KEY),
      chrome.storage.sync.get(KEY),
    ]);
    const local = l[KEY];
    const remote = sy[KEY];
    const lt = (local && local.taps) || 0;
    const rt = (remote && remote.taps) || 0;
    if (remote && rt > lt) {
      await chrome.storage.local.set({ [KEY]: remote });
    } else if (local && lt > rt) {
      await chrome.storage.sync.set({ [KEY]: local }).catch(() => {});
    }
  } catch (_) {}
}

// ── per-key 걸음: 신호를 모았다가 throttle(800ms) 로 한 번에 저장 ──
// (키마다 storage 쓰면 너무 잦음. 메시지는 키마다 와도 저장은 ~1.25회/초.)
let pending = 0;
let flushTimer = null;
async function flush() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (pending <= 0) return;
  if (!reconciled) await reconcile();
  const s = await load();
  const n = pending;
  pending = 0;
  s.steps += n * s.stepPerKey; // 키 N번 = 걸음 += N × stepPerKey
  s.taps += n;
  await save(s);
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const t = msg && msg.type;

  // 애니메이션용 per-key 신호: 누적만 하고 응답 안 함(게임 화면이 직접 받아 다리 움직임).
  if (t === "key" || t === "taps") {
    pending += t === "taps" ? Math.max(0, msg.n | 0) : 1; // taps는 구버전 호환
    if (!flushTimer) flushTimer = setTimeout(flush, 800);
    return; // 비동기 응답 없음
  }

  if (t === "shop") {
    sendResponse(SHOP); // 상점 목록은 정적
    return;
  }

  (async () => {
    if (!reconciled) await reconcile(); // 워커가 깬 직후 1회 계정 병합
    if (pending > 0) await flush(); // 행동(환전/구매) 전에 밀린 걸음 먼저 반영
    const s = await load();
    let dirty = false;

    switch (t) {
      case "exchange": {
        // 현재 걸음 전부 → 코인 (1:1)
        if (s.steps > 0) {
          s.coins += Math.floor(s.steps);
          s.steps = 0;
          dirty = true;
        }
        break;
      }
      case "buy": {
        const p = priceOf(msg.id);
        if (p != null && !s.owned.includes(msg.id) && s.coins >= p) {
          s.coins -= p;
          s.owned.push(msg.id);
          if (!s.equipped.includes(msg.id)) s.equipped.push(msg.id); // 사면 바로 착용
          dirty = true;
        }
        break;
      }
      case "equip": {
        // 착용 ↔ 해제 토글 (소유한 것만)
        if (s.owned.includes(msg.id)) {
          const i = s.equipped.indexOf(msg.id);
          if (i >= 0) s.equipped.splice(i, 1);
          else s.equipped.push(msg.id);
          dirty = true;
        }
        break;
      }
      // "get" 은 현재 상태만 돌려준다.
    }

    if (dirty) await save(s);
    sendResponse(s);
  })();
  return true; // 비동기 응답
});

// 설치/시작 시 초기화 + 계정 병합.
chrome.runtime.onInstalled.addListener(async () => {
  const o = await chrome.storage.local.get([KEY, "surface"]);
  if (!o[KEY]) await chrome.storage.local.set({ [KEY]: fresh() });
  if (!o.surface) await chrome.storage.local.set({ surface: "newtab" }); // 기본=새 탭
  await reconcile();
});
chrome.runtime.onStartup?.addListener(reconcile);

chrome.sidePanel
  ?.setPanelBehavior({ openPanelOnActionClick: true })
  .catch(() => {});
