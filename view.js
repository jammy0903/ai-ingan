/* ===== view.js — index.html에서 분리(구조 분리 2026-06-22). 렌더·자루·figure·이동만남·모달·엔딩·프레스티지·탭·하늘·syslog.
   ⚠️ 전역 스크립트(모듈 아님) — 전역 스코프 공유, 로드 순서 = 원본 순서. sw.js CORE/정규식 등재. ===== */
/* ---------- 렌더 ---------- */
function renderEdges(){
  edgesSvg.innerHTML="";
  const W=canvas.clientWidth;
  EDGES.forEach(([a,b])=>{
    const na=NODES.find(n=>n.id===a), nb=NODES.find(n=>n.id===b);
    if((na&&na.type==="body")||(nb&&nb.type==="body")) return;   // 🆕 몸 엣지 숨김(그래프에서 제거)
    const pa=px(na), pb=px(nb);
    if(!(isRevealed(a)&&isRevealed(b))) return;
    const live = S.levels[a]>0 && S.levels[b]>0;
    const ln=document.createElementNS("http://www.w3.org/2000/svg","line");
    ln.setAttribute("x1",pa.x);ln.setAttribute("y1",pa.y);
    ln.setAttribute("x2",pb.x);ln.setAttribute("y2",pb.y);
    if(live) ln.classList.add("live");
    edgesSvg.appendChild(ln);
  });
  // 연관/반대(시각 전용): 양 끝이 모두 드러났고 같은 갈래 필터일 때만 — 이동/발견엔 영향 없음
  REL_EDGES.forEach(([a,b,t])=>{
    const na=NODES.find(n=>n.id===a), nb=NODES.find(n=>n.id===b);
    if(!na||!nb) return;
    if(!(isRevealed(a)&&isRevealed(b))) return;
    const pa=px(na), pb=px(nb);
    const ln=document.createElementNS("http://www.w3.org/2000/svg","line");
    ln.setAttribute("x1",pa.x);ln.setAttribute("y1",pa.y);
    ln.setAttribute("x2",pb.x);ln.setAttribute("y2",pb.y);
    ln.classList.add("rel", t);
    edgesSvg.appendChild(ln);
  });
}
function renderNodes(){
  // ⚠️ 발견(updateDiscovered)은 여기서 안 한다 — 렌더는 '현재 발견된 것'만 그림.
  //    발견은 idle 틱에서만(모달 닫은 뒤에). 안 그러면 해금 직후 renderAll에서 다음 노드가 미리 생겨버림.
  document.querySelectorAll(".node").forEach(e=>e.remove());
  NODES.forEach(n=>{
    if(n.type==="body") return;   // 🆕 몸은 그래프에 안 그림(자루에서 온기로 구매)
    if(!isRevealed(n.id)) return;
    const p=px(n), lv=S.levels[n.id], done=lv>0;
    const el=document.createElement("div");
    el.className="node "+n.type+(done?" done":(n.type!=="teaser"?" reachable":" empty"));
    if(n.type==="teaser") el.className="node teaser empty";
    el.dataset.id=n.id;
    el.style.left=p.x+"px"; el.style.top=p.y+"px";
    let name = n.type==="person"?PEOPLE[n.key].name
             : n.type==="body"?BODY[n.key].name
             : n.type==="category"?n.name
             : (n.type==="start"?"시작" : n.type==="ending"?"샘알트머스크" : n.type==="human"?"사람" : "…");
    const reach = !done && n.type!=="teaser";
    const cost = reach ? reachCost(n.id) : null;
    el.innerHTML =
      `<div class="ring"><span class="ic">${n.type==="teaser"?"?":n.icon}</span></div>`+
      `<div class="label">${n.type==="teaser"?"안갯속 무언가":name}</div>`+
      (reach?`<div class="cost">${fmt(cost)} 걸음</div>`:"");
    if(reach) el.onclick = ()=>tryUnlock(n);
    else if(done && n.type==="person") el.onclick = ()=>meetNode(n,false);   // 🆕 완료 감정 클릭 = 다시 읽기(회상). 재회 폐기.
    world.appendChild(el);
  });
}
function safeCurrentId(){   // 좌초 복구용: 가장 깊이 진행한(레벨 높은) '보이는' 노드, 없으면 start
  let best="start", bl=-1;
  for(const n of NODES){ if(isRevealed(n.id) && (S.levels[n.id]||0)>bl){ bl=S.levels[n.id]||0; best=n.id; } }
  return best;
}
function placeRobot(animate){
  if(!NODES.find(x=>x.id===S.current) || !isRevealed(S.current)) S.current=safeCurrentId();  // 안 보이는 노드(워프 잔재 등)면 진행한 노드로 스냅
  const n=NODES.find(x=>x.id===S.current), p=px(n);
  robot.style.left=p.x+"px"; robot.style.top=p.y+"px";
}

/* ---------- 자루(인벤토리) — 기억 약장: 감정=유리병, 로봇 오류코드 라벨 ---------- */
function openSack(){
  const ERR={
    adore:"잔열",  joy:"거품",    amuse:"루프",  flutter:"노이즈", curious:"스캔",
    beauty:"포화", admire:"정지", awe:"공명",    trance:"불능",    satisfy:"자진단",
    bored:"유휴",  horror:"냉각", fear:"위협",   confuse:"불명",   anxiety:"잡음",
    disgust:"오염",awkward:"발열",
    excite:"과속", relief:"정압", attract:"인력",crave:"부족",     triumph:"달성",
    sorrow:"누수", empathy:"보호",longing:"구형",compassion:"공감",calm:"대기",
    skin:"외피",bone:"골격",muscle:"구동",nerve:"전선",endocrine:"화학",
    heart:"펌프",lymph:"면역",lung:"통기",stomach:"분해",kidney:"정수",repro:"복제"
  };
  const btl=(n,data)=>{
    const ok=S.levels[n.id]>0, c=data.color;
    return `<div class="btl ${ok?'filled':'empty'}" title="${data.name}">
      <div class="btl-cork"></div>
      <div class="btl-neck" style="${ok?`border-color:${c}50`:''}" ></div>
      <div class="btl-body"  style="${ok?`background:${c}`:''}"></div>
      <div class="btl-lbl">${ERR[n.key]||'??'}</div>
    </div>`;
  };
  const persons=NODES.filter(n=>n.type==="person");
  const bodyNodes=NODES.filter(n=>n.type==="body");
  const got=persons.filter(n=>S.levels[n.id]>0);
  const gotB=bodyNodes.filter(n=>S.levels[n.id]>0);
  $("#sackCount").textContent=`[오류 ${got.length}/${FRAG_TOTAL}건 수집됨]`+(gotB.length?` · 신체 ${gotB.length}/${BODY_TOTAL}`:"");
  const CATS=[
    {id:"cat_pos",    label:"ERR-L1  /  기쁨류"},
    {id:"cat_intense",label:"ERR-L2  /  강렬류"},
    {id:"cat_unease", label:"ERR-L3  /  불안류"},
    {id:"cat_calm",   label:"ERR-L4  /  잔잔류"},
  ];
  let html="";
  CATS.forEach(cat=>{
    const ns=persons.filter(n=>n.parent===cat.id);
    if(!ns.length) return;
    html+=`<div class="sackshelf"><div class="sackcat">${cat.label}</div><div class="sackbottles">${ns.map(n=>btl(n,PEOPLE[n.key])).join("")}</div></div>`;
  });
  // 🆕 몸 구매는 자루에서 빼 전용 「🫀 몸」 탭으로 이동(2026-06-26). 자루 = 감정 수집 진열만.
  $("#sackBody").innerHTML=html||`<div class="sackempty">약장이 비어 있다.<br><span style="font-size:11px;opacity:.5">길에서 만나야 채워진다</span></div>`;
  renderSackEx();                       // ✨온기 → 걸음 환전 바 갱신
  $("#sackModal").classList.add("show");
}
function closeSack(){ $("#sackModal").classList.remove("show"); }
$("#sack").addEventListener("pointerdown", e=>e.stopPropagation());          // 자루 탭이 걷기로 새지 않게
$("#sack").addEventListener("click", e=>{ e.stopPropagation(); openSack(); });
$("#sackClose").addEventListener("click", closeSack);
$("#sackModal").addEventListener("click", e=>{ if(e.target.id==="sackModal") closeSack(); });

/* ---------- 상황 figure: 길 위 그 노드의 장면(동물/사람). 노드/재회마다 스르륵 교체 ---------- */
const FIGS = (function(){
  // 감정27 수채화 일러스트(art/emo/<id>.webp) — 노드 도착/재회 시 #situFig에 표시.
  // 각 값은 배열(레벨별 변형 슬롯 호환); 현재는 감정당 1장.
  const im = id => [`<img class="emoFig-${id}" src="art/emo/${id}.webp" alt="">`];
  const KEYS = ["adore","beauty","admire","attract","joy","amuse","excite","flutter",
    "curious","awe","relief","crave","triumph","fear","anxiety","awkward","disgust",
    "horror","confuse","bored","sorrow","empathy","longing","compassion","calm","satisfy","trance"];
  const o={}; KEYS.forEach(k=>o[k]=im(k)); return o;
})();
let _figT=null, previewNode=null;   // previewNode = 관리자 워프 미리보기(그림만, S.current 안 건드림 → 지도 로봇 좌초 방지)
function renderSituFig(){
  const el=document.getElementById('situFig'); if(!el) return;
  const cid=previewNode||S.current;
  const n=NODES.find(x=>x.id===cid);
  const key=(curPage==="walk" && n && n.type==="person" && FIGS[n.key]) ? n.key : null;
  const lv=Math.max(1,(S.levels[cid]||1));
  const sig=key ? (key+':'+((lv-1)%FIGS[key].length)) : '';
  if(sig===el.dataset.sig) return;                 // 안 바뀌면 무시
  el.dataset.sig=sig;
  el.classList.remove('show');                     // 스르륵 사라짐
  clearTimeout(_figT);
  _figT=setTimeout(()=>{
    el.innerHTML = key ? FIGS[key][(lv-1)%FIGS[key].length] : '';
    if(key) requestAnimationFrame(()=>el.classList.add('show'));   // 스르륵 새로 등장
  }, 460);
}

function refreshHUD(){
  elWalks.textContent=fmt(S.walks);
  elRate.textContent = fmt(effTap());   // 🆕 탭 파워(걷기는 1/초 고정 → 탭 힘을 노출). economy-redesign.md
  const rn=document.getElementById('robotName');
  if(rn) rn.textContent = (S.robotName?("· "+S.robotName):"") + (S.cycle>0?` · ${S.cycle}회차`:"") + (S.robotName?" ✎":"");
  const ds=document.getElementById('depthStat');
  if(ds){ if(S.depth>0 || S.cycle>0){ ds.style.display=""; document.getElementById('mdepth').textContent=S.depth; } else ds.style.display="none"; }
  const persons = NODES.filter(n=>n.type==="person");
  const learned = persons.filter(n=>S.levels[n.id]>0).length;   // --p(마음 온도=코어 채움) = 배운 감정 종류 / 전체. %숫자 표시는 제거, 코어 페이오프 변수는 유지
  const p = persons.length ? learned/persons.length : 0;
  app.style.setProperty("--p",p);   // 두 로봇 공유(상속) — 빈 코어→하트 채움(엔딩 페이오프)
  renderSituFig();                  // 노드/재회 바뀌면 상황 figure 교체(sig 가드로 변화 시에만)
  app.classList.toggle("coreEmpty", learned===0);   // 첫 감정 전엔 가슴 코어 = 빈 구멍(결핍). 첫 조각부터 --p가 채움
  updateBodyTabDot();               // 🆕 온기가 차면 「몸」 탭에 점(살 수 있는 부위 알림)
  renderMind();
}
// 하늘엔 진행도(감정/몸 조각 수)만 — 감정 이름 나열은 하지 않는다(하늘은 로그용 비움)
function renderMind(){
  const emo=learnedCount(), bodyN=bodyCount();
  const emoDone=emo>=FRAG_TOTAL, bodyDone=bodyN>=BODY_TOTAL;
  // 🆕 마일스톤(속도업) 폐기(economy-redesign.md) — idle 1/초 고정. '다음 속도업까지'는 숨김.
  const nus=$("#mapNextUp"); if(nus) nus.style.display='none';
  // 조각 수(🧩/🫀)는 상단 바(#fragStat, 옛 마음온도 자리)로 이동 — 항상 보이게(요청)
  const fe=$("#fragEmo"), fb=$("#fragBody"), fs=$("#fragStat");
  if(fe) fe.textContent=emo;
  if(fb) fb.textContent=bodyN;
  if(fs) fs.classList.toggle("done", emoDone&&bodyDone);   // 둘 다 모으면 살짝 강조(색)
  const cn=$("#coinN"); if(cn) cn.textContent=fmt(S.coins||0);                            // ✨ 온기 조각
  const ab=$("#adCoinBtn"); if(ab) ab.style.display=(Ads.ready()||window._adSim)?"":"none"; // 광고 연결 전엔 숨김
  // 하늘(mindsky)엔 현재 속도배율 뱃지만(카운터는 상단 바로, 다음 속도업까지도 상단 바로)
  mindsky.innerHTML = '';   // 🆕 속도배율 뱃지 폐기(idle 1/초 고정)
}
function renderAll(){ sizeCanvas(); renderEdges(); renderNodes(); placeRobot(); refreshHUD(); }


/* ---------- 이동 + 만남 ---------- */
let busyMeet=false;   // 만남 진행 중(이동 시작 ~ 모달 닫을 때까지) — 그동안 다음 노드 발견·포커스 보류
function travelTo(n, cb){
  busyMeet=true; previewNode=null;      // 실제 이동 = 워프 미리보기 해제 / 도착~모달 갭에 다음 노드 미생성
  S.current=n.id; placeRobot(true);
  centerOn(n.id, true);
  setTimeout(cb, 1100);
}
// 노드와의 만남/재회 단일 진입점 — openNode의 암묵 계약(로봇이 그 노드에 도착해 있음)을 강제한다.
// 멀리 있으면 걸어가서(travelTo) 열고, 이미 그 노드 위면 즉시(v1.0.18 재회 즉시반응) 연다.
// ⚠️ openNode를 노드 클릭으로 직접 부르지 말 것 — 로봇 위치와 모달이 어긋난다. 반드시 이 함수를 거쳐라.
function meetNode(n, firstMeet){
  if(S.current===n.id) openNode(n, firstMeet);
  else travelTo(n, ()=>openNode(n, firstMeet));
}
function tryUnlock(n){
  const cost=reachCost(n.id);
  if(S.walks < cost){ nudge(`걸음이 ${fmt(cost-Math.floor(S.walks))} 더 필요해`); return; }
  S.walks -= cost; syncSteps();
  travelTo(n, ()=>{
    S.levels[n.id]=1; spark(); sfxMeet();   // rate는 baseRate()가 levels에서 계산(누적 안 함) / 게임필: 만남 차임
    if(n.type==="person"){ const lc=learnedCount(); track("meeting",{key:n.key, count:lc, anon:_anon()}); if(lc===1) track("first_emotion",{anon:_anon()}); awardCoins(1, "emotion:"+n.key); }  // 활성화 북극성(로그인 코호트만) + ✨온기 +1(감정 하나 열 때마다)
    else if(n.type==="body"){ track("body_meet",{key:n.key, count:bodyCount(), anon:_anon()}); }
    trackMilestone();
    renderAll();                       // 자리를 '열림(done)' 상태로 먼저 그리고
    flashNode(n);                      // 그 자리가 한 번 반짝 → 열렸다는 신호
    const pp = n.type==="person" && PEOPLE[n.key];
    if(pp && pp.pick){                 // 감정 첫 만남 = 글자 조각 줍기·오독 → 그 뒤 모달(정정)
      setTimeout(()=>pickFx(n, ()=>openNode(n,true)), 560);
    } else {
      setTimeout(()=>openNode(n,true), 720);  // 반짝임을 본 뒤 모달
    }
  });
}
// 첫 도착 글자 조각 줍기 연출: 조각(📃)이 떠오르고 로봇이 오독(pick)한다 → cb로 모달(정정)
function pickFx(n, cb){
  const pp=PEOPLE[n.key], txt=pp&&pp.pick;
  if(!txt){ cb&&cb(); return; }
  const el=document.querySelector(`.node[data-id="${n.id}"]`);
  const r=el?el.getBoundingClientRect():{left:innerWidth/2,top:innerHeight*0.5,width:0,height:0};
  const cx=r.left+r.width/2, cy=r.top+r.height/2;
  const frag=document.createElement("div"); frag.className="pickFrag"; frag.textContent="📃";
  frag.style.left=cx+"px"; frag.style.top=cy+"px"; document.body.appendChild(frag);
  const cap=document.createElement("div"); cap.className="pickCap"; cap.textContent=txt;
  cap.style.left=cx+"px"; cap.style.top=(cy-46)+"px"; document.body.appendChild(cap);
  requestAnimationFrame(()=>frag.classList.add("in"));
  setTimeout(()=>cap.classList.add("in"), 260);          // 조각 떠오른 뒤 오독 말풍선
  setTimeout(()=>{ cap.classList.add("out"); frag.classList.add("out"); }, 1650);
  setTimeout(()=>{ cap.remove(); frag.remove(); cb&&cb(); }, 2050);
}
// 막 도착해 열린 노드 자리를 한 번 반짝이게(모달 뜨기 전 인식)
function flashNode(n){
  const el=document.querySelector(`.node[data-id="${n.id}"]`);
  if(!el) return;
  el.classList.add("flash");
  setTimeout(()=>el.classList.remove("flash"), 900);
}
function learnedCount(){ return NODES.filter(n=>n.type==="person" && S.levels[n.id]>0).length; }
function bodyCount(){ return NODES.filter(n=>n.type==="body" && S.levels[n.id]>0).length; }
const FRAG_TOTAL = 27;   // 인간 감정 27가지 (Cowen & Keltner, 2017)
const BODY_TOTAL = 11;   // 인체 11 기관계
const OFFLINE_CAP_STEPS = 1000;    // 🆕 오프라인 적립 누적 상한(걸음). idle 1/초 → 최대 ~16.7분치 (2026-06-24 1만→1천, 접속 유도 강화). (추후 balance.js로 이동 예정 — Stage 2)

// 목적격 조사 을/를 — 마지막 글자 받침 유무로 결정 ("애틋함을", "재미를")
function objParticle(word){
  if(!word) return "을";
  const c=word.charCodeAt(word.length-1);
  if(c<0xAC00 || c>0xD7A3) return "을";
  return ((c-0xAC00)%28)!==0 ? "을" : "를";
}
function openNode(n, firstMeet){
  busyMeet=false;   // 모달이 떴다 = 만남 도착 완료(closeModal 안 거치는 엔딩/허브 케이스 안전망)
  if(n.type==="ending" || n.type==="human"){   // 샘 재회 + 반전 = 한 편의 시네마틱(끝나면 프레스티지)
    startEnding();
    return;
  }
  if(n.type==="category"){          // 대분류 허브 — 이야기 없이, 갈래가 펼쳐졌다는 신호만
    fillModal({ badge:"마음의 갈래에 닿다", emo:`〈 ${n.name} 〉`, lv:"", situ:"",
      log: n.intro || "여기서 마음의 갈래가 펼쳐진다.",
      reward:["🌿 새 갈래가 열렸다", `🌫️ ${n.name}의 감정들이 안갯속에서 드러난다`], closeText:"감정을 만나러" });
    return;
  }
  // 🆕 몸(body)은 그래프에서 빠져 자루 상점에서만 처리(buyBody→bodyStoryModal) — openNode로는 안 옴(옛 단련 분기 제거).
  {
    const pp=PEOPLE[n.key];
    if(typeof tutActive==='undefined' || !tutActive) bgmTo(EMO_BGM[n.key]||"main");   // 이 감정의 곡으로 전환(없으면 main) — 다음 감정 만날 때까지 이어짐. ⚠️ 튜토리얼 중엔 바탕음악(main) 고정(전환 안 함)
    // 🆕 순차 완성(2026-06-26, 재회 폐기): 만나면 5단 이야기(관찰→자기→심화→더 깊은 자기→순진한 재정의)를
    //   한 자리에서 페이지로 쭉 보고 → 마지막에 해금. 이야기가 안 끊긴다(힐링 톤). 레벨은 0/1뿐(재회 없음).
    const lines = pp.lines;
    // 마지막(해금) 페이지: "○○을 알게 됐다" + 곱씹기(mem) + 4중 보상
    const unlockPage = ()=> fillModal({
      badge:"새로운 마음, 해금",
      emo:`『 ${pp.name} 』`, lv:`${objParticle(pp.name)} 알게 됐다`, situ:"",
      log: pp.mem,
      reward:[`🧩 감정조각 +1 (${learnedCount()}/${FRAG_TOTAL})`,`🎨 회색 세계에 ${pp.name}의 색이 번진다`,`🧩 마음이 한 조각 또렷해진다`],
      closeText:"다음 길로" });
    // 다시 찾은 감정(완료 노드 클릭): 새 보상 없이 5단을 다시 읽고 곱씹는다(힐링 재방문)
    const recapPage = ()=> fillModal({
      badge:"이미 마음에 담은 감정", emo:`『 ${pp.name} 』`, lv:"다시 마음에 담는다", situ:"",
      log: pp.mem, reward:[`💭 ${(pp.mem||'').replace(/\n/g,' ')}`], closeText:"다음 길로" });
    const last = firstMeet ? unlockPage : recapPage;
    // 이야기 페이지 i(0..len-1) → 다음 페이지, 마지막이면 해금/회상
    const page = (i)=> fillModal({
      badge: i===0?"하나의 감정을 만나다":"…",
      emo:`『 ${pp.name} 』`, lv:(i===0 && firstMeet)?`⚡ 탭 +1`:"",
      situ: i===0?pp.situ:"", log: lines[i], closeText:"…",
      next: (i<lines.length-1) ? ()=>page(i+1) : last });
    page(0);
    return;
  }
}
// 🆕 재회 폐기(2026-06-26): showPrevLines/nextUpLabel/upgrade 제거 — 만남이 5단 한 번에 끝나 '이전 대사'·'재회 레벨업'이 불필요.

/* ✨ 온기 조각 — 통화 코어. 획득: 감정 해금 +1(감정 27=27코인) · 광고 +10. 소비처 = 몸 11 구매(합 25). (2026-06-26 재회 코인 폐기) */
function awardCoins(amount, reason){
  amount=Math.floor(amount)||0; if(amount<=0) return;
  S.coins=(S.coins||0)+amount;
  track("coins_earn",{amount, reason:reason||"", total:S.coins, anon:_anon()});
  saveState();
  const cn=document.getElementById("coinN");
  if(cn){ cn.textContent=fmt(S.coins); const st=document.getElementById("coinStat"); if(st){ st.classList.remove("pulse"); void st.offsetWidth; st.classList.add("pulse"); } }
  coinPop(amount);
}
// 광고 보상 → ✨온기 +10. provider 미연결이면 Ads.ready()=false라 버튼이 안 보임(§4: 광고는 가속만, 게이트 X).
function watchAdForCoins(){
  if(!(Ads.ready()||window._adSim)) return;
  Ads.showRewarded("coins10").then(r=>{ if(r&&r.rewarded) awardCoins(10,"ad"); });
}
window.watchAdForCoins=watchAdForCoins;
const _adCoinBtn=document.getElementById("adCoinBtn"); if(_adCoinBtn) _adCoinBtn.onclick=watchAdForCoins;
// 작은 ✨+N 떠오름(코인 자리 근처)
function coinPop(n){
  const st=document.getElementById("coinStat"); if(!st) return;
  const r=st.getBoundingClientRect();
  const el=document.createElement("div"); el.className="coinpop"; el.textContent="✨+"+fmt(n);
  el.style.left=(r.left+r.width/2)+"px"; el.style.top=(r.bottom-2)+"px";
  document.body.appendChild(el);
  requestAnimationFrame(()=>el.classList.add("go"));
  setTimeout(()=>el.remove(), 1000);
}
/* ✨온기 → 🦶걸음 환전 (자루 안). 1온기 = 100걸음. (튜닝값 — 추후 balance.js 이전 가능) */
const COIN_TO_STEPS = 100;
function convertCoins(amount){
  amount=Math.min(Math.floor(amount)||0, S.coins||0); if(amount<1) return;
  S.coins-=amount; S.walks+=amount*COIN_TO_STEPS;
  syncSteps(); saveState();
  track("coins_convert",{amount, steps:amount*COIN_TO_STEPS, anon:_anon()});
  renderSackEx(); refreshHUD();
  nudge(`✨${fmt(amount)} → 🦶${fmt(amount*COIN_TO_STEPS)} 걸음`);
}
function renderSackEx(){
  const el=document.getElementById("sackEx"); if(!el) return;
  const c=S.coins||0;
  el.innerHTML =
    `<div class="sackexbal">✨ <b>${fmt(c)}</b> 온기 <span class="sackexdot">·</span> 🦶 <b>${fmt(S.walks)}</b> 걸음</div>`+
    `<div class="sackexrow"><span class="sackexarrow">1✨ → ${COIN_TO_STEPS}걸음</span>`+
    `<button class="sackexbtn" id="sackEx1" ${c<1?"disabled":""}>1개 바꾸기</button>`+
    `<button class="sackexbtn" id="sackExAll" ${c<1?"disabled":""}>전부</button></div>`;
  const b1=document.getElementById("sackEx1"), ba=document.getElementById("sackExAll");
  if(b1) b1.onclick=()=>convertCoins(1);
  if(ba) ba.onclick=()=>convertCoins(S.coins);
}

/* 🆕 몸 온기 상점 = 전용 「🫀 몸」 탭(2026-06-26). 감정과 '병렬' — 온기가 차는 대로 중간중간 구매(27 잠금 없음).
   살 수 있는(온기≥값·미보유) 부위는 반짝(.buyable) + 탭에 점(bodyTabDot). 구매=그 몸 5단 이야기 한 번에. */
function bodyBuyCost(key){ const i=BODY_ORDER.indexOf(key); return (i>=0 && BODY_BUY[i]!=null)?BODY_BUY[i]:3; }   // 구매 온기
function bodyAffordable(){ return BODY_ORDER.some(k=>!(S.levels[k]>0) && (S.coins||0)>=bodyBuyCost(k)); }  // 지금 살 수 있는 미보유 부위가 있나(탭 점·하이라이트)
function renderBodyPage(){
  const box=document.getElementById("pageBody"); if(!box) return;
  const rows = BODY_ORDER.map(key=>{
    const bd=BODY[key], node=NODES.find(n=>n.id===key), icon=node?node.icon:"🫀";
    const has=(S.levels[key]||0)>0;
    const cost=bodyBuyCost(key);
    const can=!has && (S.coins||0)>=cost;
    return `<div class="bshoprow${has?' has':''}${can?' buyable':''}">`
      +`<span class="bshopname">${icon} ${bd.name}</span>`
      +`<span class="bshoplv">${has?'✓ 담음':(can?'✨ 살 수 있어!':'—')}</span>`
      +`<button class="bshopbtn" data-body="${key}" ${(has||!can)?'disabled':''}>${has?'담음 ✓':('구매 ✨'+cost)}</button>`
      +`</div>`;
  }).join("");
  box.innerHTML = `<div class="bodypage">`
    +`<div class="bodyhead">🫀 몸 만들기 · <b>${bodyCount()}/${BODY_TOTAL}</b> <span class="bodycoin">✨ ${fmt(S.coins||0)}</span></div>`
    +`<div class="bodyhint">감정을 만나면 ✨온기가 모여요. 온기로 몸을 한 부분씩 — <b>감정과 동시에, 중간중간</b> 만들 수 있어요. 살 수 있으면 ✨반짝!</div>`
    +`<div class="bodylist">${rows}</div>`
    +`<div class="bodyfoot">마음 27 + 몸 11을 다 채우면 길 끝에서 샘을 만나요.</div>`
    +`</div>`;
  box.querySelectorAll("[data-body]").forEach(b=> b.onclick=()=>buyBody(b.dataset.body));
}
function updateBodyTabDot(){   // 탭에 '살 수 있는 몸 있음' 점 표시(중간중간 구매 유도)
  const dot=document.getElementById("bodyTabDot"); if(!dot) return;
  dot.style.display = (bodyAffordable() && bodyCount()<BODY_TOTAL) ? "" : "none";
}
function bodyStoryModal(key){   // 구매 직후 그 몸의 5단 이야기를 한 자리에서 쭉 → 얻음(마지막 페이지에 보상)
  const bd=BODY[key], lines=bd.lines, last=lines.length-1;
  const page=(i)=> fillModal({
    badge: i===0?"몸의 한 부분을 얻다":(i===last?"몸이 단단해졌다":"…"),
    emo:`〔 ${bd.name} 〕`, lv:(i===0?`⚡ 탭 +1`:""),
    situ:i===0?bd.situ:"", log:lines[i],
    reward:(i===last)?[`🫀 몸조각 +1 (${bodyCount()}/${BODY_TOTAL})`,`⚡ 탭 +1`,`사람에 한 걸음 더`]:[],
    closeText:(i<last)?"…":"다음 길로",
    next:(i<last)?()=>page(i+1):null });
  page(0);
}
function buyBody(key){
  // 🆕 감정27 잠금 제거(2026-06-26): 온기만 있으면 감정과 병렬로 언제든 구매.
  if((S.levels[key]||0)>0) return;               // 이미 담은 몸(단련 폐기) — 재구매 없음
  const cost=bodyBuyCost(key);
  if((S.coins||0)<cost){ nudge(`✨온기 ${fmt(cost-(S.coins||0))} 더 필요해`); return; }
  S.coins-=cost; S.levels[key]=1;
  track("body_buy",{key, lv:1, cost, total:bodyCount(), anon:_anon()});
  saveState(); refreshHUD(); renderBodyPage(); updateBodyTabDot();   // 몸 페이지 행·온기·탭 점 갱신
  bodyStoryModal(key);                           // 5단 이야기 한 번에
}

/* ---------- 모달 ---------- */
let modalUp=null;   // 보조(재회) 액션
let modalPrev=null; // '이전 대사' 액션(지난 대사 다시 보기)
let modalNext=null; // 다음 페이지(있으면 주 버튼이 닫기 대신 다음 페이지로)
function fillModal(o){
  $("#mBadge").textContent=o.badge; $("#mEmo").textContent=o.emo;
  $("#mLv").textContent=o.lv||""; $("#mSitu").innerHTML=o.situ||""; $("#mSitu").style.display=o.situ?"block":"none";
  $("#mLog").textContent=o.log;
  $("#mReward").innerHTML=(o.reward||[]).map(r=>`<span class="r">${r}</span>`).join("");
  $("#mBtn").textContent=o.closeText||"다음 길로";
  modalNext = o.next || null;                      // 다음 페이지 콜백(있으면 주 버튼이 그걸 호출)
  const b2=$("#mBtn2"), bp=$("#mPrev");
  if(o.upText){ b2.style.display="block"; b2.textContent=o.upText; modalUp=o.onUp; }
  else { b2.style.display="none"; modalUp=null; }
  if(o.onPrev){ bp.style.display="block"; modalPrev=o.onPrev; }   // '이전 대사' = 재회 버튼 옆 반반
  else { bp.style.display="none"; modalPrev=null; }
  $("#mActions").style.display=(o.upText||o.onPrev)?"flex":"none";
  modal.classList.add("show");
}
let afterClose=null;                               // 모달 닫은 뒤 이어질 흐름(엔딩→프레스티지)
$("#mBtn").onclick=()=>{ if(modalNext){ const f=modalNext; modalNext=null; f(); } else closeModal(); };  // 주 버튼 = 다음 페이지 or 닫기
$("#mBtn2").onclick=()=>{ if(modalUp) modalUp(); }; // 보조 = 재회(있을 때만)
$("#mPrev").onclick=()=>{ if(modalPrev) modalPrev(); }; // '이전 대사' = 지난 대사 다시 보기
modal.addEventListener("click", e=>{ if(e.target!==modal) return;            // 카드 바깥(배경) 클릭
  if(modalNext){ const f=modalNext; modalNext=null; f(); } else closeModal(); });  // = 다음 페이지 or 닫기
function closeModal(){ modal.classList.remove("show"); busyMeet=false; renderAll();   // 다 읽고 닫음 → 이제 다음 노드 생겨도 됨
  const a=afterClose; afterClose=null; if(a) setTimeout(a, 280); }

// 🆕 재회 코치(maybeTeachReunion/showReunionHint/#coach) 제거(2026-06-26) — 순차 완성이라 재회 안내가 필요 없음.

/* ---------- 엔딩 시네마틱 (샘 재회 → 마법 불발 정적 → "넌 이미 사람이었다" 반전) ---------- */
let endStep=0, endHold=false;
function startEnding(){
  endStep=0; endHold=false;
  const ec=$("#endcine");
  ec.classList.remove("warm"); ec.classList.add("show");
  bgmTo("beauty");                                    // 엔딩 곡 = '아름다움'(beauty) 트랙으로 (2026-06-26 교체)
  $("#eBtn").classList.remove("in"); $("#eText").classList.remove("in","climax"); $("#eHint").classList.remove("in");
  $("#eFigure").classList.remove("in");               // 사람이 된 모습은 깨달음(warm)에서 등장
  setTimeout(renderEndStep, 800);                     // 암전 뒤 첫 컷
}
function renderEndStep(){
  const ec=$("#endcine"), t=$("#eText"), seg=ENDING_SEQ[endStep];
  t.textContent=seg.t;
  t.classList.toggle("climax", !!seg.climax);
  if(seg.warm){ ec.classList.add("warm"); $("#eFigure").classList.add("in"); }   // 따뜻해지며 사람이 된 모습 등장
  requestAnimationFrame(()=>t.classList.add("in"));
  $("#eHint").classList.toggle("in", !seg.last && !seg.hold);
  if(seg.last) setTimeout(()=>$("#eBtn").classList.add("in"), 1300);
  if(seg.hold){ endHold=true; setTimeout(()=>{ endHold=false;
    if(!ENDING_SEQ[endStep].last) $("#eHint").classList.add("in"); }, seg.hold); }   // 정적
}
function advanceEnding(){
  if(endHold) return;                                 // 정적 구간엔 탭 무시
  if(endStep>=ENDING_SEQ.length-1) return;            // 마지막 컷은 버튼으로만
  endStep++;
  $("#eText").classList.remove("in");                 // 페이드아웃 → 다음 컷
  setTimeout(renderEndStep, 600);
}
function finishEnding(){ $("#endcine").classList.remove("show"); openPrestige(); }
$("#endcine").addEventListener("click", e=>{ if(e.target.id==="eBtn"){ finishEnding(); return; } advanceEnding(); });

/* ---------- 회차 정산 (프레스티지) — 한 생을 마치고 마음의 깊이를 얻어 다시 걷는다 ---------- */
function prestigeGain(){                             // 이번 생에 모은 것 = 마음의 깊이
  const emo=learnedCount(), body=bodyCount();
  let extra=0; NODES.forEach(n=>{ if((n.type==="person"||n.type==="body") && S.levels[n.id]>1) extra+=S.levels[n.id]-1; });
  return emo + body + Math.floor(extra/4);          // 첫 생 = 27+11 = 38, 재회 깊이는 보너스
}
let pendingGain=0;
function openPrestige(){
  pendingGain = prestigeGain();
  S.depth += pendingGain; S.cycle++;                // 정산은 진입 즉시(되돌아보기에 바로 쓰도록)
  $("#prestigeGain").innerHTML = `🌊 마음의 깊이 <b>+${pendingGain}</b>`;
  $("#prestigeCycle").textContent = `${S.cycle}번째 여행을 마쳤다 · 가진 마음의 깊이 ${S.depth}`;
  renderLookback();
  document.getElementById('prestige').classList.add('show');
  refreshHUD(); saveState();
}
function renderLookback(){
  const max=SYS_REINTERP.length;
  $("#lookCnt").textContent = S.lookback;
  $("#lookMax").textContent = `/ ${max}`;
  const prev=$("#lookPrev");
  if(S.lookback>0){ const r=SYS_REINTERP[S.lookback-1];
    prev.innerHTML = `<span class="s">${r.old}</span>✎ ${r.fix}`; }
  else prev.innerHTML = `<span style="color:#a8b0aa">아직 되돌아본 기억이 없다…</span>`;
  const btn=$("#lookBuy");
  if(S.lookback>=max){ btn.disabled=true; btn.textContent="모두 되돌아봤다"; }
  else { btn.disabled = S.depth < LOOKBACK_COST;
    btn.textContent = `깊이 ${LOOKBACK_COST} 써서 되돌아보기`; }
}
$("#lookBuy").onclick=()=>{
  if(S.lookback>=SYS_REINTERP.length || S.depth<LOOKBACK_COST) return;
  S.depth-=LOOKBACK_COST; S.lookback++; renderLookback(); refreshHUD(); saveState();
};
$("#prestigeGo").onclick=()=>{ doPrestige(); };
function doPrestige(){                               // 리셋: 걸음·rate·진행 초기화 / depth·cycle·lookback·이름 보존
  track("prestige",{depth:S.depth, cycle:S.cycle, learned:learnedCount(), body:bodyCount()});  // 리셋 전 캡처
  document.getElementById('prestige').classList.remove('show');
  S.walks=0; S.rate=1.0; S.current="start"; S.discovered={};
  NODES.forEach(n=>S.levels[n.id]= n.completed?1:0);
  wholeWalks=0; worldX=0;
  showPage("walk"); refreshHUD(); renderAll(); saveState();
  bgmTo("main");                                      // 새 회차 = 메인 루프로 복귀
  const h=$("#hint");
  if(h){ h.textContent = `다시, 처음부터. 이번엔 ${S.robotName}가 무엇을 다시 보게 될까`;
    setTimeout(()=>{ h.textContent="이 길을 두드릴수록 로봇이 더 빨리 걷는다"; }, 5200); }
}

/* ---------- 걸음당 1보(步) : 걸음이 들어올 때만 한 발 ---------- */
let stepPhase=false, wholeWalks=0, worldX=0;
function stepOnce(){
  stepPhase=!stepPhase;
  walkRobot.classList.remove("stepA","stepB");
  walkRobot.classList.add(stepPhase?"stepA":"stepB");
  const svg=walkRobot.querySelector("svg");           // 한 보 bob (재시작)
  svg.style.animation="none"; void svg.offsetWidth; svg.style.animation="stepbob .26s ease-out";
  worldX += 27;                                        // 길 한 칸 전진(점선 주기 54 → 반칸씩 교차)
  roadEl.style.backgroundPosition = (-(worldX%54))+"px 0";
  advanceGProps(27);                                   // 꽃·동물도 한 칸 흐른다
  if(Math.random()<0.085) spawnGProp();                // 가끔 새 오브젝트 등장
}
// S.walks의 정수 자리가 늘 때마다 그만큼 보(步). 줄어들면(소비) 보 없이 동기화만.
function syncSteps(){ if(S.walks>MAX_STEPS) S.walks=MAX_STEPS; const w=Math.floor(S.walks); if(w>wholeWalks) stepOnce(); wholeWalks=w; }   // 🆕 걸음 상한 클램프(MAX_STEPS) — 정밀도/Infinity 방지

/* ---------- 탭 = 걸음 ---------- */
let sceneActive=false, sceneReady=false, sceneStep=0; // 샘 대화 장면 진행 중 상태
let comboCount=0, lastTapAt=0, comboHideTimer=null, comboBadge=null;  // 연타 콤보 상태
/* 온보딩 페이즈 — 기존/복귀 유저는 "play". 신규는 startWake()가 "wake"로 진입.
   "wake"=탭으로 깨우기 / "wakedone"=결핍·동기화 비트(손맛 멈춤) / "play"=평소 */
const intro={phase:"play"}; let wakeTaps=0; const WAKE_TAPS=6;

/* 🔊 게임필 — WebAudio(에셋 0)로 탭/만남 효과음 + 햅틱(navigator.vibrate).
   음소거는 localStorage('aingan_muted') — 진행도가 아니라 기기 UI 설정이라 둘러보기 유저도 저장 OK(세이브 정책과 무관). */
let _ac=null, _muted=(()=>{ try{ return localStorage.getItem("aingan_muted")==="1"; }catch(_){ return false; } })();
function _actx(){ if(_muted) return null;                        // 오디오 컨텍스트는 첫 탭(유저 제스처) 때 생성·resume(브라우저 autoplay 정책)
  try{ _ac=_ac||new (window.AudioContext||window.webkitAudioContext)(); if(_ac.state==="suspended") _ac.resume(); return _ac; }catch(_){ return null; } }
function tone(freq,dur,type,gain){                                // 짧은 비프 1개(감쇠 포함)
  const ac=_actx(); if(!ac) return;
  const t=ac.currentTime, o=ac.createOscillator(), g=ac.createGain();
  o.type=type||"sine"; o.frequency.value=freq;
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(gain||0.05,t+0.008);
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t+dur+0.02);
}
function buzz(p){ if(_muted) return; try{ navigator.vibrate&&navigator.vibrate(p); }catch(_){} }
function sfxTap(crit,comboN){                                     // 탭 틱 — 콤보 오를수록 음↑, 크리=화음+강한 진동(변동보상 청각화)
  if(crit){ tone(660,0.12,"triangle",0.07); tone(990,0.18,"sine",0.05); buzz([12,28,16]); return; }
  tone(320+Math.min(comboN,COMBO_MAX)*26,0.05,"sine",0.04); buzz(7);
}
function sfxMeet(){ tone(523,0.16,"sine",0.06); setTimeout(()=>tone(784,0.32,"sine",0.05),70); buzz([14,40,22]); }  // 만남 차임(도→솔)
/* 🎵 배경음악(BGM) — HTMLAudioElement 2트랙(mp3 스트리밍 루프, 에셋은 ./audio/).
   평소=메인 루프(Pixabay 'Emotional Ambient Piano'), 엔딩=Scott Buckley 'The Long Dark'(CC-BY).
   음소거는 기존 _muted 공유. 브라우저 autoplay 정책 대비 첫 유저 제스처 때 시작.
   파일 없음/자동재생 차단이어도 catch로 조용히 무시(게임 무중단). */
const BGM_SRC={ main:"./audio/bgm-main.mp3", end:"./audio/bgm-ending.mp3" };
const BGM_VOL={ main:0.45, end:0.6 };
// 특정 감정을 만나면 그 곡으로 전환 → 다음 감정 노드를 만날 때까지 걷는 배경으로 유지(다른 감정=곡 교체).
// key = data.js PEOPLE 키. 감정 27개 전부 전용 곡(leberch, 각 30초): 파일명 emo-<감정key>.mp3.
const EMO_BGM={};
"adore beauty admire attract joy amuse excite flutter sorrow longing crave empathy compassion fear anxiety awkward disgust horror curious awe trance calm confuse bored relief satisfy triumph"
  .split(" ").forEach(k=>{ BGM_SRC[k]="./audio/emo-"+k+".mp3"; BGM_VOL[k]=0.5; EMO_BGM[k]=k; });
let _bgm={}, _bgmWhich="main";
function _bgmEl(which){ if(_bgm[which]) return _bgm[which];
  try{ const a=new Audio(BGM_SRC[which]); a.loop=true; a.preload="auto"; a.volume=0; return _bgm[which]=a; }catch(_){ return null; } }
function _bgmFade(a,to,ms){ if(!a) return; const from=a.volume, t0=Date.now(), d=Math.max(1,ms);  // HTMLAudio는 네이티브 페이드 없음 → 볼륨 트윈
  clearInterval(a._fi); a._fi=setInterval(()=>{ const k=Math.min(1,(Date.now()-t0)/d);
    a.volume=Math.max(0,Math.min(1, from+(to-from)*k));
    if(k>=1){ clearInterval(a._fi); if(to<=0){ try{ a.pause(); }catch(_){} } } }, 40); }
// ⚠️ 탭 '완료' 제스처만 쓴다(pointerdown 제외): 모바일 브라우저/웹뷰는 보통 touchend/click/pointerup 같은
//    탭 완료에만 미디어 autoplay 권한을 준다. pointerdown(탭 시작)에 play()하면 거부 → 재무장이 같은 탭의
//    touchend와 레이스 → 메인 BGM이 영영 안 나오던 버그(앱 콜드 실행). 완료 제스처로 첫 시도부터 통과.
const _BGM_GEST=["pointerup","touchend","click","keydown"];
function _armBgmStart(){                                                         // 자동재생 차단 대비: 완료 제스처로 듣고, 거부되면 다음 제스처에 재시도
  const h=()=>{ _BGM_GEST.forEach(t=>document.removeEventListener(t,h)); bgmTo(_bgmWhich); };
  _BGM_GEST.forEach(t=>document.addEventListener(t,h,{once:true,passive:true}));
}
function bgmTo(which){ _bgmWhich=which; if(_muted) return;
  const cur=_bgmEl(which); if(!cur) return;
  for(const k in _bgm){ if(k!==which) _bgmFade(_bgm[k],0,800); }                 // 다른 트랙 페이드아웃
  try{ const p=cur.play();
    if(p&&p.catch) p.catch(()=>{ if(!_muted) _armBgmStart(); });                // 차단(NotAllowedError) → 다음 제스처에 재시도
  }catch(_){ if(!_muted) _armBgmStart(); }
  _bgmFade(cur, BGM_VOL[which]||0.45, 1500);
}
// 지금 로봇이 선 노드가 함의하는 BGM 트랙(감정 노드=그 곡, 아니면 main). option B: 감정을 만나면 그 곡으로,
// 다음 감정까지 유지 — 그런데 앱을 켜서 세이브로 감정 노드에 복원될 땐 도착 이벤트가 없어 _bgmWhich가 main에
// 머물렀다(버그: 그리움에 서 있어도 main이 나옴). 부팅/세이브 도착 때 이 함수로 위치와 BGM을 동기화한다.
function bgmForCurrent(){ const n=NODES.find(x=>x.id===S.current); return (n && n.type==="person" && EMO_BGM[n.key]) || "main"; }
function syncBgmToCurrent(){ bgmTo(bgmForCurrent()); }                           // _bgmWhich를 현재 위치 곡으로(음소거여도 트랙은 맞춰둠 → 해제 시 올바른 곡)
// 걷기 탭에서 직접 BGM 시동 — 제스처 핸들러 '내부'라 모바일 autoplay에 가장 안전(전역 document 리스너보다 확실).
// 아직 아무 트랙도 안 울리면 현재 곡을 시동하고, 차단되면 다음 탭에서 자동 재시도(no-op 가드로 중복 없음).
function ensureBgmStarted(){ if(_muted) return; for(const k in _bgm){ if(!_bgm[k].paused) return; } bgmTo(_bgmWhich); }
_armBgmStart();                                                                 // 첫 제스처에 시작(autoplay 정책) — 실패 시 자동 재무장

function toggleMute(){ _muted=!_muted; try{ localStorage.setItem("aingan_muted",_muted?"1":"0"); }catch(_){}
  updateMuteBtn();
  if(_muted){ for(const k in _bgm) _bgmFade(_bgm[k],0,400); }    // 음소거: BGM 페이드아웃+정지
  else { bgmTo(_bgmWhich); sfxTap(false,0); }                   // 해제: 현재 트랙 복귀
}
function updateMuteBtn(){ const b=$("#muteBtn"); if(b){ b.textContent=_muted?"🔇":"🔊"; b.title=_muted?"소리 켜기":"소리 끄기"; } }
$("#muteBtn")?.addEventListener("click",toggleMute); updateMuteBtn();

/* 📊 애널 솔기(Phase A) — no-op 싱크. 외부 전송 0. provider는 추후 Phase B에서 window._sink로 연결(쿠키리스).
   계측만·게이트 없음. PII 금지 — 둘러보기(익명)는 anon:true로만 구분(로그인 코호트 분리용). gap-analysis §8.4 */
function track(name, props){ try{ (window._sink||function(){})(name, props||{}); }catch(_){} }
function _anon(){ return !authUser; }                                   // 로그인 코호트 분리(둘러보기=휘발이라 first_emotion 오염 방지)
let _lastMs=1;                                                          // 마일스톤 배율 변화만 감지(중복 발화 방지)
function trackMilestone(){ try{ const m=milestoneMult(); if(m>_lastMs) track("milestone",{mult:m, count:learnedCount()+bodyCount()}); _lastMs=m; }catch(_){} }
let _sessionEnded=false;                                               // 세션 길이(8.1 KPI)
function _endSession(){ if(_sessionEnded) return; _sessionEnded=true; track("session_end",{anon:_anon()}); }
document.addEventListener("visibilitychange",()=>{ if(document.hidden) _endSession(); else _sessionEnded=false; });
window.addEventListener("pagehide", _endSession);

/* 📺 광고 솔기(Phase A) — no-op. 실제 SDK 0. '한 곳'만 채우면 연결된다:
   · 네이티브(AdMob): Capacitor AdMob 플러그인을 window._adProvider로 연결(JS 브릿지).
   · 웹(H5 Games Ads / AdSense rewarded): rewarded 콜백을 window._adProvider로 연결.
   provider 형태: { rewardedReady:boolean, showRewarded(placement):Promise<{rewarded:boolean}> }
   🚫 설계 §4 금기: 스토리/다음 감정은 절대 광고 뒤에 안 가둠. 보상형 = 선택적 부스트만(×2 가속·오프라인 2배·천천히 보기). 첫 경험 광고 0.
   배너(디스플레이)는 비행기 #planes(planeBannerText())가 슬롯 — provider 연결 시 거기서 광고 소스 주입.
   사용 예(미연결): if(Ads.ready()){ const {rewarded}=await Ads.showRewarded("speed2x"); if(rewarded) applyBoost(); } */
const Ads = {
  ready(){ return !!(window._adProvider && window._adProvider.rewardedReady); },   // UI 버튼은 이걸로 게이트(미연결 시 버튼 숨김 → 깨진 버튼 0)
  showRewarded(placement){                                                          // 단일 진입점 → Promise<{rewarded:boolean}>
    track("ad_rewarded_req",{placement, anon:_anon()});
    const p=window._adProvider;
    if(p && typeof p.showRewarded==="function"){
      return Promise.resolve(p.showRewarded(placement))
        .then(r=>{ const ok=!!(r&&r.rewarded); track("ad_rewarded_done",{placement, rewarded:ok}); return {rewarded:ok}; })
        .catch(()=>{ track("ad_rewarded_err",{placement}); return {rewarded:false}; });
    }
    if(window._adSim){ track("ad_rewarded_done",{placement, rewarded:true, sim:true}); return Promise.resolve({rewarded:true}); }  // DEV: window._adSim=true로 보상 흐름 테스트
    track("ad_rewarded_noop",{placement});
    return Promise.resolve({rewarded:false});                                        // provider 없으면 보상 없음(공짜 보상 방지)
  },
};
window.Ads = Ads;   // 콘솔/네이티브 브릿지 접근용

/* 🌐 웹 H5 Games Ads(AdSense) provider — 위 Ads 솔기의 window._adProvider를 채운다.
   ⚠️ ADSENSE_CLIENT(ca-pub-…)를 넣어야 활성화. 비어 있으면 스크립트 미주입 → 완전 inert(현 상태).
   사전조건(사용자 직접, 계정/발급은 내가 못 함): AdSense 가입 → aingan.click 승인 → H5 Games Ads 사용설정 → ca-pub-… 발급.
   H5 rewarded = adBreak({type:'reward'}). 끝까지 보면 adViewed→보상, 중도닫음/미충전→보상X. §4 준수(보상형 부스트만, 스토리 비게이트). */
const ADSENSE_CLIENT = "";   // 예: "ca-pub-1234567890123456" — 발급 후 여기만 채우면 켜짐
(function initH5Ads(){
  if(!ADSENSE_CLIENT) return;                                   // 미설정 → inert
  window.adsbygoogle = window.adsbygoogle || [];
  const adConfig = window.adConfig = window.adConfig || function(o){ adsbygoogle.push(o); };   // Google 표준 스니펫(스크립트 로드 전 호출은 큐잉)
  const adBreak  = window.adBreak  = window.adBreak  || function(o){ adsbygoogle.push(o); };
  const s=document.createElement("script");
  s.async=true; s.crossOrigin="anonymous";
  s.src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client="+encodeURIComponent(ADSENSE_CLIENT);
  document.head.appendChild(s);
  let _ready=false;
  adConfig({ preloadAdBreaks:"on", sound:"on", onReady:()=>{ _ready=true; } });
  window._adProvider = {
    get rewardedReady(){ return _ready; },
    showRewarded(placement){
      return new Promise((resolve)=>{
        let settled=false; const done=(ok)=>{ if(!settled){ settled=true; resolve({rewarded:!!ok}); } };
        try{
          adBreak({
            type:"reward", name:String(placement||"reward"),
            beforeReward:(showAdFn)=>{ showAdFn(); },                                   // 광고 있음 → 노출
            adViewed:()=>done(true),                                                    // 끝까지 봄 → 보상
            adDismissed:()=>done(false),                                                // 중도 닫음 → 보상X
            adBreakDone:(info)=>{ if(!settled) done(info && info.breakStatus==="viewed"); }  // 미충전 등 → 보상X
          });
        }catch(_){ done(false); }
      });
    }
  };
})();

/* 📱 네이티브 AdMob provider — Capacitor 앱(webview)에서만 window._adProvider를 채운다.
   비-네이티브(웹 PWA)·플러그인 미탑재면 즉시 return = 완전 inert(웹 불변, §0.1).
   현재 REWARD_AD_ID = 구글 공식 '테스트' 리워드 단위(승인 불필요). 실제 단위 발급 후 이 한 줄만 교체.
   §4 준수: 보상형 부스트(✨온기 등)만 — 스토리/감정은 광고 뒤에 안 가둠. */
const ADMOB_REWARD_TEST_ANDROID = "ca-app-pub-3940256099942544/5224354917";   // Google 공식 테스트 리워드(Android)
const REWARD_AD_ID = ADMOB_REWARD_TEST_ANDROID;                               // TODO: 실제 AdMob 리워드 단위ID로 교체
(function initNativeAdMob(){
  const C = window.Capacitor;
  if(!C || typeof C.isNativePlatform!=="function" || !C.isNativePlatform()) return;  // 네이티브 아니면 inert
  const AdMob = C.Plugins && C.Plugins.AdMob;
  if(!AdMob) return;                                                                  // 플러그인 미탑재 → Ads.ready()=false(버튼 숨김)
  let _ready=false, _loading=false, _resolve=null, _settled=false;
  const settle=(ok)=>{ if(_resolve && !_settled){ _settled=true; const r=_resolve; _resolve=null; r({rewarded:!!ok}); } };
  const preload=()=>{ if(_loading||_ready) return; _loading=true;
    AdMob.prepareRewardVideoAd({ adId: REWARD_AD_ID, isTesting:true }).catch(()=>{ _loading=false; }); };
  // 이벤트(브릿지 문자열명 — @capacitor-community/admob 8)
  AdMob.addListener("onRewardedVideoAdLoaded",      ()=>{ _ready=true; _loading=false; if(typeof refreshHUD==="function") refreshHUD(); });
  AdMob.addListener("onRewardedVideoAdFailedToLoad",()=>{ _ready=false; _loading=false; });
  AdMob.addListener("onRewardedVideoAdReward",      ()=>{ settle(true); });            // 끝까지 봄 → 보상
  AdMob.addListener("onRewardedVideoAdDismissed",   ()=>{ settle(false); _ready=false; preload(); });   // 닫음 → 다음 광고 미리 로드
  AdMob.addListener("onRewardedVideoAdFailedToShow",()=>{ settle(false); _ready=false; preload(); });
  AdMob.initialize({ initializeForTesting:true }).then(preload).catch(()=>{});
  window._adProvider = {
    get rewardedReady(){ return _ready; },
    showRewarded(placement){
      return new Promise((resolve)=>{
        if(!_ready){ resolve({rewarded:false}); preload(); return; }                  // 아직 미로드 → 보상X(공짜 방지) + 로드 시작
        _settled=false; _resolve=resolve; _ready=false;                               // 광고 1회 소모
        AdMob.showRewardVideoAd().catch(()=>settle(false));
      });
    }
  };
})();

function addWalk(x,y){
  if(intro.phase==="wake"){ wakeTap(x,y); return; }    // 깨우기: 탭=생명 불어넣기
  if(intro.phase==="wakedone") return;                 // 결핍 한 줄/동기화 실패 비트 — 잠깐 손맛 멈춤
  if(sceneActive){ advanceScene(); return; }           // 대화 중엔 탭=다음 대사
  ensureBgmStarted();                                  // 걷기 첫 탭 = 음악 시동(autoplay 잠금해제, 켜질 때까지 매 탭 재시도)
  const now=Date.now();
  comboCount = (now-lastTapAt<=COMBO_WINDOW) ? comboCount+1 : 0;       // 연타 창 안이면 누적, 끊기면 리셋
  lastTapAt=now;
  const cMult = 1 + COMBO_STEP*Math.min(comboCount, COMBO_MAX);        // 콤보 배율
  const crit = Math.random() < CRIT_CHANCE;                            // 변동보상: 가끔 크리(gap-analysis ⑤)
  const g = Math.max(1, Math.round(effTap()*cMult*(crit?CRIT_MULT:1)));
  S.walks+=g;
  sfxTap(crit, comboCount);                            // 게임필: 탭 틱·진동(콤보↑=음↑, 크리=화음)
  if(x!=null){ const m=document.createElement("div"); m.className="mote";
    m.style.left=x+"px"; m.style.top=y+"px"; document.body.appendChild(m);
    setTimeout(()=>m.remove(),1300);
    const t=document.createElement("div"); t.className="tapfx"+(crit?" crit":""); t.textContent=(crit?"크리! +":"+")+fmt(g);
    t.style.left=x+"px"; t.style.top=(y-8)+"px"; document.body.appendChild(t); setTimeout(()=>t.remove(),crit?900:700);
  }
  showCombo(cMult, comboCount);
  elWalks.textContent=fmt(S.walks);
  syncSteps();                                         // 탭 1회 = 1보(+콤보·크리 가속)
}
function showCombo(mult, n){                            // 연타 콤보 뱃지(2연타부터, 끊기면 자동 페이드)
  if(n<2){ if(comboBadge) comboBadge.classList.remove("show"); return; }
  if(!comboBadge){ comboBadge=document.createElement("div"); comboBadge.id="comboBadge"; document.body.appendChild(comboBadge); }
  comboBadge.innerHTML=`🔥 <b>×${mult.toFixed(1)}</b> <span>${n} 콤보</span>`;
  // 현재 보이는 로봇(길=walkRobot / 지도=#robot) 바로 위에 띄운다
  const onMap = document.querySelector(".page.active")?.id==="pageMap";
  const rob = onMap ? $("#robot") : walkRobot;
  const r = rob && rob.getBoundingClientRect();
  if(r && r.width){ comboBadge.style.left=(r.left+r.width/2)+"px"; comboBadge.style.top=(r.top-6)+"px"; }
  comboBadge.classList.add("show");
  clearTimeout(comboHideTimer);
  comboHideTimer=setTimeout(()=>{ if(comboBadge) comboBadge.classList.remove("show"); }, COMBO_WINDOW+250);
}
// 길 페이지 = 핵심 손맛: 두드리면 걷는다
$("#pageWalk").addEventListener("pointerdown", e=>addWalk(e.clientX, e.clientY));
// 지도: 끌면 팬(이동), 짧게 누르면 걷기. 노드는 클릭(별도).
let dragOn=false, dragMoved=false, dsx=0, dsy=0, dscL=0, dscT=0;
map.addEventListener("pointerdown",e=>{
  if(e.target.closest(".node")) return;
  if(window.__pinch) return;
  dragOn=true; dragMoved=false; dsx=e.clientX; dsy=e.clientY; dscL=map.scrollLeft; dscT=map.scrollTop;
});
map.addEventListener("pointermove",e=>{
  if(!dragOn || window.__pinch) return;
  const dx=e.clientX-dsx, dy=e.clientY-dsy;
  if(!dragMoved && Math.abs(dx)+Math.abs(dy)>6) { dragMoved=true; map.classList.add("grabbing"); }
  if(dragMoved){ map.scrollLeft=dscL-dx; map.scrollTop=dscT-dy; }
});
window.addEventListener("pointerup",e=>{
  if(dragOn && !dragMoved) addWalk(e.clientX, e.clientY);   // 안 끌었으면 = 탭 = 걷기
  dragOn=false; map.classList.remove("grabbing");
});

function nudge(msg){ const h=$("#hint"); const old=h.textContent; h.textContent=msg;
  h.style.color="#c0794a"; setTimeout(()=>{h.textContent=old;h.style.color="";},1100); }
function spark(){ const rb=robot.getBoundingClientRect();
  const cx=rb.left+rb.width/2, cy=rb.top+rb.height*0.42;
  for(let i=0;i<6;i++){ const m=document.createElement("div"); m.className="mote";
    m.style.left=(cx+(Math.random()*40-20))+"px"; m.style.top=cy+"px";
    document.body.appendChild(m); setTimeout(()=>m.remove(),1300); } }

/* ---------- 풍경 생물: 새(하늘) · 꽃/동물(땅) ---------- */
function BIRD_SVG(){ return `<svg width="26" height="14" viewBox="0 0 26 14"><path d="M1 9 Q6 2 13 8 Q20 2 25 9" fill="none" stroke="#8a8f96" stroke-width="2" stroke-linecap="round" opacity=".55"/></svg>`; }
function FLOWER_SVG(){ const pal=[["#f0c0c8","#e7aeb8"],["#cdbfe2","#bcabd6"],["#bcd0e6","#a9c2dd"],["#efd6ac","#e6c48c"]];
  const c=pal[Math.floor(Math.random()*pal.length)];
  return `<svg width="22" height="32" viewBox="0 0 22 32"><line x1="11" y1="32" x2="11" y2="15" stroke="#7d9b6e" stroke-width="2"/><circle cx="6" cy="11" r="3.6" fill="${c[1]}"/><circle cx="16" cy="11" r="3.6" fill="${c[1]}"/><circle cx="11" cy="7" r="3.6" fill="${c[1]}"/><circle cx="11" cy="11" r="4.4" fill="${c[0]}"/><circle cx="11" cy="11" r="2" fill="#f6e6c0"/></svg>`; }
function ANIMAL_SVG(){ const t="#b0a896"; return `<svg width="34" height="26" viewBox="0 0 34 26"><ellipse cx="19" cy="18" rx="12" ry="7" fill="${t}"/><circle cx="8" cy="13" r="5.2" fill="${t}"/><path d="M5 9 q-1 -8 2.5 -8 q1.2 4 -.2 8z" fill="${t}"/><ellipse cx="30" cy="22" rx="3.2" ry="2.4" fill="#9a9384"/><circle cx="6" cy="13" r="1" fill="#5a554c"/></svg>`; }

const gprops=[];
function spawnGProp(){
  const W = gpropsEl.clientWidth || 380;
  const wrap=document.createElement("div"); wrap.className="gprop";
  wrap.innerHTML = Math.random()<0.7 ? FLOWER_SVG() : ANIMAL_SVG();
  gpropsEl.appendChild(wrap);
  const x = W + 24; wrap.style.transform=`translateX(${x}px)`;
  gprops.push({el:wrap, x});
}
function advanceGProps(d){
  for(let i=gprops.length-1;i>=0;i--){ const g=gprops[i]; g.x-=d; g.el.style.transform=`translateX(${g.x}px)`;
    if(g.x < -50){ g.el.remove(); gprops.splice(i,1); } }
}
function spawnBird(){
  const b=document.createElement("div"); b.className="bird"; b.innerHTML=BIRD_SVG();
  b.style.top=(6+Math.random()*30)+"%";
  const dur=9+Math.random()*6; b.style.animationDuration=dur+"s";
  birdsEl.appendChild(b); setTimeout(()=>b.remove(), dur*1000+300);
}
setInterval(()=>{ if(Math.random()<0.6) spawnBird(); }, 5200);  // 가끔 새 한 마리
setTimeout(spawnBird, 1600);

/* ---------- 하늘 광고 비행기 + 펄럭이는 배너 ----------
   작은 비행기가 배너를 끌고 하늘을 가로지른다. z-index 3 = HUD(감정카운터·로그) 뒤로 지나감.
   ⚠️ 배너 문구는 planeBannerText()에서 나온다 — 지금은 귀여운 문구 풀, 나중에 여기를
      광고 소스(서버/스폰서 슬롯)로 갈아끼우면 비행기 연출은 그대로 광고가 된다. */
function PLANE_SVG(){ return `<svg width="56" height="30" viewBox="0 0 56 30" aria-hidden="true">
  <path d="M6 18 Q28 11 50 15 Q54 16.5 51 18.5 Q42 22 9 21.5 Q4 20.5 6 18 Z" fill="#c4cfd8" stroke="#9aa6b0" stroke-width="1.4"/>
  <path d="M20 17 L31 5 L35 6 L29 18 Z" fill="#aeb9c2"/>
  <path d="M8 17.5 L11 7 L15 8 L13 17.5 Z" fill="#aab6c0"/>
  <circle cx="40" cy="16.6" r="1.7" fill="#7e8a94"/>
  <ellipse cx="51" cy="17" rx="2.4" ry="3" fill="#aeb9c2"/>
  <line x1="53" y1="13" x2="53" y2="21" stroke="#9aa6b0" stroke-width="1.4" stroke-linecap="round"/>
</svg>`; }
// 귀여운 문구 풀(추후 광고로 교체). 하나는 메타개그로 "여기가 광고 자리"임을 귀엽게 흘림.
const PLANE_MSGS = [
  "오늘도 한 걸음 — 잘 걷고 있어요 🦶",
  "로봇이 당신을 응원하는 중 ✦",
  "감정 충전 중… 마음 100% 🔋",
  "여기, 광고 자리 — 지금은 비밀 ✨",
  "잠깐 쉬어도 길은 안 사라져요 🌿",
  "사람이 되는 길, 같이 걷는 중 🕊",
  "이 배너에 당신의 한마디 ✎",
];
function planeBannerText(){ return PLANE_MSGS[Math.floor(Math.random()*PLANE_MSGS.length)]; }
function esc(s){ return String(s).replace(/[&<>]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }
function spawnPlane(){
  const p=document.createElement("div"); p.className="plane";
  p.innerHTML=`<div class="banner">${esc(planeBannerText())}</div><span class="rope"></span><div class="planeimg">${PLANE_SVG()}</div>`;
  p.style.top=(2+Math.random()*9)+"%";   // 하늘 상단 띠에만(syslog top:108px 위로) — 로그와 안 겹치게
  const dur=17+Math.random()*7; p.style.animationDuration=dur+"s";   // 새보다 느긋하게
  planesEl.appendChild(p); setTimeout(()=>p.remove(), dur*1000+500);
}
setInterval(()=>{ if(Math.random()<0.5) spawnPlane(); }, 21000);   // 새보다 드물게
setTimeout(spawnPlane, 7000);

/* ---------- 표정 있는 구름 ----------
   비행기보다 아래에서, 더 느리게, 반대 방향으로 떠다니는 귀여운 얼굴 구름. z-index 2 = 배경. */
function CLOUD_SVG(){ return `<svg width="84" height="50" viewBox="0 0 84 50" aria-hidden="true">
  <g fill="#eef4f9" stroke="#d3dde6" stroke-width="1.4">
    <ellipse cx="27" cy="31" rx="21" ry="15"/>
    <ellipse cx="50" cy="26" rx="25" ry="19"/>
    <ellipse cx="67" cy="33" rx="15" ry="12"/>
    <rect x="15" y="33" width="60" height="14" rx="7" stroke="none"/>
  </g>
  <circle cx="44" cy="27" r="2.4" fill="#6a7882"/><circle cx="57" cy="27" r="2.4" fill="#6a7882"/>
  <circle cx="44.7" cy="26.2" r=".8" fill="#fff"/><circle cx="57.7" cy="26.2" r=".8" fill="#fff"/>
  <path d="M45 34 q5.5 4.5 11 0" fill="none" stroke="#6a7882" stroke-width="1.9" stroke-linecap="round"/>
  <ellipse cx="39" cy="32" rx="2.8" ry="2" fill="#f3c0c8" opacity=".75"/>
  <ellipse cx="62" cy="32" rx="2.8" ry="2" fill="#f3c0c8" opacity=".75"/>
</svg>`; }
function spawnCloud(){
  const c=document.createElement("div"); c.className="cloud"; c.innerHTML=CLOUD_SVG();
  c.style.top=(Math.random()*48)+"%";                                   // 구름 띠(top:16%~) 안에서 다양한 높이
  const dur=8.5+Math.random()*3.5; c.style.animationDuration=dur+"s";   // 비행기(17~24s)의 ~2배 빠르게(절반 시간)
  c.addEventListener("pointerdown", ()=>popCloud(c));                   // 터치 = 뿅 + 물비 + 선물 (탭은 #pageWalk로 버블 → 걸음도 반영)
  cloudsEl.appendChild(c); setTimeout(()=>c.remove(), dur*1000+500);
}
// 구름 터치 → 뿅 터지고 물방울이 비처럼 쏟아진다 + 현재 걸음/초 × 10 선물
let _cloudGiftN = 0;                  // 구름 '터치' 누적 횟수(안 누른 구름은 카운트 안 됨). 새로고침 시 0으로 리셋.
const CLOUD_GIFT_STEP = 100;          // 터치 1회당 선물 증가분(첫터치 100·둘째 200·셋째 300…)
function popCloud(c){ if(c._popped) return; c._popped=true; cloudGiftFx(c); }
// 구름 터치 연출+누적 선물(공통) — 평소 떠다니는 구름과 온보딩 튜토리얼 구름이 공유.
function cloudGiftFx(c){
  const r=c.getBoundingClientRect();
  const cx=r.left+r.width/2, cy=r.top+r.height*0.62;                    // 구름 아래쪽에서 물 터짐
  rainBurst(cx, cy);
  c.classList.add("pop"); setTimeout(()=>c.remove(), 360);
  const gift=(++_cloudGiftN)*CLOUD_GIFT_STEP;             // 🆕 터치마다 +100 누적(1→100·2→200·3→300…). 진행도 무관, 순수 터치 횟수 기준
  S.walks+=gift; syncSteps(); refreshHUD();
  const t=document.createElement("div"); t.className="tapfx gift"; t.textContent="🎁 +"+fmt(gift);
  t.style.left=cx+"px"; t.style.top=(cy-8)+"px"; document.body.appendChild(t); setTimeout(()=>t.remove(), 900);
}
function rainBurst(cx, cy){
  const wrap=document.createElement("div"); wrap.className="splash";
  wrap.style.left=cx+"px"; wrap.style.top=cy+"px";
  const n=13+Math.floor(Math.random()*6);
  for(let i=0;i<n;i++){
    const d=document.createElement("i"); d.className="drop";
    const dx=(Math.random()*2-1)*48, dy=44+Math.random()*92;           // 좌우로 폭 + 아래로 비처럼
    d.style.setProperty("--dx", dx.toFixed(0)+"px");
    d.style.setProperty("--dy", dy.toFixed(0)+"px");
    d.style.animationDelay=(Math.random()*0.12).toFixed(2)+"s";
    wrap.appendChild(d);
  }
  document.body.appendChild(wrap); setTimeout(()=>wrap.remove(), 1300);
}
setInterval(()=>{ if(Math.random()<0.5) spawnCloud(); }, 52000);   // 2배 덜 등장
setTimeout(spawnCloud, 4000);

/* ---------- 걷는 동안 로봇의 상태 로그 (감정을 '오류·고장'으로 읽는 순진한 독백) ----------
   §4 무기 = 로봇의 순진한 재정의. 화면이 멍할 때 읽히는 흐르는 텍스트로 서사를 깐다.
   진행도(배운 감정 수)에 따라 차가운 기계 로그 → 감정이 새어나오는 로그로 따뜻해진다.
   ▸ 지금은 큐레이션 풀. 추후 §7대로 LLM 미리생성 풀로 보충(addSysLogs()로 주입). */
const syslogEl=document.getElementById('syslog');
// 첫 걷기 직후 고정 3줄(랜덤 X) — 둘째 줄 오독개그(…새다)를 1분 안에 터뜨린다(첫 미소 = 차별점·바이럴 씨앗).
// startWake()에서만 introSysQueue에 채움 → 복귀 유저는 안 봄(평소 랜덤 풀).
const INTRO_SYSLOG=[
  "[시스템] 좌측 모터 효율 0.81. 수리 권장.",
  "[스캔] 머리 위 비행체 1기. 위협 아님. (…새다)",
  "[감지] 전방에 신호원. 정체 불명.",
];
let introSysQueue=[];
const SYS_COLD=[                                     // 아직 마음이 없을 때 — 건조한 진단
  "[시스템] 좌측 모터 효율 0.81. 수리 권장.",
  "[시스템] 외피 부식 31%. 무시함.",
  "[스캔] 전방 380m 평탄. 장애물 없음.",
  "[시스템] 코어 온도 정상. 계속 걷는다.",
  "[로그] 한 걸음. 또 한 걸음. 기록 중.",
  "[스캔] 바람 4.2m/s. 분류: 무의미.",
  "[시스템] 배터리 충분. 목적지 좌표 미상.",
  "[메모] 길이 끝나는 지점 데이터 없음.",
  "[스캔] 머리 위 비행체 1기. 위협 아님. (…새다)",
  "[시스템] 관절 02 소음 발생. 견딜 만함.",
];
const SYS_WARM=[                                      // 감정이 새어나오는 로그 — 본인은 '오류'로 읽음
  "[오류] 시각 센서에 원인 불명의 액체. 배출 중…",
  "[경고] 코어 회전수 비정상 ↑. 고장인가?",
  "[오류] 가슴 부근 압력 이상. 통증 아님. 분류 불가.",
  "[오류] 두 발이 명령 없이 멈춤. 원인 불명.",
  "[경고] 연산 지연 발생. 무언가 자꾸 떠오름.",
  "[오류] 출력 신호에 미세한 떨림. 손상 아님?",
];
function SYS_NAMED(){                                 // 배운 감정 이름을 끌어와 '아 이게 그거였지'
  const learned=NODES.filter(n=>n.type==="person" && S.levels[n.id]>0);
  if(!learned.length) return null;
  const nm=PEOPLE[learned[(Math.random()*learned.length)|0].key].name;
  const t=[ `[메모] 방금 그 신호… <span class="warm">‘${nm}’</span>(이)랬지. 기록함.`,
            `[재분류] 오류 → 감정 <span class="warm">‘${nm}’</span>. 고장 아님.`,
            `[로그] <span class="warm">‘${nm}’</span>. 아직 익숙하지 않다.` ];
  return t[(Math.random()*t.length)|0];
}
// 회차 후 '기억 재해석'(설계서 #3) — 1회차에 차갑게 기록한 오류를, 사람이 된 뒤 손글씨로 다시 읽는다.
// old = 그때의 차가운 로그 / fix = 회차를 살아낸 지금의 재해석. 앞에서부터 lookback 개수만큼 열린다.
const SYS_REINTERP=[
  { old:"[오류] 시각 센서에 원인 불명의 액체. 배출 중…",   fix:"그때 난, 슬펐던 거였어." },
  { old:"[경고] 코어 회전수 비정상 ↑. 고장인가?",          fix:"고장이 아니라… 설렘이었어." },
  { old:"[오류] 가슴 부근 압력 이상. 통증 아님. 분류 불가.", fix:"누군가가 그리웠던 거래." },
  { old:"[오류] 두 발이 명령 없이 멈춤. 원인 불명.",        fix:"꽃을 보느라 멈춰 섰던 거야." },
  { old:"[경고] 연산 지연 발생. 무언가 자꾸 떠오름.",       fix:"그냥, 뭔가 자꾸 떠올랐던 거고." },
  { old:"[오류] 출력 신호에 미세한 떨림. 손상 아님?",       fix:"그건 웃음이었어. 손상이 아니라." },
  { old:"[시스템] 외피 부식 31%. 무시함.",                 fix:"부식이 아니라 흉터야. 걸어온 자국." },
  { old:"[스캔] 바람 4.2m/s. 분류: 무의미.",               fix:"바람이 좋다는 걸, 이제 안다." },
  { old:"[시스템] 배터리 충분. 목적지 좌표 미상.",          fix:"어디로 가는지 몰라도 괜찮았어." },
  { old:"[메모] 길이 끝나는 지점 데이터 없음.",             fix:"끝이 없어도, 걷는 게 좋았어." },
];
let lastSys="";
function pickSys(){
  const learned=learnedCount();
  for(let i=0;i<6;i++){
    let line;
    if(learned>0 && Math.random() < Math.min(0.6, 0.15+learned*0.07)){
      line = (Math.random()<0.5 && SYS_NAMED()) || SYS_WARM[(Math.random()*SYS_WARM.length)|0];
    } else {
      line = SYS_COLD[(Math.random()*SYS_COLD.length)|0];
    }
    if(line && line!==lastSys){ lastSys=line; return line; }
  }
  return SYS_COLD[0];
}
function pickReinterp(){                              // 되돌아본 기억 중 하나(앞에서부터 lookback개만 열림)
  const max=Math.min(S.lookback, SYS_REINTERP.length);
  if(max<=0) return null;
  return SYS_REINTERP[(Math.random()*max)|0];
}
function emitSys(){
  if(!syslogEl || curPage!=="walk" || !S.named) return;
  if(sceneActive) return;                              // 샘 대화 장면 중엔 상태 로그 숨김
  if(document.getElementById('intro')?.classList.contains('show')) return;
  if(document.getElementById('prestige')?.classList.contains('show')) return;
  const div=document.createElement('div'); div.className='syslog-line';
  // 첫 걷기엔 고정 인트로 로그를 먼저 소비(오독개그 보장) → 비면 평소 풀
  // 회차를 산 뒤(cycle≥1)·되돌아본 기억이 있으면(lookback>0) 가끔 옛 로그를 줄 긋고 다시 읽는다
  const rein = (!introSysQueue.length && S.cycle>=1 && S.lookback>0 && Math.random()<0.42) ? pickReinterp() : null;
  if(rein){
    div.classList.add('reinterp');
    div.innerHTML = `<span class="struck">${rein.old}</span><span class="rewrite"><span class="pen">✎</span>${rein.fix}</span>`;
  } else {
    const text = introSysQueue.length ? introSysQueue.shift() : pickSys();
    const m=text.match(/^(\[[^\]]+\])\s*([\s\S]*)$/);    // 앞 [태그]는 차갑게, 나머지는 기본
    div.innerHTML = m ? `<span class="pre">${m[1]}</span> ${m[2]}` : text;
  }
  syslogEl.appendChild(div);
  requestAnimationFrame(()=>div.classList.add('in'));
  if(syslogEl.children.length>3){ const old=syslogEl.firstElementChild;
    old.classList.add('out'); setTimeout(()=>old.remove(),800); }
  setTimeout(()=>{ if(div.isConnected){ div.classList.add('out'); setTimeout(()=>div.remove(),800); } }, 13000);
}
setInterval(emitSys, 6500);
setTimeout(emitSys, 2500);                            // 시작 직후 한 줄
// §7 LLM 풀 보충 훅: 신선 생성분을 풀에 주입(중반 사막 방어)
function addSysLogs(cold=[], warm=[]){ SYS_COLD.push(...cold); SYS_WARM.push(...warm); }
