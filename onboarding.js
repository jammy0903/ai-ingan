/* ===== onboarding.js — index.html에서 분리(구조 분리 2026-06-22). 온보딩·게이트·샘 대화·닉네임.
   ⚠️ 전역 스크립트(모듈 아님) — 전역 스코프 공유, 로드 순서 = 원본 순서. sw.js CORE/정규식 등재. ===== */
/* ---------- 첫 플레이 온보딩: 탭으로 깨우기 → 샘 퀘스트 → 이름짓기 → 규칙설명 → 걷기 ----------
   2026-06-19 개편: 옛 모달 3컷(깨어남·결핍·동기화실패)은 startWake()의 탭 연출로 흡수됨
   (깨어남=탭 / 결핍=빈 코어+한 줄 / 동기화실패=기립 직후). 이름짓기는 샘 퀘스트 뒤로 이동. */
function hasProgress(){
  if(S.seenIntro || S.named || S.cycle>0 || S.depth>0) return true;
  // 🆕 실제 '만남'(start 제외 레벨>0)만 진행으로 인정 — 단순 발견(안갯속 미리보기)·idle 걸음은 진행이 아니다(온보딩 오판 방지)
  return NODES.some(n=> n.id!=="start" && (S.levels[n.id]||0)>0);
}
function startIntro(){
  if(hasProgress()){ S.seenIntro=true; closeGate(); decideEntry(); return; }  // 이미 시작/진행한 유저 — 튜토리얼 강제 안 함
  S.seenIntro=true; saveState();                       // 온보딩이 시작되면 '봤음' — 이후 강제 재노출 안 함
  closeGate();
  startWake();                                          // 모달 3컷 대신: 탭으로 깨우기부터(손맛 먼저)
}
function closeIntro(){ document.getElementById('intro')?.classList.remove('show'); }

/* ---------- 온보딩 비트0: 탭으로 깨우기 (손맛 먼저, 설명 0) ----------
   탭마다 로봇이 깨어나지만(밝아짐·기립) 가슴 코어만 어두운 빈 구멍으로 남는다(coreEmpty).
   기립(WAKE_TAPS) 순간 결핍 한 줄 "…여기만, 비어 있다" → [ERROR 동기화 실패] → 샘 등장. */
function startWake(){
  showPage('walk');
  intro.phase="wake"; wakeTaps=0;
  app.classList.add("coreEmpty");                       // 코어 = 빈 구멍(첫 감정 전까지)
  introSysQueue=INTRO_SYSLOG.slice();                  // 걷기 시작하면 흐를 고정 syslog(오독개그 포함)
  $("#hint").style.visibility="hidden";
  if(syslogEl) syslogEl.innerHTML="";
  walkRobot.classList.add("waking"); renderWakeFrame(0);
  showWakePrompt("눌러서 깨워주세요");
}
function renderWakeFrame(n){                            // n: 0→WAKE_TAPS 비례로 누운 자세(어둡고 -80°)→기립(밝고 0°)
  const f=Math.min(1,n/WAKE_TAPS);
  const ang=((1-f)*-80).toFixed(1);                    // -80°(고철 더미에 누움) → 0°(똑바로 섬), 발이 축
  walkRobot.style.opacity=(0.5+f*0.5).toFixed(2);
  walkRobot.style.filter=`grayscale(${(1-f).toFixed(2)}) brightness(${(0.78+f*0.22).toFixed(2)})`;
  walkRobot.style.transform=`translateX(-50%) rotate(${ang}deg)`;
}
function wakeTap(x,y){
  wakeTaps++; renderWakeFrame(wakeTaps);
  if(x!=null){ const m=document.createElement("div"); m.className="mote";
    m.style.left=x+"px"; m.style.top=y+"px"; document.body.appendChild(m); setTimeout(()=>m.remove(),1300); }
  if(wakeTaps>=WAKE_TAPS) finishWake();
}
function finishWake(){
  track("wake_done",{});                               // 온보딩 1단(깨우기) 통과
  intro.phase="wakedone";                              // 결핍 비트 동안 탭 멈춤
  walkRobot.classList.remove("waking");
  walkRobot.style.opacity=""; walkRobot.style.filter=""; walkRobot.style.transform="";  // 기립 완료(coreEmpty는 #app에 유지)
  showWakePrompt("…여기만, 비어 있다.", true);          // 결핍 한 줄 — 조용히
  // 가드: 도중에 dismissOnboarding(세이브 늦게 도착)이 phase를 바꾸면 비트 취소
  setTimeout(()=>{ if(intro.phase==="wakedone") showWakePrompt("[ERROR: 창조주 동기화 실패]", false, true); }, 1700);
  setTimeout(()=>{ if(intro.phase!=="wakedone") return; hideWakePrompt(); intro.phase="play"; startSamScene(); }, 3700);  // → 길 위 샘 등장(퀘스트)
}
function showWakePrompt(text, deficit, cold){
  const w=$("#wakePrompt"); if(!w) return;
  w.textContent=text; w.classList.toggle("deficit",!!deficit); w.classList.toggle("cold",!!cold); w.classList.add("show");
}
function hideWakePrompt(){ $("#wakePrompt")?.classList.remove("show"); }
// 진행 중인 온보딩(인트로 모달 + 길 위 샘 대화)을 즉시 걷어낸다 — 세이브가 늦게 도착했을 때 등
function dismissOnboarding(){
  closeIntro();
  const sc=document.getElementById('samScene');
  if(sc){ sc.classList.remove("show"); sc.querySelectorAll(".scenebub").forEach(x=>x.remove()); }
  sceneActive=false; samVisible=false;
  intro.phase="play"; wakeTaps=0;                       // 깨우기 비트도 걷어냄
  document.getElementById('wakePrompt')?.classList.remove("show");
  document.getElementById('sceneTapHint')?.classList.remove("show");
  document.getElementById('sam')?.classList.remove("in","out");
  if(typeof walkRobot!=="undefined" && walkRobot){ walkRobot.classList.remove("waking"); walkRobot.style.left=""; walkRobot.style.opacity=""; walkRobot.style.filter=""; walkRobot.style.transform=""; }
}

/* ---------- 시작 게이트 (로그인 권장 — 스킵 가능) ---------- */
function showGate(){ intro.phase="gate"; document.getElementById('gate')?.classList.add('show'); }   // 🆕 게이트 떠있는 동안 게임 정지(idle 걸음·노드 발견 누적 차단 → 온보딩 오판 방지). 둘러보기/로그인 시 startWake가 phase 전환.
function closeGate(){ document.getElementById('gate')?.classList.remove('show'); }
// 로컬에 Supabase 세션 토큰이 있으면 = 로그인된 복귀 유저 (인증은 부팅 직후 비동기로 해소됨)
function hasAuthSession(){
  try{ return Object.keys(localStorage).some(k=>k.startsWith('sb-') && k.includes('auth-token')); }catch(e){ return false; }
}
// OAuth 리다이렉트 직후(=방금 로그인) — URL에 code/token이 있으면 교환이 비동기로 진행 중.
// 이땐 아직 localStorage 토큰이 없어 hasAuthSession()이 false라, 게이트가 잠깐 뜨는 레이스 차단.
// (앱 webview는 code 교환이 네트워크라 더 느려 이 창이 길다 — 모바일에서 "로그인했는데 다시 로그인화면" 버그의 원인)
function authRedirectPending(){
  try{ return /[?&]code=/.test(location.search) || /[#&](access_token|code)=/.test(location.hash); }catch(e){ return false; }
}
// 들어올 때 무엇을 보여줄지: 이미 지났으면 바로 게임 / 로그인 상태면 온보딩 / 아니면 게이트
function decideEntry(){
  if(S.seenIntro){
    closeGate(); closeIntro();
    if(!S.named) ensureRobotName();                     // 이름 없이 지나친 경우 자동 이름 부여
    refreshHUD();
    if(typeof syncBgmToCurrent==="function") syncBgmToCurrent();   // 복원된 위치에 맞는 곡으로 BGM 동기화(부팅/세이브 도착)
    return;
  }
  if(typeof authUser!=="undefined" && authUser){ startIntro(); return; }  // 로그인 했으면 게이트 건너뛰고 온보딩
  // 아직 authUser 미해소지만 (세션 토큰이 있거나 || 방금 OAuth 리다이렉트로 교환 중)이면 = 로그인 유저
  // → 게이트 깜빡임 방지, onAuthChanged가 곧 처리. (authRedirectPending이 앱 첫 로그인 후 게이트 재노출 버그 차단)
  if(hasAuthSession() || authRedirectPending()) return;
  showGate();
}
$("#gGoogle")?.addEventListener("click", ()=>{ if(typeof googleLogin==="function") googleLogin(); });
$("#gBrowse")?.addEventListener("click", ()=>{ startIntro(); });          // 로그인 없이 둘러보기 → 온보딩
// 이름짓기 모달 — 샘 퀘스트 직후 호출(사명을 받은 뒤 이름 = 각오). onDone에서 샘 장면을 이어감.
function openNamingModal(onDone){
  sceneReady=false;                                     // 모달 동안 탭(대사진행) 잠금
  $("#sceneTapHint").classList.remove("show");
  const t=$("#introText"), nb=$("#introName"), btn=$("#introBtn"), skip=$("#introSkip");
  document.getElementById('intro').classList.add('show');
  t.textContent="…이제 이름이 필요해.\n날 뭐라고 부를래?"; t.classList.remove("cold");
  nb.style.display="flex"; if(skip) skip.style.display="none"; btn.textContent="이 이름으로, 출발";
  const inp=$("#nameInput"); if(!inp.value){ S.robotName=""; ensureRobotName(); inp.value=S.robotName; }
  btn.onclick=()=>{
    S.robotName=(inp.value||"").trim().slice(0,8) || S.robotName;
    ensureRobotName(); S.named=true; closeIntro(); refreshHUD(); saveState();
    sceneReady=true; if(onDone) onDone();
  };
}
function beginAdventure(){
  const h=$("#hint"); h.style.visibility=""; h.textContent=`그렇게, ${S.robotName}의 모험이 시작된다!`;
  setTimeout(()=>{ h.textContent="이 길을 두드릴수록 로봇이 더 빨리 걷는다"; }, 5000);
}

/* ---------- 온보딩 직후 1회: 길 위에서 샘과 말풍선 대화 → 로봇이 규칙 설명 → 걷기 시작 ----------
   장면 동안엔 걷지 않는다(idle 걸음 정지). 샘과의 대화가 끝나면 샘은 떠나고,
   로봇이 사용자에게 "걸은 만큼 마음·몸을 줍는다"는 규칙을 직접 설명한 뒤 비로소 걷기 시작. */
const ROBOT_X_TALK="26%", ROBOT_X_PLAY="44%";                // 대화 땐 거리를 넓혀 말풍선 자리 확보(로봇 element용)
const ROBOT_PCT_TALK=0.26, ROBOT_PCT_PLAY=0.44, SAM_PCT=0.73; // 말풍선 꼬리가 가리킬 화자 위치(0~1)
const SAM_SCRIPT=[
  {who:'sam', t:"안녕.\n깨어났구나."},
  {who:'sam', t:"난 샘알트-머스크.\n널 만든 사람이지."},
  {who:'bot', t:"나…\n사람 아니야?"},
  {who:'sam', t:"응. 넌 로봇이야."},
  {who:'bot', t:"그럼 사람으로\n만들어줘!"},
  {who:'sam', t:"그래. 근데 그냥은 안 돼.\n마음 27, 몸 11.\n전부 모아 와."},
  {who:'sam', t:"다 모으면 그때\n진짜 사람으로\n만들어줄게."},
  {naming:true},                                       // ← 샘 퇴장 + 이름 짓기(사명 직후 = 각오)
  // ↓ 이름 지은 뒤, 로봇이 사용자에게 규칙 설명 (걷기 전)
  {who:'bot', t:"[목표 수신]\n마음 27 · 몸 11"},
  {who:'bot', t:"…근데\n어떻게 모으지?"},
  {who:'bot', t:"아~\n길에서 사람을 만나면\n마음도 몸도 한 조각씩!"},
  {who:'bot', t:"가만히 둬도 걸어.\n근데 네가 화면을 톡톡!\n그럼 내가 더 빨리 걸어."},
  {who:'bot', t:"그러니까…\n같이 걸어줘."},
  {cloud:true} ];                                      // ← 걷기 직전: 구름 튜토리얼(구름이 말풍선으로 직접 설명 → 터치=선물, 누를수록 ↑)
let samVisible=false, forceOnboard=false;   // forceOnboard = 관리자 '온보딩 다시보기'(진행 있어도 샘 생략 가드 우회, 비파괴)
function startSamScene(){
  if(!forceOnboard && (S.cycle>0 || S.depth>0 || (S.discovered && Object.keys(S.discovered).length>0))){ beginAdventure(); return; }  // 이미 진행한 유저 — 샘 대화 생략
  showPage('walk');
  sceneActive=true; sceneReady=false; sceneStep=0; samVisible=true;
  if(syslogEl) syslogEl.innerHTML="";                  // 대화 동안 상태 로그 비움
  $("#hint").style.visibility="hidden";
  walkRobot.style.left=ROBOT_X_TALK;                   // 로봇은 옆으로 물러나 거리 확보
  $("#samScene").classList.add("show");
  $("#sam").classList.remove("out"); $("#sam").classList.add("in");   // 샘 등장
  setTimeout(()=>{ sceneReady=true; renderSceneBubble(); }, 650);     // 등장 후 첫 말풍선
  setTimeout(()=>$("#sceneTapHint").classList.add("show"), 1200);
}
function renderSceneBubble(){
  const sc=$("#samScene");
  sc.querySelectorAll(".scenebub").forEach(b=>{ b.classList.add("out"); setTimeout(()=>b.remove(),360); });
  if(sceneStep>=SAM_SCRIPT.length){ endSamScene(); return; }
  const cur=SAM_SCRIPT[sceneStep];
  if(cur.naming){                                      // 사명 직후: 샘 퇴장 + 이름 짓기 → 이어서 로봇이 규칙 설명
    if(samVisible){ samVisible=false; $("#sam").classList.remove("in"); $("#sam").classList.add("out"); walkRobot.style.left=ROBOT_X_PLAY; }
    openNamingModal(()=>{ sceneStep++; $("#sceneTapHint").classList.add("show"); renderSceneBubble(); });
    return;
  }
  if(cur.cloud){ spawnTutorialCloud(); return; }        // 🆕 구름 튜토리얼: 구름이 말풍선으로 직접 설명 → 터치해야 다음(걷기)
  const b=document.createElement("div");
  b.className="scenebub "+(cur.who==="sam"?"fromSam":"fromBot");
  b.textContent=cur.t;
  sc.appendChild(b);                                  // 먼저 붙여 폭 측정 → 화면 안으로 클램프
  const pct = cur.who==="sam" ? SAM_PCT : (samVisible ? ROBOT_PCT_TALK : ROBOT_PCT_PLAY);
  placeBubble(b, pct);
  requestAnimationFrame(()=>b.classList.add("in"));
}
// 말풍선 본체는 화면(8px 여백) 안으로 클램프하고, 꼬리(--tail)만 화자 머리 위를 가리킨다
function placeBubble(b, pct){
  const sc=$("#samScene"), W=sc.getBoundingClientRect().width, pad=14;
  const speakerX = W*pct, bw=b.getBoundingClientRect().width;
  const left = Math.max(pad, Math.min(speakerX - bw/2, W - bw - pad));
  b.style.left = left+"px";
  b.style.setProperty("--tail", Math.max(16, Math.min(bw-16, speakerX-left))+"px");
}
/* 🆕 온보딩 마지막: 구름이 말풍선으로 "날 누르면 걸음 선물! 누를수록 더!" → 터치하면 선물+걷기 시작.
   구름은 #samScene(z6) 안에 둬야 위에서 탭을 받는다(#clouds는 z2라 씬에 가려져 못 받음). */
function spawnTutorialCloud(){
  $("#sceneTapHint").classList.remove("show");          // '화면 톡 - 다음' 숨김 — 구름 터치로만 진행
  sceneReady=false;                                     // 빈 곳 탭으론 안 넘어감(구름만)
  const sc=$("#samScene");
  const c=document.createElement("div");
  c.className="cloud tutCloud"; c.innerHTML=CLOUD_SVG();
  c.style.cssText="left:50%; top:38%; transform:translateX(-50%); animation:none;";   // 안 떠다니고 가운데 정지
  c.addEventListener("pointerdown", e=>{ e.stopPropagation(); popTutorialCloud(c); }); // 스톱: 씬 advance(addWalk)로 안 새게
  sc.appendChild(c);
  const b=document.createElement("div");
  b.className="scenebub fromBot tutCloudBub";
  b.textContent="안녕! 날 톡 누르면\n걸음을 선물로 줄게.\n누를수록 더 많이!";
  sc.appendChild(b);
  b.style.top="18%";                                    // 구름(38%) 위 — 꼬리가 아래 구름을 가리킴
  placeBubble(b, 0.5);
  requestAnimationFrame(()=>b.classList.add("in"));
}
function popTutorialCloud(c){
  if(c._popped) return; c._popped=true;
  cloudGiftFx(c);                                       // 뿅 + 물비 + 누적 선물(view.js 공통, 첫 100·둘째 200…)
  $("#samScene").querySelectorAll(".tutCloudBub").forEach(b=>{ b.classList.add("out"); setTimeout(()=>b.remove(),360); });
  setTimeout(()=>{ sceneStep++; renderSceneBubble(); }, 750);   // → 다음 스텝=끝 → endSamScene → 걷기 시작
}
function advanceScene(){ if(!sceneActive || !sceneReady) return; sceneStep++; renderSceneBubble(); }
function endSamScene(){
  track("quest_received",{});                          // 온보딩 2단(샘 퀘스트) 통과 → 모험 시작
  sceneActive=false;                                   // ← 이제부터 걷기 시작(idle 걸음 재개)
  const sc=$("#samScene");
  $("#sceneTapHint").classList.remove("show");
  walkRobot.style.left="";                             // 평소 위치(44%)로 복귀
  sc.classList.remove("show");
  sc.querySelectorAll(".scenebub, .tutCloud").forEach(x=>x.remove());   // 🆕 튜토리얼 구름 잔여물도 정리
  $("#sam").classList.remove("in","out"); samVisible=false;
  forceOnboard=false;                                  // 재생 종료
  beginAdventure();
  setTimeout(emitSys, 900);
  setTimeout(()=>{ try{ startMapTut(); }catch(_){} }, 1300);   // 🆕 걷기 시작 직후 지도 스포트라이트 튜토리얼(1회)
}
$("#rerollBtn").addEventListener("click",()=>{ S.robotName=""; ensureRobotName(); $("#nameInput").value=S.robotName; });
// 샘 장면(튜토리얼) 넘어가기 → 바로 게임 시작
$("#samSkip").addEventListener("pointerdown", e=>e.stopPropagation());            // 버튼 탭이 대사진행(addWalk)으로 새지 않게
$("#samSkip").addEventListener("click", e=>{ e.stopPropagation(); if(sceneActive) endSamScene(); });

/* ---------- 닉네임 변경 (헤더 이름 ✎ 클릭) — 저장 시 saveState로 로컬+Supabase 반영 ---------- */
const renameOv=$("#renameOv");
function openRename(){
  if(!S.robotName) return;                              // 아직 이름이 없으면(미시작) 무시
  $("#renameInput").value=S.robotName;
  renameOv.classList.add("show");
  setTimeout(()=>{ const i=$("#renameInput"); i.focus(); i.select(); }, 50);
}
function closeRename(){ renameOv.classList.remove("show"); }
function applyRename(){
  const v=($("#renameInput").value||"").trim().slice(0,8);
  if(v && v!==S.robotName){ S.robotName=v; S.named=true; refreshHUD(); saveState(); }  // saveState → 클라우드까지 저장
  closeRename();
}
$("#robotName")?.addEventListener("click", openRename);
$("#renameReroll")?.addEventListener("click", ()=>{ const inp=$("#renameInput"); let n;
  do{ n=ROBOT_NAMES[Math.floor(Math.random()*ROBOT_NAMES.length)]; }while(n===inp.value && ROBOT_NAMES.length>1); inp.value=n; });
$("#renameOk")?.addEventListener("click", applyRename);
$("#renameCancel")?.addEventListener("click", closeRename);
renameOv?.addEventListener("click", e=>{ if(e.target===renameOv) closeRename(); });
$("#renameInput")?.addEventListener("keydown", e=>{ if(e.key==="Enter") applyRename(); else if(e.key==="Escape") closeRename(); });

/* ===== 🆕 스포트라이트 튜토리얼 — 지도→긍정→기쁨→재회→다음노드→가방 (+목표카운터·빈원·색번짐·오프라인) =====
   '정해진 곳만 빛나고 거기를 눌러야 다음' 표준 코치마크. 상태 기반(이벤트 훅 최소) 폴링 rAF로 구동.
   4장 패널이 타깃만 빼고 화면을 가려 '구멍'을 만든다 → 그 타깃만 탭 통과. 모달 떠 있으면 잠깐 숨김. */
let tutActive=false, tutStep=0, tutRaf=0, _tutShownStep=-1, _tutEls=null;
const TUT_GRANT_STEPS = 1500;   // 튜토리얼 시작 시 걸음 선물 — 노드·재회 비용에 막히지 않게(유저 결정: 넉넉히 지급)
function tutDom(){
  if(_tutEls) return _tutEls;
  const mk=cls=>{ const d=document.createElement("div"); d.className=cls; document.body.appendChild(d); return d; };
  const panels=[mk("tutpanel"),mk("tutpanel"),mk("tutpanel"),mk("tutpanel")];
  const ring=mk("tutring");
  const cap=mk("tutcap");
  const skip=document.createElement("button"); skip.id="tutSkip"; skip.type="button"; skip.textContent="튜토리얼 건너뛰기 ›";
  skip.addEventListener("click", e=>{ e.stopPropagation(); tutEnd(); }); document.body.appendChild(skip);
  return (_tutEls={panels, ring, cap, skip});
}
function tutModalOpen(){   // 메인 모달/자루/리네임 등 떠 있으면 스포트라이트 숨김(겹침 방지)
  return ["modal","sackModal","renameOv","gate","endcine"].some(id=>{ const e=document.getElementById(id); return e && e.classList.contains("show"); });
}
function firstCatPosNext(){   // 재회 후 안갯속에서 열린 다음 긍정 감정(기쁨 외, 빈 원)
  return NODES.find(n=>n.type==="person" && n.parent==="cat_pos" && n.id!=="joy" && isRevealed(n.id) && !(S.levels[n.id]>0));
}
const MAP_TUT=[
  { tap:true, find:()=>document.querySelector('.tab[data-page="map"]'),
    cap:"먼저 지도를 보자.\n「🗺 지도」를 톡!",
    done:()=>curPage==="map" },
  { tap:true, find:()=>document.querySelector('.node[data-id="cat_pos"]'), onShow:()=>panTo("cat_pos"),
    cap:"여긴 「긍정·흥미」 갈래.\n톡 눌러 걸음으로 가보자.",
    done:()=>S.levels["cat_pos"]>0 },
  { tap:true, find:()=>document.querySelector('.node[data-id="joy"]'), onShow:()=>panTo("joy"),
    cap:"첫 감정, 「기쁨」!\n다가가 만나보자.",
    done:()=>S.levels["joy"]>0 },
  { info:true, find:()=>document.getElementById("fragStat"),
    cap:"🧩 1/27! 회색 세계에 색이 번졌지?\n마음 27 · 몸 11을 다 모으면\n샘이 진짜 사람으로 만들어줘.",
    done:s=>s._adv },
  { tap:true, find:()=>{ const b=document.getElementById("reunionBtn"); return (b&&b.classList.contains("show"))?b:null; },
    cap:"이제 재회! 「다시 만나기」를 눌러.\n재회하면 더 깊어지고 ✨온기를 얻어 —\n그리고 재회해야 다음 감정이 열려!",
    done:()=>S.levels["joy"]>=2 },
  { info:true, find:()=>{ const n=firstCatPosNext(); return n?document.querySelector(`.node[data-id="${n.id}"]`):null; },
    onShow:()=>{ const n=firstCatPosNext(); if(n) panTo(n.id); },
    cap:"봐, 다음 감정이 안갯속에서 열렸어!\n흐릿한 빈 원 = 다음 예고야.",
    done:s=>s._adv },
  { tap:true, find:()=>document.querySelector('.tab[data-page="walk"]'),
    cap:"가방을 보러 「🚶 길」로 돌아가자.",
    done:()=>curPage==="walk" },
  { tap:true, find:()=>document.getElementById("sack"),
    cap:"등의 가방을 톡!\n여기서 ✨온기로 「몸(신체)」을 사 모아.\n사람이 되려면 몸 11도 필요해\n(감정 27을 다 모으면 열려).",
    done:()=>{ const e=document.getElementById("sackModal"); return e&&e.classList.contains("show"); } },
  { info:true, find:()=>document.getElementById("fragStat"),
    cap:"끝! 꺼도 로봇은 계속 걸어둬 🌙\n돌아오면 걸음이 쌓여 있어.\n자, 같이 사람이 되자.",
    done:s=>s._adv },
];
function startMapTut(){
  if(tutActive || S.seenMapTut) return;
  if(S.cycle>0 || S.depth>0){ S.seenMapTut=true; return; }   // 이미 진행한 유저면 표시만 하고 생략
  tutActive=true; tutStep=0; _tutShownStep=-1;
  MAP_TUT.forEach(s=>s._adv=false);
  S.walks += TUT_GRANT_STEPS; syncSteps(); refreshHUD();      // 걸음 선물(막힘 방지)
  try{ bgmTo("main"); }catch(_){}                              // 🆕 튜토리얼 동안은 처음 바탕음악(main) 고정(첫 탭 제스처에 시동)
  tutDom().skip.style.display="block";
  tutLoop();
}
function tutLoop(){
  if(!tutActive) return;
  tutRaf=requestAnimationFrame(tutLoop);
  const els=tutDom(), cur=MAP_TUT[tutStep];
  if(!cur){ tutEnd(); return; }
  if(cur.done(cur)){ _tutShownStep=-1; tutStep++; return; }   // 완료 → 다음 스텝
  const el = tutModalOpen() ? null : cur.find();
  if(!el){ tutHideSpot(els); return; }                        // 타깃 아직 없음/모달 중 → 잠깐 숨김
  if(_tutShownStep!==tutStep){ _tutShownStep=tutStep; if(cur.onShow) try{ cur.onShow(); }catch(_){} }
  tutPlaceSpot(els, el, cur);
}
function tutHideSpot(els){ els.panels.forEach(p=>p.style.display="none"); els.ring.style.display="none"; els.cap.style.display="none"; }
function tutShake(els){ els.ring.classList.remove("flash"); void els.ring.offsetWidth; els.ring.classList.add("flash"); }
function tutPlaceSpot(els, el, cur){
  const r=el.getBoundingClientRect(), W=innerWidth, H=innerHeight, pad=6;
  const x=Math.max(0,r.left-pad), y=Math.max(0,r.top-pad), w=r.width+pad*2, h=r.height+pad*2;
  const [pt,pb,pl,pr]=els.panels;
  const onClick = cur.info ? (()=>{ cur._adv=true; }) : (()=>tutShake(els));
  const set=(p,l,t,ww,hh)=>{ p.style.display="block"; p.style.left=l+"px"; p.style.top=t+"px";
    p.style.width=Math.max(0,ww)+"px"; p.style.height=Math.max(0,hh)+"px";
    p.className="tutpanel"+(cur.info?" info":""); p.onclick=onClick; };
  set(pt, 0, 0, W, y);                       // 위
  set(pb, 0, y+h, W, H-(y+h));               // 아래
  set(pl, 0, y, x, h);                       // 왼
  set(pr, x+w, y, W-(x+w), h);               // 오른
  els.ring.style.display="block"; els.ring.style.left=x+"px"; els.ring.style.top=y+"px";
  els.ring.style.width=w+"px"; els.ring.style.height=h+"px";
  els.cap.style.display="block";
  els.cap.innerHTML = cur.cap.replace(/\n/g,"<br>") + (cur.tap?'<span class="tuttap">👆 여기를 톡</span>':(cur.info?'<span class="tuttap">탭하면 다음 ›</span>':''));
  const capW=els.cap.offsetWidth, capH=els.cap.offsetHeight, cx=x+w/2;
  let top = y+h+12; if(top+capH > H-8) top = Math.max(8, y-capH-12);   // 아래 우선, 없으면 위
  els.cap.style.left = Math.max(8, Math.min(cx-capW/2, W-capW-8))+"px";
  els.cap.style.top  = top+"px";
}
function tutEnd(){
  tutActive=false; if(tutRaf){ cancelAnimationFrame(tutRaf); tutRaf=0; }
  if(_tutEls){ tutHideSpot(_tutEls); _tutEls.skip.style.display="none"; _tutEls.panels.forEach(p=>p.onclick=null); }
  S.seenMapTut=true; saveState();
  try{ syncBgmToCurrent(); }catch(_){}                         // 🆕 튜토리얼 끝 → 현재 노드 곡으로 복귀(기쁨 등). 이후 평소대로 전환
}
