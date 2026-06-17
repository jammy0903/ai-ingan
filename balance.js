/* ===================== balance.js — idle 밸런스/튜닝 상수 =====================
   index.html 인라인보다 '먼저' 로드되는 전역 classic 스크립트(모듈 아님).
   난이도·곡선을 로직과 분리 — 여기 숫자만 만지면 튜닝, 게임 로직은 안 건드림.
   ⚠️ 수정 시 sw.js의 CACHE="aingan-vN" 번호를 올려야 캐시 stale 방지(plan.md ④).
   ※ COST_MULT(그래프 거리 스칼라)는 EDGES와 묶여 data.js에 있음 — 여기 아님. */
const TAP_GAIN = 1;
const UP_BASE = { person: 30 };   // 재회 업그레이드 1레벨 비용 기준
const upCost = (node, lv) => Math.round(UP_BASE.person * Math.pow(1.45, lv-1));  // 재회 비용 곡선 배율(완만하게)
const MAX_LV = 10;                // 재회 심화 상한 — 각 노드는 Lv10(첫 만남 Lv1 + 재회 9회)까지만 깊어진다
const TIER = {
  joy:"big", adore:"mid", amuse:"mid", flutter:"mid", curious:"small", beauty:"small", admire:"small", awe:"small", trance:"small", satisfy:"small",
  fear:"big", confuse:"mid", bored:"mid", awkward:"mid", anxiety:"small", disgust:"small", horror:"small",
  excite:"big", relief:"mid", attract:"mid", crave:"small", triumph:"small",
  sorrow:"big", empathy:"mid", longing:"mid", compassion:"small", calm:"small",
};
const LOOKBACK_COST = 2;                            // 기억 한 조각 재해석 비용(마음의 깊이)
const OFFLINE_CAP_H = 4;            // 오프라인 적립 상한(시간)
