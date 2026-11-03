# P0-02 — 상세 조회 오류와 실제 not-found 분리

작성일: 2026-10-13  
상태: 전체 CI·웹/API 운영 배포 및 대표 상세/오류/재시도 검증 완료

## 2026-10-13 배포 검증 요약

- 로컬 npm 설치는 DNS 오류로 실패했으나 GitHub CI에서 lockfile 기준 의존성 설치·lint·전체 type-check·웹/API build·Vitest/Jest를 실행해 모두 통과했다. 타입 검사 전 공유 패키지를 빌드하도록 Turbo 순서를 보완했다.
- 최종 테스트: Node **54개**(주소 35 + 상세 19), 웹 Vitest **101개**, API Jest **11개** 통과. CI 및 PR 링크는 [배포 검증 기록](deploy-verification-2026-10-13.md)에 보관했다.
- 웹과 API를 모두 운영 반영했다. 책 `/book/9791161571195`, 서울도서관 `/library/111314`의 기본 상세·canonical·`index, follow`를 확인했다. 책 분석과 보유 도서관 카드도 표시됐다.
- API 컨테이너 교체 중 발생한 실제 502에서 책은 잘못된 not-found 대신 장애 안내를 표시했다. API 준비 후 새 문서 요청으로 정상 상세가 복구됐다. 도서관 인기 조회 실패도 기본 상세를 유지하며 정상 빈 신착 결과와 구분됐다.
- 최초 `router.refresh() + reset()` 조합은 이전 오류 화면에 남았다. PR #5에서 `window.location.reload()`로 보완하고 전체 CI 재실행 후 배포했다. 최종 운영 버튼 클릭으로 실제 새 문서 navigation이 발생하는 것을 확인했다.
- 없는 도서관 `/library/2147483647`은 not-found와 noindex를 유지한다. invalid ID가 만드는 upstream non-404 응답에서도 일시 장애 UI와 재시도 navigation을 확인했다. 단, invalid ID 입력 전용 UX는 별도 개선 대상이다.
- 강제로 운영 장애를 주입하거나 캐시를 삭제하지 않았다. 모든 timeout/429/5xx 조합의 실제 브라우저 E2E, 수동 지역 전환의 race, 로그인 저장 동작은 이번 검증 범위 밖이며 P1-15에서 확장한다.
- 아래 내용은 초기 로컬 작업 기록이다. 당시 미실행/미배포 항목의 최종 상태는 이 요약과 배포 검증 기록을 따른다.

## 확인한 코드 원인

- 책 상세는 `/books/:isbn/with-libraries`로 메타데이터·주변 보유 현황·제휴 조회를 묶었다. 이 요청의 모든 non-OK 응답과 예외를 `null`로 바꿔 `notFound()` 및 `noindex` 처리했다.
- 도서관 상세도 기본 조회의 모든 non-OK 응답·timeout을 `notFound()`로 바꿨다. 부가 응답의 JSON 파싱 오류는 정상 기본 상세까지 깨뜨릴 수 있었다.
- 책 상세의 Next 캐시 주기는 30일, 도서관은 1주였다. 이것이 운영의 특정 not-found를 실제로 캐시했다는 증거는 아직 없으며, 기존 실패 캐시의 복구는 배포 후 확인해야 한다.
- 백엔드 `JeongbonaruService.getBookByIsbn()`은 외부 API 실패 시 캐시가 없으면 `null`을 반환했다. `BooksService`는 이를 실제 책 없음으로 보고 HTTP 404로 바꿨다.
- 주변 도서관 Client Component는 HTTP 상태를 검사하지 않았으며, 서버에서 받은 초기 빈 배열은 서울 기본 위치에서 재조회하지 않았다.

## 변경 사항

### 기본 정보

- `lib/detail-request.mjs`: HTTP 404만 `null` 반환. 다른 HTTP 상태, timeout, 네트워크/TLS 오류, JSON 파싱 오류는 구분된 오류를 발생시킨다. 응답 본문·상세 네트워크 오류는 사용자 오류 메시지에 노출하지 않는다.
- timeout은 fetch뿐 아니라 응답 본문 파싱까지 포함한다. 기본 8초이며, 타이머를 해제한다.
- `lib/detail-data.ts`: 책 메타데이터는 `/books/:isbn`만 조회한다. 도서관 기본 정보는 `/libraries/:id`에서 조회한다. 최소 필수 키가 잘못된 응답은 정상 빈 결과로 처리하지 않는다.
- 메타데이터 생성과 페이지는 같은 함수를 사용한다. React `cache`로 한 서버 렌더 내 요청을 중복 방지하며, 부가 API 실패 때문에 정상 책/도서관의 메타데이터를 not-found/noindex로 바꾸지 않는다.
- 실제 404에만 기존 not-found UI와 noindex 정책을 유지한다. 기본 정보의 일시 장애는 오류를 전파하고, 각 상세 route의 `error.tsx`에서 중립적인 장애 안내·새 문서 요청 재시도를 제공한다.

### 주변 보유 현황과 부가 정보

- 주변 보유 현황은 브라우저에서 현재 선택 위치로 조회하며, 기본 서울 위치도 조회한다. SSR 메타데이터 요청에는 보유·제휴 조회가 포함되지 않는다.
- 로딩/조회 실패/빈 결과를 구분하고 실패 시 재시도 버튼을 제공한다. 위치 변경·unmount 시 이전 요청을 중단하고 늦은 응답이 새 위치 결과를 덮어쓰지 않게 한다. timeout은 15초다.
- 빈 보유 배열은 실제 미소장을 확정하지 않는 문구로 표시한다. 백엔드가 보유 조회 오류를 빈 배열로 숨기는 문제와 `unknown` 상태 모델은 **P1-01에서 추가 해결해야 한다**.
- 분석·도서관 인기/신착/추이 조회는 독립적으로 실패할 수 있다. 부가 응답의 HTTP/JSON 오류가 기본 상세를 not-found로 바꾸지 않는다. 도서관 인기/신착은 정상 빈 배열과 조회 실패 문구를 구분한다.
- 기존 위시리스트·즐겨찾기·제휴 UI·canonical·JSON-LD·사이트맵 코드는 유지했다. 즐겨찾기 상태 조회 실패도 기본 상세를 깨뜨리지 않는다.

### 캐시와 백엔드

- 상세 route의 `revalidate = 0`, 기본/부가 서버 fetch의 `cache: 'no-store'`로 장기 상세 페이지/응답 캐시를 사용하지 않는다. 책 메타데이터의 기존 백엔드 DB/메모리 캐시 및 만료 캐시 fallback은 유지한다. 보유 현황은 브라우저에서 `no-store`로 요청한다.
- 기존 최대 5,000권의 `generateStaticParams`를 제거했다. 동적 상세·canonical·사이트맵은 유지하며, 빌드 단계에서 위치 기반 보유 API를 대량 호출하지 않는다.
- 부가 데이터의 기존 백엔드 캐시는 유지되므로 `no-store`가 외부 정보나루를 매번 직접 호출한다는 뜻은 아니다. Next 상세 페이지 캐시 제거로 서버 렌더/API 요청량은 늘 수 있어 배포 후 지연·호출량을 확인해야 한다.
- 백엔드는 외부 조회 실패 시 만료 메타데이터가 있으면 fallback을 유지한다. 캐시가 없으면 **503 Service Unavailable**로 응답하고, 정상 빈 검색 결과만 `null` → 404로 이어진다. 잘못된 docs/도서 항목도 503 처리한다.
- 운영의 Cloudflare/Vercel 설정·캐시·배포는 이번 작업에서 변경하지 않았다. 서비스 워커가 기존 응답을 보관하는 문제는 P1-02 범위이며, 배포 확인 시 캐시 없는 새 세션도 사용해야 한다.

## 검증 결과

- Node 기본 테스트: **53개 통과** = 기존 주소 정책 35개 + 상세 요청/소스 연결 회귀 18개.
  - 정상 JSON, 404, 400/401/403/429/5xx, JSON null/잘못된 JSON, 네트워크/TLS, fetch/body timeout, 장애 후 회복을 검증했다.
  - 소스 연결 테스트는 기본 정보/보유 분리와 캐시·재시도 연결을 확인하며 실제 컴포넌트 렌더/E2E를 대체하지 않는다.
- `detail-request.mjs` strict/checkJs 제한적 TypeScript 검사: 통과.
- 변경한 TS/TSX 10개 파일의 TypeScript 문법/변환 검사: 오류 0개. 전체 프로젝트 type-check는 아니다.
- `git diff --check`: 통과.
- 기본 상세/부가 정보 분리 Vitest **10개**, 백엔드 조회 Jest **10개** 추가. **미실행**: pnpm·프로젝트 node_modules가 없고 터미널에서 `registry.npmjs.org` DNS 연결에 실패했다.
- 전체 lint/type-check/build, Next 오류 경계 실제 동작, 위치 변경/재시도 UI, 운영 기존 실패 캐시 복구는 **미검증**이다. commit/push/배포하지 않았다.

실행한 Node 회귀 테스트:

```sh
node --test apps/web/scripts/api-config.test.mjs apps/web/scripts/detail-request.test.mjs
```

웹 build 명령은 위 두 테스트 묶음을 먼저 실행하도록 연결했다.

## 배포 전후 확인할 것

1. 의존성 설치 후 웹/API의 전체 type-check·build·Vitest/Jest를 실행한다.
2. 로컬/preview에서 기본 404, 429/503/timeout, 부가 HTTP/JSON 실패를 주입해 not-found·오류 경계·재시도·metadata를 확인한다. 정상 빈 결과와 실패 화면도 구분한다.
3. 배포 시 **웹과 API 양쪽 변경**을 반영한다. 웹만 배포하면 백엔드가 외부 장애를 404로 바꾸는 문제가 남는다.
4. `/book/9791161571195`, `/library/111314`의 SSR/API 일치, 기본/변경 위치 보유 조회, 공식 링크·찜을 확인한다. 운영 로그·새 세션으로 기존 not-found 복구를 확인한다.
5. 완료 기준 검증 후에만 TODO의 P0-02를 체크한다. 운영 캐시 삭제나 인프라 변경은 별도 범위 확인 후 진행한다.

## 설계 참고

- [Next.js 15 fetch의 no-store](https://nextjs.org/docs/15/app/api-reference/functions/fetch)
- [Next.js 15 오류 경계와 reset](https://nextjs.org/docs/15/app/api-reference/file-conventions/error)
- [Next.js 15 메타데이터 생성](https://nextjs.org/docs/15/app/api-reference/functions/generate-metadata)
