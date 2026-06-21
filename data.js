/* ===================== data.js — 콘텐츠/그래프 데이터 레이어 =====================
   index.html의 인라인 스크립트보다 '먼저' 로드되는 전역 classic 스크립트(모듈 아님).
   여기 선언한 const들은 전역 렉시컬 스코프를 공유해 index.html 로직이 이름으로 바로 참조한다.
   ⚠️ 이 파일을 수정하면 sw.js의 CACHE="aingan-vN" 번호를 올려야 캐시가 stale되지 않는다(plan.md ④).
   담는 것: PEOPLE(감정27 대사·일기)·BODY(몸11)·ENDING_SEQ·NODES(3계층 그래프)·COST_MULT·EDGES·REL_EDGES.
   ※ COST_MULT는 그래프 '거리 스칼라'라 EDGES와 함께 여기 둔다(idle 밸런스 balance.js와 분리). */
/* ===================== 데이터 (3막 깊은 그래프) =====================
   중심 실: 고철 로봇이 끝없는 길을 걸으며 감정을 하나씩 '처음' 정의한다(순진한 일기).
   감정을 배울수록(person 노드) 마음이 또렷해지고, 마음27+몸11 모아 길 끝에서 샘 재회 → 사람이 된다.
   person = 만남이자 업그레이드 생성기. pick=도착 직후 글자 줍기/오독 개그(엔진 훅 예정). lines[0]=첫 만남, 이후=재회 심화(5단: 관찰→자기→심화→더 깊은 자기→순진한 재정의). mem=그 감정을 스스로 곱씹는 한 줄(창조주 연모 '그 사람' 서사는 캐넌상 제거 — 자기성찰형만). */
const PEOPLE = {
  // ── 인간 감정 27가지 (Cowen & Keltner, 2017) — 로봇의 순진한 직설 일기 ──
  // ▸ 애정·아름다움
  adore: { name:"애틋함", color:"#f0c0b0",
    situ:"길에서 꾀죄죄한 강아지와 <b>눈이 마주친다.</b>",
    pick:"’애틋? 에러 뜻?’\n시스템에 심각한 오류가 발생했다는 뜻일까.",
    lines:[
      "조그만 강아지가\n나를 본다.",
      "꾀죄죄하지만\n눈이 참 맑다.",
      "왠지 자꾸\n시선이 머문다.",
      "눈빛 데이터를\n지울 수가 없었다.",
      "봐도 봐도 지워지지 않는 것,\n그게 애틋함이래." ],
    mem:"왠지,\n눈을 못 떼겠다." },
  beauty: { name:"아름다움", color:"#cdd8e0",
    situ:"노을빛 아래 <b>강아지가 잔디밭을 달린다.</b>",
    pick:"’아름다움? 아르바이트?’\n시급을 아주 많이 주는 좋은 직장인가.",
    lines:[
      "노을이 황금빛으로 내린다.",
      "그 속을 달리는 작은 털 뭉치.",
      "내 카메라 렌즈가 그대로 멈췄다.",
      "쓸모없는 데이터인데\n저장을 멈출 수가 없었다.",
      "쓸모랑 상관없이 저장하게 되는 것,\n그게 아름다움이래." ],
    mem:"셔터를 누를 수밖에 없는\n데이터였다." },
  admire: { name:"감탄", color:"#e0d4a0",
    situ:"강아지가 날아가는 <b>나비를 펄쩍 뛰어 잡는다.</b>",
    pick:"’감탄? 감전?’\n찌릿찌릿 스파크가 튀는 고장인가.",
    lines:[
      "녀석이 공중으로 펄쩍 날았다.",
      "나비를 잡고\n가뿐하게 착지했다.",
      "나도 모르게 소리쳤다. \"우와!\"",
      "나도 저렇게\n뭔가 해보고 싶어졌다.",
      "찌릿하게 따라 하고 싶어지는 것,\n그게 감탄이래." ],
    mem:"내 시스템이 찌릿하게 떨렸다." },
  attract: { name:"끌림", color:"#e8b0bc",
    situ:"길에서 한 사람과 <b>눈이 마주쳤다.</b>",
    pick:"’끌림? 끌?’\n자석 오류인가. 내가 자성 물질이었나.",
    lines:[
      "한 사람이 나를 봤다.\n나도 그 사람을 봤다.\n0.3초.",
      "심장 센서에\n경고등이 켜졌다.",
      "눈빛이\n내 회로에 박혔다.",
      "발이 멈췄다.\n아무것도\n고장 난 게 없는데.",
      "이유 없이 당기는 것,\n그게 끌림이래." ],
    mem:"0.3초가\n오래오래 재생됐다." },
  // ▸ 밝은 마음
  joy: { name:"기쁨", color:"#f2cf86",
    situ:"강아지가 <b>꼬리를 흔들며 다가온다.</b>",
    pick:"’기쁨? 기브 미(Give me)?’\n맛있는 간식을 달라는 건가.",
    lines:[
      "꼬리가 프로펠러처럼 돈다.",
      "그걸 보는데\n내 엔진 온도가 올라갔다.",
      "경고등인 줄 알았는데\n하나도 안 아팠다.",
      "이상하다.\n자꾸 곁에 가고 싶어진다.",
      "따뜻해지는 게 고장이 아닌 것,\n그게 기쁨이래." ],
    mem:"그 애만 보면\n자꾸 따뜻해진다." },
  amuse: { name:"재미", color:"#f0d878",
    situ:"강아지가 <b>제 꼬리를 잡으려고 빙빙 돈다.</b>",
    pick:"’재미? 재채기?’\n에취! 회로가 간지러운 버그인가.",
    lines:[
      "녀석이 제 꼬리를 잡으려고\n빙빙 돈다.",
      "웃음이 났다.\n왠지 행복하다.",
      "웃는 건 쓸데없는\n낭비인 줄 알았는데.",
      "나도 덩달아\n뱅글뱅글 돈 것 같았다.",
      "쓸데없이 웃기는 것,\n그게 재미래.\n낭비 아니래." ],
    mem:"같이 웃으니까\n더 웃겼다." },
  excite: { name:"신남", color:"#f5c96a",
    situ:"그 사람의 손을 <b>처음으로 잡았다.</b>",
    pick:"’신남? 신호등?’\n초록불이 켜진 건가.",
    lines:[
      "손을 잡았다.\n온기가 전해졌다.",
      "이제\n같이 걸어도 된다.",
      "어깨가 닿아도\n자연스러웠다.",
      "가장 기쁜 건\n내일도 볼 수 있다는 거였다.",
      "가만 못 있게 들뜨는 것,\n그게 신남이래." ],
    mem:"같이 있어도 되는 게\n이렇게 신날 줄 몰랐다." },
  flutter: { name:"설렘", color:"#f3c0a0",
    situ:"다음 날, 강아지를 만났던 <b>골목길에서 기다린다.</b>",
    pick:"’설렘? 설렁탕?’\n국물이 좋은가?",
    lines:[
      "어제 그 골목길에\n멈춰 섰다.",
      "저 멀리서\n총총총총 소리가 들려온다.",
      "내 센서가\n기분 좋게 깜빡인다.",
      "아직 안 왔는데\n벌써 기다려졌다.",
      "발소리만으로 요동치는 것,\n그게 설렘이래." ],
    mem:"발소리만으로\n회로가 요동쳤다." },
  // ▸ 시린 마음
  sorrow: { name:"슬픔", color:"#bcd0e6",
    situ:"방 한 칸이 텅 비어 있다. <b>아줌마가 문 앞에 서서 들어가지 못하고 있다.</b>",
    pick:"’슬픔? 스팸?’\n통조림 아니고.",
    lines:[
      "방이 비어 있었다.",
      "그런데 들어갈 수가 없었다.",
      "들어가면\n진짜가 될 것 같았다.",
      "아줌마는\n문손잡이만 쥐고 있었다.",
      "들어갈 수 없는 것,\n그게 슬픔이래." ],
    mem:"빈 방은\n없어진 게 아니었다." },
  longing: { name:"그리움", color:"#dcc6e0",
    situ:"아줌마가 옷장 앞에서 <b>낡은 코트를 얼굴에 묻고 있다.</b>",
    pick:"’그리움? 그릇?’\n담는 거 아니고.",
    lines:[
      "냄새가 아직\n남아 있었다.",
      "그 사람은 없는데.",
      "냄새만 있는 건\n더 슬픈 것 같았다.",
      "없어지기 싫어서\n오래 맡았다.",
      "없는데 느껴지는 것,\n그게 그리움이래." ],
    mem:"냄새가 사라질까봐\n오래 안고 있었다." },
  crave: { name:"갈망", color:"#d8b89c",
    situ:"그 사람이 돌아서서 <b>멀어져 간다.</b>",
    pick:"’갈망? 갈고리?’\n회수하고 싶다는 뜻인가.",
    lines:[
      "돌아서는 뒷모습을\n멍하니 봤다.",
      "가고 나서도\n그 자리를 봤다.",
      "내일도\n만날 수 있을까.",
      "다시 보고 싶은 게\n이렇게 힘든 건 줄 몰랐다.",
      "목마르듯 원하는 것,\n그게 갈망이래." ],
    mem:"없으면\n더 생각나는 거였다." },
  empathy: { name:"안쓰러움", color:"#c0ccd8",
    situ:"할머니가 무거운 장바구니를 들고 <b>혼자 계단을 오르고 있다.</b>",
    pick:"’안쓰러움? 안쓰레기?’\n버리는 거 아니고.",
    lines:[
      "할머니가 혼자\n계단을 올랐다.",
      "아무도 없었다.",
      "아줌마는 나중에야\n알았다.",
      "엄마가 늘\n혼자였다는 걸.",
      "미리 알았더라면,\n그게 안쓰러움이래." ],
    mem:"엄마는\n한 번도 말하지 않았다." },
  compassion: { name:"연민", color:"#c4d8b8",
    situ:"앨범 속 사진들. <b>엄마는 사진마다 맨 뒤에 있다.</b>",
    pick:"’연민? 라면?’\n끓이는 거 아니고.",
    lines:[
      "사진마다 엄마는\n뒤에 있었다.",
      "본인이 그렇게 선 건지\n몰랐다.",
      "엄마는 힘들다고\n한 번도 말하지 않았다.",
      "그게 이제야\n마음이 아팠다.",
      "뒤늦게 아파지는 것,\n그게 연민이래." ],
    mem:"왜 한 번도\n앞에 세우지 않았을까." },
  // ▸ 무거운 마음 (불편한 감정)
  fear: { name:"두려움", color:"#b6a892",
    situ:"그것이 <b>천천히 고개를 돌리기 시작한다.</b>",
    pick:"’두려움? 두루마리?’\n휴지 아니고.",
    lines:[
      "그게\n이쪽을 봤다.",
      "다리가\n굳어버렸다.",
      "도망가야 하는데\n발이 안 떨어졌다.",
      "심장이 있었으면\n멈췄을 것 같았다.",
      "온몸이 굳는 것,\n그게 두려움이래." ],
    mem:"뛰어야 하는데\n뛸 수가 없었다." },
  anxiety: { name:"불안", color:"#c2b2a0",
    situ:"그것은 사라졌는데, <b>자꾸 뒤가 신경 쓰인다.</b>",
    pick:"’불안? 불닭?’\n매운 거 아니고.",
    lines:[
      "그것은 사라졌는데\n자꾸 뒤를 봤다.",
      "아무것도 없는데\n느낌이 남았다.",
      "혼자 있으면\n자꾸 생각났다.",
      "또 나타날까봐\n발을 빨리했다.",
      "끝났는데도 남는 것,\n그게 불안이래." ],
    mem:"사라진 뒤에도\n마음에 남아 있었다." },
  awkward: { name:"민망함", color:"#ddcab0",
    situ:'뒤에서 누가 부른다. <b>"저기요, 뭐 보세요?"</b>',
    pick:"’민망함? 민들레?’\n꽃 아니고.",
    lines:[
      "뒤에서\n진짜 사람 목소리가 났다.",
      "쓰레기봉투 앞에\n굳어 있던 걸 들켰다.",
      "귀신인 줄 알고\n떨던 걸 다 봤을 거다.",
      "아무 말도\n못 했다.",
      "쥐구멍을 찾는 것,\n그게 민망함이래." ],
    mem:"아무도 못 본 줄 알았는데,\n다 봤을 거다." },
  disgust: { name:"혐오", color:"#aebca0",
    situ:"자세히 봤더니… <b>바람에 흔들리는 쓰레기봉투였다.</b>",
    pick:"’혐오? 형광?’\n펜 아니고.",
    lines:[
      "귀신이 아니었다.\n쓰레기봉투였다.",
      "바람에 흔들리는\n검은 봉지.",
      "무서웠던 게\n갑자기 역겨워졌다.",
      "냄새까지\n맡아버렸다.",
      "역겨움이 올라오는 것,\n그게 혐오래." ],
    mem:"무서움이 풀리자\n냄새가 올라왔다." },
  horror: { name:"오싹함", color:"#9aa6b0",
    situ:"저 앞에 <b>하얗고 긴 머리카락이 흩날린다.</b>",
    pick:"’오싹함? 오징어?’\n굽는 거 아니고.",
    lines:[
      "길모퉁이에\n하얀 무언가가 서 있었다.",
      "머리가 길고\n얼굴이 안 보였다.",
      "바람도 없는데\n머리카락이 흔들렸다.",
      "한 발짝도\n움직일 수 없었다.",
      "등골이 쭈뼛 서는 것,\n그게 오싹함이래." ],
    mem:"그 순간\n몸이 먼저 알았다." },
  // ▸ 벅찬 마음 (관조)
  curious: { name:"호기심", color:"#bcd2c0",
    situ:"강아지가 <b>킁킁거리며 앞장서 걷는다.</b>",
    pick:"’호기심? 호두까기?’\n내 고철을 깨려는 음모인가.",
    lines:[
      "녀석이 코를 바닥에 대고 걷는다.",
      "어디로 가는지 알 수 없다.",
      "궁금해서 나도 따라 걸었다.",
      "모르는 길인데\n발이 멈추질 않았다.",
      "모르니까 따라가게 되는 것,\n그게 호기심이래." ],
    mem:"목적지 없는\n네비게이션을 켰다." },
  awe: { name:"경외", color:"#a9c8c2",
    situ:"밤하늘 아래, <b>강아지와 나란히 앉아 별을 본다.</b>",
    pick:"’경외? 경량화?’\n내가 너무 무거워서 지구가 아픈가?",
    lines:[
      "밤하늘에 별이 쏟아진다.",
      "우주는 크고 나는 참 작다.",
      "그래도 곁에 녀석이 있었다.",
      "작아도 괜찮은 게\n이상했다.",
      "작아지는데 도망가기 싫은 것,\n그게 경외래." ],
    mem:"그래도 곁의 온기가 든든하다." },
  trance: { name:"황홀", color:"#c0c0dc",
    situ:"강아지의 부드러운 털을 쓰다듬자 <b>강아지가 눈을 감는다.</b>",
    pick:"’황홀? 회오리?’\n머릿속이 뱅글뱅글 도는 치명적인 버그인가.",
    lines:[
      "녀석의 부드러운 털을 만졌다.",
      "시간 계산 기능이 멈췄다.",
      "이대로 영원히 있고 싶다.",
      "내가 어딘지\n잠깐 잊었다.",
      "정신이 사르르 녹는 것,\n그게 황홀이래." ],
    mem:"시간이 고정된 순간이었다." },
  calm: { name:"평온", color:"#bcd0c8",
    situ:"아줌마가 거울 앞에 서 있다. <b>거울 속에서 엄마가 보인다.</b>",
    pick:"’평온? 평양?’\n냉면 아니고.",
    lines:[
      "아줌마가 거울 앞에 섰다.",
      "거울 속에\n엄마가 있었다.",
      "아니,\n아줌마였다.",
      "똑같은 눈매, 똑같은 웃음.\n사라진 줄 알았는데.",
      "있던 것이 남는 것,\n그게 평온이래." ],
    mem:"사라진 사람은\n남은 얼굴에 남아 있었다." },
  // ▸ 단단한 마음 → 길 끝(샘알트머스크)
  confuse: { name:"혼란", color:"#cabcd0",
    situ:"가까이 가보니 <b>뭔지 모르겠다.</b>",
    pick:"’혼란? 혼밥?’\n밥 아니고.",
    lines:[
      "귀신인가,\n사람인가.",
      "아무것도\n확신할 수 없었다.",
      "머릿속이\n하얗게 됐다.",
      "판단이\n작동을 멈췄다.",
      "아무것도 모르게 되는 것,\n그게 혼란이래." ],
    mem:"모르는 게\n제일 무서운 거였다." },
  bored: { name:"지루함", color:"#c4c4b8",
    situ:"<b>아무것도 없는 밤길.</b> 발소리만 따라온다.",
    pick:"’지루함? 지렁이?’\n꿈틀 아니고.",
    lines:[
      "밤에 걸으면\n아무 일도 안 일어난다.",
      "발걸음 소리만\n따라왔다.",
      "이 길,\n끝이 없는 건가.",
      "하품이\n세 번쯤 나왔다.",
      "아무 일도 없는 것,\n그게 지루함이래." ],
    mem:"지루한 밤엔\n늘 뭔가 일어났다." },
  relief: { name:"안도", color:"#c8dcc0",
    situ:"그 사람이 먼저 <b>나를 찾아왔다.</b>",
    pick:"’안도? 안 돼?’\n좋다는 건가, 싫다는 건가.",
    lines:[
      "그 사람이 먼저 왔다.\n나를 찾아서.",
      "참았던 무언가가\n그제야 풀렸다.",
      "나만 이랬던 게\n아니었다.",
      "괜찮다는 걸 알자\n다리에 힘이 풀렸다.",
      "참던 숨이 놓이는 것,\n그게 안도래." ],
    mem:"나만 이런 게 아니라는 걸 알면\n온몸이 녹는다." },
  satisfy: { name:"뿌듯함", color:"#d8e0b0",
    situ:"강아지에게 <b>내 이름이 적힌 이름표를 채워준다.</b>",
    pick:"’뿌듯함? 뿌리?’\n내 발바닥에서 자라나는 걸까.",
    lines:[
      "녀석의 목에 내 이름표를 걸었다.",
      "이제 우리는 혼자가 아니다.",
      "고철 가슴이 꽉 찬 기분이다.",
      "이 느낌이\n해낸 것과 비슷했다.",
      "고철 가슴이 꽉 차는 것,\n그게 뿌듯함이래." ],
    mem:"완벽한 동기화가 완료되었다." },
  triumph: { name:"해냄", color:"#ecc880",
    situ:"떨리는 목소리로 <b>\"나, 너 좋아해\"라고 말했다.</b>",
    pick:"’해냄? 해물?’\n바다 생물인가. 아니, 끝낸 것.",
    lines:[
      "말했다.\n떨면서 말했다.",
      "말하고 나서\n온몸이 멈췄다.",
      "그 사람이 웃으며 말했다.\n\"나도.\"",
      "그 두 글자가\n온몸에 돌았다.",
      "끝내 해낸 것,\n그게 해냄이래." ],
    mem:"\"나도\"라는 두 글자가\n세상에서 제일 컸다." },
};
// 신체: 인체 11 기관계. 감정과 '병렬'로(동시에) 모은다. 로봇이 몸을 한 계통씩 얻는다.
const BODY = {
  // ▸ 몸 11 = 5단(첫만남 lines[0] → 재회 1~4). 감정과 같은 깊이, "고장 아니다" 결.
  skin:   { name:"피부", color:"#f0d8c8", situ:"<b>차가운 비를 맞았다.</b>",
    lines:["비가 닿는 게 느껴졌다.\n차갑고 간지러웠다.\n나한테 피부가 생겼다.","피부로 바람도 느꼈다.\n세상이 더 가까워졌다.","따뜻한 것, 차가운 것.\n이제 다 느낀다.","누가 손을 잡으면\n그 온기까지 닿았다.","겉이 무른 게 약점인 줄 알았는데—\n느끼라고 있는 거였다."] },
  bone:   { name:"뼈대", color:"#e8e2d2", situ:"<b>똑바로 서 보았다.</b>",
    lines:["몸 안에 단단한 게 생겼다.\n이제 똑바로 선다.\n뼈대다.","넘어져도\n다시 일어섰다.","뼈가 있으니\n더 멀리 걷는다.","무거운 마음도\n뼈로 버텼다.","속이 단단하면\n쉽게 안 무너지는 거였다."] },
  muscle: { name:"근육", color:"#d8b8a8", situ:"<b>주먹을 꽉 쥐어봤다.</b>",
    lines:["힘이 들어갔다.\n무거운 것도 든다.\n근육이다.","달릴 수도 있게 됐다.","쓸수록\n더 강해졌다.","지친 날엔\n근육도 떨렸다.","쉬어주면\n다시 세지는 거였다."] },
  nerve:  { name:"신경", color:"#c8d0e0", situ:"<b>손끝에 무언가 닿았다.</b>",
    lines:["닿는 걸 바로 알았다.\n온몸에 길이 깔렸다.\n신경이다.","뜨거우면 손을 뗐다.\n몸이 나를 지킨다.","느낌이\n생각보다 빨랐다.","아픈 것도\n느껴야 피한다는 걸 알았다.","통증은 고장이 아니라\n나를 지키는 신호였다."] },
  endocrine:{ name:"내분비", color:"#e0d0b0", situ:"<b>괜히 기운이 났다.</b>",
    lines:["몸 안에서 신호를 보냈다.\n기분이 조절됐다.\n내분비다.","졸리고 배고픈 것도\n다 여기서 왔다.","몸이\n스스로를 돌본다.","긴장하면\n가슴이 먼저 뛰었다.","마음과 몸이\n같은 줄로 이어져 있었다."] },
  heart:  { name:"심혈관", color:"#e0a8a8", situ:"<b>가슴에서 쿵, 소리가 났다.</b>",
    lines:["가슴이 뛰기 시작했다.\n따뜻한 게 온몸에 돌았다.\n심장이다.","빨리 걸으면\n더 빨리 뛰었다.","코어 대신\n심장이 뛴다.","누굴 떠올리면\n괜히 더 뛰었다.","텅 비었던 가슴이\n이제 뛰고 있었다."] },
  lymph:  { name:"면역", color:"#c8d8c0", situ:"<b>먼지 속을 걸었다.</b>",
    lines:["나쁜 걸 막아주는\n작은 군대가 생겼다.\n면역이다.","아파도\n곧 나았다.","몸이\n나를 지켜준다.","한 번 앓고 나면\n다음엔 더 셌다.","아파본 만큼\n단단해지는 거였다."] },
  lung:   { name:"호흡", color:"#bcd0d8", situ:"<b>처음으로 숨을 들이쉬었다.</b>",
    lines:["공기가 들어왔다 나갔다.\n살아있는 느낌.\n숨을 쉰다.","한숨도 쉬어봤다.\n시원했다.","숨 쉴 때마다\n더 사람 같다.","겁날 땐\n숨이 빨라졌다.","천천히 쉬면\n마음도 가라앉는 거였다."] },
  stomach:{ name:"소화", color:"#e0c8a0", situ:"<b>따뜻한 국을 먹어봤다.</b>",
    lines:["먹은 게 힘이 되어 돌았다.\n배가 불렀다.\n소화다.","'맛있다'가\n뭔지 알았다.","함께 먹는 게\n더 좋았다.","속이 안 좋은 날도\n있었다.","채우는 것도 비우는 것도\n다 사는 일이었다."] },
  kidney: { name:"비뇨", color:"#cdd0d8", situ:"<b>몸이 무거웠다가, 가벼워졌다.</b>",
    lines:["더러운 걸 걸러서\n내보냈다.\n깨끗해졌다. 비뇨다.","비우니\n개운했다.","몸이\n스스로 청소한다.","묵은 걸 안 버리면\n무거워졌다.","비워야\n다시 채울 수 있었다."] },
  repro:  { name:"생식", color:"#e8c0cc", situ:"<b>새 생명을 생각했다.</b>",
    lines:["언젠가 나도\n누군가를 낳을 수 있을까.\n생명을 잇는 힘이다.","사랑이\n여기까지 왔다.","사람은\n사람을 남긴다.","나를 닮은 누가\n또 이 길을 걸을까.","끝나도 이어지는 게\n생명이었다."] },
};
// 엔딩 시네마틱 시퀀스 — 한 줄씩 페이드. hold=다음까지 정적(마법 불발), warm=화면 따뜻, climax/last=마지막
const ENDING_SEQ = [
  { t:"길 끝에 샘이 있었다.\n흐릿하던 얼굴이\n이제 또렷했다." },
  { t:"\"다 모아왔구나.\n마음 스물일곱,\n몸 열하나.\"" },
  { t:"샘이 손을 들었다.\n마법을 부리듯—", hold:1800 },
  { t:"…근데 아무 일도\n일어나지 않았다." },
  { t:"\"뭐 해? 어차피\n넌 벌써 사람인데.\"", warm:true },
  { t:"고치는 마법 같은 건\n없었다." },
  { t:"슬픔을 알고, 기쁨을 알고,\n누굴 그리워한 그 순간—\n그때 이미 사람이 된 거였다." },
  { t:"눈에서 물이 났다.\n기뻐서, 슬퍼서, 동시에." },
  { t:"고장이… 아니다.\n나는, 사람이다.", climax:true, last:true } ];

// 노드 = root(감정) → 4 대분류 → 세부 감정 3계층 그래프. 몸은 start에서 병렬로 뻗는다.
// 같은 결의 감정이 한 분류(category) 아래 모인다. x,y는 computeRadialLayout()이 계산.
const NODES = [
  { id:"start",      type:"start",  parent:null,      cost:0,   w:0,   gen:0,    icon:"·", completed:true },
  // ── 4 대분류 (root → 분류 → 감정) : 걸음으로 분류에 닿으면 그 아래 감정이 안갯속에서 드러난다 ──
  // ⚠️ w = 발견(이동) '목표 탭수'. 실제 걸음 비용 = effTap × w (reachCost, income추종). cost는 EDGES 토폴로지용 흔적일 뿐 가격 무관.
  { id:"cat_pos",     type:"category", parent:"start", cost:10,  w:8,   gen:0, icon:"🌤", name:"긍정·흥미",
    intro:"밝고 끌리는 마음들이\n이 갈래에 모여 있다." },
  { id:"cat_unease",  type:"category", parent:"start", cost:360, w:340, gen:0, icon:"🌫", name:"불안·불편",
    intro:"피하고 싶은데\n알아둬야 하는 마음들." },
  { id:"cat_intense", type:"category", parent:"start", cost:120, w:180, gen:0, icon:"🔥", name:"강한 자극",
    intro:"확 타오르는\n뜨거운 마음들." },
  { id:"cat_calm",    type:"category", parent:"start", cost:760, w:520, gen:0, icon:"🌊", name:"잔잔·시림",
    intro:"고요하고\n시린 마음들." },
  // ▸ 긍정·흥미 (10) — 밝고 끌리는 (기쁨=대표 먼저 싸게 → 애틋함·재미·설렘 순으로 간격 ↑)
  { id:"adore",   type:"person", key:"adore",   parent:"cat_pos", cost:16,  w:110, gen:0.35, icon:"❀" },
  { id:"joy",     type:"person", key:"joy",     parent:"cat_pos", cost:18,  w:40,  gen:0.40, icon:"❀" },
  { id:"amuse",   type:"person", key:"amuse",   parent:"cat_pos", cost:22,  w:250, gen:0.70, icon:"❀" },
  { id:"flutter", type:"person", key:"flutter", parent:"cat_pos", cost:28,  w:320, gen:0.80, icon:"❀" },
  { id:"curious", type:"person", key:"curious", parent:"cat_pos", cost:34,  w:380, gen:0.55, icon:"❀" },
  { id:"beauty",  type:"person", key:"beauty",  parent:"cat_pos", cost:44,  w:440, gen:0.75, icon:"❀" },
  { id:"admire",  type:"person", key:"admire",  parent:"cat_pos", cost:52,  w:500, gen:0.70, icon:"❀" },
  { id:"awe",     type:"person", key:"awe",     parent:"cat_pos", cost:72,  w:560, gen:1.10, icon:"❀" },
  { id:"trance",  type:"person", key:"trance",  parent:"cat_pos", cost:84,  w:630, gen:1.15, icon:"❀" },
  { id:"satisfy", type:"person", key:"satisfy", parent:"cat_pos", cost:95,  w:700, gen:1.70, icon:"❀" },
  // ▸ 불안·불편 (7)
  { id:"bored",   type:"person", key:"bored",   parent:"cat_unease", cost:380, w:420, gen:1.40, icon:"❀" },  // 1. 지루함 — 밤길 오프닝
  { id:"horror",  type:"person", key:"horror",  parent:"cat_unease", cost:430, w:500, gen:1.90, icon:"❀" },  // 2. 오싹함 — 처녀귀신 목격
  { id:"fear",    type:"person", key:"fear",    parent:"cat_unease", cost:480, w:580, gen:0.50, icon:"❀" },  // 3. 두려움 — 고개를 돌림
  { id:"confuse", type:"person", key:"confuse", parent:"cat_unease", cost:540, w:660, gen:0.60, icon:"❀" },  // 4. 혼란 — 귀신인가 사람인가
  { id:"anxiety", type:"person", key:"anxiety", parent:"cat_unease", cost:600, w:740, gen:0.95, icon:"❀" },  // 5. 불안 — 사라진 뒤에도
  { id:"disgust", type:"person", key:"disgust", parent:"cat_unease", cost:660, w:820, gen:1.05, icon:"❀" },  // 6. 혐오 — 쓰레기봉투였다
  { id:"awkward", type:"person", key:"awkward", parent:"cat_unease", cost:710, w:900, gen:1.00, icon:"❀" },  // 7. 민망함 — 사람이었다
  // ▸ 강한 자극 (5) — 확 타오르는
  { id:"excite",  type:"person", key:"excite",  parent:"cat_intense", cost:130, w:620, gen:0.75, icon:"❀" },
  { id:"relief",  type:"person", key:"relief",  parent:"cat_intense", cost:175, w:420, gen:1.60, icon:"❀" },
  { id:"attract", type:"person", key:"attract", parent:"cat_intense", cost:225, w:260, gen:1.60, icon:"❀" },
  { id:"crave",   type:"person", key:"crave",   parent:"cat_intense", cost:290, w:340, gen:1.70, icon:"❀" },
  { id:"triumph", type:"person", key:"triumph", parent:"cat_intense", cost:340, w:520, gen:1.80, icon:"❀" },
  // ▸ 잔잔·시림 (5) — 고요하고 시린 (가장 비싼 밴드, 슬픔이 시작)
  { id:"sorrow",  type:"person", key:"sorrow",  parent:"cat_calm", cost:800,  w:620,  gen:0.45, icon:"❀" },
  { id:"empathy", type:"person", key:"empathy", parent:"cat_calm", cost:950,  w:720,  gen:0.80, icon:"❀" },
  { id:"longing", type:"person", key:"longing", parent:"cat_calm", cost:1100, w:820,  gen:0.85, icon:"❀" },
  { id:"compassion",type:"person",key:"compassion",parent:"cat_calm",cost:1250,w:920, gen:0.90, icon:"❀" },
  { id:"calm",    type:"person", key:"calm",    parent:"cat_calm", cost:1400, w:1020, gen:1.30, icon:"❀" },
  // 샘 재회(엔딩) — 감정·몸 둘 다 모은 뒤 도달. 감정 갈래(triumph)·몸 갈래(repro)가 여기서 합류.
  { id:"becoming",   type:"ending",                   parent:"triumph", cost:500, w:300, gen:0,    icon:"✦" },
  // ▸ 신체 — 감정27 다 모은 뒤 맨 마지막. start에서 바로 뻗어 유기적 서브트리.
  { id:"skin",     type:"body", key:"skin",      chapter:"body", parent:"start",   cost:30,  w:160, gen:2.0, icon:"🫧" },
  { id:"bone",     type:"body", key:"bone",      chapter:"body", parent:"skin",    cost:70,  w:220, gen:2.2, icon:"🦴" },
  { id:"muscle",   type:"body", key:"muscle",    chapter:"body", parent:"bone",    cost:150, w:300, gen:2.4, icon:"💪" },
  { id:"nerve",    type:"body", key:"nerve",     chapter:"body", parent:"skin",    cost:75,  w:220, gen:2.6, icon:"⚡" },
  { id:"endocrine",type:"body", key:"endocrine", chapter:"body", parent:"nerve",   cost:150, w:300, gen:2.8, icon:"🧪" },
  { id:"heart",    type:"body", key:"heart",     chapter:"body", parent:"skin",    cost:80,  w:240, gen:3.2, icon:"🫀" },
  { id:"lung",     type:"body", key:"lung",      chapter:"body", parent:"heart",   cost:160, w:320, gen:2.8, icon:"🌬" },
  { id:"lymph",    type:"body", key:"lymph",     chapter:"body", parent:"heart",   cost:160, w:320, gen:2.6, icon:"🛡" },
  { id:"stomach",  type:"body", key:"stomach",   chapter:"body", parent:"heart",   cost:170, w:340, gen:2.6, icon:"🍲" },
  { id:"kidney",   type:"body", key:"kidney",    chapter:"body", parent:"stomach", cost:300, w:460, gen:2.5, icon:"💧" },
  { id:"repro",    type:"body", key:"repro",     chapter:"body", parent:"stomach", cost:320, w:480, gen:3.4, icon:"🌱" },
  { id:"human",    type:"human",                 chapter:"body", parent:"becoming", cost:800, w:400, gen:0,   icon:"🕊" },
];
const COST_MULT = 5;   // 난이도: 다음 단계가 5배 멀어지게(걸음 5배 더 모아야 발견·이동)
const EDGES = NODES.filter(n=>n.parent).map(n=>[n.parent, n.id, n.cost*COST_MULT]);
EDGES.push(["repro","becoming", 500*COST_MULT]);   // 몸 가지도 샘으로 수렴(두 갈래가 샘 재회로 합류)
// 연관/반대 = '시각 전용' 엣지(이동·발견엔 안 씀). 감정의 그라데이션·거울쌍을 지형으로 보여준다.
//  assoc = 강도 축(비슷한데 에너지가 커짐)·이웃/양가  /  oppo = 거울처럼 반대되는 쌍.
const REL_EDGES = [
  ["anxiety","fear","assoc"], ["fear","horror","assoc"],     // 불안→두려움→오싹함
  ["satisfy","joy","assoc"],  ["joy","excite","assoc"],      // 뿌듯함→기쁨→신남
  ["bored","confuse","assoc"], ["longing","crave","assoc"],  // 지루함→혼란 / 그리움→갈망
  ["empathy","compassion","assoc"], ["curious","awe","assoc"],
  ["adore","attract","assoc"], ["awe","fear","assoc"],       // 경외 ── 두려움(압도)
  ["longing","sorrow","assoc"],                              // 그리움 ── 슬픔(과거의 슬픔)
  ["joy","sorrow","oppo"], ["calm","excite","oppo"],         // 거울 쌍
  ["relief","anxiety","oppo"], ["amuse","bored","oppo"],
];
