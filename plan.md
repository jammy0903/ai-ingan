# 유지보수 리팩토링 계획 — 경량 분리안 (확정)

> 목적: MVP(단일 `index.html` 2000줄) → **유지보수 가능한 진짜 앱.**
> 게임 내용·규칙이 자주 바뀔 걸 전제로, **바뀌는 속도가 다른 것을 분리**한다.
> 단, 이 프로젝트(솔로·빌드 없음·PWA) 규모에 맞춰 **과설계를 피한 80/20 경량안**으로 간다.

작성: 2026-06-18. 상태: **착수 전 합의 완료.**

---

## 0. 한 줄 원칙

> **"파일을 쪼개는 것"과 "ES 모듈을 도입하는 것"은 별개다. 우리는 전자만 한다.**
> 데이터·밸런스만 전역 `<script src>`로 빼고, 엔진·뷰는 `index.html`에 그대로 둔다.

데이터(대사·감정)·규칙(비용곡선)을 손대는 일이 90%인데, 그건 데이터 추출만으로 사라진다.
엔진/뷰를 폴더로 쪼개고 `services/content.js` 같은 추상화를 까는 건 **아직 없는 기능을 위한 선투자**라 지금은 순손해.

---

## 1. 왜 풀버전(25파일 `src/` 트리 + ES 모듈)을 안 하나 — 이 코드베이스의 함정 3개

근거는 실제 파일에서 확인함.

### 🔴 함정 ① 서비스워커가 "스크립트 캐시 우선" — 모듈로 쪼개면 stale JS 지옥
`sw.js:27-47` — navigate(=`index.html`)만 **네트워크 우선**, 그 외 스크립트·자산은 전부 **캐시 우선**:
```js
// 문서(내비게이션)는 네트워크 우선 → 항상 최신 index
if (req.mode === "navigate") { ... fetch 우선 ... }
// 그 외(스크립트·폰트·아이콘)는 캐시 우선
caches.match(req).then(hit => hit || fetch(req)...)
```
지금은 로직이 전부 인라인이라 F5 = 항상 최신(navigate 덕분). 로직을 외부 `*.js`로 빼면 **고쳐도 옛 캐시가 나간다.**
→ CLAUDE.md "F5로 검증" 워크플로가 깨진다.

### 🟠 함정 ② ES 모듈 = `file://` 직접 열기 사망 + `node --check` 그물 약화
`<script type="module">`는 `file://`에서 CORS로 안 돌아 → CLAUDE.md "직접 파일 열기도 됨" 폴백 소멸.
더 중요: 모듈로 쪼개면 import 경로 오타·순환참조·배선 실수를 `node --check`가 **못 잡고** 브라우저에서만 터진다. 테스트도 없는데 자동검증 그물이 헐거워진다.

### 🟠 함정 ③ "데이터 주도 그래프 자동생성"은 리스크 최악·이득 과장
`computeRadialLayout()`(`index.html:1073`)은 좌표를 **이미 100% 자동생성**(트리 잎 수 비례 각도 + `hash(id)` 지터 + 완화). 손튜닝 좌표는 0개.
바로 그래서 위험: 이 배치는 **노드 id 문자열·트리 순서에 결정적으로 의존**한다. "감정 데이터에서 NODES 자동생성"하면 id·구조가 바뀌어 **현재의 보기 좋은 배치가 통째로 셔플**된다. `REL_EDGES`·`TIER`는 손 큐레이션 데이터고.
→ number-go-up 배선은 쉽고, 정작 깨지기 쉬운 layout이 자동화 제일 안 되는 부분. **그래프 자동생성은 안 한다.**

---

## 2. 할 일 (리스크 낮은 → 값 높은 순)

### ① 세이브 버저닝 — **제일 먼저, 단독으로도 가치 만점**
리팩토링과 무관하게 무조건 옳다. 콘텐츠·규칙 바뀌면 옛 세이브 깨지는 건 실재 위험.
- `snapshot()`(`index.html:1726`)에 `v:` 스키마 버전 필드 추가.
- `applyState()`(`:1728`)에 버전별 마이그레이션 분기(옛 세이브 → 현 구조 변환, 모르는 필드는 안전 기본값).
- 마이그레이션 실패 시 진행 날리지 말고 가능한 만큼 복구.

### ② 데이터 추출 → `data.js` (전역 스크립트, **모듈 아님**)
`window.PEOPLE = [...]` 식 전역 노출. `index.html` 인라인 로직보다 **먼저 로드**(`<head>` 또는 인라인 위 `<script src="data.js">`).
- 대상: `PEOPLE` · `BODY` · `NODES` · `REL_EDGES` · `SYS_COLD/WARM/REINTERP` · `INTRO` · `SAM_SCRIPT` · `ENDING_SEQ` · `ROBOT_NAMES`.
- `NODES`는 **손으로 짠 그대로** 옮긴다(자동생성 X — 함정 ③).
- 결과: `index.html`은 ~1200줄 로직만 남고, 감정 한 줄 고치기 = `data.js`만 연다.

### ③ 밸런스 추출 → `balance.js` (동일 방식)
튜닝 상수를 로직과 분리.
- 대상: `COST_MULT` · `UP_BASE` · `MAX_LV` · `TAP_GAIN` · `TIER` · `OFFLINE_CAP_H` · `LOOKBACK_COST` · `upCost` 곡선 계수 등.

### ④ SW 버전 범프 규칙 박기 (함정 ①의 방어)
- `data.js` · `balance.js`를 `sw.js`의 `CORE` 배열에 추가.
- **규칙: `data.js`/`balance.js`를 건드리면 `sw.js`의 `CACHE = "aingan-vN"` 번호를 올린다.** (안 하면 stale)
- 이 규칙을 CLAUDE.md §7에도 명시.

### ⑤ 엔진·뷰는 `index.html`에 그대로 — **건드리지 않는다**
`stepOnce` · `renderNodes` · `openNode` · `upgrade` · 온보딩·엔딩·줌/팬 전부 인라인 유지.
폴더 쪼개기·`core/`·`ui/` 분리는 **하지 않는다**(과설계).

---

## 3. 지금 안 하고 미루는 것 (진짜 strangler)

빈 추상화 레이어를 미리 까는 게 아니라, **기능이 임박했을 때 그 칸만 승격**한다.

- **콘텐츠 원격 핫업데이트(재배포 0) — Cloudflare KV/R2 채널.** *LLM 콘텐츠 풀 연동이 임박할 때* 도입.
  - 구조: 번들 `data.js` = 오프라인 기본값/폴백, KV JSON = 핫 업데이트 채널(`version.json` 포인터 + 엣지 캐시 + 클라 localStorage/SW 캐시). 대량 읽기는 CDN이 받아 DB를 안 탐.
  - 그때 `data.js` 로더만 `services/content.js`로 승격(출처를 함수 뒤로 숨김). UI는 안 바뀜.
- **세이브 쓰기 스로틀.** 트래픽 커지면: 현 `setInterval(saveState, 10s)`의 Supabase 쓰기를 의미 있는 체크포인트(노드 해금·프레스티지·이탈)+최소 60~120초 dirty 스로틀로. (둘러보기=비저장이라 캐주얼 트래픽은 이미 DB 0회 — 그대로 유지.)
- **로직까지 쪼개야 할 날이 오면** → bare ES 모듈 말고 **Vite**로. 빌드가 파일명 해시(=SW stale 자동 해결) + 번들(=`file://`·로드순서 소멸). 지금은 안 함.

---

## 4. 살아남은 원칙 (풀버전에서 가져온 것)

- ✅ **변화속도별 분리** — 데이터 / 규칙 / 엔진 / 뷰. 단 폴더가 아니라 *파일 2개*로 가볍게.
- ✅ **세이브 마이그레이션 버전** — 위 ①.
- ✅ **strangler(점진) > 빅뱅** — 작동하는 게임 안 멈추고 ①→④ 순서로.

---

## 진행 결정 (2026-06-18)

- **①만 먼저, 단독 체크포인트로 친다(완료).** ②~④는 다음 배치로 분리.
  - 이유: ②~③(큰 배열 추출)은 테스트0·F5수동뿐인 환경에서 참조누락·로드순서 회귀가 숨는 *진짜 위험 칸*. ①과 묶으면 회귀 격리가 안 됨. ①은 리스크0·독립이라 깨끗한 커밋 지점이 됨 → 그 위에서 ②③④ 진행.
  - ① 구현: node --check 통과. **커밋 b0e6fa0 → main FF 병합 완료(2026-06-18). origin 미푸시(ahead 1).**

## 5. 진행 체크리스트

- [x] ① `snapshot`/`applyState` 세이브 버저닝 + 마이그레이션 — **완료**(`SAVE_VERSION`·`migrate()`·미래버전 클램프, `index.html:1715/1727/1731`)
- [x] ② `data.js` 추출 — **완료**(커밋 78a51f0). PEOPLE·BODY·ENDING_SEQ·NODES·COST_MULT·EDGES·REL_EDGES. node --check 3종 통과. ※COST_MULT는 EDGES 결합 때문에 data.js에 둠(balance ❌)
- [x] ③ `balance.js` 추출 — **완료**(커밋 df7faea). TAP_GAIN·UP_BASE·upCost·MAX_LV·TIER·LOOKBACK_COST·OFFLINE_CAP_H. COST_MULT는 data.js(EDGES 결합)
- [x] ④ `sw.js` `CORE`에 data.js·balance.js 추가 + `CACHE=aingan-v2` 범프 + 규칙(CLAUDE.md §7·sw.js 주석) — **완료**
- [x] ⑤ 엔진/뷰 인라인 유지 확인 — 회귀 없음(엔진·뷰 코드 미변경, 데이터/밸런스만 이동)
- [x] `node --check`(data·balance·인라인·합본) + 브라우저 부팅(localhost:8000 게이트→인트로 풀렌더, 콘솔 무에러) 통과
