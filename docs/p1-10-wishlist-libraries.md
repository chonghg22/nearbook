# P1-10 위시리스트·기본 도서관

## 범위와 승인

기반 main `a516a5e`, 별도 worktree `nearbook-p1-10`. 사용자가 ‘검증 후 운영 웹/API 반영’을 승인했다. DB 스키마/마이그레이션, 요금/무료 한도, 알림 정책·동의·발송, 지도 허용 URL, 서비스워커/개인정보 캐시, 강제 데이터 갱신, P1-11은 제외한다. 테스트에서 실제 계정의 찜/도서관 설정을 변경하지 않는다.

## 문제와 해결

- 개인 목록 SSR이 HTTP 실패를 빈 목록으로 바꾸고 네트워크 실패는 페이지 오류가 될 수 있었다. 보호된 `/me` 라우트/서버 인증은 유지하고, 목록을 인증된 클라이언트에서 bounded/no-store/엄격 parser로 읽는다. loading/실패/실제 빈 목록을 구분하고 로그인/재조회 복구를 제공한다. 공개 도서관 상세의 중복·오류를 false로 바꾸던 SSR 등록 조회는 제거하고 인증 widget 한 곳에서 확인한다.
- `personalApiFetch`는 기존 `/api` rewrite에 SDK 세션 bearer를 붙인다. 기존 외부 `authenticatedApiFetch`와 `/auth-api` logout helper는 유지한다. 새 개인 화면이 프리뷰 CORS에 의존하지 않으며 API origin 허용 목록을 넓히지 않는다. cache:no-store/credentials/timeout/abort/body 제한은 기존 공통 요청기를 재사용한다.
- 찜·도서관 widget은 실제 상태 확인 전 쓰기를 막는다. 익명은 원래 책/도서관으로 돌아오는 로그인 링크를 제공한다. ref lock으로 같은 작업을 중복 전송하지 않고, 저장 뒤 상태를 다시 읽어 확인한 다음 성공 안내/다음 행동을 표시한다. 상태 조회/저장 실패를 false/등록 성공으로 위장하지 않는다. 결과가 불확실하면 쓰기를 중단하고 상태 재조회부터 하도록 한다. 안내는 타이머로 사라지는 absolute toast 대신 일반 흐름의 안내다.
- 찜 성공 뒤 기본 도서관 선택·확인 → 내 위시리스트의 보유 조회로 연결한다. 알림 설정은 기존 링크로만 이동하며 동의/설정 저장을 하지 않는다.
- 내 도서관에 공개 이름 검색/명시적 등록, 기본 도서관 선택, 삭제, 공식 링크/목적지 길찾기를 제공한다. 첫 카드의 기본 자동 지정은 기존 정책이다. 기본 카드 삭제 시 다른 카드를 자동 승격시키지 않으며 사용자가 한 곳을 선택한다. 기존 다중 default도 한 곳 선택으로 복구할 수 있다. 홈/GPS 지역 기준과 별도라는 설명을 표시한다.
- 기존 무료10권/도서관1개 정책과 기존 Pro 안내는 변경하지 않는다. 실동작하지 않는 Pro CTA/요금 제품 결정은 P2-01에 남는다.
- 계정 경계를 구독해 로그아웃/계정 변경 시 개인 데이터와 안내를 지우고 요청을 취소한다. 목록 mutation은 해당 계정 scope signal을 사용한다. 과거 조회/기본 도서관/ISBN의 늦은 결과를 버리고 StrictMode effect replay도 검증한다. 이미 서버에 도달해 완료된 쓰기를 클라이언트 abort가 되돌린다고 주장하지 않는다.
- 로그인 시작 중 중복 클릭을 막고 SDK 실패/코드 교환 실패를 안전한 재시도 안내로 바꾼다. `next`는 같은 origin 내부 경로만 허용하며 기본 복귀 `/`는 유지한다. OAuth 권한/스코프/허용 URL은 변경하지 않는다. 실제 OAuth 로그인은 실행하지 않는다.

## 저장 안전성 (API)

`lockUser`는 transaction 안에서 필요할 때만 Supabase subject로 user insert-on-conflict 후 사용자 행을 `FOR UPDATE`로 잠근다. 기본 도서관 변경은 타깃 소유권 확인 **후** 기존 기본값 해제와 타깃 설정을 한 트랜잭션으로 수행한다. 중간 실패는 예외를 전파해 rollback한다. nickname을 전송하지 않으면 기존 값을 지우지 않는다. 빈 PATCH는 읽기만 하고 null boolean은 거부한다.

찜·카드의 add/delete도 같은 사용자 lock 경로를 사용한다. 재등록은 기존 행을 먼저 반환해 한도 도달 상태에서도 안전하게 재시도할 수 있다. 새 등록만 현재 행 수/한도를 확인하고, 카드 등록은 도서관 존재도 확인한다. 기존 email/plan을 덮어쓰거나 별도 알림 preference를 만들지 않는다. nullable email은 없으면 null이며 가짜 메일 주소를 만들지 않는다.

설계 근거: [PostgreSQL row-level locks](https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-ROWS). DB 테스트는 query/order/예외 전파 mock이며 실제 PostgreSQL 경합·장애 주입 검증은 아니다. 이 경로 외의 독립적인 운영 작업까지 모두 직렬화했다고 주장하지 않는다.

## 한 권·한 곳 보유 API

`GET /me/wishlists/:isbn/holdings?libraryId=<expected-default>` — 기존 AuthGuard + private,no-store.

1. 형식 검증 후 토큰의 사용자/그 사용자의 찜 ISBN을 확인한다.
2. 본인이 저장한 default가 정확히 한 곳이고 expected ID와 일치해야 한다. 없음/다중/변경은409, 찜 없음은404다.
3. 기존 정보나루 ownership helper를 정확히 한 번 호출한다(기존 cache/quota 사용). 주변 검색이나 찜 전체 fan-out/자동 재시도/폴링은 없다.
4. 응답 전 찜·default를 다시 확인해 조회 중 변경 결과를 반환하지 않는다.
5. 기존 HoldingsResult/parser/Card를 재사용하되 한 곳만 반환하고 거리 값은 만들지 않는다. 외부 실패는 unknown/이유/조회 시각이며 미소장으로 바꾸지 않는다. 정상이어도 실제 대출/예약 보장이나 전국·주변 전체 조사라는 의미가 아니다.

위시리스트는 목록·기본 도서관 정보만 자동으로 읽고 **각 책의 조회 버튼 클릭 시에만** 이 API를 호출한다. unknown/에러/stale/공식 사이트/조회 시각을 보존하고 시간 경과는 표시만 바꾸며 자동 API 재조회는 하지 않는다. 기본 도서관 변경 또는 목록 삭제로 컴포넌트가 바뀌면 요청을 취소한다.

## 검증과 배포 조건

- frozen install/전체 lint/type-check/build/Node·Vitest·API Jest 및 최종 GitHub CI.
- 실제 DOM+SDK/API 모의: 익명 로그인 복귀 링크, 로그인 실패/중복/안전한 callback, 인증된 카드 등록→기본→찜→한 곳 조회, 실패/빈 상태·한도·중복·늦은 응답·로그아웃/계정 변경·StrictMode.
- API mock: user row lock 순서·소유권 확인·원자적 default/rollback 예외·idempotency/기존 한도·개인 guard·no-store·한 곳 호출·unknown·default 변경 재확인. 실제 DB/계정/카카오/정보나루 네트워크를 쓰는 E2E와 구분한다.
- 프리뷰에는 운영 API가 연결되어 있으므로 **새 `/me/wishlists/:isbn/holdings`는 API 운영 배포 전404가 가능하다**. 프리뷰 web만으로 미배포 API의 양성 동작을 검증했다고 주장하지 않는다. 새 계약의 양성/오류는 모의 테스트로 확인하고 실제 계정 변경 없이 프리뷰 화면/복귀/기존 개인 목록을 확인한다. 새 API 양성 live 검증이 필요하면 사용자 소유의 기존 찜/default로 배포 후 읽기 전용 확인을 요청한다.
- 기존 브라우저 프리뷰 접근 차단을 다른 URL/프로필/CLI로 우회하지 않는다. 사용자 직접 화면 확인과 자동 DOM/계약 테스트를 구분한다. 화면 확인 조건이 남으면 운영 미반영으로 기록한다.
- 승인된 정확한 head/base/CI/check 재확인 후 merge, Vercel Ready/alias·API CD build/pull digest·main revision·health·공개 회귀·익명 개인 endpoint401 확인. 실제 개인 저장/삭제/발송·강제 갱신은 하지 않는다.
