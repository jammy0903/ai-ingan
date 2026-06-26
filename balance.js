/* ===================== balance.js — idle 밸런스/튜닝 상수 =====================
   index.html 인라인보다 '먼저' 로드되는 전역 classic 스크립트(모듈 아님).
   난이도·곡선을 로직과 분리 — 여기 숫자만 만지면 튜닝, 게임 로직은 안 건드림.
   ⚠️ 수정 시 sw.js의 CACHE="aingan-vN" 번호를 올려야 캐시 stale 방지(plan.md ④).
   ※ COST_MULT(그래프 거리 스칼라)는 EDGES와 묶여 data.js에 있음 — 여기 아님. */
const TAP_GAIN = 1;                // 탭 최소 이득(초반 = 1걸음)
const TAP_FRAC = 1.0;             // 탭 이득 = 현재 걸음/초 × 이 비율. 1.0 = "1탭=1초어치" → 죽은 구간 없이 rate와 함께 성장(gap-analysis ③)
// 연타 콤보 + 크리(Phase 1.2, gap-analysis ⑤ 변동보상 일부)
const COMBO_WINDOW = 600;        // ms — 이 안에 또 누르면 콤보 유지(끊기면 리셋)
const COMBO_STEP   = 0.10;       // 콤보 1당 탭 배율 증가분 (배율 = 1 + STEP×min(combo,MAX))
const COMBO_MAX    = 40;         // 콤보 상한 → 최대 탭 배율 1 + 0.10×40 = ×5 (2026-06-26 ×7→×5 완만화: 빨리 눌러야 한다는 압박↓, 힐링 톤)
const CRIT_CHANCE  = 0.12;       // 탭 크리티컬 확률
const CRIT_MULT    = 5;          // 크리 시 탭 × (2026-06-26 6→5 중간값)
// 🆕 재회 폐기(2026-06-26): UP_BASE·REUNION_*·upCost·MAX_LV 제거 — 만남이 5단 한 번에 끝나 레벨업(재회)이 없음.
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
// 🆕 발견(걸음) 비용 = 지수곡선 (2026-06-26 재회 제거판). 비용 = DISCOVER_COST_BASE × DISCOVER_COST_GROWTH^costN.
//   costN = engine.js costN() = '모은 감정 수'(0~27). 재회가 없으니 곡선은 순수 감정 수집 진행만 따라간다.
//   탭 파워(1+감정+몸)는 별개 — 후반 ~39/탭이라 콤보 ×5와 합쳐 몇 번만 눌러도 비용을 순삭(탭 피로 0).
//   🍃 잔잔 페이스: 첫 감정 25걸음(~25초 idle) … 막 감정 ~1,187걸음(~20분 idle) … 전체 ~8,500걸음(~2.4h 순수 idle). cap 불필요(감정 27에서 끝).
const DISCOVER_COST_BASE   = 25;    // costN=0(첫 감정) 발견 비용 = ~25초 idle (2026-06-26 100→25)
const DISCOVER_COST_GROWTH = 1.16;  // 감정 하나 끝낼 때마다 다음 발견 비용 ×이 비율 (2026-06-26 1.25→1.16, 잔잔)
const OFFLINE_RATE = 0.1;         // (사문화) 옛 오프라인 배율 — 실제 오프라인은 save-auth.js의 1걸음/초·상한 OFFLINE_CAP_STEPS
const LOOKBACK_COST = 2;                            // 기억 한 조각 재해석 비용(마음의 깊이)
// 🆕 몸 온기 상점 — 몸 11을 그래프에서 빼고 자루에서 ✨온기로 '구매'(한 번, 5단 이야기). 단련(반복) 폐기(2026-06-26 재회 제거와 일관).
// ⚠️ §4 보장: 구매 11개 합 ≤ 감정 27코인(무광고 최소 플레이어도 인간 달성). 합 = 25.
const BODY_ORDER = ["skin","bone","muscle","nerve","endocrine","heart","lymph","lung","stomach","kidney","repro"];
const BODY_BUY   = [1,1,2,2,2,2,3,3,3,3,3];   // 부위별 구매 온기(BODY_ORDER 순서). 합 25.
const OFFLINE_CAP_H = 4;            // (사문화) 옛 오프라인 상한(시간)
// 수집(감정+몸) 누적 개수가 at를 넘을 때마다 전역 걸음/초 ×mult 점프.
// cells 근거: 제너레이터 '랭크 돌파마다 ×3' — 선형 덧셈이 아니라 '돌파=배율'로 자릿수 점프(gap-analysis Phase 3 ①).
// 점증 배율(거지키우기 달성보너스 +600%→+5000% 모사): 후반 문턱일수록 세게 → income이 K→M→B로 폭발.
const MILESTONES = [
  {at:3, mult:1.5}, {at:6, mult:1.7}, {at:10, mult:2.0},
  {at:15, mult:2.4}, {at:20, mult:3}, {at:27, mult:4},
  {at:33, mult:6}, {at:38, mult:9},   // 후반 폭발 완화(2026-06-22): 전부 모으면 누적 ×약 7.9천(종전 ×3.7만 대비 ~4.7배 완만)
];
