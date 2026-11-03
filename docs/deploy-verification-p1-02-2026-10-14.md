# P1-02 PWA 개인정보 캐시 검증 — 2026-10-14

## 현재 상태

- 수정·전체 CI·사용자 프리뷰 화면 확인 후 **운영 웹 반영 완료**. 아래 보류/차단 기록은 배포 전 이력임.
- PR: https://github.com/chonghg22/nearbook/pull/9
- base: `02a5c67fbb52259364530eea810d7b11545923f5`
- head: `ce1714c9834429433f0dcc780b615ba46083643a`
- 작업 브랜치: `fix/p1-02-private-cache-20261014`
- 별도 worktree `/Users/jack/local/nearbook-p1-02`를 사용하여 기존 프로젝트의 누적 변경을 보존함.
- 구현 문서: `/Users/jack/local/nearbook-p1-02/docs/p1-02-pwa-privacy.md`

## 승인과 범위

사용자가 수정·전체 CI·프리뷰 검증 통과 후 운영 반영을 승인함. 이번 변경은 웹/PWA만이며 API CD path filter에 해당하지 않아 컨테이너 교체는 없음. DB/서버 계정/위시리스트/강제 갱신은 변경하지 않음.

## 구현 요약

- 개인정보/페이지 HTML/RSC/모든 API/프로필·표지 이미지를 PWA 캐시에서 제외.
- 공개 정적 자산 allowlist, credentials omit, TTL 7일·64개·각 2 MiB 제한, 응답 Cache-Control/Vary/MIME 검사.
- legacy 앱 캐시 삭제. 기존 탭은 migration 때 한 번 refresh하여 구 Router Cache를 버림(OAuth/login 제외).
- 로그아웃·계정 전환 시 개인 UI 즉시 숨김 → 앱 캐시 삭제 → document navigation. 토큰 refresh/동일 계정은 유지. BFCache 복원 시 재검증.
- 인증 fetch HTTP cache no-store 강제, 독립 오프라인 안내 및 저장소 오류 fallback.

## 검증 증거

- frozen-lockfile 의존성 설치, lint/type-check/build 통과.
- Node 211개(39개 PWA 포함), 웹 Vitest 122개, API Jest 54개: **387개**.
- 실제 Chromium의 격리 프로필/테스트 서버에서 6시나리오 통과:
  1. 구 SW가 A의 개인 API/화면을 캐시하는 상태 재현.
  2. 신 SW 업데이트, legacy 캐시 삭제, 기존 탭 reload.
  3. 공개 JS만 캐시, 개인 API/화면은 캐시되지 않음.
  4. A→B 전환 후 A 내용 없이 B의 신규 문서 표시.
  5. 오프라인 개인 경로에서 A/B 모두 숨김, 연결 안내만 표시, 390px overflow 없음.
  6. 네트워크 복구 후 현재 B 문서 표시.
- 테스트용 identity만 사용, 실제 OAuth 로그인/계정 변경은 하지 않음.
- screenshot: `/Users/jack/local/.tools/nearbook-evidence/p1-02-browser-offline.png`

## CI / 프리뷰

- CI #18: https://github.com/chonghg22/nearbook/actions/runs/38497752117
- Build and Test job `115637318283`: success. 의존성 설치·lint·type-check·build·test 모두 성공.
- Preview: https://nearbook-cs4gfayhd-chonghg22s-projects.vercel.app
- Vercel: `dpl_3mYBCb6pLPj3Xb5afTZYFYasQMsc`, source `ce1714c`, Vercel check success.
- 프리뷰는 Vercel SSO 보호가 있으며, 실제 화면 브라우저 접근은 사용자 권한 거부로 차단됨. 차단을 우회하지 않고 접근 허용 또는 사용자 직접 검증을 요청함.
- 사용자가 접근 허용으로 답변하여 같은 URL 재시도했으나, 저장된 사이트 차단 설정으로 여전히 거부됨. 사용자 답변만으로 저장된 설정은 해제되지 않았으며, 다른 브라우저/CLI 우회 접근은 하지 않음. 저장된 차단 설정 해제 또는 사용자 직접 확인 필요.
- 실제 배포된 프리뷰 화면 검증이 끝나지 않았으므로 merge/운영 배포하지 않음.
- 구버전이 이미 오프라인인 기기는 연결하여 새 worker를 받을 때 새 정책 적용.

## 프리뷰 화면 깨짐 제보 후 보완

- 사용자 제보 후 코드를 검토함. 프리뷰 인증 쿠키가 필요한 정적 파일 요청에도 `credentials: omit`을 적용하여 CSS/JS 대신 401/403/로그인 HTML 또는 CORS 오류가 반환될 수 있는 충돌을 발견함.
- 보호된 static 요청 5가지(401/403/redirect/HTML/CORS)를 로컬 테스트로 재현하여 기존 구현에서 모두 실패함을 확인. 실제 제보된 화면과 동일 원인인지는 스크린샷/배포 화면 확인 전까지 확정하지 않음.
- 익명 자산 요청 실패 시 원래 요청의 credentials를 유지하는 정상 요청으로 파일을 반환하되, 인증된 응답은 PWA 캐시에 저장하지 않도록 수정함. 보호 설정이나 브라우저 차단은 해제/우회하지 않음.
- 후속 head: `6270ca3ce0a199741ba2a26ceeeaa9d9b78ddd87`.
- Node 216개(PWA 44개 포함), 웹 Vitest 122개, API Jest 54개: 전체 **392개** 통과. lint/type-check/build 성공.
- 후속 CI #19 `38498751427`, job `115640432830` 전체 success: https://github.com/chonghg22/nearbook/actions/runs/38498751427
- 후속 Vercel check success: `dpl_7myL7qc4UGAjk7hQEnEokDfEt3L8`, source `6270ca3`, preview https://nearbook-dzm8ba8p7-chonghg22s-projects.vercel.app
- 브랜치 고정 프리뷰: https://nearbook-web-git-fix-p1-02-private-c-fe258f-chonghg22s-projects.vercel.app/offline
- 실제 화면 접근 차단은 다른 도구/도메인으로 우회하지 않음. 화면 재확인 전 운영은 여전히 변경하지 않음.
- 스크린샷/주소 및 깨지는 유형(배치/빈 화면/지도·책 정보 누락)을 요청함.
- 사용자 스크린샷 3개 수신: 기본 브라우저 링크/버튼 스타일, 세로 목록 메뉴, viewport 너비로 확대된 SVG 로고. HTML 콘텐츠는 표시되지만 공통 CSS가 적용되지 않은 상태임을 확인. `/offline` 안내는 보이지만 페이지 주소는 이미지에 없음.
- 로컬 생성 CSS `7719780fdeaafef1.css`(48,342문자)에 Tailwind reset/hidden/flex/h-16/bg-canvas 등 규칙이 있고 미처리 @tailwind 지시문은 없음. 생성 HTML에도 해당 stylesheet link가 존재함. 따라서 로컬 CSS 빌드 누락은 확인되지 않음.
- 스크린샷만으로 실제 배포 요청의 HTTP 상태·MIME·worker 버전은 판별 불가. 이전 immutable 프리뷰인지 수정된 배포인지 URL 확인 필요. 화면 자체 복구 확인 전 완료/운영 반영 처리하지 않음.

## 운영 반영 완료

- 사용자 후속 스크린샷(11:06): 수정 배포 `nearbook-dzm8ba8p7`에서 로고·메뉴·버튼·카드·footer 스타일 정상 적용 확인. `/offline`은 의도적으로 여는 안내 페이지임을 설명함.
- 사용자 명시 지시: “운영 반영하고 다음작업 이어서 하자”.
- PR #9 expected head `6270ca3`로 merge 성공. 운영 source `a921b115098f14694d9e4b36aabf25082436d924`.
- Vercel production: `dpl_44EHYrPVzQYzcZwNbUDBsW3jwncL`, Ready/check success, immutable https://nearbook-rnxmlzmad-chonghg22s-projects.vercel.app
- 운영 https://www.near-book.com/offline 에서 새 개인정보/대출 상태 안내 표시 확인(브라우저 AX).
- 독립 HTTP smoke: `/sw.js`가 수정 소스와 완전히 일치. `/offline` HTTP200 및 `/ _next/static/css/7719780fdeaafef1.css`(공백 없는 실제 경로) HTTP200, `text/css; charset=utf-8`, flex/h-9 규칙 존재. `/api/health` status ok.
- merge source Actions run 조회 결과 0. 변경 파일은 apps/web + docs뿐이며 API CD path filter 미해당. API 컨테이너/DB/강제 데이터 갱신 없음.
- 운영 UI 캡처는 브라우저의 focus-emulation timeout으로 실패했고 네이티브 Chrome 접근도 허용되지 않음. 다른 제어 방식으로 우회하지 않음. 따라서 운영 시각적 screenshot 증거는 주장하지 않으며, 사용자 프리뷰 이미지 + 운영 AX/HTTP/배포 source 증거를 구분함.
- 다음 P1-03은 별도 브랜치/worktree에서 진행.
