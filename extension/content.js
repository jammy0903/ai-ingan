// content.js — ① 키 신호 전송(모든 프레임) ② 화면 테두리(바닥·양벽·천장)를 도는 강아지 펫
//
// ⚠️ 개인정보: keydown '발생'만 안다. 무슨 키인지(e.key)는 절대 안 읽음 = 키로거 아님.
// v2: 타자 한 글자 또는 마우스 왼클릭 = 신호 1발(걸음 +1) + 펫 한 걸음. 펫은 크기조절 + 선택 강아지 반영.
// 펫은 바닥→오른벽→천장→왼벽 순으로 테두리를 돈다(모서리에서 회전, 발이 벽에 붙음).

(() => {
  const TOP = window.top === window; // 펫은 메인 화면(최상위 프레임)에만 1마리
  const url = (p) => chrome.runtime.getURL(p);
  const SEQ = [0, 1, 2, 3, 2, 1]; // 핑퐁
  const dogPrefix = (id) => (id === "cheese" ? "dog" : "dog-" + id);

  let selDog = "cheese",
    REST = url("assets/dog-rest.webp"),
    WALK = [1, 2, 3, 4].map((n) => url(`assets/dog-walk${n}.webp`));

  function setDogSprites(id) {
    selDog = id || "cheese";
    const p = dogPrefix(selDog);
    REST = url(`assets/${p}-rest.webp`);
    WALK = [1, 2, 3, 4].map((n) => url(`assets/${p}-walk${n}.webp`));
    if (img && !walking) img.src = REST;
  }

  let wrap = null,
    img = null,
    edge = "bottom", // 현재 붙어있는 면
    p = 60, // 그 면에서 진행한 거리(px)
    curAng = 0,
    phase = 0,
    restTimer = null,
    petOn = true,
    petSize = 92,
    walking = false;

  const NEXT = { bottom: "right", right: "top", top: "left", left: "bottom" };

  function makePet() {
    if (!TOP || wrap || !document.body) return;
    wrap = document.createElement("div");
    wrap.id = "__aingan_dog";
    // 발(이미지 하단 중앙)이 (left,top)에 오도록 translate(-50%,-100%)
    wrap.style.cssText =
      "position:fixed;left:0;top:0;z-index:2147483600;pointer-events:none;" +
      "transform:translate(-50%,-100%);will-change:left,top;";
    img = document.createElement("img");
    img.src = REST;
    img.draggable = false;
    img.style.cssText =
      "display:block;width:auto;transform-origin:50% 100%;filter:drop-shadow(0 5px 4px rgba(0,0,0,.18));";
    img.style.height = petSize + "px";
    wrap.appendChild(img);
    document.body.appendChild(wrap);
    place();
  }

  function removePet() {
    if (wrap) wrap.remove();
    wrap = img = null;
  }

  // 현재 면·진행도에서 발 좌표·회전각·면 길이
  function geom() {
    const vw = window.innerWidth,
      vh = window.innerHeight,
      m = 4;
    switch (edge) {
      case "right": return { fx: vw - m, fy: vh - p, ang: -90, len: vh }; // 위로
      case "top": return { fx: vw - p, fy: m, ang: 180, len: vw }; // 왼쪽(거꾸로)
      case "left": return { fx: m, fy: p, ang: 90, len: vh }; // 아래로
      default: return { fx: p, fy: vh - m, ang: 0, len: vw }; // bottom, 오른쪽
    }
  }

  function place() {
    if (!wrap) return;
    const g = geom();
    curAng = g.ang;
    if (p > g.len) p = g.len;
    wrap.style.left = g.fx + "px";
    wrap.style.top = g.fy + "px";
    img.style.transform = `rotate(${g.ang}deg)`;
  }

  function advance() {
    p += 7;
    if (p >= geom().len) {
      edge = NEXT[edge]; // 모서리 → 다음 면으로 회전
      p = 0;
    }
  }

  function setPetSize(px) {
    petSize = Math.max(32, Math.min(240, px | 0)) || 92;
    if (img) img.style.height = petSize + "px";
    place();
  }

  // 키 한 번 = 다리 한 번 + 테두리 한 걸음 전진.
  function petStep() {
    if (!wrap) return;
    walking = true;
    phase = (phase + 1) % SEQ.length;
    img.src = WALK[SEQ[phase]];
    advance();
    place();
    img.animate(
      [
        { transform: `rotate(${curAng}deg) translateY(0)` },
        { transform: `rotate(${curAng}deg) translateY(-6px)` },
        { transform: `rotate(${curAng}deg) translateY(0)` },
      ],
      { duration: 220, easing: "ease-in-out" }
    );
    clearTimeout(restTimer);
    restTimer = setTimeout(() => {
      walking = false;
      if (img) img.src = REST; // 그 자리(벽이든 천장이든)에 쉼
    }, 600);
  }

  // 한 걸음 신호(걸음 +1 + 펫 한 걸음). 막지 않고 곁눈질만.
  function signalStep() {
    try {
      chrome.runtime.sendMessage({ type: "key" });
    } catch (_) {}
    if (petOn) petStep();
  }

  // 타자 한 글자 = 한 걸음
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.repeat) return; // 꾹 누름 자동연타 제외
      signalStep();
    },
    true
  );

  // 마우스 왼쪽 클릭 한 번 = 한 걸음 (오른/가운데 클릭 제외)
  window.addEventListener(
    "mousedown",
    (e) => {
      if (e.button !== 0) return;
      signalStep();
    },
    true
  );

  window.addEventListener("resize", place);

  chrome.storage.local.get(["pet", "petSize", "g"], ({ pet, petSize: ps, g }) => {
    petOn = pet !== false;
    if (ps) petSize = ps;
    if (g && g.selDog) setDogSprites(g.selDog);
    if (petOn) makePet();
  });
  chrome.storage.onChanged.addListener((c, area) => {
    if (area !== "local") return;
    if (c.pet) {
      petOn = c.pet.newValue !== false;
      if (petOn) makePet();
      else removePet();
    }
    if (c.petSize) setPetSize(c.petSize.newValue || 92);
    if (c.g && c.g.newValue && c.g.newValue.selDog !== selDog) {
      setDogSprites(c.g.newValue.selDog);
    }
  });
})();
