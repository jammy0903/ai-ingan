// background.js — 진실의 원천(single source of truth).
// 게임(v2): 강아지 산책. 키 한 글자=한 걸음 → 🦴환전 → 강아지(품종) 수집.
// ⚠️ idle 없음 — 키 칠 때만 걷는다. 저장=local(즉시)+sync(계정연동, 15초 throttle), taps로 병합.
// 모든 쓰기(걷기/환전/구매/선택)는 여기로 모은다 = 단일 작성자.

const KEY = "g";

// 강아지 상점(권위 = 여기). game.js는 "shop" 메시지로 받는다.
const DOGS = [
  { id: "cheese", name: "치즈 시바", nameEn: "Cheese Shiba", price: 0 },
  { id: "cream", name: "크림 시바", nameEn: "Cream Shiba", price: 300 },
  { id: "sesame", name: "참깨 시바", nameEn: "Sesame Shiba", price: 700 },
  { id: "corgi", name: "웰시코기", nameEn: "Welsh Corgi", price: 1500 },
  { id: "chihuahua", name: "치와와", nameEn: "Chihuahua", price: 2500 },
  { id: "poodle", name: "토이푸들", nameEn: "Toy Poodle", price: 4000 },
  { id: "bulldog", name: "프렌치불독", nameEn: "French Bulldog", price: 6000 },
  { id: "border", name: "보더콜리", nameEn: "Border Collie", price: 9000 },
  { id: "chow", name: "차우차우", nameEn: "Chow Chow", price: 13000 },
  { id: "ig", name: "이탈리안 그레이하운드", nameEn: "Italian Greyhound", price: 18000 },
  { id: "golden", name: "골든리트리버", nameEn: "Golden Retriever", price: 25000 },
];
const DOGIDS = DOGS.map((d) => d.id);
const priceOf = (id) => (DOGS.find((d) => d.id === id) || {}).price;

function fresh() {
  return {
    steps: 0, // 현재 걸음(환전 잔액)
    taps: 0, // 평생 친 키(단조 증가=병합 기준)
    coins: 0, // 🦴 돈
    stepPerKey: 1, // 키당 걸음
    owned: ["cheese"], // 가진 강아지
    selDog: "cheese", // 선택한 강아지
  };
}

async function load() {
  const o = await chrome.storage.local.get(KEY);
  const s = Object.assign(fresh(), o[KEY] || {});
  // 꾸미기→강아지 마이그레이션: owned를 강아지 id만 남기고 보정
  s.owned = Array.isArray(s.owned) ? s.owned.filter((x) => DOGIDS.includes(x)) : [];
  if (!s.owned.includes("cheese")) s.owned.unshift("cheese");
  if (!DOGIDS.includes(s.selDog)) s.selDog = "cheese";
  delete s.equipped; // 옛 꾸미기 필드 제거
  return s;
}

async function save(s) {
  await chrome.storage.local.set({ [KEY]: s });
  queueSync(s);
}

let syncTimer = null;
function queueSync(s) {
  if (syncTimer) return;
  syncTimer = setTimeout(async () => {
    syncTimer = null;
    try {
      await chrome.storage.sync.set({ [KEY]: s });
    } catch (_) {}
  }, 15000);
}

let reconciled = false;
async function reconcile() {
  reconciled = true;
  try {
    const [l, sy] = await Promise.all([
      chrome.storage.local.get(KEY),
      chrome.storage.sync.get(KEY),
    ]);
    const local = l[KEY],
      remote = sy[KEY];
    const lt = (local && local.taps) || 0,
      rt = (remote && remote.taps) || 0;
    if (remote && rt > lt) await chrome.storage.local.set({ [KEY]: remote });
    else if (local && lt > rt) await chrome.storage.sync.set({ [KEY]: local }).catch(() => {});
  } catch (_) {}
}

// per-key 걸음: 모았다가 throttle(800ms) 저장
let pending = 0;
let flushTimer = null;

// 모든 상태 변이를 한 줄로 직렬화 = buy/exchange 이중지불·flush 경합 차단.
// load→검사→save 사이에 다른 변이가 끼어들지 못하게 단일 프라미스 체인으로 순서화한다.
let opChain = Promise.resolve();
function enqueue(fn) {
  const run = opChain.then(fn, fn); // 앞 작업이 끝난 뒤에만 실행(성공/실패 무관)
  opChain = run.catch(() => {});    // 한 작업이 실패해도 체인은 이어감
  return run;
}
// 모아둔 걸음(pending)을 상태에 반영. 변경되면 true.
function applyPending(s) {
  if (pending <= 0) return false;
  const n = pending;
  pending = 0;
  s.steps += n * s.stepPerKey;
  s.taps += n;
  return true;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const t = msg && msg.type;

  if (t === "vid") {
    // 자식 프레임의 영상 재생 보고 → 같은 탭의 TOP 프레임(frameId 0)에만 중계.
    // 웹페이지는 chrome.runtime을 못 써서 이 채널 자체가 위·변조 불가.
    const tabId = _sender.tab && _sender.tab.id;
    if (tabId != null) {
      chrome.tabs.sendMessage(
        tabId,
        { type: "vidFrame", frameId: _sender.frameId, playing: !!msg.playing },
        { frameId: 0 },
        () => void chrome.runtime.lastError // 수신자(TOP content script) 없을 때 에러 무시
      );
    }
    return;
  }
  if (t === "key" || t === "taps") {
    pending += t === "taps" ? Math.max(0, msg.n | 0) : 1;
    if (!flushTimer) {
      flushTimer = setTimeout(() => {
        flushTimer = null;
        enqueue(async () => {
          if (!reconciled) await reconcile();
          const s = await load();
          if (applyPending(s)) await save(s);
        });
      }, 800);
    }
    return;
  }
  if (t === "shop") {
    sendResponse(DOGS);
    return;
  }

  enqueue(async () => {
    if (!reconciled) await reconcile();
    const s = await load();
    let dirty = applyPending(s); // 모인 걸음 먼저 반영

    switch (t) {
      case "exchange": {
        if (s.steps > 0) {
          s.coins += Math.floor(s.steps);
          s.steps = 0;
          dirty = true;
        }
        break;
      }
      case "buy": {
        // 강아지 구매 → 자동 선택
        const p = priceOf(msg.id);
        if (p != null && !s.owned.includes(msg.id) && s.coins >= p) {
          s.coins -= p;
          s.owned.push(msg.id);
          s.selDog = msg.id;
          dirty = true;
        }
        break;
      }
      case "select": {
        // 가진 강아지로 교체
        if (s.owned.includes(msg.id)) {
          s.selDog = msg.id;
          dirty = true;
        }
        break;
      }
    }

    if (dirty) await save(s);
    sendResponse(s);
  });
  return true;
});

chrome.runtime.onInstalled.addListener(async () => {
  const o = await chrome.storage.local.get([KEY]);
  if (!o[KEY]) await chrome.storage.local.set({ [KEY]: fresh() });
  await reconcile();
});
chrome.runtime.onStartup?.addListener(reconcile);

// 아이콘 클릭은 이제 팝업(popup.html)을 연다(강아지 ON/OFF + 게임 열기).
// 게임 사이드패널은 팝업의 '게임 열기' 버튼에서 sidePanel.open()으로 연다 → 자동열기 끔.
chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});

// 강아지 OFF면 아이콘에 'OFF' 뱃지 — 한눈에 상태 보이게.
function updateBadge(on) {
  chrome.action.setBadgeText({ text: on ? "" : "OFF" });
  chrome.action.setBadgeBackgroundColor({ color: "#9aa0a6" });
}
chrome.storage.local.get("petOn").then((o) => updateBadge(o.petOn !== false)).catch(() => {});
chrome.storage.onChanged.addListener((c, area) => {
  if (area === "local" && c.petOn) updateBadge(c.petOn.newValue !== false);
});
