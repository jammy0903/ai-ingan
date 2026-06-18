/* ===================== data.js — 콘텐츠/그래프 데이터 레이어 =====================
   index.html의 인라인 스크립트보다 '먼저' 로드되는 전역 classic 스크립트(모듈 아님).
   여기 선언한 const들은 전역 렉시컬 스코프를 공유해 index.html 로직이 이름으로 바로 참조한다.
   ⚠️ 이 파일을 수정하면 sw.js의 CACHE="aingan-vN" 번호를 올려야 캐시가 stale되지 않는다(plan.md ④).
   담는 것: PEOPLE(감정27 대사·일기)·BODY(몸11)·ENDING_SEQ·NODES(3계층 그래프)·COST_MULT·EDGES·REL_EDGES.
   ※ COST_MULT는 그래프 '거리 스칼라'라 EDGES와 함께 여기 둔다(idle 밸런스 balance.js와 분리). */
/* ===================== 데이터 (3막 깊은 그래프) =====================
   중심 실: 고철 로봇이 끝없는 길을 걸으며 감정을 하나씩 '처음' 정의한다(순진한 일기).
   감정을 배울수록(person 노드) 마음이 또렷해지고, 마음27+몸11 모아 길 끝에서 샘 재회 → 사람이 된다.
   person = 만남이자 업그레이드 생성기. lines[0]=첫 만남, 이후=재회 심화. mem=그 감정을 스스로 곱씹는 한 줄(사람 언급 X). */
const PEOPLE = {
  // ── 인간 감정 27가지 (Cowen & Keltner, 2017) — 로봇의 순진한 직설 일기 ──
  // ▸ 애정·아름다움
  adore: { name:"애틋함", color:"#f0c0b0",
    situ:"엄마가 <b>자는 아이를 한참 바라본다.</b>",
    lines:[
      "엄마가 아이를\n오래 바라봤다.\n눈빛이 말랑했다.",
      "보고 또 봐도\n안 질리는 거였다.",
      "나도 누굴\n그렇게 보고 싶다." ],
    mem:"오래 바라보면\n마음이 말랑해지는 거였다." },
  beauty: { name:"아름다움", color:"#cdd8e0",
    situ:"<b>노을이 하늘을 붉게 물들인다.</b>",
    lines:[
      "하늘이 붉게 탔다.\n발이 저절로 멈췄다.\n예뻤다.",
      "쓸모도 없는데\n자꾸 보게 됐다.",
      "예쁜 건\n그냥 좋은 거였다." ],
    mem:"예쁜 걸 보면\n발이 저절로 멈추는 거였다." },
  admire: { name:"감탄", color:"#e0d4a0",
    situ:"<b>장인이 그릇 하나를 빚어낸다.</b>",
    lines:[
      "손이 춤추듯 움직였다.\n그릇이 태어났다.\n우와.",
      "따라 하고 싶어졌다.",
      "대단한 걸 보면\n나도 커지고 싶다." ],
    mem:"대단한 걸 보면\n나도 커지고 싶어지는 거였다." },
  attract: { name:"끌림", color:"#e8b0bc",
    situ:"<b>한 사람이 자꾸 누군가를 곁눈질한다.</b>",
    lines:[
      "자꾸 그쪽으로\n눈이 갔다.\n가까이 가고 싶었다.",
      "왜인지 모르겠는데\n그냥 끌렸다.",
      "나는 누구에게\n마음이 끌릴까." ],
    mem:"이유도 모르고\n자꾸 그쪽으로 가게 되는 거였다." },
  // ▸ 밝은 마음
  joy: { name:"기쁨", color:"#f2cf86",
    situ:"<b>아이들이 비눗방울을 분다.</b>",
    lines:[
      "방울이 펑 터졌다.\n아이들이 까르르 웃었다.\n나도 웃었다.",
      "나도 방울을 불었다.\n터져도 안 아쉬웠다.\n부는 게 좋았으니까.",
      "기쁨은\n지금 활짝 웃는 것." ],
    mem:"웃으면\n몸이 가벼워지는 거였다." },
  amuse: { name:"재미", color:"#f0d878",
    situ:"<b>강아지가 제 꼬리를 빙빙 쫓는다.</b>",
    lines:["강아지가 꼬리를 쫓았다.\n웃겼다.\n나도 웃음이 났다.","내가 웃으니까\n옆 사람도 웃었다.","재미는\n같이 웃으면 커진다."],
    mem:"같이 웃으면\n웃음이 더 커지는 거였다." },
  excite: { name:"신남", color:"#f5c96a",
    situ:"달리기 전에 <b>아이가 발을 동동 구른다.</b>",
    lines:["아직 시작도 안 했는데\n아이 가슴이 콩닥거렸다.","달리기보다\n달리기 전이 더 신났다.","신날 땐\n기다리는 것도 재밌다."],
    mem:"시작 전이\n제일 콩닥거리는 거였다." },
  flutter: { name:"설렘", color:"#f3c0a0",
    situ:"<b>한 사람이 편지를 들고</b> 문 앞에 서 있다.",
    lines:["두드릴까 말까.\n가슴이 간질간질했다.","두드리기 전이\n제일 떨리고 좋았다.","설렘은\n좋은 일을 기다리는 거다."],
    mem:"좋은 일을 기다릴 때\n가슴이 간질거리는 거였다." },
  // ▸ 시린 마음
  sorrow: { name:"슬픔", color:"#bcd0e6",
    situ:"<b>아이가 길에서 울고 있다.</b> 눈에서 물이 난다.",
    lines:[
      "아이 눈에서 물이 났다.\n고장인 줄 알았다.\n옆에 앉았더니\n내 가슴도 무거웠다.",
      "또 울었다.\n그냥 들어줬다.\n물이 멎었다.",
      "슬픈 사람 옆에\n같이 있어 주면 된다." ],
    mem:"옆에 있어 주면\n슬픔이 조금 가벼워지는 거였다." },
  longing: { name:"그리움", color:"#dcc6e0",
    situ:"버스가 떠났는데 <b>한 사람이 계속 손을 흔든다.</b>",
    lines:[
      "버스는 갔는데\n손은 계속 흔들렸다.\n없어도 자꾸 생각나는 거.",
      "그리움은\n없어지지 않았다.\n그냥 익숙해졌다.",
      "보고 싶어도\n웃을 수 있다는 걸 배웠다." ],
    mem:"뭔가 그리운데\n그게 뭔지 나도 모르겠다." },
  crave: { name:"갈망", color:"#d8b89c",
    situ:"<b>한 사람이 빵집 앞에서 못 떠난다.</b>",
    lines:[
      "갖고 싶은 게\n자꾸 떠올랐다.\n참기 힘들었다.",
      "가지면 끝일 줄 알았는데\n또 생겼다.",
      "원하는 게 있으면\n자꾸 걷게 된다." ],
    mem:"갖고 싶은 게 있으면\n참기 힘들어지는 거였다." },
  empathy: { name:"안쓰러움", color:"#c0ccd8",
    situ:"<b>한 아이가 넘어져 무릎이 까졌다.</b>",
    lines:["남이 아픈데\n내 무릎이 시렸다.","대신 아파줄 순\n없었다.","그냥 옆에서\n같이 찡그렸다."],
    mem:"남이 아픈데\n내 무릎이 시린 거였다." },
  compassion: { name:"연민", color:"#c4d8b8",
    situ:"<b>한 사람이 다친 고양이한테</b> 우산을 씌워준다.",
    lines:["비 맞는 작은 것을\n그냥 못 지나쳤다.","그냥 못 가고\n옆에 앉아 있었다.","연민은\n같이 비 맞아 주는 거다."],
    mem:"약한 걸 보면\n그냥 못 지나치는 거였다." },
  // ▸ 무거운 마음 (불편한 감정)
  fear: { name:"두려움", color:"#b6a892",
    situ:"<b>한 사람이 깜깜한 굴 앞에서</b> 못 들어간다.",
    lines:["어둠은 아무 말 안 했다.\n근데 발이 안 떨어졌다.","한 발 넣으니까\n어둠이 조금 물러났다.","두려움은\n맞서면 작아진다."],
    mem:"무서운 것도\n한 발 넣으면 조금 물러났다." },
  anxiety: { name:"불안", color:"#c2b2a0",
    situ:"<b>한 사람이 전화기를 들고</b> 왔다 갔다 한다.",
    lines:["아직 안 온 일을\n미리 걱정했다.","전화가 오니까\n걱정이 싹 사라졌다.","걱정한 일은\n거의 안 일어났다."],
    mem:"아직 오지 않은 일을\n미리 걱정하는 거였다." },
  awkward: { name:"민망함", color:"#ddcab0",
    situ:"누군가 나에게 말을 안 걸었는데 <b>나한테 말 건 줄 알고 대답했다.</b>",
    lines:["먼 곳을 쳐다보는 척했다.","어디 볼지\n몰랐다.","웃어버리니까\n괜찮아졌다."],
    mem:"쭈뼛대다가\n웃어버리면 괜찮아지는 거였다." },
  disgust: { name:"혐오", color:"#aebca0",
    situ:"<b>쓰레기 더미에서 냄새가 올라온다.</b>",
    lines:["코를 막고\n뒤로 물러났다.\n싫었다.","싫은 게 있다는 건\n좋아하는 게 있다는 거였다.","피하고 싶은 것도\n알아야 했다."],
    mem:"싫은 걸 알아야\n좋은 것도 아는 거였다." },
  horror: { name:"오싹함", color:"#9aa6b0",
    situ:"<b>깜깜한 골목에서 무언가 움직인다.</b>",
    lines:["등이 쭈뼛 섰다.\n온몸이 굳었다.","고양이였다.\n그제야 숨이 쉬어졌다.","무서운 건\n대개 아무것도 아니었다."],
    mem:"오싹한 건\n대개 아무것도 아니었다." },
  // ▸ 벅찬 마음 (관조)
  curious: { name:"호기심", color:"#bcd2c0",
    situ:"<b>아이가 돌을 뒤집어</b> 밑을 본다.",
    lines:["돌 밑에\n작은 벌레 세상이 있었다.","물어볼수록\n세상이 넓어졌다.","궁금하면\n자꾸 걷게 된다."],
    mem:"끝에 뭐가 있을지\n궁금해서 자꾸 걷는다." },
  awe: { name:"경외", color:"#a9c8c2",
    situ:"<b>사람들이 밤하늘 별을</b> 올려다본다.",
    lines:["하늘이 너무 컸다.\n나는 아주 작아졌다.","작아져도\n무섭지 않고 좋았다.","큰 걸 보면\n마음이 조용해진다."],
    mem:"큰 걸 보면\n내가 작아져도 좋은 거였다." },
  trance: { name:"황홀", color:"#c0c0dc",
    situ:"거리에서 <b>누가 악기를 켠다.</b> 사람들이 멈춘다.",
    lines:["음악이 들리자\n시간이 멈춘 것 같았다.","아무 생각 없이\n그냥 들었다.","황홀은\n지금에 푹 빠지는 거다."],
    mem:"푹 빠지면\n시간이 멈추는 거였다." },
  calm: { name:"평온", color:"#bcd0c8",
    situ:"<b>호숫가에 바람 한 점 없다.</b>",
    lines:["아무 일도 없었다.\n마음이 잔잔했다.","급할 게 없었다.","조용한 것도\n좋은 거였다."],
    mem:"아무 일 없는 것도\n좋은 거였다." },
  // ▸ 단단한 마음 → 길 끝(샘알트머스크)
  confuse: { name:"혼란", color:"#cabcd0",
    situ:"<b>갈림길에 푯말이 다 지워져 있다.</b>",
    lines:[
      "어디로 가야 할지\n하나도 몰랐다.\n머리가 엉켰다.",
      "한참 서 있다가\n그냥 한쪽을 골랐다.",
      "모를 땐\n일단 걸으면 됐다." ],
    mem:"나는 왜 걷는 걸까.\n가끔 헷갈린다." },
  bored: { name:"지루함", color:"#c4c4b8",
    situ:"<b>한 사람이 빈 정류장에서 하품한다.</b>",
    lines:["아무것도 안 일어났다.\n시간이 느렸다.","심심하니까\n별게 다 궁금해졌다.","지루함 끝엔\n뭔가 시작됐다."],
    mem:"지루함 끝엔\n늘 뭔가 시작됐다." },
  relief: { name:"안도", color:"#c8dcc0",
    situ:"<b>잃어버린 아이를 엄마가 찾아 끌어안는다.</b>",
    lines:["꽉 막혔던 게\n탁 풀렸다.\n숨이 쉬어졌다.","걱정한 만큼\n더 후련했다.","괜찮다는 걸 알면\n다리에 힘이 풀렸다."],
    mem:"괜찮다는 걸 알면\n다리에 힘이 풀리는 거였다." },
  satisfy: { name:"뿌듯함", color:"#d8e0b0",
    situ:"<b>농부가 다 자란 밭을</b> 둘러본다.",
    lines:["땀 흘린 만큼\n가득 찼다.\n배가 부른 것 같았다.","남이 안 알아줘도\n혼자 꽉 찼다.","해낸 건\n안 사라졌다."],
    mem:"여기까지 온 것도\n좀 뿌듯하다." },
  triumph: { name:"해냄", color:"#ecc880",
    situ:"<b>한 사람이 산꼭대기에서</b> 두 팔을 든다.",
    lines:["끝까지 올라왔다.\n두 팔이 저절로 올라갔다.\n해냈다.","숨이 찼지만\n다 잊었다.","끝에 서 보니\n내가 좀 멋졌다."],
    mem:"감정 스물일곱 개,\n내가 다 해낼 수 있을까." },
};
// 신체: 인체 11 기관계. 감정과 '병렬'로(동시에) 모은다. 로봇이 몸을 한 계통씩 얻는다.
const BODY = {
  skin:   { name:"피부", color:"#f0d8c8", situ:"<b>차가운 비를 맞았다.</b>",
    lines:["비가 닿는 게 느껴졌다.\n차갑고 간지러웠다.\n나한테 피부가 생겼다.","피부로 바람도 느꼈다.\n세상이 더 가까워졌다.","따뜻한 것, 차가운 것.\n이제 다 느낀다."] },
  bone:   { name:"뼈대", color:"#e8e2d2", situ:"<b>똑바로 서 보았다.</b>",
    lines:["몸 안에 단단한 게 생겼다.\n이제 똑바로 선다.\n뼈대다.","넘어져도\n다시 일어섰다.","뼈가 있으니\n더 멀리 걷는다."] },
  muscle: { name:"근육", color:"#d8b8a8", situ:"<b>주먹을 꽉 쥐어봤다.</b>",
    lines:["힘이 들어갔다.\n무거운 것도 든다.\n근육이다.","달릴 수도 있게 됐다.","쓸수록\n더 강해졌다."] },
  nerve:  { name:"신경", color:"#c8d0e0", situ:"<b>손끝에 무언가 닿았다.</b>",
    lines:["닿는 걸 바로 알았다.\n온몸에 길이 깔렸다.\n신경이다.","뜨거우면 손을 뗐다.\n몸이 나를 지킨다.","느낌이\n생각보다 빨랐다."] },
  endocrine:{ name:"내분비", color:"#e0d0b0", situ:"<b>괜히 기운이 났다.</b>",
    lines:["몸 안에서 신호를 보냈다.\n기분이 조절됐다.\n내분비다.","졸리고 배고픈 것도\n다 여기서 왔다.","몸이\n스스로를 돌본다."] },
  heart:  { name:"심혈관", color:"#e0a8a8", situ:"<b>가슴에서 쿵, 소리가 났다.</b>",
    lines:["가슴이 뛰기 시작했다.\n따뜻한 게 온몸에 돌았다.\n심장이다.","빨리 걸으면\n더 빨리 뛰었다.","코어 대신\n심장이 뛴다."] },
  lymph:  { name:"면역", color:"#c8d8c0", situ:"<b>먼지 속을 걸었다.</b>",
    lines:["나쁜 걸 막아주는\n작은 군대가 생겼다.\n면역이다.","아파도\n곧 나았다.","몸이\n나를 지켜준다."] },
  lung:   { name:"호흡", color:"#bcd0d8", situ:"<b>처음으로 숨을 들이쉬었다.</b>",
    lines:["공기가 들어왔다 나갔다.\n살아있는 느낌.\n숨을 쉰다.","한숨도 쉬어봤다.\n시원했다.","숨 쉴 때마다\n더 사람 같다."] },
  stomach:{ name:"소화", color:"#e0c8a0", situ:"<b>따뜻한 국을 먹어봤다.</b>",
    lines:["먹은 게 힘이 되어 돌았다.\n배가 불렀다.\n소화다.","'맛있다'가\n뭔지 알았다.","함께 먹는 게\n더 좋았다."] },
  kidney: { name:"비뇨", color:"#cdd0d8", situ:"<b>몸이 무거웠다가, 가벼워졌다.</b>",
    lines:["더러운 걸 걸러서\n내보냈다.\n깨끗해졌다. 비뇨다.","비우니\n개운했다.","몸이\n스스로 청소한다."] },
  repro:  { name:"생식", color:"#e8c0cc", situ:"<b>새 생명을 생각했다.</b>",
    lines:["언젠가 나도\n누군가를 낳을 수 있을까.\n생명을 잇는 힘이다.","사랑이\n여기까지 왔다.","사람은\n사람을 남긴다."] },
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
  { id:"start",      type:"start",  parent:null,      cost:0,   gen:0,    icon:"·", completed:true },
  // ── 4 대분류 (root → 분류 → 감정) : 걸음으로 분류에 닿으면 그 아래 감정이 안갯속에서 드러난다 ──
  { id:"cat_pos",     type:"category", parent:"start", cost:10, gen:0, icon:"🌤", name:"긍정·흥미",
    intro:"밝고 끌리는 마음들이\n이 갈래에 모여 있다." },
  { id:"cat_unease",  type:"category", parent:"start", cost:360, gen:0, icon:"🌫", name:"불안·불편",
    intro:"피하고 싶은데\n알아둬야 하는 마음들." },
  { id:"cat_intense", type:"category", parent:"start", cost:120, gen:0, icon:"🔥", name:"강한 자극",
    intro:"확 타오르는\n뜨거운 마음들." },
  { id:"cat_calm",    type:"category", parent:"start", cost:760, gen:0, icon:"🌊", name:"잔잔·시림",
    intro:"고요하고\n시린 마음들." },
  // ▸ 긍정·흥미 (10) — 밝고 끌리는
  { id:"adore",   type:"person", key:"adore",   parent:"cat_pos", cost:16,  gen:0.35, icon:"❀" },
  { id:"joy",     type:"person", key:"joy",     parent:"cat_pos", cost:18,  gen:0.40, icon:"❀" },
  { id:"amuse",   type:"person", key:"amuse",   parent:"cat_pos", cost:22,  gen:0.70, icon:"❀" },
  { id:"flutter", type:"person", key:"flutter", parent:"cat_pos", cost:28,  gen:0.80, icon:"❀" },
  { id:"curious", type:"person", key:"curious", parent:"cat_pos", cost:34,  gen:0.55, icon:"❀" },
  { id:"beauty",  type:"person", key:"beauty",  parent:"cat_pos", cost:44,  gen:0.75, icon:"❀" },
  { id:"admire",  type:"person", key:"admire",  parent:"cat_pos", cost:52,  gen:0.70, icon:"❀" },
  { id:"awe",     type:"person", key:"awe",     parent:"cat_pos", cost:72,  gen:1.10, icon:"❀" },
  { id:"trance",  type:"person", key:"trance",  parent:"cat_pos", cost:84,  gen:1.15, icon:"❀" },
  { id:"satisfy", type:"person", key:"satisfy", parent:"cat_pos", cost:95,  gen:1.70, icon:"❀" },
  // ▸ 불안·불편 (7)
  { id:"fear",    type:"person", key:"fear",    parent:"cat_unease", cost:380,  gen:0.50, icon:"❀" },
  { id:"confuse", type:"person", key:"confuse", parent:"cat_unease", cost:430,  gen:0.60, icon:"❀" },
  { id:"bored",   type:"person", key:"bored",   parent:"cat_unease", cost:480,  gen:1.40, icon:"❀" },
  { id:"awkward", type:"person", key:"awkward", parent:"cat_unease", cost:540,  gen:1.00, icon:"❀" },
  { id:"anxiety", type:"person", key:"anxiety", parent:"cat_unease", cost:600,  gen:0.95, icon:"❀" },
  { id:"disgust", type:"person", key:"disgust", parent:"cat_unease", cost:660,  gen:1.05, icon:"❀" },
  { id:"horror",  type:"person", key:"horror",  parent:"cat_unease", cost:710, gen:1.90, icon:"❀" },
  // ▸ 강한 자극 (5) — 확 타오르는
  { id:"excite",  type:"person", key:"excite",  parent:"cat_intense", cost:130,  gen:0.75, icon:"❀" },
  { id:"relief",  type:"person", key:"relief",  parent:"cat_intense", cost:175,  gen:1.60, icon:"❀" },
  { id:"attract", type:"person", key:"attract", parent:"cat_intense", cost:225,  gen:1.60, icon:"❀" },
  { id:"crave",   type:"person", key:"crave",   parent:"cat_intense", cost:290, gen:1.70, icon:"❀" },
  { id:"triumph", type:"person", key:"triumph", parent:"cat_intense", cost:340, gen:1.80, icon:"❀" },
  // ▸ 잔잔·시림 (5) — 고요하고 시린
  { id:"sorrow",  type:"person", key:"sorrow",  parent:"cat_calm", cost:800,  gen:0.45, icon:"❀" },
  { id:"empathy", type:"person", key:"empathy", parent:"cat_calm", cost:950,  gen:0.80, icon:"❀" },
  { id:"longing", type:"person", key:"longing", parent:"cat_calm", cost:1100,  gen:0.85, icon:"❀" },
  { id:"compassion",type:"person",key:"compassion",parent:"cat_calm",cost:1250, gen:0.90, icon:"❀" },
  { id:"calm",    type:"person", key:"calm",    parent:"cat_calm", cost:1400,  gen:1.30, icon:"❀" },
  // 샘 재회(엔딩) — 감정·몸 둘 다 모은 뒤 도달. 감정 갈래(triumph)·몸 갈래(repro)가 여기서 합류.
  { id:"becoming",   type:"ending",                   parent:"triumph", cost:500, gen:0,    icon:"✦" },
  // ▸ 신체 — 감정과 '병렬'로 자라는 또 하나의 가지(cells식 동시 성장). start에서 바로 뻗어 유기적 서브트리.
  { id:"skin",     type:"body", key:"skin",      chapter:"body", parent:"start",   cost:30,  gen:2.0, icon:"🫧" },
  { id:"bone",     type:"body", key:"bone",      chapter:"body", parent:"skin",    cost:70,  gen:2.2, icon:"🦴" },
  { id:"muscle",   type:"body", key:"muscle",    chapter:"body", parent:"bone",    cost:150, gen:2.4, icon:"💪" },
  { id:"nerve",    type:"body", key:"nerve",     chapter:"body", parent:"skin",    cost:75,  gen:2.6, icon:"⚡" },
  { id:"endocrine",type:"body", key:"endocrine", chapter:"body", parent:"nerve",   cost:150, gen:2.8, icon:"🧪" },
  { id:"heart",    type:"body", key:"heart",     chapter:"body", parent:"skin",    cost:80,  gen:3.2, icon:"🫀" },
  { id:"lung",     type:"body", key:"lung",      chapter:"body", parent:"heart",   cost:160, gen:2.8, icon:"🌬" },
  { id:"lymph",    type:"body", key:"lymph",     chapter:"body", parent:"heart",   cost:160, gen:2.6, icon:"🛡" },
  { id:"stomach",  type:"body", key:"stomach",   chapter:"body", parent:"heart",   cost:170, gen:2.6, icon:"🍲" },
  { id:"kidney",   type:"body", key:"kidney",    chapter:"body", parent:"stomach", cost:300, gen:2.5, icon:"💧" },
  { id:"repro",    type:"body", key:"repro",     chapter:"body", parent:"stomach", cost:320, gen:3.4, icon:"🌱" },
  { id:"human",    type:"human",                 chapter:"body", parent:"becoming", cost:800, gen:0,   icon:"🕊" },
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
