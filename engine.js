/* ===== engine.js — index.html에서 분리(구조 분리 2026-06-22). 상태·레이아웃·산출/탭·DOM참조·줌좌표·도달판정.
   ⚠️ 전역 스크립트(모듈 아님) — 전역 스코프 공유, 로드 순서 = 원본 순서. sw.js CORE/정규식 등재. ===== */
/* 데이터(PEOPLE·BODY·ENDING_SEQ·NODES·COST_MULT·EDGES·REL_EDGES)는 data.js로 분리 — index보다 먼저 로드. 데이터 수정 시 sw.js CACHE 범프. */
// 프랙탈 트리 배치: 각 가지가 '자손 잎 수'에 비례한 부채꼴(sector)을 받아 바깥으로 뻗는다.
// 가지마다 자기 부채꼴 안에서만 다시 갈라지므로(자기유사) 서로 절대 안 겹치고 나무처럼 펼쳐진다.
// 가지 길이는 깊어질수록 일정 비율로 짧아져(DECAY) 프랙탈 특유의 결이 난다.
function computeRadialLayout(){
  const kids={}; NODES.forEach(n=>kids[n.id]=[]);
  NODES.forEach(n=>{ if(n.parent) kids[n.parent].push(n.id); });
  const byId=Object.fromEntries(NODES.map(n=>[n.id,n]));
  const hash=s=>{ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619);} return ((h>>>0)%100000)/100000; }; // [0,1)
  // 각 노드의 '자손 잎(leaf) 수' = 그 가지가 차지할 각도 폭의 가중치
  const leaf={};
  (function w(id){ const ch=kids[id]; if(!ch.length) return leaf[id]=1; let s=0; ch.forEach(c=>s+=w(c)); return leaf[id]=s; })("start");

  const SEG0=0.20, DECAY=0.72;                  // 가지 길이: 깊어질수록 0.72배(자기유사) → 프랙탈 결
  const seg = depth => SEG0*Math.pow(DECAY, depth);

  // assign: 노드를 (반지름, 방향)에 놓고, 자기 부채꼴 [lo,hi]를 자식들에게 잎 수 비례로 분배
  (function assign(id, dir, radius, lo, hi, depth){
    const n=byId[id];
    n.x=0.5 + radius*Math.cos(dir); n.y=0.5 + radius*Math.sin(dir);
    if(id==="becoming") return;                 // 샘의 자식(human)은 정규화 뒤 따로 배치
    const ch=kids[id]; if(!ch.length) return;
    const span=hi-lo, totW=ch.reduce((s,c)=>s+leaf[c],0);
    let acc=lo;
    ch.forEach(c=>{
      const frac=leaf[c]/totW, clo=acc, chi=acc+span*frac; acc=chi;
      const jit=(hash(c)-0.5)*span*frac*0.22;   // 부채꼴 안에서만 살짝 흔들어 유기적으로
      assign(c, (clo+chi)/2 + jit, radius+seg(depth), clo, chi, depth+1);
    });
  })("start", -Math.PI/2, 0, -Math.PI, Math.PI, 0);   // root: 자식들이 360° 전체로 펼쳐짐

  // 잎이 같은 반지름에 몰려 닿을 때만 살짝 떼는 가벼운 보정(부채꼴 구조·교차는 유지)
  const MIND=0.085, sim=NODES.filter(n=>n.id!=="human"&&n.id!=="start");
  for(let it=0; it<70; it++){
    for(let i=0;i<sim.length;i++) for(let j=i+1;j<sim.length;j++){
      const a=sim[i], b2=sim[j]; let dx=b2.x-a.x, dy=b2.y-a.y, d=Math.hypot(dx,dy);
      if(d<1e-6){ dx=(hash(a.id)-0.5)*0.02; dy=(hash(b2.id+"y")-0.5)*0.02; d=Math.hypot(dx,dy)||1e-6; }
      if(d>=MIND) continue;
      const ux=dx/d, uy=dy/d, g=(MIND-d)/2;
      a.x-=ux*g; a.y-=uy*g; b2.x+=ux*g; b2.y+=uy*g;
    }
  }
  // 중심 기준으로 전체를 캔버스에 꽉 차게 정규화(프랙탈 모양은 보존, 크기만 맞춤)
  let maxR=0; NODES.forEach(n=>{ if(n.id!=="human") maxR=Math.max(maxR, Math.hypot(n.x-0.5, n.y-0.5)); });
  const sc = maxR>0 ? 0.45/maxR : 1;
  NODES.forEach(n=>{ if(n.id!=="human"){ n.x=0.5+(n.x-0.5)*sc; n.y=0.5+(n.y-0.5)*sc; } });
  // 사람(human)은 샘(becoming) 바깥으로 살짝 떨어뜨려 배치(정규화 뒤).
  const b=byId["becoming"], hu=byId["human"];
  if(hu&&b){ const dx=b.x-0.5, dy=b.y-0.5, len=Math.hypot(dx,dy)||1; hu.x=b.x+(dx/len)*0.1; hu.y=b.y+(dy/len)*0.1; }
  NODES.forEach(n=>{ n.x=Math.max(0.03,Math.min(0.97,n.x)); n.y=Math.max(0.03,Math.min(0.97,n.y)); }); // 캔버스 안으로
}
computeRadialLayout();

/* ===================== 상태 ===================== */
const S = {
  walks: 0, rate: 1.0, current: "start",   // rate는 레거시(미사용) — baseRate()가 levels에서 계산. 세이브 호환 위해 필드만 보존

  levels: {},            // nodeId -> 레벨(0=미완료)
  discovered: {},        // nodeId -> true (걸음을 비용만큼 모아 희미하게 발견됨)
  robotName: "",         // 로봇 이름(사람마다 다름)
  named: false,          // 플레이어가 온보딩에서 직접 확정했는가
  depth: 0,              // 🌊 마음의 깊이 (프레스티지 메타통화)
  coins: 0,              // ✨ 온기 조각 — 감정 해금(+1)·N번째 재회(+N)·광고(+10)로 모음. 2단계: 몸 구매에 사용
  cycle: 0,              // 걸어온 회차 수 (0=첫 생)
  lookback: 0,           // '기억 재해석'으로 되돌아본 기억 수 (마음의 깊이로 구매, §3)
  seenIntro: false,      // 튜토리얼(온보딩)을 '완료'했는가 = 새세션(복귀) 판정 기준. beginAdventure에서만 true. (시작만 하고 이탈=false → 다음 세션 재노출)
  seenMapTut: false,      // 🆕 지도 스포트라이트 튜토리얼을 한 번이라도 봤는가
};
NODES.forEach(n => S.levels[n.id] = n.completed ? 1 : 0);

/* ---------- 유효 산출/탭 (메타 배율 솔기) ----------
   S.rate(걸음/초 누적 base)·탭 이득을 '한 곳'에서 계산한다.
   지금은 배율 1이라 동작 불변. Phase 1(탭 비례)·3(마일스톤)·4(프레스티지)가
   여기 rateMult/effTap만 손대면 idle·HUD·탭에 일괄 반영됨. */
function milestoneMult(){                          // 달성한 수집 마일스톤 배율의 곱(cells식 랭크 돌파 점프)
  const c=learnedCount()+bodyCount();             // learnedCount/bodyCount는 아래에 선언(함수 호이스팅)
  let m=1; for(const ms of MILESTONES) if(c>=ms.at) m*=ms.mult; return m;
}
function nextMilestone(){                          // 다음 속도업까지 남은 수집 개수(다 넘었으면 null)
  const c=learnedCount()+bodyCount();
  for(const ms of MILESTONES) if(c<ms.at) return {need:ms.at-c, at:ms.at, mult:ms.mult};
  return null;
}
function rateMult(){ return milestoneMult(); }     // 전역 산출 배율(추후 프레스티지 배율도 여기 곱)
// 🆕 재회 폐기(2026-06-26): 옛 '초/걸음' 재회 곡선(achieveMult·REUNION_*·nodeSps·nodeOut·baseRate) 제거 — idle은 effRate()=1 고정.
// 🆕 경제 재설계(2026-06-22, economy-redesign.md): 걷기(idle)=1걸음/초 고정, 성장(number-go-up)은 '탭'으로 이동.
// 🆕 costN = 발견(걸음) 비용 지수 (2026-06-26 재회 제거판). 비용 = DISCOVER_COST_BASE × DISCOVER_COST_GROWTH^costN.
//   재회가 없으니 곡선은 순수 '모은 감정 수'(0~27)를 따라간다 — 감정 하나 끝낼 때마다 다음 발견이 한 단계 비싸진다.
//   잔잔 페이스(BASE 25·GROWTH 1.16): 첫 25걸음(~25초) … 막 ~1,187걸음(~20분) … 전체 ~8,500걸음(~2.4h idle). cap 불필요(27에서 끝).
function costN(){ return NODES.filter(n=>n.type==="person" && (S.levels[n.id]||0)>0).length; }  // 모은 감정 수(=발견 비용 지수)
// 탭 파워 = 1 + 모은 감정 수(+몸). 감정/몸 하나 얻을 때마다 +1(레벨 0/1). 무상한 → 후반 ~39/탭이라 몇 번만 눌러도 발견 비용을 순삭(탭 피로 0).
function tapPower(){ let p=1; for(const n of NODES){ if(n.gen && (S.levels[n.id]||0)>0) p++; } return p; }
function effRate(){ return 1; }                              // 걷기(idle) = 끝까지 고정 1걸음/초 (마일스톤·재회 idle가속 폐기)
function effTap(){ return Math.max(TAP_GAIN, tapPower()); }  // 탭 1번 기본 이득 = 탭 파워(콤보·크리는 addWalk에서 곱)


/* ===================== DOM ===================== */
const $ = s => document.querySelector(s);
const app=$("#app");
const map=$("#map"), canvas=$("#canvas"), world=$("#world"), edgesSvg=$("#edges"), robot=$("#robot");
const walkRobot=$("#walkRobot"), roadEl=$("#pageWalk .roadline");
const mindsky=$("#mindsky"), birdsEl=$("#birds"), gpropsEl=$("#gprops"), planesEl=$("#planes"), cloudsEl=$("#clouds");
const elWalks=$("#walks"), elRate=$("#rate");
const modal=$("#modal");

/* ---------- 줌 + 월드 좌표 (월드는 base 좌표, 화면 스케일은 CSS transform) ---------- */
let zoom = 0.85;
const ZMIN=0.22, ZMAX=4.0;
const baseSize = () => Math.max(map.clientWidth, map.clientHeight) * 2.9;  // 정사각 월드(방사형) — 넓게 펼쳐 노드 간격 확보
const px = n => ({ x: n.x*baseSize(), y: n.y*baseSize() });                 // 미스케일 월드 좌표
function sizeCanvas(){
  const s=baseSize();
  world.style.width=s+"px"; world.style.height=s+"px"; world.style.transform="scale("+zoom+")";
  canvas.style.width=(s*zoom)+"px"; canvas.style.height=(s*zoom)+"px";
}
function centerOn(id, smooth){
  const n=NODES.find(x=>x.id===id); if(!n) return; const p=px(n);
  map.scrollTo({ left:p.x*zoom-map.clientWidth/2, top:p.y*zoom-map.clientHeight/2, behavior:smooth?"smooth":"auto" });
}
// 네이티브 behavior:'smooth'가 막힌 환경(일부 모바일/자동화) 대비 — rAF로 직접 부드럽게 카메라 이동 + 살짝 줌인.
let panRAF=0;
const REVEAL_ZOOM=1.1;          // 발견 연출 줌. '최소 이 값까지'만 당김(누적 안 됨; 이미 더 크면 줌 유지하고 이동만)
function panTo(id, ms){
  const n=NODES.find(x=>x.id===id); if(!n) return;
  const z0=zoom, z1=Math.max(zoom, Math.min(ZMAX, REVEAL_ZOOM));   // 목표 줌(고정 상한 → 발견마다 누적 줌인 방지)
  const dur=ms||700, t0=performance.now();
  cancelAnimationFrame(panRAF);
  (function step(now){
    const k=Math.min(1,(now-t0)/dur), e=1-Math.pow(1-k,3);   // easeOutCubic
    zoom=z0+(z1-z0)*e; sizeCanvas();                          // 줌 보간(매 프레임 캔버스 재크기)
    const p=px(n);                                            // 노드는 줌 무관 논리좌표 → 현재 줌으로 중앙 정렬
    map.scrollLeft=Math.max(0, Math.min(map.scrollWidth-map.clientWidth,  p.x*zoom-map.clientWidth/2));
    map.scrollTop =Math.max(0, Math.min(map.scrollHeight-map.clientHeight, p.y*zoom-map.clientHeight/2));
    if(k<1) panRAF=requestAnimationFrame(step);
    else { const zl=document.getElementById('zlvl'); if(zl) zl.textContent=zoom.toFixed(1)+"×"; }   // 줌 표시 갱신
  })(t0);
}
function setZoom(z){
  const old=zoom;
  zoom = Math.max(ZMIN, Math.min(ZMAX, z));
  // 현재 보고 있는 화면 중심을 유지하며 줌 (S.current로 스냅하지 않음 = 자유로운 줌)
  const cx=(map.scrollLeft+map.clientWidth/2)/old, cy=(map.scrollTop+map.clientHeight/2)/old;
  sizeCanvas();
  map.scrollLeft = cx*zoom - map.clientWidth/2;
  map.scrollTop  = cy*zoom - map.clientHeight/2;
  const zl=document.getElementById('zlvl'); if(zl) zl.textContent = zoom.toFixed(1)+"×";
}

// 큰 수 표기 K/M/B/T… (미국 출시 대비 영문 단위). Dc 넘으면 지수표기로 폴백.
// 🆕 상한 = JS가 정확히 셀 수 있는 최대 정수(Number.MAX_SAFE_INTEGER = 9,007,199,254,740,991). 이 위로는 부동소수 정밀도가 깨진다.
const MAX_STEPS = Number.MAX_SAFE_INTEGER;
// 🆕 K/M/B 축약 폐기(2026-06-22 요청) — 끝까지 다 적되 천단위 콤마, 상한에서 멈춘다.
function fmt(n){
  n=Math.floor(n); if(!isFinite(n)||n>MAX_STEPS) n=MAX_STEPS; if(n<0) n=0;
  return n.toLocaleString('en-US');
}

/* ---------- 도달 가능 판정 ---------- */
function neighbors(id){
  const out=[];
  EDGES.forEach(([a,b,c])=>{ if(a===id) out.push([b,c]); if(b===id) out.push([a,c]); });
  return out;
}
// 지금까지 연 노드 수(start 제외) = 발견 '순번'. TAP_CURVE 인덱스로 쓴다.
function unlockedCount(){ let c=0; for(const n of NODES){ if(n.id!=="start" && S.levels[n.id]>0) c++; } return c; }
// 다음 발견의 목표 탭수(=목표 초). 순번이 곡선 길이를 넘으면 끝값(평탄).
function discoverTaps(){ const C=(typeof TAP_CURVE!=='undefined')?TAP_CURVE:[5,25,42,58,80]; return C[Math.min(unlockedCount(), C.length-1)]; }  // 가드: balance.js 버전 엇갈려 TAP_CURVE 없어도 throw 안 하고 폴백(지도 크래시 방지)
let DISCOVER_MULT = 1;   // 🆕 발견 비용 전체 배율(관리자 실시간 튜닝용 · 기본 1=무효). reachCost에 곱해 진행 속도 일괄 조절(세이브 무관·새로고침 원복).
// 🆕 발견 비용 '날값'(반올림·도달성 판정 전) = DISCOVER_COST_BASE × DISCOVER_COST_GROWTH^costN × DISCOVER_MULT.
//   재회 비용(balance.js upCost)도 이걸 기준으로 잡아 '재회 ≥ 발견'을 보장한다.
function discoverCostRaw(){ return DISCOVER_COST_BASE * Math.pow(DISCOVER_COST_GROWTH, costN()) * DISCOVER_MULT; }
function reachCost(id){ // 🆕 발견(이동) 비용 = 지수곡선(2026-06-24)
  // 도달 가능?: 완료된 이웃이 하나라도 있어야 연다(그래프 토폴로지 게이트). 없으면 무한.
  let reachable=false;
  for(const [nb] of neighbors(id)){ if(S.levels[nb]>0){ reachable=true; break; } }
  if(!reachable) return Infinity;
  // costN()(비용 지수, 상한 40 — 탭 파워와 별개). 모든 후보가 같은 costN → 비용 동일 → updateDiscovered '최소비용'은 NODES 순서.
  return Math.round(discoverCostRaw());
}
// 🆕 갈래 안 감정 = NODES 순서대로 1개씩 '순차 완성'(2026-06-26, 재회 폐기). 직전 형제 감정을 끝내야 다음이 열린다.
//   (옛 大中小 TIER + regionReunions 게이트 폐기 — 재회가 없으니 그걸로는 中·小가 영영 안 열려 클리어 불능이 됨.)
function prevPersonDone(n){
  const sibs = NODES.filter(x=>x.type==="person" && x.parent===n.parent);  // 같은 갈래 감정들(NODES 순서 = 의도된 공개 순서)
  const i = sibs.indexOf(n);
  if(i<=0) return true;                  // 갈래 첫 감정(대표) = 허브 완료 + 걸음이면 열림
  return S.levels[sibs[i-1].id]>0;       // 직전 형제 감정을 완료(끝)해야 이 감정이 열림
}
// 노드는 '걸음을 그 비용만큼 모은' 순간 처음 희미하게 발견된다(이후 계속 보임).
// 대분류 갈래 순서(긍정→강한자극→불안·불편→잔잔·시림) — 한 갈래를 '다 끝내야' 다음 갈래가 열린다(순차).
const CAT_ORDER = ["cat_pos","cat_intense","cat_unease","cat_calm"];
function categoryComplete(catId){                  // 그 갈래의 감정을 전부 수집했나
  const ps = NODES.filter(n=>n.type==="person" && n.parent===catId);
  return ps.length>0 && ps.every(n=>S.levels[n.id]>0);
}
function gateOk(n){                                 // 챕터 게이트
  if(n.type==="ending") return learnedCount()>=FRAG_TOTAL && bodyCount()>=BODY_TOTAL; // 샘 재회 = 마음27 + 몸11 둘 다
  if(n.type==="human")  return S.levels["becoming"]>0;                                // 샘을 만난 뒤에 사람
  if(n.type==="category"){                          // 대분류 허브: 긍정만 처음부터, 나머지는 '이전 갈래 완성' 후 해금(순차)
    const i=CAT_ORDER.indexOf(n.id);
    if(i<=0) return true;                           // 긍정(첫 갈래)은 항상 열림
    return categoryComplete(CAT_ORDER[i-1]);        // 이전 갈래를 다 끝내야 이 갈래가 열림
  }
  if(n.type==="person") return prevPersonDone(n);  // 🆕 갈래 안 순차 완성 — 직전 형제 감정을 끝내야 열림(TIER 폐기)
  if(n.type==="body") return false;   // 🆕 몸은 그래프에서 제거 — 자루(기억 약장)에서 온기로 구매(graph 발견 대상 아님)
  return true;
}
let focusQueue=null;                               // 새로 열린(발견된) 노드 — 다음 맵 틱에서 그곳으로 카메라 포커스
function updateDiscovered(){
  // 🔒 한 번에 하나씩: 아직 안 연(발견됐지만 미해제) 노드가 있으면 새로 더 열지 않는다.
  for(const n of NODES){ if(n.type==="body") continue; if(n.id!=="start" && !(S.levels[n.id]>0) && S.discovered[n.id]) return null; }   // 🆕 몸은 그래프 발견 대상 아님(자루 구매)
  // 다음 1개만 연다 = 도달가능 & 게이트OK & 미발견 중 '비용 최소'(순서대로).
  // ⚠️ 걸음 충족(walks≥cost)은 보지 않는다 — '열림'은 걸음이 채워져서가 아니라 '앞 노드가 해제돼 도달가능해진' 순간에 결정.
  let best=null, bestC=Infinity;
  for(const n of NODES){
    if(n.id==="start" || S.levels[n.id]>0 || S.discovered[n.id] || !gateOk(n)) continue;
    const c=reachCost(n.id);                        // Infinity = 부모 미완료(도달 불가)
    if(c!==Infinity && c<bestC){ bestC=c; best=n; }
  }
  if(best){ S.discovered[best.id]=true; focusQueue=best.id; return best.id; }
  return null;
}
function isRevealed(id){ return S.levels[id]>0 || !!S.discovered[id]; }
