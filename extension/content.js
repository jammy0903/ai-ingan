// content.js — ① 키 신호 전송(모든 프레임) ② 페이지 위를 산책하는 강아지 펫(메인 화면만)
//
// ⚠️ 개인정보 원칙: keydown '발생'만 안다. 어떤 키였는지(e.key)는 절대 안 읽음 = 키로거 아님.
// v2: 키 한 번 = 신호 1발(걸음 +1) + 펫이 한 걸음 전진. 안 치면 그 자리에 쉼.

(() => {
  const TOP = window.top === window; // 펫은 메인 화면(최상위 프레임)에만 1마리
  const url = (p) => chrome.runtime.getURL(p);
  const REST = url("assets/dog-rest.webp");
  const WALK = [
    url("assets/dog-walk1.webp"),
    url("assets/dog-walk2.webp"),
    url("assets/dog-walk3.webp"),
    url("assets/dog-walk4.webp"),
  ];
  const SEQ = [0, 1, 2, 3, 2, 1]; // 핑퐁

  let wrap = null,
    img = null,
    posX = 60,
    dir = 1, // 1=오른쪽, -1=왼쪽
    phase = 0,
    restTimer = null,
    petOn = true;

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
      "height:92px;width:auto;display:block;transform-origin:50% 100%;" +
      "filter:drop-shadow(0 5px 4px rgba(0,0,0,.18));";
    wrap.appendChild(img);
    document.body.appendChild(wrap);
    place();
  }

  function removePet() {
    if (wrap) wrap.remove();
    wrap = img = null;
  }

  function place() {
    if (!wrap) return;
    wrap.style.transform = `translateX(${posX}px)`;
    img.style.transform = `scaleX(${dir})`; // 가는 방향으로 좌우 미러
  }

  // 키 한 번 = 다리 한 번 + 한 걸음 전진. 끝에 닿으면 방향 전환.
  function petStep() {
    if (!wrap) return;
    phase = (phase + 1) % SEQ.length;
    img.src = WALK[SEQ[phase]];
    posX += dir * 7;
    const max = Math.max(0, window.innerWidth - 110);
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
      if (img) img.src = REST; // 잠시 입력 없으면 그 자리에 쉼
    }, 600);
  }

  // 키 입력: 모든 프레임에서 신호 전송(걸음 카운트는 백그라운드가 누적·저장)
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.repeat) return; // 꾹 누름 자동연타 제외
      try {
        chrome.runtime.sendMessage({ type: "key" });
      } catch (_) {}
      if (petOn) petStep(); // 메인 화면이면 펫도 한 걸음
    },
    true
  );

  window.addEventListener("resize", () => {
    const max = Math.max(0, window.innerWidth - 110);
    if (posX > max) { posX = max; place(); }
  });

  // 펫 on/off 토글 (게임 설정에서 바꿈, 기본 on)
  chrome.storage.local.get("pet", ({ pet }) => {
    petOn = pet !== false;
    if (petOn) makePet();
  });
  chrome.storage.onChanged.addListener((c, area) => {
    if (area === "local" && c.pet) {
      petOn = c.pet.newValue !== false;
      if (petOn) makePet();
      else removePet();
    }
  });
})();
