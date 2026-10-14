# P1-03 — API 요청·응답 계약 공통화

## 범위

P1-02 운영 source `a921b11`을 기반으로 한다. 공개 검색/자동완성/도서관 검색, 상세/지도/보유 조회 및 인증 요청의 공통 transport를 정리하고, 도서관 운영시간/휴관일 표시를 바로잡는다. 검색 API 장애 응답도 수정한다. DB schema/migration, 강제 갱신, 지도 권한 변경, 다음 TODO는 포함하지 않는다.

## 결정과 변경

- `api-request.mjs`: 단일 typed error `http / timeout / network / aborted / invalid-response`, 전체 요청(인증 준비·전송·body 포함) deadline, caller 취소, body 크기 제한, no-store 강제, 오류 URL/token/body 미노출. 자동 재시도 없음(변경 요청 중복·quota 재호출 방지).
- `public-api-client.ts`: Supabase/쿠키 파싱 없이 공개 API + runtime parser. Bearer header를 전달하지 않으며 보호 프리뷰용 같은-origin credentials를 유지한다.
- `api-client.ts`: 인증용 `authenticatedApiFetch`, 세션은 SDK `getSession`으로 가져오고 임의 쿠키/base64 파싱을 제거한다. 비로그인은 getUser/실제 개인 API 요청 없이 401. 기존 UI의 401/403 판단을 위해 Response 인터페이스를 유지하지만 body까지 deadline으로 읽고 민감한 오류 body는 고정 응답으로 치환한다. 서버 AuthGuard/마이페이지 getUser 검증은 유지한다.
- `server-api.ts`: absolute upstream만 사용하는 `serverApiJson`. 브라우저 인증 SDK 의존 없음. 서버 즐겨찾기 보조 조회·동일 지역 도서관에서 사용한다.
- 기존 detail/map error 이름은 공통 class alias로 유지. detail은 명시적 HTTP404만 null; 공개 목록/holdings 404/503/비정상 JSON은 오류. 기존 metadata/보유/제휴 데이터의 실패 격리와 map 최신 요청 취소 동작 유지.
- 검색 응답/자동완성/도서관 검색·상세를 runtime schema로 검사. 공용 `LibraryOperatingHours`, `SearchBook`, `SearchResult`, `ApiRequestKind` 정리. holdings의 공용 상태/시점 계약은 유지한다.
- `SearchPageInner`는 공개 client를 사용하고 오류를 `ResultList`에 전달한다. 장애를 0건으로 표시하거나 이전 검색 결과를 새 검색 결과로 보여주지 않으며, 수동 재시도 제공. 자동완성/도서관 검색 장애도 정상 빈 결과와 구분한다.
- 검색 서비스의 index/DB 장애는 빈 성공 응답 대신 sanitized503. 실제 정상 items[]는 기존 검색 결과 유지. 실패 결과를 cache하지 않는다.
- 도서관 화면은 `{text, closed}` 운영시간/휴관일을 표시한다. 구 string/weekday 관측은 명시적으로 normalize하고 null을 가짜 시간으로 채우지 않는다.
- 개인 변경 요청의 timeout/네트워크 실패에 메시지 및 loading 해제. API 실패 시 삭제 성공/푸시 해제 성공을 단정하지 않는다. 실제 계정/위시리스트/알림 설정은 테스트에서 변경하지 않는다.

보조 제휴/트렌드/SEO별 응답 계약은 기존 실패 격리를 유지한다. 모든 도메인의 endpoint body를 이번 단계에서 새 스키마로 재설계하지 않는다.

## 근거

- [Supabase getSession](https://supabase.com/docs/reference/javascript/auth-getsession): access/refresh token 취득은 SDK에 맡긴다. 서버 권한 검증은 기존 Guard/getUser를 유지.
- [MDN AbortController.abort](https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort): body 소비까지 취소되도록 동일 signal/deadline을 유지.
- 실제 운영 `/api/libraries/111314`가 `operatingHours: {text: '화~금 09:00~21:00 / 토,일 09:00~18:00', closed: '매주 월요일 / 공휴일'}`을 반환하는 것을 확인. 기존 UI weekday만 읽어 누락됐음.
- 실제 운영 일반 검색 '한강' 응답은 items10/total415/page1/pageSize10이며 새 parser 통과. 별도 강제 갱신 API/cron 실행 없음.

## 검증

- frozen-lockfile 설치; lint/type-check/build 통과.
- Node237(공통 transport21개 추가), 웹 Vitest150(스키마/클라이언트/SSR28개 추가), API Jest58(검색 장애4개 추가) = **445개**.
- 정상 빈 결과, HTTP401/403/404/429/503, 잘못된 JSON/스키마/좌표, body deadline, 취소, 늦은 인증 후 API 발송 차단, auth Header 병합/204, 오류 정보 비노출, 검색 복구, 운영시간/휴관일 SSR 표시 검증.
- PR 전체 CI·프리뷰 검증 후 운영 웹/API 반영을 사용자 승인받음. 실제 배포/화면 검증 결과는 별도 기록에 남긴다.

## 운영 주의

API 검색 장애 시 HTTP200/빈 목록 대신503으로 바뀌므로 프리뷰의 오류·재시도 화면을 확인한다. 웹은 현재 API의 정상 계약과 호환된다. 기존 CD 방식의 API container 교체 중 짧은 요청 실패 가능성을 사용자에게 고지하고 승인받았다. DB/강제 데이터 갱신은 없다.
