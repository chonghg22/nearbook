# NearBook 고도화 할 일

최신(2026-10-20): P1-15 [PR22](https://github.com/chonghg22/nearbook/pull/22) 병합2735187·최종 CI39386995419 및 Chromium E2E32개 성공, KAN-120 완료. 완료21(기능 운영20·회귀1)·보류1·진행1(P2-04)·검토0·미착수0. 운영 웹2735187/API d619481·공개 경로 정상, Confluence v10 재조회. 인스타 게시는 사용자 직접 진행·게시 URL/시각 미전달. 아래 집계는 이전 이력이다.

최신(2026-10-20): P2-04 인스타그램 실험 착수. @jack.made.tools 게시 승인 확보·피드5장/20초 릴스/캡션/추적 링크 완성, PR26 CI/preview 성공. Instagram 접근 거절로 미게시·운영 events 행/시각 미확인으로 실험 미시작. 완료20·보류1·검토1(PR22)·진행1(P2-04)·미착수0. 아래 집계는 당시 이력이다.

최신(2026-10-20): P2-03 [PR25](https://github.com/chonghg22/nearbook/pull/25) 운영 완료(source56f5239). 지역 목록·SEO/OG·브라우저 검증 및 KAN-122 완료·Confluence v8 재조회. 완료20·보류1·검토1(PR22)·미착수1(P2-04). 아래 집계는 당시 이력이다.

최신(2026-10-20): P2-03 [PR25](https://github.com/chonghg22/nearbook/pull/25) 구현·CI39375734121/preview 검증 완료, KAN-122 검토 중·미병합/운영 미반영. 완료19·보류1·검토2(PR22/25)·미착수1(P2-04). 아래 최신 집계는 이전 시점의 이력이다.

최신: P2-02 운영 반영 완료. 로드맵 완료19·보류1·검토1(PR22)·미착수2. 다음 P2-03. 아래 미반영 집계는 이력.

최신(2026-10-20): P2-02 PR24 CI/preview 성공·검토 중. 운영 완료18·사용자 보류1·검토2(PR22/24)·미착수2. 다음 미착수는 P2-03.

최신(2026-10-20): P2-01 운영 반영 완료. 로드맵 완료18·보류1·검토1(PR22)·미착수3, 다음 P2-02. 아래 10월19일 집계는 이력.

최신 후속 상태(2026-10-19): P1-14 운영 완료, P1-15 PR22·P2-01 PR23 검토 중/미병합. 로드맵23개 기준 완료17·보류1·검토2·미착수3. 다음 미착수는 P2-02다. 아래 최초 이관 집계는 당시 이력이다.

작성일: 2026-10-12  
근거: [운영 화면·소스 분석 보고서](docs/upgrade-analysis-2026-10-12.md)

Jira·Confluence 이관 완료(2026-10-19): [연결·매핑 기록](docs/atlassian/README.md). [KAN-13](https://chonghg22-1791900037339.atlassian.net/browse/KAN-13) 아래 23항목(완료16/보류1/미착수6)을 MCP로 반영·재조회했다. [고도화 현황](https://chonghg22-1791900037339.atlassian.net/wiki/spaces/~5e9a693934f7b90c0fd20d8d/pages/458753)·[운영 문서](https://chonghg22-1791900037339.atlassian.net/wiki/spaces/~5e9a693934f7b90c0fd20d8d/pages/393218)를 게시하고, [기존 문서·관리자 백로그 맥락](docs/atlassian/remote-context.md)을 가져왔다. 다음 순서는 [KAN-119/P1-14](https://chonghg22-1791900037339.atlassian.net/browse/KAN-119). 기존 관리자 백로그를 완료 처리하거나 알림 개선을 재개하지 않았다.

목표: **검색 → 책 선택 → 가까운 도서관 확인 → 공식 사이트 이동/찜 → 재방문** 흐름을 안정적으로 완성한다.

## 관리 기준

- `P0`: 현재 서비스 이용을 막는 문제. 가장 먼저 해결한다.
- `P1`: 데이터 신뢰도·안전성·핵심 UX·운영 안정성 개선.
- `P2`: 핵심 경로 정상화 이후 개인화·유입·성장 실험.
- 체크박스는 구현과 완료 기준 검증이 모두 끝난 뒤 체크한다.
- 운영에서 관찰한 증상과 추정 원인을 구분한다. 환경변수·캐시·외부 API 장애 원인은 로그 확인 후 확정한다.
- 기존 기능과 SEO 기반은 유지한다. 이번 목록은 계획이며 구현 완료를 의미하지 않는다.

## 1. P0 — 운영 데이터 경로 복구

- [x] **P0-01 서버·브라우저 API 주소 분리 및 운영 설정 검증**
  - 완료(2026-10-13): 주소 회귀 35개 및 전체 CI 통과 후 웹/API 운영 배포. 대표 책·도서관의 SSR/공개 API 정보 일치, 지도 프록시 100개 목록, 정상 canonical·색인 정책 확인. [진행 기록](docs/p0-01-api-routing.md) · [배포 검증](docs/deploy-verification-2026-10-13.md)
  - 현재 Vercel production 배포 커밋·환경변수·서버 로그를 확인한다. 비밀값은 문서나 로그에 남기지 않는다.
  - 서버 요청은 절대 upstream URL만 사용하고 브라우저 요청과 구분한다.
  - `constants.ts`, rewrite, 지도/분석 Route Handler의 API 주소 정책을 통일한다.
  - 빈 값·상대 서버 URL·잘못된 production 설정을 배포 전에 검증한다.
  - 완료 기준: 같은 책/도서관을 SSR 페이지와 공개 API에서 일관되게 조회하고 환경변수 조합 테스트가 통과한다.

- [x] **P0-02 책·도서관 상세의 잘못된 not-found 처리 수정**
  - 완료(2026-10-13): 웹/API 운영 반영 및 대표 상세 복구 확인. API 교체 중 502는 장애 UI로 표시, 실제 없는 도서관은 not-found/noindex 유지, 재시도는 새 문서 요청으로 보완·검증. Node 54개·웹 101개·API 11개 통과. 부가 조회 실패 중 기본 도서관/색인 정책 유지 확인. [진행 기록](docs/p0-02-detail-errors.md) · [배포 검증](docs/deploy-verification-2026-10-13.md)
  - 실제 404와 timeout·네트워크/TLS 오류·429·5xx를 구분한다.
  - 일시 장애를 “ISBN 오류”, “삭제된 도서관”으로 표시하지 않는다.
  - 책 메타데이터와 위치 기반 보유 현황·분석·제휴 요청을 분리한다.
  - 메타데이터와 대출 상태의 캐시 주기를 분리하고 기존 실패 캐시의 복구 여부를 검증한다.
  - 완료 기준: `/book/9791161571195`, `/library/111314`가 정상 표시되고 부가 API 실패가 기본 상세나 색인 정책을 잘못 바꾸지 않는다.

- [x] **P0-03 도서관 지도 목록·지역 중심 프록시 복구**
  - 완료(2026-10-13): Claude Code 구현·보완을 Codex가 검토·검증했다. [PR #6](https://github.com/chonghg22/nearbook/pull/6) 병합, 전체 CI **237개** 통과 후 웹/API `b240462` 운영 배포. 해운대구 주소/목록/마커6·강원51, 가장자리 팝업 유지·상세 이동, 390px 캐시 SDK 재진입, SDK 실패 목록 대체, API 교체 중 실제 실패→재시도 복구 및 최종 health 정상 확인. [구현 기록](docs/p0-03-map-libraries.md) · [운영 검증](docs/deploy-verification-p0-03-2026-10-13.md)
  - `/api/libraries/in-bounds`의 upstream 오류 원인을 확인하고 서버 API client로 연결한다.
  - `/api/libraries/region-center`도 동일한 정책으로 정리한다.
  - 지도 데이터 실패 시 재시도와 목록 대체 경로를 제공한다.
  - 완료 기준: `/libraries`의 지도·목록·분할 모드와 시도/시군구 변경에서 도서관 목록이 표시된다.

- [x] **P0-04 인기·분야·신착도서의 빈 화면 원인 확인 및 복구**
  - 완료(2026-10-13): [PR #7](https://github.com/chonghg22/nearbook/pull/7), 전체 CI **273개** 통과 후 웹/API `1961f07` 운영 반영. 신착 집계500 복구·도서관12곳·선택 변경/신착10권·재시도 복구, 인기20/분야·소설40권, 실제 저장 기간/수집 시각·이전 자료 안내, canonical·390px 가로 넘침 없음·health 정상 확인. 데이터 강제 갱신은 하지 않았다. [구현 기록](docs/p0-04-explore-data.md) · [운영 검증](docs/deploy-verification-p0-04-2026-10-13.md)
  - 각 페이지의 upstream 데이터, SSR 요청 실패, 캐시, 큐레이션 갱신 상태를 구분해서 조사한다.
  - 정상 빈 결과·장애·갱신 중·오래된 데이터 안내를 분리한다.
  - 완료 기준: `/popular`는 정상 API 데이터를 표시하고, `/category`, `/category/novel`, `/new-books`는 실제 데이터 유무에 맞는 화면을 표시한다.

## 2. P1 — 데이터 신뢰도와 캐시 안전성

- [x] **P1-01 보유·대출 상태 모델 정리**
  - 완료(2026-10-14): [PR #8](https://github.com/chonghg22/nearbook/pull/8), 전체 CI **346개** 후 웹/API `02a5c67` 운영 반영.4상태/시점·출처/확인범위, 성공관측 cache·unknown 미캐시, 독립 holdings 조회 및 PWA cache 대체 제외. 실제 재시도 복구·서울후보30/확인10/소장10/대출가능9·부산후보19/확인10·캐시시각 유지·390px·canonical·health 확인. 사용자 기준지역 서울과 viewport 복구. [구현 기록](docs/p1-01-holding-status.md) · [운영 검증](docs/deploy-verification-p1-01-2026-10-14.md)
  - `available / borrowed / not_held / unknown`을 구분하고 조회 실패를 미소장으로 처리하지 않는다.
  - `checkedAt`, 데이터 출처, 오래된 데이터 여부, 확인한 도서관 수를 전달한다.
  - Y/N 응답을 실제 권수처럼 표현하지 않는다.
  - “주변 도서관 없음”과 “주변 도서관에 보유 책 없음”을 구분한다.
  - 완료 기준: 외부 API 실패·한도 초과·정상 미소장·대출 중을 각각 올바르게 표시한다.

- [x] **P1-02 PWA 개인 데이터 캐시 제외**
  - 완료(2026-10-14): 수정 프리뷰의 정상 CSS/로고/메뉴를 사용자 스크린샷으로 확인 후 운영 반영 승인. PR #9 merge `a921b11`, Vercel production `44EHYrPVzQYzcZwNbUDBsW3jwncL` Ready. 운영 `/sw.js` 수정본 바이트 일치, `/offline`·CSS HTTP200/MIME·핵심 규칙·health ok 확인. API CD 없음, DB/서버 데이터 변경 없음. 아래 보류 기록은 배포 전 이력.
  - 진행(2026-10-14): [PR #9](https://github.com/chonghg22/nearbook/pull/9), 전체 CI #18/lint/type-check/build 및 387개 테스트·격리 Chromium 6시나리오 통과. 프리뷰 배포 성공. 접근 허용 답변 후에도 저장된 브라우저 사이트 차단 설정이 남아 프리뷰 화면 검증/운영 반영 보류. [검증 기록](docs/deploy-verification-p1-02-2026-10-14.md)
  - 후속 보완: 프리뷰 깨짐 제보 후 보호 배포 CSS/JS 요청의 인증 쿠키 제거 충돌을 5개 실패 테스트로 재현·수정(`6270ca3`). 인증된 파일은 반환만 하고 캐시 저장 제외. 실제 화면 동일성 확인 및 운영 반영은 계속 보류.
  - 공개 응답만 캐시하도록 allowlist를 적용하고 `/me/*`, 인증·개인 API/화면은 제외한다.
  - 로그아웃·계정 전환 시 개인 데이터 캐시 처리와 공개 캐시 TTL·크기 제한을 정리한다.
  - 오프라인에서 대출 상태를 표시할 경우 마지막 확인 시각과 오래된 정보임을 알린다.
  - 완료 기준: 계정 A → 로그아웃 → 계정 B/오프라인 시나리오에서 이전 개인 정보가 노출되지 않는다.

- [x] **P1-03 API client·응답 타입·오류 처리 공통화**
  - 완료(2026-10-14): 사용자 수정 프리뷰 정상 확인, CI #22/447개 성공 후 PR #10 merge `de38fc8`. Vercel production `86rNh1g7uRdQRJX4mJnwv47vfefD` Ready 및 운영 도메인 연결, API CD #68 성공/배포 digest 일치. 교체 중 502·상세500이 관측됐으나 이후 health HTTP200/ok, 검색10건/total415·자동완성8건·도서관 운영시간/휴관일 및 상세 SSR HTTP200 확인. DB/강제 갱신/지도 권한 변경 없음. 아래 대기 기록은 배포 전 이력.
  - 착수(2026-10-14): 별도 worktree `nearbook-p1-03`, base `a921b11`. 공개 검색 인증 의존·오류→빈 결과 처리·운영시간 `{text, closed}`/`weekday` 불일치를 확인하여 공통 요청/응답 계약으로 정리 중.
  - 진행: [PR #10](https://github.com/chonghg22/nearbook/pull/10), `1d6b69b`, 공통 transport/공개·인증·서버 client/검색 오류·재시도/운영시간·휴관일 수정. 로컬 전체445개 및 lint/type-check/build 통과. CI·프리뷰 검증 후 웹/API 배포 승인받음. [검증 기록](docs/deploy-verification-p1-03-2026-10-14.md)
  - CI #21/446개 및 프리뷰 check 성공(`02ace09`) 후 사용자 이미지에서 운영시간·휴관일 정상, 검색 실패/지도 실패 확인. 공개 요청을 같은-origin `/api` rewrite로 보완(`98f87a6`), 로컬447개 및 lint/type-check/build 통과. 후속 CI #22와 Vercel Ready/check 성공, 사용자 검색 화면 재검증 대기이며 P1-03 운영 웹/API는 아직 반영하지 않음.
  - 서버용·공개 브라우저용·인증용 client를 구분한다.
  - 공개 검색이 불필요한 세션 갱신에 의존하지 않게 한다.
  - timeout, non-OK 처리, 오류 타입, 응답 스키마 검증을 공통화한다.
  - 운영시간·휴관일, 보유 상태, 확인 시각 등 공용 타입과 실제 API 응답을 맞춘다.
  - 완료 기준: `{text, closed}` 형태의 운영시간이 표시되고 API 오류가 정상 빈 결과와 구분된다.

## 3. P1 — 핵심 UI/UX와 검색

- [x] **P1-04 홈 검색창·기준 지역 선택 개선**
  - 완료(2026-10-14): 사용자 프리뷰 이미지 확인 및 지도 허용 URL 추가 없이 직접 운영 반영 승인. CI #23/497개 성공 후 PR #11 merge `6ec2b81`, Vercel production `FVQd4aJWbH67fKcWHhnqJNvJxLCb` Ready/운영 alias 연결. 홈 HTTP200/검색·스캔·기준 변경 SSR 표시·CSS 정상, 서울·부산 near 각12곳/검색10건/parser·health ok 확인. API CD/컨테이너 교체·DB·지도 권한 변경 없음. 지도 live 화면은 별도 검증하지 않았으며 아래 대기 기록은 배포 전 이력.
  - 진행(2026-10-14): 운영 `de38fc8` 기반 별도 worktree `nearbook-p1-04`, [PR #11](https://github.com/chonghg22/nearbook/pull/11)/head `86b09fc`. 홈 검색·상시 ISBN 스캔·기준 지역/도서관 변경, GPS 수동 대체/저장 위치 검증·늦은 응답 차단, 선택 기준 반경5km 목록/실제 거리 표시 구현. CI #23/497개 및 lint/type-check/build 전체 성공, Vercel 프리뷰 Ready/check 성공. 사용자 프리뷰 화면 확인·운영 승인 대기, 운영 미반영. [검증 기록](docs/deploy-verification-p1-04-2026-10-14.md)
  - 소개 문구 아래에 주요 검색창과 ISBN 스캔 진입을 배치한다.
  - GPS 미사용 시 “현재 위치” 대신 실제 기준 지역을 명확히 표시한다.
  - 지역/도서관 변경 버튼을 상시 제공하고 GPS 거부 시 수동 선택을 지원한다.
  - 완료 기준: 처음 방문한 비로그인 사용자도 홈에서 바로 검색하고 GPS 없이 지역을 변경할 수 있다.

- [x] **P1-05 도서관 공식 사이트·길찾기 CTA 연결**
  - 완료(2026-10-14): 사용자 후속 프리뷰 정상 확인 및 운영 반영 승인, CI #26/536개 통과 후 PR #12 merge `56947d6`. Vercel production `BycU91FSfqHVXZR3wWt4NWG3udui` Ready/운영 alias 연결, 실제 책 상세 SSR·CSS·CTA/수정 요청경로 JS bundle200, 보유 API 두 ISBN 각10곳/파서 및 링크·health ok 확인. PWA source 유지. API CD/컨테이너 교체·DB·지도 설정 변경 없음. 아래 대기 문구는 배포 전 이력이며 P1-06은 미착수. [검증 기록](docs/deploy-verification-p1-05-2026-10-14.md)
  - 후속(2026-10-14): 사용자 프리뷰에 카드 대신 조회 실패가 표시되어 1차 화면 검증 실패로 처리. `LibraryStatus`의 절대 API 직접 요청(CORS 프리뷰 미허용)을 기존 same-origin public client로 수정, 실제 화면 요청→CTA/503→재시도 DOM 회귀2개 추가 및 기존 소스 검사 업데이트. PR #12 최신 head `d7cf86f`, CI #26/536개 및 lint/type-check/build 성공·최신 Vercel `DxztvDZdN1R4MgAswyKT559qJ3bx` Ready/check 성공. 고정 프리뷰 재확인 요청/운영 미반영. 아래 1차 CI 성공은 이전 head 이력.
  - 진행(2026-10-14): 운영 `6ec2b81` 기반 별도 worktree `nearbook-p1-05`, [PR #12](https://github.com/chonghg22/nearbook/pull/12)/head `8a7a3e0`. API에 이미 있는 홈페이지·좌표 보존, 공식 확인·카카오맵 목적지 연결, 안전한 URL/누락 안내·예약 접수 아님 문구·새 탭·키보드·터치 타깃 구현. 신규37개/전체534개 및 CI #24 lint/type-check/build/test 성공, Vercel 프리뷰 Ready/check 성공. ‘검증 후 운영 웹 반영’ 승인 수신, 사용자 프리뷰 화면·버튼 이동 확인 대기/운영 미반영. API·공용 패키지·DB·지도 권한 변경 없음. [검증 기록](docs/deploy-verification-p1-05-2026-10-14.md)
  - 책 상세의 도서관 카드에 홈페이지·길찾기 URL을 전달한다.
  - 책별 검색/예약 링크는 실제 지원하는 도서관만 연결하고 그 외에는 홈페이지로 안내한다.
  - 대출 상태·거리·확인 시각을 주요 정보로 배치하고 광고·제휴 옵션은 뒤에 둔다.
  - 완료 기준: 책 상세에서 도서관 공식 확인과 길찾기로 바로 이동할 수 있으며 자동 예약을 암시하지 않는다.

- [x] **P1-06 검색 순위·검색 유형·판본 구분 개선**
  - 완료(2026-10-14): 사용자 프리뷰 통합 복귀 확인 및 기존 운영 승인, CI #28/620개 통과 후 PR #13 merge `0979c1b`. Vercel `AaGnE6ZU2uCbMANETCyGRkkrVE19` Ready/운영 alias, API CD #69 success/build-pull digest 일치. 운영 ISBN10/하이픈13/all 자동감지 각각정확1건·invalid400, 제목 전체구문→부분 순서/저자·출판사 필드/API health/CSS·JS bundle/worker 확인. DB·강제 갱신·지도 설정 없음. 첫 제목18.3초 지연과 remoteTotal 정합성은 아래 P1-07에 남기며 P1-07 미착수. 아래 대기 문구는 배포 전 이력. [검증 기록](docs/deploy-verification-p1-06-2026-10-14.md)
  - 진행(2026-10-14): 운영 `56947d6` 기반 별도 worktree `nearbook-p1-06`, [PR #13](https://github.com/chonghg22/nearbook/pull/13)/최신 head `db00074`. 통합/명시 필드 검색 구분·전체 후보 관련도 정렬·ISBN 체크/10→13/legacy alias·역할 정리·판본/ISBN 표시·typed 보충·자동 ISBN 감지 후 새 제목 검색 모드 복귀 구현. 대표40개 실제 Orama fixture 및 UI 요청 DOM 회귀, 로컬/CI #28 전체620개/frozen install/lint/type-check/build/test 성공·Vercel `EHJFEdoQzVRY4wQn8Ye2YbJUKksY` Ready/check 성공. 사용자 프리뷰 확인 대기/운영 미반영. ‘검증 후 운영 웹/API’ 승인 수신; 프리뷰 API는 기존 운영이라 새 순위는 배포 후 실제 검증. DB·강제 갱신·지도 설정 및 P1-07 변경 없음. [검증 기록](docs/deploy-verification-p1-06-2026-10-14.md)
  - 정규화된 정확 제목·전체 구문 일치를 부분 일치보다 우선한다.
  - 제목/저자/ISBN/출판사 검색 유형의 실제 동작을 UI와 맞춘다.
  - ISBN 감지·10/13 정규화, 저자 역할 표기 정리, 일반판/큰글자책/필사집 구분을 검토한다.
  - 대표 검색어 30~50개의 기대 결과·순위로 회귀 테스트를 만든다.
  - 완료 기준: 대표 제목 검색에서 관련성이 높은 책이 우선하고 ISBN·저자·판본 테스트가 통과한다.

- [x] **P1-07 검색 응답 시간·페이지 정합성·오류 UI 개선**
  - 완료(2026-10-15): 사용자 프리뷰 정상 확인 및 운영 승인, CI #29/645개 성공 후 PR #14 merge `4fa9883`. 운영 Vercel `23CQG6b5EDUcrbyM3ejk1wnHw8fD` Ready/도메인 연결, API CD #70 success/build-pull digest 일치. 새 응답 플래그·제목/저자/출판사/ISBN/invalid400·총134건/마지막14페이지4건/다음페이지0건/1·2페이지 중복 없음·health/자산/worker 확인. 제목 첫 GET847ms, 후속 page3 207ms. 배포 직후502→회복 및 일부7~9.7초 일시 지연도 기록했으며 모든 요청 지연 해소를 주장하지 않는다. DB·강제 갱신·지도/PWA·P1-08 변경 없음. 아래 진행 문구는 배포 전 이력. [검증 기록](docs/deploy-verification-p1-07-2026-10-15.md)
  - 진행(2026-10-15): 운영 `0979c1b` 기반 별도 worktree `nearbook-p1-07`, [PR #14](https://github.com/chonghg22/nearbook/pull/14)/head `d031eb8`. 로컬 우선·같은 색인 total·중복/동시16개 제한 백그라운드 보충·cold pending/failure·최대15회 UI 재확인·500개 LRU/TTL/revision 무효화·범위 밖 페이지 복귀 구현. 로컬/최종 CI #29 frozen install/lint/type-check/build/645개 테스트 통과. Vercel `BvY21XsSxAHQh4vTnGN8YV6YWHhj` Ready/check 성공. 사용자 프리뷰 화면 확인 대기/운영 미반영. 사용자 ‘검증 후 운영 웹/API 반영’ 승인 수신; DB·강제 갱신·지도/PWA·P1-08 제외. [검증 기록](docs/deploy-verification-p1-07-2026-10-15.md)
  - 착수 전 운영 관측(2026-10-14, P1-06 배포 후): 제목 첫 GET18284ms로 웹15000ms deadline 초과 가능, 출판사10659ms. 동기 외부 보충·remoteTotal 혼합이 이번 작업의 출발점이었다.
  - 로컬 결과 우선 응답과 외부 보충 요청의 중복 방지·캐시 무효화를 설계한다.
  - `total`과 페이지 항목이 같은 결과 집합을 기준으로 하도록 한다.
  - SWR error를 결과 UI에 전달하고 로딩 중 0건을 확정 결과처럼 표시하지 않는다.
  - 검색 캐시에 최대 크기와 만료 엔트리 정리를 적용한다.
  - 완료 기준: 외부 timeout에도 기존 결과를 사용할 수 있고 오류/0건이 구분되며 잘못된 총건수로 빈 페이지를 만들지 않는다.

- [x] **P1-08 보유 책이 없을 때의 대안 제공**
  - 완료(2026-10-15): 사용자 정상 확인·운영 웹 승인 및 CI #30/663개 통과 후 PR #15 merge `5440144`. Vercel `DVCVpnCizhP58HCG75wKQ7nmdEpM` Ready/check success/운영 도메인 연결. 운영 책 SSR·찜 anchor·반경/대안 JS·CSS·worker byte 일치,5/10/20km HTTP200/후보30·조회10/strict parser·health 확인. 웹만 배포, main SHA API CD0건이며 API/DB·강제 갱신·지도/PWA·자동 찜/알림 변경 없음. P1-09 미착수. 아래 진행 문구는 배포 전 이력. [검증 기록](docs/deploy-verification-p1-08-2026-10-15.md)
  - 진행(2026-10-15): 운영 `4fa9883` 기반 별도 worktree `nearbook-p1-08`, [PR #15](https://github.com/chonghg22/nearbook/pull/15)/head `0e97ff5`. 명시5/10/20km·책/위치 변경5km 복귀·늦은 응답 배제, 대출 가능0/오류/미확인에서 반경·지역·제목/판본·기존 찜/알림 설정·공식 사이트 탐색 제공. 로컬/최종 CI #30 frozen install/lint/type-check/build/663개 테스트 통과. Vercel `5ET2PzWMMy5GikntPRJxyGhPrPyZ` Ready/check success. 사용자 프리뷰 화면 확인 대기/운영 미반영. 사용자 ‘검증 후 운영 웹 반영’ 승인 수신. 웹만 변경, API/DB·강제 갱신·지도/PWA·자동 찜/알림 발송/설정·검색 결과 보유 fan-out·P1-09 제외. [검증 기록](docs/deploy-verification-p1-08-2026-10-15.md)
  - 반경 확대, 다른 지역/판본 선택, 찜·알림, 공식 사이트 확인으로 연결한다.
  - 검색 결과의 대출 상태 미리보기를 추가한다면 화면에 보이는 결과부터 배치·캐시로 조회한다.
  - 완료 기준: 미소장/조회 실패 화면에서 사용자가 다음 행동을 선택할 수 있고 외부 API 호출이 무제한 증가하지 않는다.

- [x] **P1-09 모바일·접근성 검증**
  - 완료(2026-10-15): 사용자 휴대폰 정상 확인(검색/지역 선택 시 키보드 가림 없음)·운영 웹 승인, CI #32/693개 통과 후 [PR #16](https://github.com/chonghg22/nearbook/pull/16) merge `a516a5e`. Vercel `7yiBYvog9cPvZXdNRqszao9P1gPk` production Ready/check success/운영 두 도메인 연결. 홈·검색·도서관·책 상세/자산25개/combobox·focus·viewport·inline 설치 bundle·worker byte 일치/검색·보유 parser/health 확인. API CD0건, 컨테이너/DB/지도·개인 설정 변경 없음. 브라우저 접근 차단은 우회하지 않았으며 사용자 확인·DOM·HTTP 증거를 구분, 정확한360/390/430px별 픽셀·OS/회전 전종 통과는 주장하지 않는다. 보유 조회9.8초 관측은 P1-13에 기록. 아래 진행 문구는 배포 전 이력. P1-10 미착수. [검증 기록](docs/deploy-verification-p1-09-2026-10-15.md)
  - 진행(2026-10-15): 운영 `5440144` 기반 별도 worktree `nearbook-p1-09`, [PR #16](https://github.com/chonghg22/nearbook/pull/16)/최종 head `2edfd05`. 자동완성 키보드/ARIA/IME·모바일 검색/위치 Dialog viewport/focus·긴 텍스트/페이지 번호/44px 대상·지도/목록 상태·성공 조회 후 inline 설치 제안 구현. 로컬 및 최종 CI #32 frozen install/lint/type-check/build/693개 테스트 통과, Vercel `35dzuTJFFBmv4dbNqhDCVu5gcDPS` Ready/check success/고정 프리뷰 연결. 운영 웹·프리뷰·현재 Chrome 새 탭 사용 승인 수신했으나 새 탭 접근이 브라우저 보안 정책에서 차단됨. 임시 viewport 원복/우회 없음. 직접 모바일 화면·키보드 확인 대기, 운영 미반영. API/DB·지도 URL·worker·자동 찜/알림/설치·P1-10 제외. [검증 기록](docs/deploy-verification-p1-09-2026-10-15.md)
  - 360/390/430px 및 실제 기기에서 검색, 지역 필터, 지도/목록 전환, 긴 제목, 키보드 열린 상태를 검증한다.
  - 자동완성의 키보드 탐색·Esc·ARIA 상태와 위치 선택 모달의 포커스를 점검한다.
  - 설치 배너와 핵심 버튼 겹침을 제거하고 유용한 행동 완료 후 설치를 제안한다.
  - 완료 기준: 핵심 흐름이 모바일에서 잘리거나 가려지지 않고 키보드로도 조작 가능하다.

## 4. P1/P2 — 찜·내 도서관·알림

- [x] **P1-10 위시리스트·기본 도서관 흐름 개선**
  - 사용자 운영 확인(2026-10-15): 배포 안내 후 ‘확인했어’ 응답 수신. 에이전트의 실제 계정 변경/로그인 검증으로 바꾸어 기록하지 않는다.
  - 완료(2026-10-15): 사용자 ‘운영 반영해’ 직접 지시에 따라 [PR #17](https://github.com/chonghg22/nearbook/pull/17) 운영 웹/API 반영 후, 운영 자산 점검에서 발견한 로그인 page→새컴포넌트 연결 누락을 [PR #18](https://github.com/chonghg22/nearbook/pull/18)로 보완했다. 실제 route DOM 테스트 강화·최종 CI #34/774개 통과. 최종 웹 main `d03897b`/Vercel `D83dxUMzj31AkXY8UJqbLuW1gu1A` Ready/두 운영 도메인 연결, API source `0c60b52`/CD #71 success/build-pull digest 일치. 운영 페이지5종·고유 자산28개·새 로그인/찜/도서관 bundle·worker 동일·개인페이지307/개인API5종 direct+proxy401·검색10건240ms·공개 보유checked10/available9/borrowed1/1164ms·health292/157ms 확인. 실제 로그인/개인쓰기/인증된 보유 양성 live·DB경합 검증과 자동 mock/DOM/HTTP 증거는 구분. 교체 중502 및 앞선unknown/지연 회복 이력은 P1-13/14 기록, DB·요금·알림·지도·PWA 설정 변경 없음. 아래 진행 문구는 배포 전 이력, P1-11 미착수. [최종 검증 기록](docs/deploy-verification-p1-10-2026-10-15.md)
  - 진행(2026-10-15): 운영 `a516a5e` 기반 별도 worktree `nearbook-p1-10`, [PR #17](https://github.com/chonghg22/nearbook/pull/17)/head `6d1d31f`. 개인 목록 실패/빈 상태 분리·same-origin 인증 요청·찜/도서관 상태 확인/중복/복구·기본 도서관 검색/등록/선택·명시적 한 권/한 곳 보유 API·user lock/transaction/default 소유권/idempotency·로그인 실패/안전한 복귀 구현. 로컬 및 최종 CI #33 frozen install/lint/type-check/build/773개 테스트 통과. Vercel `HvkogGAQx9MDHWUcRT9uTR27mUff` Ready/check success, 고정 프리뷰 연결. 사용자 ‘검증 후 운영 웹/API 반영’ 승인 수신. 실제 화면 사용자 확인 대기, 운영 미반영. 새 보유 API는 API 배포 전 프리뷰404 가능; 양성 계약은 모의 테스트이며 live 계정/DB경합 검증과 구분. 기존 브라우저 제한 우회·실제 찜/도서관 설정 변경·DB 스키마·요금/알림·지도/worker·강제 갱신·P1-11 제외. [검증 기록](docs/deploy-verification-p1-10-2026-10-15.md)
  - 찜 이후 기본 도서관 선택으로 자연스럽게 연결한다.
  - 위시리스트에 내 도서관 기준 대출 상태와 공식 링크를 표시한다.
  - 찜/삭제/설정 저장의 오류 안내, 중복 클릭 방지, 실패 복구를 정리한다.
  - 완료 기준: 로그인 → 기본 도서관 → 찜 → 상태 확인 흐름과 저장 실패 시나리오가 검증된다.

- [ ] **P1-11 이메일·푸시 채널 독립 및 발송 주기 정합성 확보**
  - 보류(2026-10-15): 사용자 ‘이메일,푸시,알림 발송은 나중으로 미루고 다음 작업하자’ 지시. 기존 발송 설정/동의/주기·실제 발송은 이번 후속 작업에서 변경하거나 실행하지 않는다. P1-12로 이동.
  - 이메일과 푸시의 opt-in·대상 조건·발송 결과를 독립시킨다.
  - 실제 새벽 digest 방식과 “즉시 알림” 문구를 일치시킨다.
  - 중복 발송 방지, 재시도, 확인 시각, 공식 링크를 검증한다.
  - 완료 기준: 이메일 끔+푸시 켬을 포함한 조합 테스트가 통과하고 UI가 실제 발송 주기를 설명한다.

- [x] **P2-01 비로그인 재방문·요금 정책 검토**
  - 완료(2026-10-20): PR23 merge c48a91b 운영 반영. Vercel READY/운영 두 도메인·source 일치, 운영 GET8개200·개인 API401. [배포 검증](docs/deploy-verification-p2-01-2026-10-20.md). 아래 검토 중 기록은 배포 전 이력.
  - 진행(2026-10-19): [PR #23](https://github.com/chonghg22/nearbook/pull/23), 찜·내 도서관의 동작하지 않는 Pro CTA를 실제 무료 한도/목록 교체 안내로 정리. 최근 본 책 opt-in/삭제·만료·계정 경계·병합/지표 실험안 작성. 웹365·lint/type-check 통과, [CI39233248557](https://github.com/chonghg22/nearbook/actions/runs/39233248557)·Vercel preview 성공. Jira 검토 중/미병합/미배포. [검토 기록](docs/p2-01-return-policy.md).
  - 최근 검색/최근 본 책/임시 찜과 로그인 후 병합을 제품 실험으로 검토한다.
  - free 한도와 동작하지 않는 “Pro 알아보기” CTA의 처리 방향을 결정한다.
  - 요금·결제·한도 변경은 별도 제품 결정 후 구현한다.
  - 완료 기준: 실험/정책 결정이 문서화되고 실제 동작하지 않는 유료 CTA가 남지 않는다.

## 5. P1 — 운영·테스트 기반

- [x] **P1-12 외부 API 한도·작업 등록·갱신 상태 통일**
  - 완료(2026-10-15): 사용자1일500건/운영API 승인 후 [PR #19](https://github.com/chonghg22/nearbook/pull/19) main `f7f344d` 반영. 로컬826(실PG9)/CI #35 817+PG9skip 구분. API CD #72 success/build-pull digest 일치·Vercel Ready/두 도메인 연결. direct/proxy quota·operations200/no-store/등록5+observer, 검색10건158ms/개인401/health892·148ms 확인. 기존실서버설정30000→effective500 clamp, 오늘기존장부644(성공542+실패102)로 추가조회차단, raw보유reasonquota10·장부644→644 확인. 로컬reset은10/16 00KST이며 공급자실제잔여 보장 아님. 기존loan2026-05-07/keyword2026-04 stale snapshot 감지, 강제갱신없음. 교체중502회복P1-14기록. 알림/발송개선보류·기존설정유지·pending활성화/DBschema/강제갱신/P1-13착수 없음. 아래는 진행 이력. [최종 검증](docs/deploy-verification-p1-12-2026-10-15.md)
  - 검증 진행: [PR #19](https://github.com/chonghg22/nearbook/pull/19)/head `23ee538`, 최종 로컬826개(실PG9개 포함/no skips) 통과. workflow scope 부족으로 CI DB service 변경 push가 거부돼 workflow 변경은 제거하고 기존 CI 유지(새 권한/우회 없음). CI #35의817개+PG9skip을 별도 확인한다. API 프리뷰 서버가 없어 새 경로는 격리 SQL/실제 module HTTP 후 승인된 운영 GET으로 검증. [상세 기록](docs/deploy-verification-p1-12-2026-10-15.md)
  - 진행(2026-10-15): 사용자 실제 정보나루 한도1일500건 확인 및 검증 후 운영 API 반영 승인. 기반 `d03897b`, 별도 worktree `nearbook-p1-12`. DB 예약 장부/트랜잭션 경합 제어·KST 일자/재시작·475LOW/500전체 제한·중복 호출 합치기·한 번 기록·등록/갱신 aggregate 상태 API 구현. 기존 큐레이션 스케줄 유지, 미등록 pending/새 발송 활성화 없음. 로컬826개(실 PostgreSQL9개 포함) 통과 후 HTTP route 회귀·최종 CI 검증 중. DBschema·요금/알림·강제갱신·P1-13 제외. 운영 미반영.
  - 실제 계정 호출 한도를 확인하고 client·quota·알림 cron의 분산된 기준을 통일한다.
  - QuotaModule, acquire, pending lookup cron의 등록/호출 여부를 확인한다.
  - 호출 우선순위·재시도·중복 방지와 큐레이션 마지막 성공/건수/기준 기간을 기록한다.
  - 완료 기준: 한도 초과와 갱신 실패가 감지되고 운영자가 실제 동작 상태를 확인할 수 있다.

- [x] **P1-13 캐시·검색 인덱스 운영 정리**
  - 운영 후속(13:30KST): 정기reconcile 자연실행 success/count2000/cursor진행·completedSweeps0/revision1유지 확인. 한 회차 성공과 전체 순환/운영 인기rank 양성은 구분한다. 수동 작업 실행 없음.
  - 운영 완료(2026-10-16): 사용자 ‘반영해’ 승인 후 PR20→main `fb95610`, API [CD #73](https://github.com/chonghg22/nearbook/actions/runs/38850514646) SUCCESS/build-pull digest 일치. Vercel `dpl_4VFVyvy9cNQLwiUQA1dva8pXhRkM` production Ready/두 운영 도메인 연결. liveDB13572건/22549ms rebuild 성공·readytrue/신규 status direct+proxy200/no-store/3jobs등록·검색 ‘책’10/591·기저장ISBN1건/parser통과·health200/ok·주요4페이지200·개인3종401. 교체중502→회복으로 무중단아님/P1-14에기록. quota500/blocked 그대로·강제갱신/발송/계정/DBschema/한도변경 없음. popularityPeriod:null로 유효 전국rank의 운영 양성은 확인되지 않았으며 실PG/Orama 검증과 구분, 전체 정기replay·dual-generation최대메모리도 live검증미완 주장없음. 아래 승인대기 문구는 과거 진행 이력. [최종검증](docs/deploy-verification-p1-13-2026-10-16.md)
  - 검증 완료/운영 승인 대기(2026-10-16): 최종 head `7849dcf` [CI #36](https://github.com/chonghg22/nearbook/actions/runs/38850204320) SUCCESS/실행838개(Node237+Vitest365+API236), 실PG15개/2suites는CI skip·로컬853개 전부 실행 통과로 구분. Vercel `dpl_BXuSjhPx82rRf2uo3quiwjdY1jeK` Ready/check SUCCESS/build1m1s(웹변경없음,API프리뷰없음/화면검증아님). 격리 테스트DB 정리/로그 보존. 원격 main은 `f7f344d` 유지/PR20 OPEN/운영 CD 실행 없음. 다음 작업/P1-14 미착수.
  - 진행(2026-10-16): 운영 `f7f344d` 기반 별도 worktree `nearbook-p1-13`, [PR #20](https://github.com/chonghg22/nearbook/pull/20)/head `7849dcf`. 동일 캐시 singleton·DB repeatable-read 전체 generation 교체/실패 유지·매 기동 DB rebuild·PK 순환 replay/성공 cursor·canonical metadata/최신 전국 기간 인기 점수 유지·aggregate `/operations/search` 구현. 로컬 frozen install/lint/types/build 및853개(Node237+Vitest365+API251, 실제 PG15 포함/no skips) 통과, CI #36 검증 중. 실제 AppModule HTTP 및2만권 합성 재색인 검증은 운영 용량/지연 보장과 구분한다. 운영 미반영/별도 승인 전 merge하지 않는다. 알림·강제 갱신·DBschema·워크플로·웹 UI·지도·한도 변경·P1-14 제외. [검증 기록](docs/deploy-verification-p1-13-2026-10-16.md)
  - 읽기 전용 후속(2026-10-16 13:16KST): 자연 스케줄에서 loan 성공/20건/2026-10-16·trend 성공/5건/2026-10-15 확인. keywords는2026-04/10건/월1일 작업/lastRun:null로 과거 원인 미확정. category·new-arrivals는partial, 최신 저장840/122. 오늘 quota장부500/effective500/blocked이며 강제조회·한도변경 없음.
  - P1-12 상태 조회에서 category840행/2026-10·trend5행/2026-10-14·신착112행/2026-10와 달리 loan20행/2026-05-07·keyword10행/2026-04의 오래된 저장 자료를 확인했다. 원인 미확정/강제갱신 없음. 새 프로세스 lastRun:null/기존 snapshot시각을 구분하고 자연 스케줄 결과·공급자/저장/한도 차단을 후속 점검한다. 현재 장부644로effective500차단 중이다.
  - P1-10 최종 재점검은 공개 보유HTTP200/1164ms·checked10/available9/borrowed1/unknown0, health292/157ms로 회복. 앞선 지연·unknown의 원인은 확정하지 않았으며 일회 회복을 전체 성능 해결로 보지 않는다.
  - P1-10 API 교체 후 공개 보유 GET HTTP200/15705ms이나 조회10곳 전부unknown(성공 관측0), 직접 health8275ms→proxy454ms. 도서관 SSR12399ms도 관측. 상태·계약 성공과 공급자 양성 결과를 구분하며, 원인/호출 이유는 이 요약 응답만으로 확정하지 않는다. 최종 재점검 결과는 P1-10 배포 기록에 남긴다.
  - P1-09 운영 웹 반영 후 공개 보유 GET(서울5km/ISBN9788936434120) HTTP200/9759ms, 뒤 health893/293ms 정상. API 배포/강제 갱신은 없었으며 원인을 확정하지 않았다. 재발 시 외부 도서관 호출·캐시/큐 대기와 기존 검색/index/네트워크 지연을 구분해 프로파일링한다.
  - P1-07 배포 후 일부 검색/health에서7~9.7초 일시 지연 후 회복 관측. 재발 시 보충 병행 색인 upsert/persist/GC 및 네트워크를 프로파일링한다. HTTP 관측만으로 원인은 확정하지 않았다.
  - 중복 CacheService의 책임을 통합하거나 구분하고 상태 지표를 맞춘다.
  - Orama 영속 볼륨 또는 명시적 재생성 전략을 결정한다.
  - 완성된 새 인덱스의 원자적 교체, delta watermark/재처리, 인기 점수 유지 여부를 검증한다.
  - 완료 기준: 컨테이너 재생성·전체 rebuild·일반 upsert 이후 검색과 인기 정렬이 일관된다.

- [x] **P1-14 준비 상태·배포 검증·롤백 마련**
  - 운영 완료(2026-10-19): 사용자 운영 배포 지시 후 [PR21](https://github.com/chonghg22/nearbook/pull/21)/main `d619481` 반영. CI39221049794/CD39221389800 성공·build/pull digest 일치·이전 컨테이너 보존. direct/proxy `/ready` DB/search true·동일SHA·scheduler true, 저장ISBN/도서관/공식URL·책/도서관SSR GET8건200. Vercel production Ready/양 도메인 연결. 실제 격리 Docker의 실패 복구·성공 후 보존 리허설 통과, Oracle 장애 주입·최대RSS 검증과 구분. 교체중502→회복/무중단 아님. Jira KAN-119 완료·Confluence 두 문서v2 재조회. [최종 검증](docs/deploy-verification-p1-14-2026-10-19.md). 아래는 운영 반영 전 이력.
  - 착수·로컬 구현(2026-10-19): Jira/Confluence 확인 후 [KAN-119](https://chonghg22-1791900037339.atlassian.net/browse/KAN-119)를 `진행 중`으로 전이하고 진행 기록을 재조회했다. main `fb95610` 기반 별도 `nearbook-p1-14` worktree/`fix/p1-14-readiness-rollback-20261019`. `/ready` DB·검색 준비/SHA·scheduler mode, digest 고정·후보 검증·이전 컨테이너 보존/복구·공개 경로 판정·GET 점검기 구현. 로컬 lint/types/build/test(API243성공·실PG15skip/웹365+Node237·일부캐시), 모의 배포장애12시나리오/HTTP9사례 통과. 실제 Oracle 복구 리허설·원격 CI/운영 반영은 남음. 운영 미배포·완료 미처리, 알림 개선 보류 유지. [구현·검증 기록](docs/p1-14-readiness-rollback.md). 아래 미착수 문구는 착수 전 이력.
  - P1-13 CD #73 교체중 신규상태 GET502(658ms)→기동DB13572건/22549ms재색인후200/readytrue 회복. CD성공·부팅재색인·실제HTTP준비를 분리했으며 기존배포는무중단아님. P1-14는아직미착수.
  - P1-12 CD #72에서도 교체중 direct health502(1140ms)→완료후 direct/proxy200/ok(892/148ms) 회복. readiness/롤백 개선은 아직 미구현이며 무중단 배포로 보지 않는다.
  - P1-10 API CD #71 컨테이너 교체 중 개인 목록 첫GET502→뒤 직접/proxy 개인 API5종 모두401·health200 회복. CD 성공만으로 readiness·무중단을 주장하지 않는다.
  - P1-07에서도 CD 성공 직후 첫 검색502→health200 회복 관측. CD 완료와 실제 readiness를 구분하는 검증이 필요하다.
  - liveness와 DB/검색 준비 상태를 확인하는 readiness를 분리한다.
  - 새 컨테이너 준비 확인, 커밋 태그 기반 배포·롤백을 마련한다.
  - 인증서/HTTP 상태와 대표 검색 → 책 상세 → 도서관 링크를 읽기 전용으로 모니터링한다.
  - 완료 기준: 실패한 배포가 정상 배포로 판정되지 않고 이전 버전으로 복구하는 절차가 검증된다.

- [x] **P1-15 핵심 기능 회귀·E2E 테스트 추가**
  - 완료(2026-10-20): 최신 운영 main56f5239 통합·PR22 병합2735187·CI39386995419 성공. E2E32개/웹402/API243(실PG15skip)/SQL6개 통과. 다음 줄은 최초28개 구현 당시 이력이다.
  - 진행(2026-10-19): 운영 `d619481` 기반 별도 `nearbook-p1-15`/`test/p1-15-core-e2e-20261019`, [PR22](https://github.com/chonghg22/nearbook/pull/22). 로컬 Next production bundle+격리 API/auth/Chromium desktop·mobile E2E28개 통과. 검색→책→도서관/429·503·15초deadline·GPS수동대체·찜실패/중복·계정전환/실제worker·offline·카메라거부/ISBN·360/390/430px 포함. 기존 API243/웹365/Node237·실PG15skip 구분. CI 브라우저/실패artifact 연결, [최종 CI39223666539](https://github.com/chonghg22/nearbook/actions/runs/39223666539) 성공·Jira 검토 중/PR 미병합. 실제 운영 계정/발송·물리카메라/iOS Safari 통과로 확대하지 않음. [검증 범위](docs/p1-15-core-e2e.md).
  - 검색→책→도서관, 외부 API timeout/429/5xx, GPS 거부를 테스트한다.
  - 로그인/찜, 채널별 알림, 계정 변경/오프라인, 카메라 거부·ISBN 스캔을 검증한다.
  - 기존 SEO 테스트와 CI lint/type-check/build/test를 유지한다.
  - 완료 기준: 핵심 사용자 흐름과 장애 시나리오가 CI 또는 문서화된 기기 검증에서 통과한다.

## 6. P2 — 계측·SEO·유입 확대

- [x] **P2-02 행동 이벤트와 핵심 지표 보정**
  - 운영 완료(2026-10-20): PR24 merge defc8a4, Vercel READY/두 도메인·source 일치, GET8개200·실제 익명 이벤트12건202/ok:true·requestId 일치. [검증 범위/한계](docs/deploy-verification-p2-02-2026-10-20.md). 아래 검토 기록은 배포 전 이력.
  - 검토 중(2026-10-20): [PR24](https://github.com/chonghg22/nearbook/pull/24), 제출/응답 결과/상태 화면·공식 클릭/7일 재방문 구분. [CI39342645093](https://github.com/chonghg22/nearbook/actions/runs/39342645093)·preview 성공, SQL6개/실제 격리PG fixture·웹388·API243·Node237 통과(API PG15skip). 미병합·미배포. [구현 기록](docs/p2-02-core-analytics.md).
  - 헤더·홈·검색 페이지의 검색 제출 이벤트를 일관되게 기록한다.
  - 상태 화면 노출과 실제 조회 완료를 구분하고 보유/대출 가능 도서관 수를 따로 집계한다.
  - 검색 순위·필터·조회 시간·오류·최신성·공식 사이트 이동을 측정한다.
  - 완료 기준: 방문→검색→책 선택→조회 완료→다음 행동→7일 재방문을 구분해서 분석할 수 있다.

- [x] **P2-03 정상 콘텐츠 기반 SEO·공유 개선** — [PR25](https://github.com/chonghg22/nearbook/pull/25) 운영 완료56f5239. 지역 SSR·콘텐츠 기준·OG·오류 noindex, CI/preview/운영 검증 성공. [배포 검증](docs/deploy-verification-p2-03-2026-10-20.md)
  - 상세/목록 복구 후 canonical·sitemap·JSON-LD와 실제 정상 페이지를 재검증한다.
  - 실제 데이터가 있는 지역 랜딩, 도서관별 신착·인기, 공유용 OG 카드를 검토한다.
  - 완료 기준: 빈/오류 화면을 성장 자산으로 확대하지 않고 검색 유입 URL이 정상 정보를 제공한다.

- [ ] **P2-04 소규모 유입 실험** — [PR26](https://github.com/chonghg22/nearbook/pull/26) Instagram 제작·계획 준비, KAN-123 진행 중/실제 미게시. [기록](docs/p2-04-instagram-experiment.md)
  - 기존 홍보 실험 계획을 활용해 독서·지역 커뮤니티 등 소규모 실험을 준비한다.
  - source별 검색·도서관 확인·공식 사이트 클릭·재방문을 비교한다.
  - 이번 @jack.made.tools 인스타 실험 게시 승인은 확보했다. Instagram 접근 거절로 실제 미게시이며 예산은0원이다.
  - 완료 기준: 방문자 수뿐 아니라 실제 핵심 행동과 반복 피드백을 바탕으로 다음 개선을 결정한다.

## 착수 순서

1. `P0-01` → `P0-02` / `P0-03` / `P0-04`: 데이터 경로와 화면 복구.
2. `P1-01` / `P1-02` / `P1-03`: 신뢰도·개인 정보 캐시·공통 요청 기반 정리.
3. `P1-04` ~ `P1-09`: 홈·검색·도서관 행동·모바일 개선.
4. `P1-10` / `P1-11`: 찜·내 도서관·알림 재방문 흐름.
5. 운영·테스트 항목 `P1-12` ~ `P1-15`는 관련 구현과 함께 진행하고 배포 전 검증한다.
6. 핵심 경로 정상화 후 P2 실험으로 확장한다.

## 당장 범위에서 제외

- AI 추천/챗봇, 대규모 커뮤니티, 네이티브 앱 전체 재작성.
- 외부 도서관 권한·API 협의 없는 예약 자동화.
- 장애가 남은 상태에서의 대량 SEO 페이지 생성·대규모 홍보.
- 원인 확인 전 인프라 전체 이전과 가치 검증 전 유료 기능 확대.
