# 출시 체크리스트 — 「마음을 줍는 로봇」 (AI인간 / aingan)

> MVP(클라이언트 단독 PWA + Cloudflare Pages + Supabase, 라이브 aingan.click)를 **Google Play 정식 앱**으로 출시하기까지의 단계별 체크리스트.
> 작성 2026-06-24. 진행하며 `[ ]`→`[x]` 체크. iOS(App Store)는 안드로이드 출시 안정화 뒤 별도(§9).

---

## 0. 현재 상태 (출발점)

- **형태**: 단일 정적 `index.html` + 분리 JS(data/balance/engine/view/save-auth/onboarding/main) + `styles.css`. 빌드·번들러 없음.
- **호스팅**: Cloudflare Pages 자동배포(main 푸시 → aingan.click). `?v=` 캐시버스터 + `_headers` no-cache.
- **백엔드**: Supabase(세이브·구글 OAuth). 둘러보기=비저장(휘발), 로그인 시에만 저장·동기화.
- **PWA**: `manifest.json`·`sw.js`(오프라인)·`icon-{192,512}.png`·`icon.svg`. 설치 가능.
- **법무 페이지**: `privacy.html`·`delete-account.html` 존재(계정 삭제 경로 포함).
- **수익화**: 자리만 잡힌 플레이스홀더(`광고 +10` 버튼, IAP 미연결). 첫 경험 광고 0 원칙.
- **분석**: `track()` 이벤트 다수(activation/meeting/reunion/coins 등).
- **현재 버전**: v1.1.15.
- **⚠️ 이미 Play Console에 TWA로 올라가 있음(2026-06-25 확인)**: 기존 빌드 = **Bubblewrap TWA**, 패키지 **`click.aingan.twa`**(versionCode 2, 표시명은 옛 「강철의 인간술사」). 프로젝트·키스토어가 repo 밖에 존재: `~/aingan-twa/`(`twa-manifest.json` + **`android.keystore`** alias `android`). assetlinks.json 라이브 검증됨(SHA256 `4D:08:…:03:B0`). → **TWA→Capacitor 전환은 이 패키지·키스토어를 그대로 승계하는 '마이그레이션'**(새 리스팅 아님). 상세 = `store/play-readiness.md`.

## 핵심 결정 (확정)

> 2026-06-25 분석 확정. 목표 = **AdMob 리워드 광고 + iOS 앱스토어 정식 등록 + 기존 Play 리스팅 유지**. 세 목표를 동시에 만족하는 건 Capacitor가 유일(아래 비교).

- ✅ **제목**: 「마음을 줍는 로봇」 / 부제 AI인간(aingan). (IP 리스크였던 '강철의 인간술사' 교체 완료, v1.1.14)
- ✅ **래핑 방식 = Capacitor 확정** (TWA에서 마이그레이션). TWA는 **AdMob 불가**(Custom Tab엔 네이티브 광고 못 얹음) + **iOS 전용 부재**라 두 목표 모두 막힘 → 탈락. Capacitor는 웹 게임을 그대로 살리며 광고·iOS·결제·푸시를 다 엶.
- ✅ **패키지명(Android) = `click.aingan.twa` 유지**. 이미 Play에 등록된 immutable 값 → 바꾸면 새 리스팅이 되어 기존 이력 손실. "twa"가 이름에 박혀 어색해도 **유지가 정답**. (기존 `~/aingan-twa/android.keystore`를 업로드 키로 승계.)
- ✅ **번들ID(iOS) = 신규 자유 선택** — `click.aingan` 또는 `click.aingan.app` 권장(안드로이드와 달라도 무방, twa 미포함 깔끔).
- ✅ **타깃 순서**: Android(기존 리스팅 업데이트) 먼저 → iOS 이후(§9).

### 래핑 방식 비교 (목표별)

| 목표 | TWA(현재) | **Capacitor(확정)** | 네이티브 재작성 |
|---|---|---|---|
| AdMob 리워드 광고 | ❌ 불가 | ✅ `@capacitor-community/admob` | ✅(과함) |
| iOS 앱스토어 | ❌ 안드로이드 전용 | ✅ `@capacitor/ios` 동일 코드 | ✅(과함) |
| 기존 Play 리스팅 유지 | ✅ | ✅ 같은 패키지 업데이트 | ⚠️ |
| 웹 즉시배포 워크플로 | ✅ | ✅(server.url 시) | ❌ 웹 버림 |
| IAP(결제) | 어려움 | ✅ RevenueCat | ✅ |
| 작업량 | 0 | 중 | 매우 큼 |

### 권장 패키지 스택 (2026-06-25 npm 실측 — 버전·유지보수 확인)

| 용도 | 패키지 | 버전 | 비고 |
|---|---|---|---|
| 코어 | `@capacitor/core`·`/cli`·`/android`·`/ios` | 8.4.1 | 활발(2026-06-24) |
| **광고** | `@capacitor-community/admob` | 8.0.0 | Cap8 호환 현행 |
| **결제** | `@revenuecat/purchases-capacitor` | 13.2.0 | 활발, 양 스토어 통합 |
| OAuth | `@capacitor/browser` + 딥링크(`appUrlOpen`) | 8.x | **Firebase 불필요**(Supabase 그대로) |

- 🚫 `@codetrix-studio/capacitor-google-auth`(3.4-rc, 2024 멈춤) 사용 금지.
- 🚫 `@capacitor-community/in-app-purchases`는 **npm에 없음** → IAP는 RevenueCat이 정답.
- (대안) 네이티브 원탭 로그인 원하면 `@capacitor-firebase/authentication`(8.3.0)→`supabase.auth.signInWithIdToken`. 단 Firebase 추가됨 → **1단계는 browser 방식 권장.**

---

## 1. 🚩 블로커 (출시 전 반드시)

- [x] **앱 제목 IP 안전화** — 「마음을 줍는 로봇」으로 교체(v1.1.14).
- [ ] **상표 검색 1회** — '마음을 줍는 로봇' 동명 앱/상표 없는지 확인: Play 스토어 검색 + KIPRIS(kipris.or.kr, 국내 상표). 일반 표현이라 위험 낮지만 출시 전 1회.
- [ ] **Play 비공개 테스트 의무** — 신규 **개인** 개발자 계정은 프로덕션 신청 전 **테스터 20명 × 14일 연속** 비공개 테스트 통과 필요. → 일정의 가장 큰 변수. **지금부터 테스터 20명 모으기 시작**(지인·커뮤니티). (법인 계정이면 면제 가능 — 계정 종류 확인.)
- [ ] **데이터 안전(Data safety) 폼** — 구글 로그인으로 이메일·프로필 수집 → Play Console에 정확히 신고(수집 항목·용도·암호화·삭제 경로). 미신고/오신고 = 리젝.
- [ ] **OAuth 프로덕션 전환** — Google Cloud 동의화면을 '테스트'→'프로덕션'으로. (테스트 상태는 100명 제한 + 리프레시 토큰 7일 만료 → 자동로그인 끊김.)

---

## 2. Capacitor 셸 셋업 (TWA → Capacitor 마이그레이션)

> ✅ 방식은 §핵심결정에서 **Capacitor 확정**. 여기선 기존 TWA 리스팅을 승계하는 셸 구축.

### ✅ PoC 결과 (2026-06-25 — 안드로이드 에뮬레이터 실측)

> **결론: 최대 리스크였던 webview OAuth가 그냥 됨. 딥링크 불필요.** PoC 핵심 항목 전부 통과.

- ✅ **셸 빌드** — `~/aingan-cap/`에 Capacitor 8.4.1 프로젝트. appId **`click.aingan.twa`**(기존 패키지 승계), 표시명 「마음을 줍는 로봇」, `server.url=https://aingan.click`(라이브 원격 로드). `app-debug.apk`(4.1MB) 산출. compile/targetSdk=36(androidx 강제), minSdk=24.
- ✅ **설치·실행·로드** — 에뮬레이터(Pixel6/android-35 google_apis)에 설치→포그라운드 동작, aingan.click ping·TLS OK, Chromium이 라이브 게임 실제 로드(우리 `viewport-fit=cover` 메타 감지).
- ✅ **구글 OAuth = 평범한 webview에서 성공** — 로그인·**세션 생성까지 정상**. → `@capacitor/browser` 딥링크/`implicit` 플로우 **둘 다 불필요**(server.url + 기본 webview로 충분). launch.md가 우려한 "임베디드 webview OAuth 차단"은 이 환경에선 발생 안 함.
- ✅ **로그인 직후 게이트 재노출 버그 수정(v1.1.16)** — OAuth는 정상인데 `?code=` 교환(비동기)이 끝나기 전 부팅 `decideEntry`가 로그인 게이트를 잠깐 띄우던 **UI 레이스**. `authRedirectPending()` 가드로 차단(`onboarding.js`). server.url이라 **AAB 재빌드 없이** CF 배포로 앱에 자동 반영.
- ✅ **실기기(안드로이드) 검증 완료(2026-06-25)** — 디버그 APK를 실제 폰에 설치(기존 Play 내부테스트 버전 제거 후 — 같은 패키지 서명충돌 회피)→ **구글 로그인·세션 정상, 게이트 레이스 없음(v1.1.16)**. 에뮬레이터뿐 아니라 실기기에서도 webview OAuth 작동 확정. (사소: 페이지 로딩 중 첫 탭이 mailto로 잘못 들어가 메일앱이 잠깐 떴다 재탭 시 정상 — 일회성, 재발 시만 점검.)
- ⚠️ **잔여: iOS만** — iOS Safari(WKWebView)에서 OAuth 재확인 필요. 혹시 막히면 **딥링크 해법을 '폴백'으로 보존**(아래 OAuth 항목 유지).
- 🖥 **개발환경 메모(WSL2)**: 에뮬은 KVM(`/dev/kvm` chmod 666 또는 kvm그룹) + WSLg 디스플레이로 구동. SW GPU(swiftshader/swangle)라 `adb screencap`은 까맣게 찍힘(게스트 프레임버퍼 리드백 한계) — 호스트 에뮬 창은 정상 표시. 실기기 테스트가 더 정확·가벼움.

- [ ] **Capacitor 셸 PoC**:
  - [ ] 별도 래퍼 폴더(예: `~/aingan-cap/` — v1 웹 repo는 그대로, CF Pages 오염 방지). `npm init` + `@capacitor/core`·`/cli`·`/android` 설치.
  - [ ] `npx cap init "마음을 줍는 로봇" click.aingan.twa` — **appId는 반드시 `click.aingan.twa`**(기존 Play 패키지 승계).
  - [ ] **콘텐츠 방식**: iOS 리젝 방어·오프라인 위해 **웹 번들 권장**(`webDir`에 정적 파일 복사). 안드로이드만이면 `server.url=aingan.click` 원격도 가능하나 **양 플랫폼 일관성 위해 번들 통일** 권장 → 게임 로직 큰 변경 때만 AAB/IPA 재배포(콘텐츠 소소한 변경은 웹과 따로 관리).
  - [ ] `npx cap add android` → Android Studio로 webview 부팅 확인(게임 동작 + **OAuth 딥링크 복귀 동작** 검증 — 최대 리스크, 아래 별도).
  - [ ] **AAB 빌드** 산출 확인.
- [ ] **🔑 서명 연속성(기존 리스팅 업데이트의 핵심)** — 새 Capacitor AAB는 **기존 업로드 키와 동일하게 서명**해야 Play가 업데이트로 받음.
  - [ ] `~/aingan-twa/android.keystore`(alias `android`)를 Capacitor 안드로이드 빌드의 업로드 키로 **재사용**(`android/app/build.gradle` signingConfig 또는 `key.properties`).
  - [ ] Play Console → 앱 무결성에서 **앱 서명(App Signing) 활성 + 업로드 키 지문 일치** 1회 확인(불일치 시 업데이트 거부). 키스토어 **백업 필수**(분실=업데이트 영구 불가).
- [x] **🔑 OAuth in-webview(최대 기술 리스크) — 에뮬레이터 검증 완료(2026-06-25)**: server.url + 기본 webview에서 구글 로그인·세션 생성 정상. 딥링크 불필요. (게이트 레이스만 v1.1.16에서 수정.)
  - [x] **실기기(안드로이드) 재확인 완료(2026-06-25)** — 실폰에서 로그인·세션 정상. iOS만 남음.
  - [ ] **폴백(필요 시에만)**: 실기기/iOS에서 막히면 `@capacitor/browser`로 시스템 브라우저 열기 → 앱 **딥링크(`appUrlOpen`)로 복귀**해 세션 주입(Firebase 불필요). Supabase redirect URL에 앱 스킴 등록. (현재는 불필요해 보류.)

## 3. 수익화 통합 (서사 비파괴 원칙 유지)

- [ ] **AdMob 리워드 비디오**: 계정·앱 등록 → `@capacitor-community/admob`(8.0.0) → `광고 +10`·×2 가속·오프라인 2배 버튼에 실제 리워드 광고 연결. AAID(`AD_ID`) 권한 선언.
- [ ] **IAP(결제)**: 광고 제거·영구 ×2·수채 팔레트 스킨 상품 등록 → **`@revenuecat/purchases-capacitor`(13.2.0)** 연동(Play Billing+StoreKit 통합·영수증 검증 대행). ⚠️ `@capacitor-community/in-app-purchases`는 npm에 없음 — RevenueCat 사용.
- [ ] **🚫 금기 준수**: 다음 감정/이야기를 광고·결제 뒤에 가두지 말 것(CLAUDE.md §4). 첫 경험 광고 0.
- [ ] **광고 ID(AAID) 권한** — Play 데이터안전·`AD_ID` 권한 선언.

## 4. 법무·컴플라이언스

- [x] 개인정보처리방침 페이지(`privacy.html`).
- [x] 계정·데이터 삭제 페이지(`delete-account.html`).
- [ ] **개인정보처리방침 URL** Play Console 등록(aingan.click/privacy.html).
- [ ] **계정 삭제 경로** Play에 신고(앱 내 + 웹). (Play 정책상 계정 생성 앱은 삭제 경로 필수 — 이미 보유.)
- [ ] **콘텐츠 등급** 설문(IARC) — 감정27에 불쾌·복잡 감정 포함하나 SFW(성적욕망=끌림으로 순화). 전체이용가 목표.
- [ ] **타깃 연령·가족 정책** 확인(아동 타깃 아니면 광고 정책 단순).
- [ ] **문구 최신화 확인** — privacy/delete 문서가 실제 설계(둘러보기=비저장)와 일치(2026-06-17 완료, 제목만 갱신됨).

## 5. QA / 안정화 (출시 전)

- [ ] **UI 목키 퍼저** — 랜덤 탭/노드클릭/재회/탭전환/자루/구름/리셋 자동 반복 + `window.onerror` 훅으로 크래시·에러 자동 탐지(어드민 토글). "N회 중 에러 0" 리포트.
- [ ] **세이브 마이그레이션 견고성** — 깨진/구버전 세이브 주입해도 `applyState`가 크래시 없이 복구되는지(`SAVE_VERSION` 마이그레이션).
- [ ] **온보딩 전체 경로** — 깨우기→샘→이름→구름 튜토리얼→지도 스포트라이트 튜토리얼이 신규/둘러보기/복귀 각각에서 정상.
- [ ] **기기/해상도** — 저사양·작은 화면·노치 기기에서 레이아웃(상단 2행 스탯바·말풍선·지도 줌) 확인.
- [ ] **오프라인 PWA** — 비행기모드에서 부팅·플레이(자산 캐시) 확인.
- [ ] **성능** — idle 루프·rAF(튜토리얼)·하늘 데코가 저사양에서 프레임 드랍 없는지.
- [ ] **엔딩·프레스티지** 도달까지 1회 풀플레이(밸런스·크래시).

## 6. 스토어 리스팅 자산

- [x] 앱 아이콘(`icon-192/512.png`·`icon.svg`, 로봇머리+하트).
- [ ] **적응형 아이콘**(Android foreground/background) + **maskable** 아이콘(manifest `purpose:"maskable"`).
- [ ] **피처 그래픽**(1024×500), **스크린샷**(폰 2~8장: 걷기·만남·감정 색번짐·재회·엔딩).
- [ ] **짧은 설명**(80자) / **자세한 설명** — "고철 로봇이 감정을 하나씩 배워 사람이 되는 수채화풍 감성 방치형".
- [ ] **앱 제목/부제** Play Console에 입력(마음을 줍는 로봇 / AI인간).
- [ ] (선택) 프로모션 동영상.

## 7. Play Console 셋업 → 출시

- [ ] **개발자 계정 등록**($25 1회). 개인/법인 종류 확정(비공개테스트 의무 영향).
- [ ] 앱 생성 → 패키지명 확정(예: `click.aingan.app` — **변경 불가, 신중히**).
- [ ] AAB 업로드(서명) → 내부 테스트 트랙으로 스모크.
- [ ] **비공개 테스트 트랙**: 테스터 20명 옵트인 → **14일 연속** 유지.
- [ ] 데이터안전·등급·리스팅·가격(무료+IAP) 작성 → 검토 제출.
- [ ] **프로덕션 출시** 신청 → 심사 통과 → 단계적 출시(%).

## 8. 출시 후 (운영)

- [ ] **분석 대시보드** — `track()` 이벤트를 수집처(Supabase 테이블/외부)로 모아 리텐션·활성화(첫 감정 도달률) 관찰.
- [ ] **크래시 리포트** — Play Console Android vitals + (Capacitor면 Sentry 등).
- [ ] **LLM 콘텐츠 풀** — 일기/사연 미리생성 캐싱 풀 보충(중반 사막 방어, CLAUDE.md §7) — 미구현, 출시 후 우선.
- [ ] **오프라인 복귀 푸시** — "돌아오니 걸음이 쌓여있다" 알림(네이티브 푸시, Capacitor).
- [ ] **업데이트 파이프라인** — 웹(aingan.click)은 즉시 반영되지만, **네이티브 셸 변경은 AAB 재배포 필요**(서명키 동일).

## 9. iOS (이후)

- [ ] Capacitor `@capacitor/ios`로 동일 셸 → Xcode 빌드. **번들ID 신규**(`click.aingan` 등, 안드로이드와 무관).
- [ ] ⚠️ Apple은 "단순 웹 래퍼"에 더 엄격 — **웹 번들 + 네이티브 기능(AdMob·IAP·푸시·햅틱) 실제 통합**되어야 통과 가능성↑(§2 콘텐츠=번들 권장 이유).
- [ ] App Store Connect·심사·StoreKit(IAP는 RevenueCat이 StoreKit까지 커버).
- [ ] ⚠️ macOS+Xcode 필요(현재 개발환경은 Linux/WSL) — iOS 빌드는 Mac 환경 별도 확보 필요.

---

## 우선순위 (추천 순서)

1. ✅ **상표 검색**(§1) — 완료(2026-06-25). Play에 동명 앱 없음, 저위험. KIPRIS 정밀확인은 직접 1회.
2. ✅ **Capacitor 셸 PoC + webview OAuth 검증**(§2) — **완료(2026-06-25, 실기기 포함)**. 셸 빌드·실행·OAuth·세션 다 정상, 게이트 레이스 v1.1.16 수정. 실폰에서도 로그인 확인. 최대 리스크 (b) 해소. (iOS만 남음.)
3. **(다음) AdMob 리워드 연결**(§3) — 핵심 수익화 동작 확인.
4. **🔑 서명 연속성 확인**(§2) — 기존 키스토어로 서명한 Capacitor AAB가 Play에 업데이트로 받아지는지(지문 일치). **(b) 다음으로 큰 리스크.**
5. **QA 퍼저**(§5) → **스토어 자산·Console 업데이트**(§6·§7, 기존 리스팅에 새 AAB) → **비공개 테스트 20/14**(§1·§7) → **프로덕션** → **iOS**(§9).

> 남은 큰 리스크: **(a) 비공개 테스트 20명/14일**, **(c) 서명 연속성**(기존 패키지 업데이트 거부 방지, §2). ~~(b) webview OAuth~~ → ✅ **에뮬+실기기(안드로이드) 검증 완료**. iOS만 재확인 남음.
