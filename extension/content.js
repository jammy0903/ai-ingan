// content.js — ① 키 신호 전송(모든 프레임) ② 페이지 위를 산책하는 강아지 펫(메인 화면만)
//
// ⚠️ 개인정보 원칙: keydown '발생'만 안다. 어떤 키였는지(e.key)는 절대 안 읽음 = 키로거 아님.
// v2: 키 한 번 = 신호 1발(걸음 +1) + 펫이 한 걸음. 펫은 크기 조절 + 선택한 강아지(품종) 반영.

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
    if (img && !walking) img.src = REST; // 쉴 때면 즉시 교체
  }

  let wrap = null,
    img = null,
    posX = 60,
    dir = 1, // 1=오른쪽, -1=왼쪽
    phase = 0,
    restTimer = null,
    petOn = true,
    petSize = 92,
    walking = false;

  function makePet() {
    if (!TOP || wrap || !document.body) return;
    wrap = document.createElement("div");
    wrap.id = "__aingan_dog";
    wrap.style.cssText =
      "position:fixed;left:0;bottom:6px;z-index:2147483600;pointer-events:none;will-change:transform;";
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

  function edge() {
    return Math.max(0, window.innerWidth - (img ? img.offsetWidth : 110));
  }

  function place() {
    if (!wrap) return;
    wrap.style.transform = `translateX(${posX}px)`;
    img.style.transform = `scaleX(${dir})`; // 가는 방향으로 미러
  }

  function setPetSize(px) {
    petSize = Math.max(32, Math.min(240, px | 0)) || 92;
    if (img) img.style.height = petSize + "px";
    const max = edge();
    if (posX > max) posX = max;
    place();
  }

  // 키 한 번 = 다리 한 번 + 한 걸음. 끝에 닿으면 방향 전환.
  function petStep() {
    if (!wrap) return;
    walking = true;
    phase = (phase + 1) % SEQ.length;
    img.src = WALK[SEQ[phase]];
    posX += dir * 7;
    const max = edge();
    if (posX > max) { posX = max; dir = -1; }
    if (posX < 0) { posX = 0; dir = 1; }
    place();
    img.animate(
      [
        { transform: `scaleX(${dir}) translateY(0)` },
        { transform: `scaleX(${dir}) translateY(-6px)` },
        { transform: `scaleX(${dir}) translateY(0)` },
      ],
      { duration: 220, easing: "ease-in-out" }
    );
    clearTimeout(restTimer);
    restTimer = setTimeout(() => {
      walking = false;
      if (img) img.src = REST; // 잠시 입력 없으면 그 자리에 쉼
    }, 600);
  }

  window.addEventListener(
    "keydown",
    (e) => {
      if (e.repeat) return;
      try {
        chrome.runtime.sendMessage({ type: "key" });
      } catch (_) {}
      if (petOn) petStep();
    },
    true
  );

  window.addEventListener("resize", () => {
    const max = edge();
    if (posX > max) { posX = max; place(); }
  });

  // 펫 on/off + 크기 + 선택 강아지
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
      setDogSprites(c.g.newValue.selDog); // 강아지 교체 즉시 반영
    }
  });
})();
