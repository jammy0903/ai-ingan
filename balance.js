/* ===================== balance.js — idle 밸런스/튜닝 상수 =====================
   index.html 인라인보다 '먼저' 로드되는 전역 classic 스크립트(모듈 아님).
   난이도·곡선을 로직과 분리 — 여기 숫자만 만지면 튜닝, 게임 로직은 안 건드림.
   ⚠️ 수정 시 sw.js의 CACHE="aingan-vN" 번호를 올려야 캐시 stale 방지(plan.md ④).
   ※ COST_MULT(그래프 거리 스칼라)는 EDGES와 묶여 data.js에 있음 — 여기 아님. */
const TAP_GAIN = 1;                // 탭 최소 이득(초반 = 1걸음)
const TAP_FRAC = 1.0;             // 탭 이득 = 현재 걸음/초 × 이 비율. 1.0 = "1탭=1초어치" → 죽은 구간 없이 rate와 함께 성장(gap-analysis ③)
// 연타 콤보 + 크리(Phase 1.2, gap-analysis ⑤ 변동보상 일부)
const COMBO_WINDOW = 600;        // ms — 이 안에 또 누르면 콤보 유지(끊기면 리셋)
const COMBO_STEP   = 0.15;       // 콤보 1당 탭 배율 증가분 (배율 = 1 + STEP×min(combo,MAX))
const COMBO_MAX    = 40;         // 콤보 상한 → 최대 탭 배율 1 + 0.15×40 = ×7
const CRIT_CHANCE  = 0.12;       // 탭 크리티컬 확률
const CRIT_MULT    = 6;          // 크리 시 탭 ×
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
// 수집(감정+몸) 누적 개수가 at를 넘을 때마다 전역 걸음/초 ×mult 점프.
// cells 근거: 제너레이터 '랭크 돌파마다 ×3' — 선형 덧셈이 아니라 '돌파=배율'로 자릿수 점프(gap-analysis Phase 3 ①).
const MILESTONES = [
  {at:3, mult:1.5}, {at:6, mult:1.5}, {at:10, mult:1.5},
  {at:15, mult:2.0}, {at:20, mult:2.0}, {at:27, mult:2.0},
  {at:33, mult:2.5}, {at:38, mult:3.0},
];
