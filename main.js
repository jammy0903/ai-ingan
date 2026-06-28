/* ===== main.js — index.html에서 분리(구조 분리 2026-06-22). idle루프·줌입력·페이지전환·부팅.
   ⚠️ 전역 스크립트(모듈 아님) — 전역 스코프 공유, 로드 순서 = 원본 순서. sw.js CORE/정규식 등재. ===== */
/* ---------- idle 루프 (기본 1초 1걸음 → 1초 1보) ---------- */
setInterval(()=>{ if(sceneActive||intro.phase!=="play") return;   // 샘 대화/깨우기 중엔 걷지 않음(걸음 정지)
  S.walks += effRate()*0.1; elWalks.textContent=fmt(S.walks); syncSteps();
  // ⚠️ 만남 모달(글 읽는 중) 등 오버레이가 떠 있으면 '발견'도 '포커스'도 둘 다 보류 → 다 읽고 닫은 뒤에 비로소 다음 노드가 생긴다.
  const _ov = ['modal','sackModal','prestige','endcine'].some(id=>{const e=document.getElementById(id); return e&&e.classList.contains('show');});
  if(_ov || busyMeet) return;     // 만남 진행 중(이동~모달)·오버레이 떠 있으면 다음 노드 발견·포커스 보류
  updateDiscovered();                                 // 다음 노드 1개를 '열림'(도달가능)이면 발견 → focusQueue 설정
  if(focusQueue && curPage==="map"){ const id=focusQueue; focusQueue=null; renderEdges(); renderNodes(); placeRobot();
    if(focusArmed) panTo(id);              // 플레이 중 진짜 해금 발견 → 그곳으로 포커스 연출
    else centerOn(S.current); } }, 100);   // 🆕 부팅/복원 시의 발견 → 카메라 안 뺏고 로봇 현재 노드 유지

/* ---------- 줌 입력 ---------- */
document.getElementById('zin').addEventListener('click', ()=>setZoom(zoom*1.25));
document.getElementById('zout').addEventListener('click', ()=>setZoom(zoom/1.25));
// 마우스 휠 = 줌 (ctrl 불필요)
map.addEventListener('wheel', e=>{ e.preventDefault(); setZoom(zoom*(e.deltaY<0?1.12:0.9)); }, {passive:false});
// 모바일 = 손가락 둘로 핀치 줌 (passive:false + preventDefault로 브라우저 기본 제스처 차단)
let pinch=null;
const tdist=t=>Math.hypot(t[0].clientX-t[1].clientX, t[0].clientY-t[1].clientY);
map.addEventListener('touchstart', e=>{ if(e.touches.length===2){ e.preventDefault(); pinch={d:tdist(e.touches), z:zoom}; window.__pinch=true; } }, {passive:false});
map.addEventListener('touchmove', e=>{ if(pinch&&e.touches.length===2){ e.preventDefault(); setZoom(pinch.z * tdist(e.touches)/pinch.d); } }, {passive:false});
map.addEventListener('touchend', e=>{ if(e.touches.length<2){ pinch=null; window.__pinch=false; } });

/* ---------- 페이지 전환 (거지키우기식: 길 ↔ 지도) ---------- */
let curPage = "walk";
function showPage(name){
  if(name!=="walk") previewNode=null;   // 길을 떠나면 워프 미리보기 해제 → 지도 로봇은 실제 S.current로
  curPage = name;
  document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active", p.id==="page"+name[0].toUpperCase()+name.slice(1)));
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active", t.dataset.page===name));
  if(name==="map"){ renderAll(); centerOn(S.current); }   // 숨어있던 지도 → 표시될 때 치수 잡고 렌더
  else if(name==="walk"){ setTimeout(emitSys, 400); }     // 길로 돌아오면 곧 상태 로그 한 줄
  else if(name==="body"){ renderBodyPage(); }             // 🆕 몸 탭 — 온기 상점 렌더
  else if(name==="admin"){ adminRenderPage(); }           // 관리자 탭 — 콘솔 렌더
  renderSituFig();                                        // 길 화면이면 현재 노드의 상황 figure 표시(스르륵)
}
document.querySelectorAll(".tab").forEach(t=> t.addEventListener("click", ()=>showPage(t.dataset.page)) );

/* ---------- 시작 ---------- */
window.addEventListener("resize", ()=>{ if(curPage==="map"){ renderAll(); centerOn(S.current); } });
bootSave();             // 세이브 불러오기(+오프라인 적립)
refreshHUD();           // 길 페이지 먼저 보이므로 HUD/온도만 갱신 (지도는 진입 시 렌더)
initAuth();             // 구글 로그인 초기화(세션 복원/버튼)
