# 🎵 배경음악(BGM) 에셋

`index.html`의 BGM 시스템(`bgmTo`)이 아래 **두 파일명을 그대로** 찾는다. 여기에 mp3를 넣으면 자동 재생된다.
(파일이 없어도 게임은 정상 작동 — 음악만 안 나옴.)

| 파일명(고정) | 곡 | 작곡가 / 출처 | 라이선스 | 게임 내 역할 |
|---|---|---|---|---|
| `bgm-main.mp3`   | Mellow Piano | leberch / Pixabay | Pixabay License(무표기 가능, 곡 페이지서 확인) | 평소 메인 루프 |
| `bgm-ending.mp3` | The Long Dark | Scott Buckley (scottbuckley.com.au) | **CC-BY 4.0 — 크레딧 필수** | 엔딩 시네마틱(`#endcine`) |

## 받는 법
1. **bgm-main.mp3** — Pixabay에서 다운로드 → 이 폴더에 `bgm-main.mp3`로 저장. 곡 페이지의 라이선스·업로드 날짜를 캡처해 보관.
2. **bgm-ending.mp3** — https://www.scottbuckley.com.au/library/the-long-dark/ 에서 mp3 다운로드 → `bgm-ending.mp3`로 저장.

## ⚠️ 크레딧 표기 (The Long Dark = CC-BY 필수)
게임 내 라이선스/크레딧 화면에 추가:
> "The Long Dark" by Scott Buckley — www.scottbuckley.com.au · CC BY 4.0

(메인 Mellow Piano는 Pixabay라 의무 아님 — 표기하려면: "Mellow Piano" by leberch / Pixabay)

## 참고
- 볼륨/전환은 `index.html`의 `BGM_VOL`·`bgmTo()`에서 조정(메인 0.45 / 엔딩 0.6).
- SW(`sw.js`) `CORE` 프리캐시에는 **일부러 안 넣음** — 파일 누락 시 `addAll`이 전체 실패해 PWA가 깨지기 때문. 온라인 첫 재생 후 런타임 캐시에 담겨 이후 오프라인도 재생된다.
