/* ===== save-auth.js — index.html에서 분리(구조 분리 2026-06-22). 세이브·구글로그인·어드민.
   ⚠️ 전역 스크립트(모듈 아님) — 전역 스코프 공유, 로드 순서 = 원본 순서. sw.js CORE/정규식 등재. ===== */
/* ---------- 세이브 (localStorage 즉시 + 새 Supabase 키 넣으면 클라우드 동기화) ---------- */
const SAVE_KEY = "aingan_save_v1";   // localStorage 키 이름(레거시 — 바꾸면 기존 미러를 못 읽으니 고정)
const SAVE_VERSION = 3;              // 세이브 '데이터' 스키마 버전(SAVE_KEY와 별개). 필드/노드id/규칙을 바꾸면 +1 하고 migrate()에 변환 한 칸 추가. (v2: 비용곡선 개편 — 전 유저 1회 강제 리셋 / v3: ✨온기 조각 추가 — 추가형, 리셋 없음)
// 강철의 인간술사 전용 Supabase 프로젝트. publishable 키는 클라 공개용(안전·RLS 보호).
const SUPA = { url:"https://irpavlciywhjnigqsjxn.supabase.co", anon:"sb_publishable_SNr6tjf-JX5-4NhLBo8oEg_mNqoClDf" };

// 저장은 '로그인된 계정'에 대해서만. 비로그인(둘러보기)은 임시 플레이 — 익명 로컬/클라우드 db를 만들지 않는다.
function saveKey(){ return authUser ? ("u_"+authUser.id) : null; }

// 로봇이 스스로 짓는 이름 — 사람마다 다르게(첫 플레이에 랜덤, 세이브에 보관)
const ROBOT_NAMES=["삐삐","또르","깡통이","녹슬이","별이","콩이","또롱","삐릭","깡총","또또","모리","단추","나사","볼트","깜빡이","또각","삐약","동그리","네모","철이","구리","뚜뚜","링링","찌릿","오백","뽀삐","고철이","반짝","덜컹","깡깡"];
function ensureRobotName(){ if(!S.robotName) S.robotName = ROBOT_NAMES[Math.floor(Math.random()*ROBOT_NAMES.length)]; }

function snapshot(){ return { v:SAVE_VERSION, walks:S.walks, rate:S.rate, current:S.current, levels:S.levels, discovered:S.discovered, robotName:S.robotName, named:S.named, depth:S.depth, coins:S.coins, cycle:S.cycle, lookback:S.lookback, seenIntro:S.seenIntro, seenReunionHint:S.seenReunionHint, seenMapTut:S.seenMapTut, t:Date.now() }; }
function loadLocal(){ try{ const r=localStorage.getItem(SAVE_KEY); return r?JSON.parse(r):null; }catch(e){ return null; } }
// 옛 세이브를 현재 스키마로 끌어올린다. v 필드 없으면 버전 도입 이전(레거시) = v1로 간주.
// 스키마 바꿀 때: SAVE_VERSION +1 하고 아래 체인에 `if(v<N){ /* 변환 */ v=N; }` 한 칸 추가(순서대로 누적 적용).
function migrate(d){
  if(!d || typeof d!=="object") return d;
  let v = d.v || 1;
  if(v<2){ d = { v:2 };  v=2; }      // v2: 비용곡선(경제) 개편 → 기존 진행 전체 폐기, 처음부터. 진행 필드 제거 → applyState가 새 게임 기본값으로 채움(걸음0·레벨초기화·온보딩 재등장). t 빼서 오프라인 적립도 0.
  if(v<3){ v=3; }                    // v3: ✨온기 조각 추가 — 추가형(coins 없으면 applyState가 0). 리셋 없음.
  d.v = Math.min(v, SAVE_VERSION);   // 미래 버전 세이브(다운그레이드 케이스)는 현재로 클램프 → 알 수 없는 스키마로 크래시 방지
  return d;
}
function applyState(d){
  if(!d) return 0;
  d = migrate(d);                    // 적용 전 항상 현재 스키마로 정규화(loadLocal·supaLoad 양쪽 원시 데이터)
  S.rate   = d.rate || 1.0;
  S.current= NODES.find(n=>n.id===d.current) ? d.current : "start";
  NODES.forEach(n=>{ S.levels[n.id] = (d.levels && d.levels[n.id]>0) ? d.levels[n.id] : (n.completed?1:0); });
  S.discovered = d.discovered || {};
  S.walks  = d.walks || 0;
  if(d.robotName) S.robotName = d.robotName;
  S.named = !!d.named;
  S.depth = d.depth || 0; S.cycle = d.cycle || 0; S.lookback = d.lookback || 0;
  S.coins = d.coins || 0;            // ✨ 온기 조각(없는 옛 세이브=0)
  S.seenIntro = !!(d.seenIntro || d.named);   // 기존 이름지은 유저는 자동으로 '봤음' 처리(게이트 안 띄움)
  S.seenReunionHint = !!d.seenReunionHint;     // 재회 안내 1회 표시 플래그
  S.seenMapTut = !!d.seenMapTut;               // 🆕 지도 튜토리얼 1회 표시 플래그
  // 🆕 오프라인 = 1걸음/초(온라인 idle과 동일), 누적 상한 OFFLINE_CAP_STEPS(=1000걸음, 2026-06-24). economy-redesign.md
  let off=0; if(d.t){ const sec=Math.max(0,(Date.now()-d.t)/1000); off=Math.min(sec, OFFLINE_CAP_STEPS); S.walks+=off; }
  wholeWalks=Math.floor(S.walks);
  return off;
}
function saveState(){
  if(!authUser) return;                                  // 둘러보기(로그인 X)는 의도적으로 로컬에도 저장 안 함 — 익명=휘발, 로그인 유도(설계). CLAUDE.md 참고
  const d=snapshot();
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify(d)); }catch(e){}  // 빠른 부팅용 계정 미러(로그인 유저만)
  supaSave(d);
}
async function supaSave(d){ if(!authUser || !SUPA.url || !SUPA.anon) return;
  try{ await fetch(`${SUPA.url}/rest/v1/saves`, { method:"POST",
    headers:{ apikey:SUPA.anon, Authorization:"Bearer "+SUPA.anon, "Content-Type":"application/json", Prefer:"resolution=merge-duplicates" },
    body: JSON.stringify({ device_id:saveKey(), data:d, updated_at:new Date().toISOString() }) }); }catch(e){}
}
async function supaLoad(){ if(!authUser || !SUPA.url || !SUPA.anon) return null;
  try{ const r=await fetch(`${SUPA.url}/rest/v1/saves?device_id=eq.${encodeURIComponent(saveKey())}&select=data`,
    { headers:{ apikey:SUPA.anon, Authorization:"Bearer "+SUPA.anon } });
    const rows=await r.json(); return (rows&&rows[0])?rows[0].data:null; }catch(e){ return null; }
}
function resetState(){                                   // 메모리 상태를 새 게임으로 초기화
  S.walks=0; S.rate=1.0; S.current="start"; S.discovered={};
  NODES.forEach(n=>S.levels[n.id]= n.completed?1:0);
  S.robotName=""; S.named=false; S.depth=0; S.cycle=0; S.lookback=0; S.seenIntro=false; S.seenReunionHint=false; S.seenMapTut=false;
  wholeWalks=0; worldX=0;
}
function bootSave(){
  track("app_open",{seenIntro:!!S.seenIntro});         // 세션 시작(load당 1회). 로그인 판별은 별도 login 이벤트(여기선 auth 미해결)
  const off = applyState(loadLocal());                 // 직전 로그인 계정 미러가 있으면 즉시 반영(빠른 부팅)
  decideEntry();                                        // 게이트 / 온보딩 / 바로 게임 중 결정 (클라우드는 onAuthChanged가 처리)
  if(S.seenIntro && off>=1){ const h=$("#hint"); h.textContent=`당신이 없는 동안 ${fmt(Math.floor(off))}걸음이나 걸었어요`;   // 오프라인=1걸음/초·상한 1000걸음(OFFLINE_CAP_STEPS, 2026-06-24, economy-redesign.md)
    setTimeout(()=>{ h.textContent="이 길을 두드릴수록 로봇이 더 빨리 걷는다"; }, 5500); }
}
setInterval(saveState, 10000);
window.addEventListener("beforeunload", saveState);
document.addEventListener("visibilitychange", ()=>{ if(document.hidden) saveState(); });

/* ---------- 구글 로그인 (강철의 인간술사 전용 Supabase 프로젝트) ---------- */
let sb=null, authUser=null, lastKey=null;
function initAuth(){
  if(!window.supabase || !SUPA.url || !SUPA.anon){ renderAuth(); return; }
  try{ sb = window.supabase.createClient(SUPA.url, SUPA.anon, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } }); }  // 세션 유지(자동 로그인). 계정 전환은 '로그아웃 후 재로그인' 시 prompt:select_account로
  catch(e){ renderAuth(); return; }
  sb.auth.onAuthStateChange((_e,s)=>{ authUser = s?.user || null; renderAuth(); onAuthChanged(); });
  sb.auth.getSession().then(({data})=>{ authUser = data?.session?.user || null; renderAuth(); onAuthChanged(); });
}
async function googleLogin(){ if(sb) await sb.auth.signInWithOAuth({ provider:"google", options:{ redirectTo: location.origin+location.pathname, queryParams:{ prompt:"select_account" } } }); }  // 항상 구글 계정 선택창
async function logout(){
  try{ if(sb) await sb.auth.signOut(); }catch(e){}
  authUser=null; lastKey=null; isAdmin=false; renderAdminUI();   // 어드민 UI도 내림
  try{ localStorage.removeItem(SAVE_KEY); }catch(e){}   // 익명 로컬 기록 남기지 않음
  resetState();                                          // 메모리 초기화 → 옛 기록 안 보이게
  closeIntro(); closeModal && closeModal();
  renderAuth(); refreshHUD();
  showGate();                                            // 로그아웃 = 로그인(게이트) 화면으로
}
function renderAuth(){
  const b=document.getElementById('authBtn'); if(!b) return;
  if(authUser){ const md=authUser.user_metadata||{}; b.textContent="👤 "+(md.name||md.full_name||"로그인됨"); b.classList.add('on'); b.onclick=logout; }
  else { b.textContent="구글 로그인"; b.classList.remove('on'); b.onclick=googleLogin; }
}
function onAuthChanged(){
  if(!authUser){ return; }                                // 로그아웃은 logout()에서 게이트로 처리(익명 복원 안 함)
  checkAdmin();                                            // 어드민 여부 재확인(UI 토글) — 실제 권한은 RLS가 서버에서 강제
  const k=saveKey(); if(k===lastKey) return; lastKey=k;
  supaLoad().then(d=>{
    track("login",{returning:!!d});                     // 둘러보기→로그인 전환(세이브 정책 핵심 KPI)
    if(d){ applyState(d); S.seenIntro=true; dismissOnboarding(); closeGate(); }  // 계정에 세이브 있음 = 돌아온 유저 → 진행 중이던 온보딩도 걷어냄
    saveState();                                          // 신규 계정이면 현재 진행 업로드 / 복귀면 미러 갱신
    decideEntry(); refreshHUD(); if(curPage==="map") renderAll();
  });
}

/* ---------- 어드민 스캐폴딩 ----------
   ⚠️ 여기 isAdmin은 'UI 토글용'일 뿐. 실제 권한은 Supabase RLS(is_admin())가 서버에서 강제한다.
   ⚠️ 모든 어드민 DB 호출은 반드시 sb(supabase-js)로 — 유저 JWT가 붙어야 RLS에서 auth.uid()가 동작.
      (supaSave/supaLoad의 raw fetch는 anon 키라 auth.uid()=null → 어드민 판별 불가.)
   셋업: Supabase에 admins 테이블 + is_admin() 함수 + 보호테이블 RLS 정책. 무야호를 admins에 1행 insert. */
let isAdmin=false;
async function checkAdmin(){
  isAdmin=false;
  if(sb && authUser){
    try{ const {data,error}=await sb.rpc('is_admin'); if(!error) isAdmin=!!data; }catch(e){}
  }
  renderAdminUI();
}
function renderAdminUI(){
  const tab=document.getElementById('adminTab');
  if(tab) tab.style.display = isAdmin ? '' : 'none';          // 관리자 탭은 admin에게만 노출
  if(!isAdmin && curPage==='admin' && typeof showPage==='function') showPage('walk');  // 권한 사라지면 길로
}
// ── 관리자 탭 페이지 (#pageAdmin). isAdmin일 때만 탭 노출 · 모든 DB는 sb(JWT)+RLS ──
function aesc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function adminRenderPage(){
  const p=document.getElementById('pageAdmin'); if(!p) return;
  if(!p.dataset.built){
    p.innerHTML=
      '<div style="padding:16px 16px 80px;max-width:760px;margin:0 auto;width:100%;box-sizing:border-box;font:14px sans-serif;color:#5a4d34;overflow:auto;height:100%">'
        +'<b style="font-size:17px">🛠 관리자 콘솔</b>'
        +'<div id="adminMeta" style="font-size:12px;color:#9a7b4a;border-bottom:1px solid #e3dcc8;padding:8px 0 8px;margin-bottom:14px"></div>'
        +'<section style="margin-bottom:22px">'
          +'<h3 style="margin:0 0 8px;font-size:15px">🚀 감정 구간 이동 (테스트 워프)</h3>'
          +'<div style="font-size:12px;color:#9a7b4a;margin-bottom:8px">이름=그 구간으로 이동(그림 표시) · 💬=장면/대사 모달</div>'
          +'<div id="adminWarpList"></div>'
        +'</section>'
        +'<section style="margin-bottom:22px">'
          +'<h3 style="margin:0 0 8px;font-size:15px">💰 경제 튜닝 (실시간 · 세이브 무관)</h3>'
          +'<div style="font-size:12px;color:#9a7b4a;margin-bottom:8px">이 세션에서만 적용 · 새로고침 시 원복. (걷기=1걸음/초·탭 파워·콤보/크리는 구조상 고정 — balance.js에서만 조정)</div>'
          +'<div id="adminTuning"></div>'
        +'</section>'
        +'<section style="margin-bottom:22px">'
          +'<h3 style="margin:0 0 8px;font-size:15px">👤 유저 세이브 (개별 초기화)</h3>'
          +'<button type="button" id="admUsersLoad" style="border:1px solid #d8cdb6;border-radius:8px;background:#fff;padding:7px 12px;cursor:pointer;font:13px sans-serif;color:#5a4d34">유저 목록 불러오기</button>'
          +'<div id="adminUsersMsg" style="font-size:12px;color:#9a7b4a;margin:8px 0"></div>'
          +'<div id="adminUsers"></div>'
        +'</section>'
        +'<section style="margin-bottom:22px">'
          +'<h3 style="margin:0 0 8px;font-size:15px">🧪 테스트</h3>'
          +'<button type="button" id="admReplay" style="border:1px solid #d8cdb6;border-radius:8px;background:#fff;padding:7px 12px;cursor:pointer;font:13px sans-serif;color:#5a4d34">온보딩 다시보기 (비파괴)</button>'
          +'<div style="font-size:12px;color:#9a7b4a;margin-top:6px">샘 튜토리얼(깨우기→샘→이름→규칙)을 진행도 안 지우고 재생. 끝나면 원래 게임으로.</div>'
        +'</section>'
      +'</div>';
    p.querySelector('#admReplay').onclick=adminReplayOnboarding;
    p.querySelector('#admUsersLoad').onclick=adminLoadUsers;
    p.dataset.built='1';
  }
  adminRefreshMeta(); adminRenderWarps(); adminBuildTuning();
}
// ── 유저 세이브 개별 초기화 (sb=유저 JWT, RLS의 is_admin() 정책 필요) ──
function adminUsersMsg(t){ const m=document.getElementById('adminUsersMsg'); if(m) m.textContent=t; }
let _admNames={};                                            // 🆕 device_id → 유저명(로봇 이름) 맵 — 행 목록 로드 시 채움
function admName(id){ return _admNames[id] || '(이름 없음)'; }  // 🆕 확인창·상태메시지도 uuid 대신 유저명으로
async function adminLoadUsers(){
  const box=document.getElementById('adminUsers');
  if(!sb||!authUser){ adminUsersMsg('로그인 필요'); return; }
  adminUsersMsg('불러오는 중…');
  const {data,error}=await sb.from('saves').select('device_id,data,updated_at').order('updated_at',{ascending:false}).limit(100);
  if(error){ adminUsersMsg('오류(RLS admin select 필요?): '+error.message); if(box)box.innerHTML=''; return; }
  adminUsersMsg(`${data.length}명`);
  _admNames={}; data.forEach(r=>{ _admNames[r.device_id]=(r.data&&r.data.robotName)?r.data.robotName:'(이름 없음)'; });  // 🆕 id→이름
  const bs='border:1px solid #d8cdb6;border-radius:6px;background:#fff;padding:4px 8px;cursor:pointer;font:12px sans-serif;color:#5a4d34';
  box.innerHTML = (data.map(r=>{
    const w=(r.data&&r.data.walks!=null)?r.data.walks:'?', id=aesc(r.device_id);
    const nm=(r.data&&r.data.robotName)?aesc(r.data.robotName):'(이름 없음)';   // 🆕 UUID 대신 유저명(로봇 이름) — uuid는 식별용으로 title(호버)에만
    const cyc=(r.data&&r.data.cycle)?` · ${r.data.cycle}회차`:'';
    return '<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid #efeadd;font-size:12px">'
      +`<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${id}">${nm}<span style="color:#9a7b4a">${cyc}</span></span>`
      +`<span style="width:130px;text-align:right;font-variant-numeric:tabular-nums">${typeof w==='number'?fmt(w):w}</span>`
      +`<button type="button" data-w0="${id}" style="${bs}">걸음0</button>`
      +`<button type="button" data-wipe="${id}" style="${bs};color:#b04a3a;border-color:#e0b4a8">초기화</button>`
      +'</div>';
  }).join('')) || '<div style="font-size:12px;color:#9a7b4a">세이브 없음</div>';
  box.querySelectorAll('[data-w0]').forEach(b=> b.onclick=()=>adminResetWalks(b.dataset.w0));
  box.querySelectorAll('[data-wipe]').forEach(b=> b.onclick=()=>adminWipeUser(b.dataset.wipe));
}
async function adminResetWalks(id){   // 걸음만 0 (나머지 진행 보존)
  if(!sb) return;
  const sel=await sb.from('saves').select('data').eq('device_id',id).maybeSingle();
  if(sel.error||!sel.data){ adminUsersMsg('조회 실패'); return; }
  const nd=Object.assign({}, sel.data.data, { walks:0, t:Date.now() });
  const r=await sb.from('saves').update({ data:nd, updated_at:new Date().toISOString() }).eq('device_id',id);
  adminUsersMsg(r.error?('실패(RLS update?): '+r.error.message):('걸음 0 완료 · '+admName(id))); if(!r.error) adminLoadUsers();
}
async function adminWipeUser(id){     // 세이브 삭제 = 완전 초기화 (다음 접속 시 새 게임+온보딩)
  if(!confirm('이 유저 세이브를 완전 초기화(삭제)할까요?\n『'+admName(id)+'』\n\n다음 접속 시 새 게임+온보딩으로 시작됩니다.')) return;
  const r=await sb.from('saves').delete().eq('device_id',id);
  adminUsersMsg(r.error?('실패(RLS delete?): '+r.error.message):('초기화 완료 · '+admName(id))); if(!r.error) adminLoadUsers();
}
function adminReplayOnboarding(){   // 세이브/진행 안 건드리고 온보딩 재생(비파괴). forceOnboard로 샘 생략 가드 우회
  forceOnboard=true;
  dismissOnboarding();               // 진행 중이던 씬/모달 정리
  startWake();                       // 누운 로봇 → 깨우기 → 샘 → 이름 → 규칙 → 걷기 (showPage('walk')로 관리자 탭 벗어남)
}
async function adminRefreshMeta(){
  const m=document.getElementById('adminMeta'); if(!m) return;
  if(!sb||!authUser){ m.textContent='로그인 필요'; return; }
  let ia='?'; try{ const r=await sb.rpc('is_admin'); ia = r.error?('오류:'+r.error.message):String(r.data); }catch(e){ ia='호출실패'; }
  m.textContent = `로그인: ${authUser.email||'?'} · is_admin: ${ia}`;
}
// 감정 구간 목록(4대분류별 person 노드)을 버튼으로 렌더
function adminRenderWarps(){
  const box=document.getElementById('adminWarpList'); if(!box) return;
  let html='';
  NODES.filter(c=>c.type==='category').forEach(c=>{
    const kids=NODES.filter(n=>n.type==='person' && n.parent===c.id);
    if(!kids.length) return;
    html+=`<div style="margin:10px 0 4px;font-weight:700;color:#7a5f33">${aesc(c.icon||'')} ${aesc(c.name)}</div>`
      +'<div style="display:flex;flex-wrap:wrap;gap:6px">';
    kids.forEach(n=>{
      const nm=(PEOPLE[n.key]&&PEOPLE[n.key].name)||n.key;
      html+='<span style="display:inline-flex;border:1px solid #d8cdb6;border-radius:8px;overflow:hidden">'
        +`<button type="button" data-warp="${aesc(n.id)}" style="border:0;background:#fff;padding:6px 9px;cursor:pointer;font:13px sans-serif;color:#5a4d34">${aesc(nm)}</button>`
        +`<button type="button" data-scene="${aesc(n.id)}" title="장면/대사" style="border:0;border-left:1px solid #e3dcc8;background:#faf6ee;padding:6px 8px;cursor:pointer">💬</button>`
        +'</span>';
    });
    html+='</div>';
  });
  box.innerHTML=html;
  box.querySelectorAll('[data-warp]').forEach(b=> b.onclick=()=>adminWarp(b.dataset.warp,false));
  box.querySelectorAll('[data-scene]').forEach(b=> b.onclick=()=>adminWarp(b.dataset.scene,true));
}
// 워프: 그 노드를 현재로 두고 걷기 화면 → 그림 표시. withScene이면 첫만남 장면 모달도.
// ⚠️ 진행/세이브 무변경: discovered·levels 안 건드림(그림은 레벨 없이 뜨고, 모달은 firstMeet라 레벨 불필요).
function adminWarp(id, withScene){
  const n=NODES.find(x=>x.id===id); if(!n) return;
  previewNode=id; busyMeet=false;         // ⚠️ S.current는 안 건드림(지도 로봇 좌초 방지) — 그림만 미리보기
  showPage('walk');                       // renderSituFig가 previewNode 그림 표시
  if(withScene) setTimeout(()=>openNode(n,true), 80);   // 첫 만남 장면(상황+대사) 미리보기
}
// ── 경제 튜닝(실시간) — 현재 경제(걷기 1/초 고정·성장=탭)에 맞는 손잡이만. 세이브 무관·새로고침 원복 ──
// 옛 손잡이(재회 초/걸음·마일스톤·발견곡선)는 경제 재설계로 무력화돼 제거. 지금 실제로 먹는 2개만 남김.
let _balDefaults=null;
function adminBuildTuning(){
  const box=document.getElementById('adminTuning'); if(!box) return;
  if(!_balDefaults) _balDefaults={ up:UP_BASE.person, dm:DISCOVER_MULT };
  const row=(label,id,val,step,hint)=>'<label style="display:flex;align-items:center;gap:8px;margin:7px 0;font-size:13px">'
    +`<span style="width:150px;color:#7a5f33">${label}</span>`
    +`<input id="${id}" type="number" step="${step}" value="${val}" style="width:88px;padding:4px 6px;border:1px solid #d8cdb6;border-radius:6px">`
    +`<span style="font-size:11px;color:#9a7b4a">${hint||''}</span>`
    +'</label>';
  const btn='border:1px solid #d8cdb6;border-radius:8px;padding:7px 12px;cursor:pointer;font:13px sans-serif';
  box.innerHTML = row('🦶 발견 비용 ×배율','tuneDm',DISCOVER_MULT,0.1,'전체 진행 속도 · 1=기본, ↑느리게')
    + row('🔁 재회 첫 비용(걸음)','tuneUp',UP_BASE.person,1,'재회 1레벨 비용 · 이후 레벨마다 ×1.15')
    + `<div style="display:flex;gap:8px;margin-top:8px"><button type="button" id="tuneApply" style="${btn};background:#ece3d0;color:#5a4d34">적용</button>`
    + `<button type="button" id="tuneReset" style="${btn};background:#fff;color:#9a7b4a">기본값</button></div>`
    + '<div id="tuneMsg" style="font-size:12px;color:#9a7b4a;margin-top:6px"></div>';
  box.querySelector('#tuneApply').onclick=adminApplyTuning;
  box.querySelector('#tuneReset').onclick=adminResetTuning;
}
function adminApplyTuning(){
  const dm=parseFloat(document.getElementById('tuneDm').value);
  const up=parseFloat(document.getElementById('tuneUp').value);
  if(dm>0) DISCOVER_MULT=dm;
  if(up>0) UP_BASE.person=up;
  if(typeof refreshHUD==='function') refreshHUD();
  if(typeof renderAll==='function' && typeof curPage!=='undefined' && curPage==='map') renderAll();  // 발견 비용 바뀌면 지도 도달표시 갱신
  const m=document.getElementById('tuneMsg'); if(m) m.textContent='적용됨 (이 세션만 · 새로고침 시 원복)';
}
function adminResetTuning(){
  if(_balDefaults){ UP_BASE.person=_balDefaults.up; DISCOVER_MULT=_balDefaults.dm; }
  if(typeof refreshHUD==='function') refreshHUD();
  if(typeof renderAll==='function' && typeof curPage!=='undefined' && curPage==='map') renderAll();
  adminBuildTuning();
  const m=document.getElementById('tuneMsg'); if(m) m.textContent='기본값 복원';
}
