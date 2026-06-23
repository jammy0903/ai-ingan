// newtab.js — 새 탭 래퍼. surface 설정에 따라:
//   newtab    → 이 새 탭을 게임 화면으로 교체
//   sidepanel → 새 탭은 비운 패스스루(안내 + 버튼)만 보여줌

chrome.storage.local.get("surface", ({ surface }) => {
  if ((surface || "newtab") === "newtab") {
    // 새 탭에 게임 띄우기 (같은 탭을 game.html로 교체 → history에 안 남김)
    location.replace("game.html");
    return;
  }
  // 사이드패널 모드: 패스스루 보여줌
  document.body.style.display = "block";

  document.getElementById("open").addEventListener("click", async () => {
    try {
      const w = await chrome.windows.getCurrent();
      await chrome.sidePanel.open({ windowId: w.id });
    } catch (_) {}
  });

  document.getElementById("toTab").addEventListener("click", () => {
    chrome.storage.local.set({ surface: "newtab" }, () =>
      location.replace("game.html")
    );
  });
});
