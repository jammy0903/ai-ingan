# Play Store 등재 준비 체크리스트 (TWA)

> 2026-06-19 작성. 방법: 리포 자산 + **라이브 도메인(aingan.click) 실측**. gap-analysis §8.3 합성 #2.
> 핵심: 코드/자산은 거의 준비됨. **남은 건 대부분 Play Console 계정 + AAB 빌드/서명(사람 손)**.

## 핵심 좌표
| 항목 | 값 |
|---|---|
| 패키지명 | `click.aingan.twa` (assetlinks·AAB 모두 이 값으로 고정) |
| 도메인 | `https://aingan.click` (TWA가 래핑하는 라이브 URL) |
| 개인정보 URL | `https://aingan.click/privacy.html` (존재 ✓) |
| 계정삭제 URL | `https://aingan.click/delete-account.html` (존재 ✓ — Play 필수) |
| 앱 표시명 | 강철의 인간술사 |

## ✅ 완료 (실측 검증)
- **manifest.json** — TWA 필수필드 완비: `name`·`short_name`·`start_url`·`scope`·`display:standalone`·`theme_color`·`background_color`·`orientation:portrait`·`categories`·아이콘(192/512/512-maskable/svg).
- **assetlinks.json 라이브 200** — `https://aingan.click/.well-known/assetlinks.json` 정상 서빙, 패키지·SHA256 지문 리포와 일치. → **TWA 주소창(URL bar) 제거 요건 충족.**
- **feature 그래픽** — `feature.png` **1024×500** (Play 피처 그래픽 정확 규격).
- **스크린샷 4종** — `store/screenshots/` 세로폰(840×1352·820×1366): 걷기·지도·만남·엔딩.
- **아이콘** — `icon-192.png`·`icon-512.png`(maskable 포함)·`icon.svg`.
- **PWA 오프라인** — sw.js(네비=네트워크우선, 자산=캐시우선), 설치 가능.

## ⚠️ 반드시 확인할 함정 (TWA 대표 실패)
1. **Play 앱 서명(App Signing) 지문 ≠ 업로드 키 지문.**
   Play에 AAB 올리면 Google이 **자기 키로 재서명**한다. 그러면 `assetlinks.json`의 지문은 **로컬 업로드 키가 아니라 Play Console → 앱 무결성(App Integrity)의 'Play 앱 서명 인증서 SHA-256'** 이어야 한다.
   → 현재 박힌 지문(`4D:08:…:B0`)이 **그 Play 서명 지문인지 반드시 대조**. 아니면 설치 후에도 **주소창이 뜬다**(TWA 실패의 1순위 원인). 필요시 두 지문 모두 배열에 넣어도 됨.
2. **재빌드는 같은 키스토어로.** 키스토어는 이 리포 밖에 있음 — 분실 시 업데이트 영구 불가. 안전 백업 확인.
3. **콘텐츠는 재빌드 불필요.** TWA는 라이브 URL을 래핑할 뿐 → 게임 업데이트(1.0.x)는 푸시→CF 배포로 자동 반영. AAB 재빌드는 **manifest 레벨 변경(이름·아이콘·테마·패키지)** 때만.

## 🔲 사람만 할 수 있는 일 (내가 못 함)
- [ ] **Play Console 개발자 계정**($25, 신원확인).
- [ ] **AAB 빌드·서명** — Bubblewrap(`@bubblewrap/cli`, JDK+Android SDK 필요). 프로젝트는 리포 밖 → 그 폴더에서 `bubblewrap build`. (manifest 1.0.16 기준으로 갱신했는지 확인)
- [ ] **데이터 보안(Data Safety) 양식** — 선언 대상: 구글 로그인(이메일/계정 식별자, Supabase 저장), **(예정) 쿠키리스 애널(익명 사용통계)**. ⚠️ 둘러보기=무저장이 사실대로 반영돼야 함(privacy.html과 일치).
- [ ] **콘텐츠 등급 설문**(IARC) — 폭력/성/도박 없음(끌림=SFW 순화). 전연령 예상.
- [ ] **스토어 등재 텍스트** — 제목·짧은설명(80자)·전체설명, 카테고리=게임>캐주얼/방치형.
- [ ] **앱 푸시 → 라이브 1.0.16 배포 확인** (현재 라이브=1.0.13, 이번 세션 커밋은 미푸시).

## 미동기화 메모
- 라이브 manifest/index = **1.0.13** (이번 세션 1.0.14~16 커밋은 로컬만). 푸시 시 CF 자동배포.
- `dist/`는 gitignore된 **stale 옛 빌드**(`aingan-v1`) — CF는 root를 배포하므로 무관. 정리 불필요(혼동 시 삭제 가능).
