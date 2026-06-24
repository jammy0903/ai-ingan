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
const upCost = (node, lv) => Math.round(UP_BASE.person * Math.pow(1.15, lv-1));  // 재회 비용 곡선(1.15 = 5레벨당 ×2.0, 달성보너스 ×2와 균형 → '국소 벽' 제거. 재회 = 막힘없는 잔잔한 잼)
const MAX_LV = 50;                // 재회 심화 상한 — 끝없는 sink(거지 알바식). 5레벨마다 ×2 달성보너스(achieveMult)
// 발견(이동) 비용 = '내 걸음 속도 추종' + '순번별 목표 탭수 곡선'.
// 비용 = effRate(걸음/초) × TAP_CURVE[순번]. TAP_FRAC=1.0라 "목표 탭수 = 목표 초"(가만 두면 그 초만큼 idle로도 도달).
// income이 K/M/B로 폭발해도 비용이 income추종이라 다음 발견은 늘 "목표 탭수" 거리 → 탭("다음 이야기 당겨오기")이 영원히 의미를 가짐.
// 곡선 의도: 첫 노드는 즉각(훅) → 그담부터 묵직(+20대) → 이후 평탄(끝값 유지). 걷기(idle)가 부담 절반쯤 먹어줌.
// ⚠️ 콤보 최대 ×7 쓰면 체감 탭수는 1/7로 압축됨(예: 80 → ~11탭).
const TAP_CURVE = [5, 25, 42, 58, 80];   // (폴백) w 없는 노드용 발견순번 곡선. 평소엔 data.js의 node.w 사용.
const W_MULT = 5;                 // 발견(이동) 비용 전역 배율 — 진행 속도 단일 조절 손잡이. 노드 열림 속도 ∝ w(=w/6초). ↑ = 전체 느리게(2026-06-22, 5배). 1 = 종전.
// 발견비용 = node.w(감정별 목표걸음) × W_MULT × max(1, effTap/DISCOVER_BASE).
// effTap이 이 기준 이하인 '초반'에선 비용 = w 그대로(화면에 정확히 그 숫자) → "재미=250걸음" 보장.
// effTap이 이 기준을 넘는 '후반'(마일스톤으로 income 폭발)부턴 income추종으로 커짐(후반 공짜/벽 방지).
// 6 = 자연경로상 긍정 갈래(호기심까지, effTap≤6)가 전부 정확값으로 뜨는 경계.
const DISCOVER_BASE = 6;
// 🆕 발견(걸음) 비용 = 지수곡선 (2026-06-24). 비용 = DISCOVER_COST_BASE × DISCOVER_COST_GROWTH^costN.
//   costN = 비용 '지수'(engine.js costN()). 4대분류 마스터 기반·상한 N_MAX. 노드별 w·W_MULT·TAP_CURVE는 비용에서 폐기.
//   ⚠️ costN은 '탭 파워(1+감정+재회)'와 별개 — 통일하면 행동당 +1 도파민이 상한에 뭉개지므로 분리(engine.js 주석 참고).
//   곡선 의도: 진행(costN) 0→40을 따라 비용이 매끄럽게 지수 상승. costN이 40에서 상한이라 비용도 천장(10×1.25^40≈75k)에서 멈춤 → 후반 무한폭발 방지(탭 파워는 계속 커져 이 천장을 순삭).
const DISCOVER_COST_BASE   = 100;   // costN=0일 때 발견 비용(첫 노드). 2026-06-24 ×10(가격 0 하나 더): 10→100 → 곡선 전체 ×10(100→752k)
const DISCOVER_COST_GROWTH = 1.25;  // n이 1 오를 때마다 비용 ×이 비율 (재회식 base×r^n과 동형)
// 🆕 n(탭당 걸음수 = 비용 지수) 곡선 — 4대분류 마스터 기반·상한.
//   4대분류(긍정→강한자극→불안불편→잔잔시림)를 각각 '완전 마스터'할 때마다 n += N_PER_CAT, 상한 N_MAX.
//   갈래당 +10 = 감정수집 5(그 갈래 감정 전부 수집) + 재회깊이 5(감정당 RN_FULL_LV 레벨에서 saturate). 50:50.
const N_MAX      = 40;   // n 상한 = 4대분류 × N_PER_CAT
const N_PER_CAT  = 10;   // 대분류 하나 완전 마스터 시 n 기여
const RN_FULL_LV = 5;    // 재회 깊이 만점 레벨 — 감정당 이 레벨에서 재회 기여가 꽉 참(MAX_LV=50은 그대로, n은 5에서 saturate)
const OFFLINE_RATE = 0.1;         // 앱 끈 동안 걸음 적립 배율(1/10). base 1걸음/초 → 오프라인 0.1걸음/초 = 1분에 6걸음. 켜고 놀 유인(접속 유도).
const TIER = {
  joy:"big", adore:"mid", amuse:"mid", flutter:"mid", curious:"small", beauty:"small", admire:"small", awe:"small", trance:"small", satisfy:"small",
  fear:"big", confuse:"mid", bored:"mid", awkward:"mid", anxiety:"small", disgust:"small", horror:"small",
  excite:"big", relief:"mid", attract:"mid", crave:"small", triumph:"small",
  sorrow:"big", empathy:"mid", longing:"mid", compassion:"small", calm:"small",
};
const LOOKBACK_COST = 2;                            // 기억 한 조각 재해석 비용(마음의 깊이)
// 🆕 몸 온기 상점 — 몸 11을 그래프에서 빼고 자루에서 ✨온기로 구매/단련(5단 이야기). (economy-redesign 후속)
// ⚠️ §4 보장: 첫 구매 11개 합 ≤ 감정 27코인(무재회·무광고 최소 플레이어도 인간 달성). 합 = 25.
const BODY_ORDER = ["skin","bone","muscle","nerve","endocrine","heart","lymph","lung","stomach","kidney","repro"];
const BODY_BUY   = [1,1,2,2,2,2,3,3,3,3,3];   // 부위별 '첫 구매' 온기(BODY_ORDER 순서). 합 25.
const BODY_TRAIN_BASE = 3;                    // '단련' 1회(Lv1→2) 기본 온기 — 깊은 이야기(2~5단)+탭 +1. 진짜 큰 소비처(선택).
const BODY_TRAIN_GROW = 1.6;                  // 단련 레벨마다 ×(점증). Lv1→2=3·2→3=5·3→4=8·4→5=13…
const OFFLINE_CAP_H = 4;            // 오프라인 적립 상한(시간)
// 수집(감정+몸) 누적 개수가 at를 넘을 때마다 전역 걸음/초 ×mult 점프.
// cells 근거: 제너레이터 '랭크 돌파마다 ×3' — 선형 덧셈이 아니라 '돌파=배율'로 자릿수 점프(gap-analysis Phase 3 ①).
// 점증 배율(거지키우기 달성보너스 +600%→+5000% 모사): 후반 문턱일수록 세게 → income이 K→M→B로 폭발.
const MILESTONES = [
  {at:3, mult:1.5}, {at:6, mult:1.7}, {at:10, mult:2.0},
  {at:15, mult:2.4}, {at:20, mult:3}, {at:27, mult:4},
  {at:33, mult:6}, {at:38, mult:9},   // 후반 폭발 완화(2026-06-22): 전부 모으면 누적 ×약 7.9천(종전 ×3.7만 대비 ~4.7배 완만)
];
