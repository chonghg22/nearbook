# P0-01 — API 주소 정책과 운영 요청 차단 진단

작성일: 2026-10-12  
상태: 로컬 수정·승인된 Cloudflare 규칙 변경 완료 / 일부 운영 화면 복구 / 전체 빌드·코드 배포·책 상세 잔여 문제 검증 대기

## 운영에서 확인한 원인

- Vercel `nearbook-web`의 production은 `76d62653cfa326871d58456d068d115422387fd6`이며 로컬 HEAD와 일치했다. 배포 상태는 Ready, 생성일은 8월 11일이다.
- 환경변수 `INTERNAL_API_URL`, `NEXT_PUBLIC_API_BASE_URL`은 Production and Preview에 등록되어 있다. 둘 다 Secret 타입으로 저장되어 UI에서 기존 값을 읽을 수 없었다. 값을 교체하거나 다른 비밀값을 조회하지 않았다.
- Vercel 서버 로그에서 `https://api.near-book.com`의 `/books/loan-item`, `/books/hot-trend`, `/libraries/popular`, `/search/monthly-keywords` 요청이 반복적으로 `403 Forbidden`을 받는 것을 확인했다.
- 예: 18:50:28 KST의 Vercel `/search/monthly-keywords?limit=10` 실패와 18:50:29 KST Cloudflare 동일 호스트·경로 차단 이벤트가 일치한다. Cloudflare 이벤트의 요청 User-Agent는 `node`, 요청 국가는 미국이다.
- 차단 서비스는 Custom rules이며 규칙은 **Block non-KR visitors except verified bots and API webhooks**이다. 해당 규칙이 Vercel의 해외 서버 요청까지 차단한다.
- 따라서 이번 403은 인증서 만료나 상대 URL 오류가 아니다. 주소 정책의 결함은 별도로 수정했으며, 코드 수정만으로 이 국가 차단을 해소하지는 못한다. 개별 책/도서관 실패 캐시의 원인은 배포 후 추가 확인이 필요하다.

변경 대상 규칙 ID: `6cc08baadf60473cabf2cd940f156cbb`  
변경 전 식(rollback 기준):

```text
(ip.src.country ne "KR" and not cf.client.bot and not (http.host eq "api.near-book.com" and starts_with(http.request.uri.path, "/webhooks/")))
```

기존 공개 `/api/books/9791161571195`, `/api/libraries/111314` 응답은 이전 운영 조사에서 정상 확인했으나 상세 SSR 화면은 not-found였다. 이번 규칙 변경 후 서울도서관 상세는 표시되지만 해당 책의 not-found는 남아 있다. 현재 배포에 로컬 수정은 반영하지 않았고, SSR/API 일관성 완료 기준은 아직 달성하지 않았다.

## 로컬 변경

- `lib/api-base-url.mjs`: 환경변수 처리 순수 함수. Node 20+에서 의존성 없이 테스트할 수 있다.
- `lib/constants.ts`: 브라우저 공개 주소만 계산하며 서버 환경변수를 포함하지 않는다.
- `lib/server-api.ts`: SSR·Route Handler용 절대 upstream 주소. 기존 서버 소비자·사이트맵·관련 테스트의 import를 이전했다.
- 지도 in-bounds/region-center와 analytics Route Handler는 같은 서버 주소를 사용한다. timeout/상태 모델/재시도는 후속 항목 범위다.
- `next.config.ts`: 같은 resolver로 rewrite를 만들고 시작/빌드 시 공개·서버 설정을 검증한다.
- `turbo.json`: build에 관련 환경변수를 전달하고 값 변화가 빌드 캐시에 반영되도록 한다.
- 웹 build 명령에서 주소 회귀 테스트를 먼저 실행한다.

주소 정책:

| 입력 | 동작 |
| --- | --- |
| 미설정·빈 값·공백 | 기본 API 호스트로 안전하게 fallback |
| 브라우저 `/api` | 동일 출처 프록시 사용; 서버로 상대 URL을 전파하지 않음 |
| 서버 주소 | `INTERNAL_API_URL` → 절대 공개 주소 → `https://api.near-book.com` |
| 상대 서버 URL·비HTTP(S)·인증정보·쿼리·fragment | 명시적으로 오류 처리; 입력값은 오류 메시지에 노출하지 않음 |
| 프론트 도메인을 upstream으로 지정 | 재귀 프록시 위험 때문에 오류 처리 |
| `VERCEL_ENV=production` 또는 `APP_ENV=production` | HTTP·loopback upstream 금지 |
| 로컬 개발/로컬 production build | HTTP localhost 허용; `NODE_ENV=production`만으로 운영으로 판단하지 않음 |

운영 권장 설정(아직 적용하지 않음):

```dotenv
NEXT_PUBLIC_API_BASE_URL=/api
INTERNAL_API_URL=https://api.near-book.com
```

## 검증 결과와 한계

- `node --test apps/web/scripts/api-config.test.mjs`: **35개 통과**. 환경변수 조합, 생산 환경 검증, 브라우저/서버 분리, 소스 import 및 rewrite 정책을 확인했다.
- 주소 resolver·서버 상수·브라우저 상수의 제한적 TypeScript 검사 통과. 프로젝트와 같은 strict/exactOptionalPropertyTypes/skipLibCheck를 사용했다. 설치된 Vercel CLI의 TypeScript를 이용했으며 전체 프로젝트 type-check는 아니다.
- `git diff --check`: 통과.
- Route Handler 실제 요청/응답용 Vitest 회귀 테스트 4개 추가. **실행하지 못함**: pnpm과 프로젝트 node_modules가 없고 터미널 네트워크는 DNS 접속이 불가능하다.
- 전체 lint/type-check/Vitest/Next build 및 로컬 코드 배포는 미실행이다. commit/push 또는 Vercel 환경변수 변경도 하지 않았다. Cloudflare 변경과 현재 운영 배포의 화면/API 검증은 아래와 같이 수행했다.

## 승인 후 적용한 운영 변경

사용자가 API 호스트의 국가 차단 예외와 영향 설명을 승인했다. **`api.near-book.com`만 이 국가 차단 규칙의 대상에서 제외**하는 아래 식을 기존 규칙에 저장했다. 다른 호스트에 대한 기존 조건은 유지한다. WAF 전체를 끄거나 DNS proxy/TLS를 변경하지 않았다. 기존 규칙 이름·순서·Block action·Active 상태도 유지했다.

```text
(ip.src.country ne "KR" and not cf.client.bot and http.host ne "api.near-book.com")
```

영향: 해외의 일반 사용자도 API에 접근할 수 있다. 인증이 필요한 API의 기존 인증과 Nest throttling은 별도로 유지되지만, 국가 차단이 제공하던 API 트래픽 제한은 사라진다. 한국 외 API 접근 자체를 계속 금지해야 한다면, 인증된 서버 요청만 허용하는 별도 정책을 설계해야 한다. User-Agent=`node` 또는 변동 가능한 단일 IP를 신뢰 조건으로 추가하지 않는다.

웹 도메인은 앞선 HTTPS 복구 작업에서 DNS-only로 전환되어 이 WAF 규칙이 웹 접속에 적용되는 구조는 아니다. API proxy는 유지한다.

### 변경 후 관찰 결과

- Cloudflare Security rules 목록에서 `Hostname does not equal api.near-book.com` 조건과 **Active** 상태를 확인했다.
- 19:57:02 KST Vercel 로그에서 `/api/libraries/in-bounds`가 **HTTP 200**으로 기록됐다. 공개 응답에는 가온도서관·서울도서관 등 실제 목록이 담겼다. 이전 동일 요청은 `upstream 오류`였다.
- `/libraries` 지도/분할 화면에서 도서관 링크 목록이 표시되고 이전 목록 조회 실패 메시지는 나타나지 않았다. 모든 모드·시도/시군구 변경은 아직 검증하지 않았다.
- 홈에서 이달의 키워드, 인기대출도서, 대출 급상승도서가 표시됐다. Vercel 목록의 `[safeFetch] OK` 로그도 확인했다. 운영 로그에는 규칙 변경 전 시각의 성공도 있으므로 모든 성공을 이번 변경만의 결과로 해석하지 않는다.
- `/library/111314`는 서울도서관 이름·주소·전화번호·공식 홈페이지·인접 도서관을 표시했다. 인기·신착도서는 아직 빈 상태다.
- `/book/9791161571195`는 여전히 not-found, `/popular`는 아직 준비 중 상태였다. 기존 캐시, 상세 요청 실패, 큐레이션/응답 문제를 후속 진단해야 한다. 캐시가 유일한 원인이라고 확정하지 않았으며 캐시 삭제·재배포를 수행하지 않았다.
- 이전에 남은 로컬 API 주소 수정은 **미배포** 상태다. 현 화면 복구와 코드 검증 완료를 혼동하지 않는다.

변경 증거: [Cloudflare 적용 화면](../../.tools/nearbook-evidence/p0-01-cloudflare-api-exempt.jpg)

## 다음 검증 순서

1. **완료:** 사용자 승인 후 규칙 한 개만 수정; 이전 식을 rollback 기준으로 보존.
2. **부분 완료:** 신규 지도 프록시 HTTP 200 및 운영 화면 확인. 관찰된 정상 요청과 기존 not-found/빈 결과를 분리해 추가 진단한다.
3. 의존성을 설치할 수 있는 환경에서 웹 전체 테스트·type-check·build 실행.
4. 승인된 배포 경로로 코드 반영 후 책 `9791161571195`, 도서관 `111314`의 SSR/API 일관성과 지도 프록시를 확인. 운영 환경변수 값은 필요한 API 주소만 점검한다.
5. 완료 기준 충족 후에만 TODO의 P0-01 체크. 잔여 상세 오류·지도 오류는 P0-02/P0-03에서 이어서 처리.
