// game.js — 강아지 산책 화면(사이드패널 + 새 탭 공유).
// 상태는 백그라운드(storage)가 가짐. 행동(환전/구매/선택)은 백그라운드로 메시지 = 단일 작성자.

const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.floor(n).toLocaleString("en-US");

let DOGS = []; // 강아지 상점 목록(백그라운드에서 받음)
let last = null;
let dispSteps = 0; // 화면 걸음(키마다 즉시 +, storage 동기화 때 정정)
let walkPhase = 0;
let restTimer = null;
let curDog = null; // 현재 표시 중인 강아지

// 선택한 강아지의 스프라이트 경로
const dogPrefix = (id) => (id === "cheese" ? "dog" : "dog-" + id);
let REST = "assets/dog-rest.webp";
let WALK = [1, 2, 3, 4].map((n) => `assets/dog-walk${n}.webp`);
const SEQ = [0, 1, 2, 3, 2, 1]; // 핑퐁

function setDog(id) {
  const p = dogPrefix(id);
  REST = `assets/${p}-rest.webp`;
  WALK = [1, 2, 3, 4].map((n) => `assets/${p}-walk${n}.webp`);
  [REST, ...WALK].forEach((src) => {
    const i = new Image();
    i.src = src; // 미리 로드
  });
  const d = $("dog");
  if (d && !d.classList.contains("walking")) d.src = REST; // 쉴 때면 즉시 교체
}

// 키 한 번 = 다음 프레임. 멈추면 잠시 후 쉼.
function stepLeg() {
  const d = $("dog");
  if (!d) return;
  d.classList.remove("breath");
  d.classList.add("walking");
  walkPhase = (walkPhase + 1) % SEQ.length;
  d.src = WALK[SEQ[walkPhase]];
  clearTimeout(restTimer);
  restTimer = setTimeout(() => {
    d.classList.remove("walking");
    d.classList.add("breath");
    d.src = REST;
  }, 600);
}

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
  dispSteps = s.steps;
  $("steps").textContent = fmt(s.steps);
  $("coins").textContent = fmt(s.coins);
  $("taps").textContent = fmt(s.taps);
  $("exchange").disabled = !(s.steps > 0);
  if (s.selDog !== curDog) {
    curDog = s.selDog;
    setDog(curDog);
  }
  renderShop(s);
}

function renderShop(s) {
  if (!DOGS.length) return;
  const items = $("items");
  items.innerHTML = "";
  for (const d of DOGS) {
    const owned = (s.owned || []).includes(d.id);
    const sel = s.selDog === d.id;
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML =
      `<img class="ico" src="assets/${dogPrefix(d.id)}-rest.webp" alt="" style="height:28px;width:auto;vertical-align:middle" />` +
      `<span class="nm">${d.name}</span>` +
      (owned
        ? `<button class="act ${sel ? "eq" : ""}" data-sel="${d.id}" ${sel ? "disabled" : ""}>${sel ? "산책 중" : "선택"}</button>`
        : `<span class="pr">🦴 ${d.price}</span>` +
          `<button class="act" data-buy="${d.id}" ${s.coins >= d.price ? "" : "disabled"}>입양</button>`);
    items.appendChild(row);
  }
}

// 상점 버튼(입양/선택)
$("items").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.buy) send({ type: "buy", id: b.dataset.buy });
  else if (b.dataset.sel) send({ type: "select", id: b.dataset.sel });
});

$("exchange").addEventListener("click", () => send({ type: "exchange" }));

// storage 변화 → 갱신 (어느 탭에서 타이핑해도 공유)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.g) render(changes.g.newValue);
  if (area === "local" && changes.surface) paintSurface(changes.surface.newValue);
});

// content.js가 키마다 보내는 신호 → 다리 한 번 + 걸음 즉시 +1 (1:1)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "key") {
    stepLeg();
    dispSteps += (last && last.stepPerKey) || 1;
    $("steps").textContent = fmt(dispSteps);
  }
});

// ── 표시 위치 토글 (사이드패널 ↔ 새 탭) ──
function paintSurface(surface) {
  const tab = surface === "newtab";
  $("sfTab").classList.toggle("on", tab);
  $("sfSide").classList.toggle("on", !tab);
}
$("sfSide").addEventListener("click", () => chrome.storage.local.set({ surface: "sidepanel" }));
$("sfTab").addEventListener("click", () => chrome.storage.local.set({ surface: "newtab" }));
chrome.storage.local.get("surface", ({ surface }) => paintSurface(surface || "newtab"));

// ── 강아지가 걷는 곳: 페이지 풀어놓기(pet on) ↔ 사이드패널만(pet off) ──
function paintPet(on) {
  $("petOn").classList.toggle("on", on);
  $("petOff").classList.toggle("on", !on);
  $("bgPick").style.display = on ? "none" : "block";
  $("petSizeWrap").style.display = on ? "block" : "none";
}
$("petOn").addEventListener("click", () => chrome.storage.local.set({ pet: true }));
$("petOff").addEventListener("click", () => chrome.storage.local.set({ pet: false }));
chrome.storage.local.get("pet", ({ pet }) => paintPet(pet !== false));

// 페이지 강아지 크기
function paintPetSize(px) {
  const v = px || 92;
  $("petSize").value = v;
  $("petSizeVal").textContent = v + "px";
}
$("petSize").addEventListener("input", (e) => {
  const v = +e.target.value;
  $("petSizeVal").textContent = v + "px";
  chrome.storage.local.set({ petSize: v });
});
chrome.storage.local.get("petSize", ({ petSize }) => paintPetSize(petSize || 92));

// ── 사이드패널 무대 배경 (꽃밭/도로/엑셀/크롬) ──
const BG = ["flower", "road", "excel", "chrome"];
const BODY_TINT = { excel: "#ffffff", chrome: "#f1f3f4" };
function applyBg(name) {
  if (!BG.includes(name)) name = "flower";
  const st = document.querySelector(".stage");
  if (st) {
    BG.forEach((b) => st.classList.remove("bg-" + b));
    st.classList.add("bg-" + name);
  }
  document.body.style.background = BODY_TINT[name] || "";
  [...$("bgSeg").children].forEach((b) => b.classList.toggle("on", b.dataset.bg === name));
}
$("bgSeg").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (b && b.dataset.bg) chrome.storage.local.set({ bg: b.dataset.bg });
});
chrome.storage.local.get("bg", ({ bg }) => applyBg(bg || "flower"));

chrome.storage.onChanged.addListener((c, area) => {
  if (area !== "local") return;
  if (c.pet) paintPet(c.pet.newValue !== false);
  if (c.petSize) paintPetSize(c.petSize.newValue || 92);
  if (c.bg) applyBg(c.bg.newValue);
});

// 시작: 상점(강아지) 목록 받고 → 현재 상태 로드
chrome.runtime.sendMessage({ type: "shop" }, (dogs) => {
  if (chrome.runtime.lastError) return;
  if (Array.isArray(dogs)) DOGS = dogs;
  send({ type: "get" });
});
