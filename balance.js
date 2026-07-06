/* ===================== balance.js — idle 밸런스/튜닝 상수 =====================
   index.html 인라인보다 '먼저' 로드되는 전역 classic 스크립트(모듈 아님).
   난이도·곡선을 로직과 분리 — 여기 숫자만 만지면 튜닝, 게임 로직은 안 건드림.
   ⚠️ 수정 시 sw.js의 CACHE="aingan-vN" 번호를 올려야 캐시 stale 방지(plan.md ④).
   ※ COST_MULT(그래프 거리 스칼라)는 EDGES와 묶여 data.js에 있음 — 여기 아님. */
const TAP_GAIN = 1;                // 탭 최소 이득(초반 = 1걸음)
// 연타 콤보 + 크리(Phase 1.2, gap-analysis ⑤ 변동보상 일부)
const COMBO_WINDOW = 600;        // ms — 이 안에 또 누르면 콤보 유지(끊기면 리셋)
const COMBO_STEP   = 0.10;       // 콤보 1당 탭 배율 증가분 (배율 = 1 + STEP×min(combo,MAX))
const COMBO_MAX    = 40;         // 콤보 상한 → 최대 탭 배율 1 + 0.10×40 = ×5 (2026-06-26 ×7→×5 완만화: 빨리 눌러야 한다는 압박↓, 힐링 톤)
const CRIT_CHANCE  = 0.12;       // 탭 크리티컬 확률
const CRIT_MULT    = 5;          // 크리 시 탭 × (2026-06-26 6→5 중간값)
// 🆕 재회 폐기(2026-06-26): UP_BASE·REUNION_*·upCost·MAX_LV 제거 — 만남이 5단 한 번에 끝나 레벨업(재회)이 없음.
//   (옛 발견비용 모델 TAP_CURVE·W_MULT·DISCOVER_BASE·TAP_FRAC 제거 — 아래 지수곡선으로 대체됨.)
// 🆕 발견(걸음) 비용 = 지수곡선. 비용 = DISCOVER_COST_BASE × DISCOVER_COST_GROWTH^costN.
//   costN = engine.js costN() = '모은 감정 수'(0~27). 재회가 없으니 곡선은 순수 감정 수집 진행만 따라간다.
//   ⚠️ 2026-06-26 가팔랐던 곡선 원복(유저 요청): 잔잔(BASE 25·GROWTH 1.16)을 폐기, 옛 가파른 BASE 100·GROWTH 1.25로 회귀.
//   가파른 페이스: 첫 감정 100걸음 · 감정마다 ×1.25 · 막 감정(27번째) ≈ 100×1.25^26 ≈ 33,000걸음 · 전체 ≈ 165,000걸음(순수 idle ~46h, 탭하면 훨씬 빠름).
//   (옛 752k는 costN이 재회 깊이로 40까지 올랐기 때문 — 재회 폐기로 costN은 27에서 끝나 그만큼만 낮음. 가파름=GROWTH는 동일.)
const DISCOVER_COST_BASE   = 100;   // costN=0(첫 감정) 발견 비용 (2026-06-26 25→100 원복, 가파른 곡선)
const DISCOVER_COST_GROWTH = 1.25;  // 감정 하나 끝낼 때마다 다음 발견 비용 ×이 비율 (2026-06-26 1.16→1.25 원복, 가파름)
const LOOKBACK_COST = 2;                            // 기억 한 조각 재해석 비용(마음의 깊이)
// 🆕 몸 온기 상점 — 몸 11을 그래프에서 빼고 자루에서 ✨온기로 '구매'(한 번, 5단 이야기). 단련(반복) 폐기(2026-06-26 재회 제거와 일관).
// ⚠️ §4 보장: 구매 11개 합 ≤ 감정 27코인(무광고 최소 플레이어도 인간 달성). 합 = 25.
const BODY_ORDER = ["skin","bone","muscle","nerve","endocrine","heart","lymph","lung","stomach","kidney","repro"];
const BODY_BUY   = [1,1,2,2,2,2,3,3,3,3,3];   // 부위별 구매 온기(BODY_ORDER 순서). 합 25.
// 수집(감정+몸) 누적 개수가 at를 넘을 때마다 전역 걸음/초 ×mult 점프.
// cells 근거: 제너레이터 '랭크 돌파마다 ×3' — 선형 덧셈이 아니라 '돌파=배율'로 자릿수 점프(gap-analysis Phase 3 ①).
// 점증 배율(거지키우기 달성보너스 +600%→+5000% 모사): 후반 문턱일수록 세게 → income이 K→M→B로 폭발.
const MILESTONES = [
  {at:3, mult:1.5}, {at:6, mult:1.7}, {at:10, mult:2.0},
  {at:15, mult:2.4}, {at:20, mult:3}, {at:27, mult:4},
  {at:33, mult:6}, {at:38, mult:9},   // 후반 폭발 완화(2026-06-22): 전부 모으면 누적 ×약 7.9천(종전 ×3.7만 대비 ~4.7배 완만)
];
