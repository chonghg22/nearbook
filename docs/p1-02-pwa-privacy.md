# P1-02 — PWA 개인정보 캐시 제외

## 범위와 결정

- 웹/PWA만 변경한다. 서버 계정·위시리스트·DB·API 배포·강제 데이터 갱신은 포함하지 않는다.
- 공개 화면에도 로그인 메뉴/개인 배너가 섞이므로 **페이지 HTML/RSC 및 모든 API는 PWA에 저장하지 않는다**. 공개 API를 추후 캐시하려면 인증이 없는 별도 계약과 최신성 UI가 먼저 필요하다.
- 오프라인에는 독립 정적 안내만 표시한다. 개인 정보나 보유·대출 상태를 표시하지 않아 마지막 대출 상태를 현재 상태로 오인하지 않게 한다.

## 변경

1. `sw.js` allowlist: 같은 origin의 `/offline.html`, 앱 아이콘 2개, `/_next/static/`의 JS/CSS/font만. 쿼리, Authorization/RSC/Range, private/no-store/no-cache, Vary Cookie/Authorization/*, Set-Cookie, 실패·리다이렉트·잘못된 MIME 응답 제외.
2. 공개 자산 요청은 credentials omit. TTL 7일, 64개, 각 2 MiB 이하(최대 128 MiB). 캐시 hit가 저장 시각을 갱신하지 않으며 만료/시각 없는 entry 제거. 병렬 저장도 개수 제한 준수.
3. `static-v1-*`, `images-v1-*`, `api-v1-*`와 이전 nearbook-public 캐시만 삭제. 무관한 앱 캐시/쿠키/서버 데이터 유지. 기존 개인 캐시를 발견한 worker migration 때 기존 탭을 한 번 다시 열어 구버전 Router Cache를 버린다. OAuth callback/login은 재실행하지 않는다.
4. 초기 화면에서 legacy 캐시 삭제, 계정 전환/로그아웃에서 앱 캐시 삭제. 개인정보 화면을 즉시 숨기고 전체 document navigation으로 Next Router Cache 및 mounted state 폐기. 토큰 갱신에는 reload하지 않는다. 명시적 로그아웃은 브라우저·서버 쿠키 처리 완료를 기다린다. BFCache 복원도 서버로 다시 확인한다.
5. 인증 API client는 HTTP cache도 no-store 강제. storage/설치 중 네트워크 장애에도 privacy worker가 활성화되고 안전한 합성 오프라인 안내를 반환한다.
6. 기존 push/notification click 동작 유지. 프로필·표지 이미지와 `/_next/image`는 PWA 캐시에서 제외.

Cache API는 HTTP 캐시 헤더를 자동 준수하지 않으므로 worker에서 별도로 확인한다: [MDN Cache](https://developer.mozilla.org/en-US/docs/Web/API/Cache), [Request cache](https://developer.mozilla.org/en-US/docs/Web/API/Request/cache).

## 검증

- 로컬 frozen lockfile 의존성 설치, lint/type-check/build 성공.
- Node 211개(기존 172 + PWA 39), 웹 Vitest 122개(기존 120 + 인증 client 2), API Jest 54개: 총 387개 통과.
- 실제 Chromium 격리 프로필/로컬 fixture: 구 worker가 A 개인 데이터를 캐시한 상태를 재현 → 신 worker migration/legacy 삭제/기존 탭 refresh → 공개 자산만 캐시 → A→B document navigation → 오프라인 개인정보 미노출 및 390px overflow 없음 → 연결 복구 B 표시.
- 테스트용 A/B만 사용했으며 실제 OAuth 계정 로그인/변경은 하지 않았다. Supabase callback wiring/초기 세션/동일 계정·토큰 갱신/타 계정·로그아웃/저장소 오류는 자동 테스트로 검증한다.
- PR 전체 CI와 프리뷰 검증을 통과한 뒤 승인된 운영 웹 배포를 진행한다. 운영 기록은 별도 검증 문서에 남긴다.

### 재현 명령

```sh
node --test apps/web/scripts/pwa-privacy.test.mjs
# 격리 도구 디렉토리에 Playwright를 설치하고 Chromium을 준비한 후:
PWA_PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node apps/web/scripts/pwa-browser-check.mjs
PWA_PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs PWA_REMOTE_URL=https://preview.example node apps/web/scripts/pwa-remote-check.mjs
```

브라우저 테스트는 기본 dependency/lockfile을 변경하지 않는 선택적 통합 검증이다. CI/build에는 PWA 39개 회귀 테스트가 포함된다. 이미 오프라인인 구버전 앱은 네트워크에 연결해 새 worker를 받은 뒤 안전 정책이 적용된다.
