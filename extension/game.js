// game.js — 강아지 산책 화면(사이드패널 + 새 탭이 같은 파일 공유).
// 상태는 백그라운드(storage)가 가지고 있고 여기선 읽어서 그릴 뿐.
// 모든 행동(환전/구매/착용)은 백그라운드로 메시지 → 단일 작성자.

const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.floor(n).toLocaleString("en-US");

let SHOP = [];
let last = null; // 마지막 상태(상점 다시 그릴 때 owned/equipped 참조)
let dispSteps = 0; // 화면에 보이는 걸음(키마다 즉시 +1, storage 동기화 때 정정)
let walkPhase = 0;
let restTimer = null;

// 걷기 프레임(같은 캔버스 정렬): 모음→작게→중간→크게. SEQ로 핑퐁(다리 앞뒤 부드럽게).
const REST = "assets/dog-rest.webp";
const WALK = [
  "assets/dog-walk1.webp", // 0 중립(모음)
  "assets/dog-walk2.webp", // 1 작은 보폭
  "assets/dog-walk3.webp", // 2 중간 보폭
  "assets/dog-walk4.webp", // 3 큰 보폭
];
const SEQ = [0, 1, 2, 3, 2, 1]; // 핑퐁: 다리가 앞으로 갔다 돌아옴
[REST, ...WALK].forEach((src) => {
  const i = new Image();
  i.src = src; // 미리 로드(전환 깜빡임 방지)
});

// 꾸미기 앵커: 강아지 박스 기준 [좌%, 상%] (걷기/휴식 포즈별), 이모지 크기.
// (강아지는 오른쪽 보는 옆모습 — 머리/눈/목 위치를 그리드로 읽어 맞춤)
const ANCH = {
  glasses: { walk: [78, 23], rest: [85, 27], size: 22 }, // 선글라스=눈
  cap: { walk: [78, 6], rest: [85, 8], size: 24 }, // 모자=머리 위
  crown: { walk: [78, 1], rest: [85, 2], size: 24 }, // 왕관=머리 맨 위
  ribbon: { walk: [72, 5], rest: [80, 8], size: 20 }, // 리본=머리/귀 옆
  scarf: { walk: [65, 42], rest: [76, 46], size: 24 }, // 목도리=목
};

// 착용 꾸미기를 강아지 박스에 겹쳐 제 위치에 놓는다.
function layoutWorn() {
  const d = $("dog"),
    worn = $("worn");
  if (!d || !worn) return;
  if (d.offsetWidth) worn.style.width = d.offsetWidth + "px";
  if (d.offsetHeight) worn.style.height = d.offsetHeight + "px";
  const pose = d.classList.contains("walking") ? "walk" : "rest";
  [...worn.children].forEach((sp) => {
    const a = ANCH[sp.dataset.id];
    if (!a) return;
    sp.style.left = a[pose][0] + "%";
    sp.style.top = a[pose][1] + "%";
    sp.style.fontSize = (a.size || 20) + "px";
  });
}

function buildWorn(s) {
  const worn = $("worn");
  if (!worn) return;
  worn.innerHTML = "";
  (s.equipped || []).forEach((id) => {
    const it = SHOP.find((i) => i.id === id);
    if (!it || !ANCH[id]) return;
    const sp = document.createElement("span");
    sp.dataset.id = id;
    sp.textContent = it.emoji;
    worn.appendChild(sp);
  });
  layoutWorn();
}

// 키 한 번 = 다음 프레임. 입력 멈추면 잠시 후 엎드려 쉼.
function stepLeg() {
  const d = $("dog");
  if (!d) return;
  d.classList.remove("breath");
  d.classList.add("walking");
  walkPhase = (walkPhase + 1) % SEQ.length;
  d.src = WALK[SEQ[walkPhase]];
  layoutWorn(); // 걷기 포즈 앵커로
  clearTimeout(restTimer);
  restTimer = setTimeout(() => {
    d.classList.remove("walking");
    d.classList.add("breath");
    d.src = REST;
    layoutWorn(); // 휴식 포즈 앵커로
  }, 600);
}

// 백그라운드에 행동 메시지 → 갱신된 상태로 다시 그림
function send(msg) {
  try {
    chrome.runtime.sendMessage(msg, (s) => {
      if (chrome.runtime.lastError) return;
      render(s);
    });
  } catch (_) {}
}

function render(s) {
  if (!s) return;
  last = s;
  dispSteps = s.steps; // 권위값으로 정정(키마다 올린 낙관값을 동기화)
  $("steps").textContent = fmt(s.steps);
  $("coins").textContent = fmt(s.coins);
  $("taps").textContent = fmt(s.taps);
  $("exchange").disabled = !(s.steps > 0);

  buildWorn(s); // 착용 꾸미기를 강아지 제 위치에

  renderShop(s);
}

function renderShop(s) {
  if (!SHOP.length) return;
  const owned = s.owned || [];
  const equipped = s.equipped || [];
  $("items").innerHTML = "";
  for (const it of SHOP) {
    const have = owned.includes(it.id);
    const on = equipped.includes(it.id);
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML =
      `<span class="ico">${it.emoji}</span>` +
      `<span class="nm">${it.name}</span>` +
      (have
        ? `<button class="act ${on ? "eq" : ""}" data-equip="${it.id}">${on ? "착용 중" : "착용"}</button>`
        : `<span class="pr">🦴 ${it.price}</span>` +
          `<button class="act" data-buy="${it.id}" ${s.coins >= it.price ? "" : "disabled"}>구매</button>`);
    $("items").appendChild(row);
  }
}

// 상점 버튼(구매/착용) — 위임
$("items").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.buy) send({ type: "buy", id: b.dataset.buy });
  else if (b.dataset.equip) send({ type: "equip", id: b.dataset.equip });
});

$("exchange").addEventListener("click", () => send({ type: "exchange" }));

// storage가 바뀌면(=어느 탭에서든 타이핑) 즉시 다시 그림 = 실시간 공유.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.g) render(changes.g.newValue);
  if (area === "local" && changes.surface) paintSurface(changes.surface.newValue);
});

// content.js가 키마다 보내는 신호 → 다리 한 번 + 걸음 즉시 +1 (1:1).
// (저장은 백그라운드가 ~1초에 한 번 묶어서 함 → render가 권위값으로 정정)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "key") {
    stepLeg();
    dispSteps += (last && last.stepPerKey) || 1;
    $("steps").textContent = fmt(dispSteps);
  }
});

// ── 표시 위치 토글 (사이드패널 ↔ 새 탭) ──────────────────────────
function paintSurface(surface) {
  const tab = surface === "newtab";
  $("sfTab").classList.toggle("on", tab);
  $("sfSide").classList.toggle("on", !tab);
}
$("sfSide").addEventListener("click", () => chrome.storage.local.set({ surface: "sidepanel" }));
$("sfTab").addEventListener("click", () => chrome.storage.local.set({ surface: "newtab" }));
chrome.storage.local.get("surface", ({ surface }) => paintSurface(surface || "newtab"));

// ── 강아지가 걷는 곳: 페이지에 풀어놓기(pet on) ↔ 사이드패널만(pet off, 기본 on) ──
function paintPet(on) {
  $("petOn").classList.toggle("on", on);
  $("petOff").classList.toggle("on", !on);
  $("bgPick").style.display = on ? "none" : "block"; // 사이드패널 전용일 때만 배경 선택
}
$("petOn").addEventListener("click", () => chrome.storage.local.set({ pet: true }));
$("petOff").addEventListener("click", () => chrome.storage.local.set({ pet: false }));
chrome.storage.local.get("pet", ({ pet }) => paintPet(pet !== false));

// ── 사이드패널 무대 배경 (꽃밭/도로/엑셀/크롬 — 업무위장) ──
const BG = ["flower", "road", "excel", "chrome"];
const BODY_TINT = { excel: "#ffffff", chrome: "#f1f3f4" };
function applyBg(name) {
  if (!BG.includes(name)) name = "flower";
  const st = document.querySelector(".stage");
  if (st) {
    BG.forEach((b) => st.classList.remove("bg-" + b));
    st.classList.add("bg-" + name);
  }
  document.body.style.background = BODY_TINT[name] || ""; // 위장 테마는 패널 전체도 톤 맞춤
  [...$("bgSeg").children].forEach((b) =>
    b.classList.toggle("on", b.dataset.bg === name)
  );
}
$("bgSeg").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (b && b.dataset.bg) chrome.storage.local.set({ bg: b.dataset.bg });
});
chrome.storage.local.get("bg", ({ bg }) => applyBg(bg || "flower"));

chrome.storage.onChanged.addListener((c, area) => {
  if (area !== "local") return;
  if (c.pet) paintPet(c.pet.newValue !== false);
  if (c.bg) applyBg(c.bg.newValue);
});

// 강아지 종횡비 변화(걷기↔휴식)·창 크기 변화 시 꾸미기 재배치
$("dog")?.addEventListener("load", layoutWorn);
window.addEventListener("resize", layoutWorn);

// 시작: 상점 목록 먼저 받고(응답은 SHOP 배열) → 현재 상태 로드
chrome.runtime.sendMessage({ type: "shop" }, (shop) => {
  if (chrome.runtime.lastError) return;
  if (Array.isArray(shop)) SHOP = shop;
  send({ type: "get" });
});
