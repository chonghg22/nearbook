# P1-10 찜·기본 도서관 — 2026-10-15

## 상태/승인

**운영 웹/API 반영 및 공개 응답 검증 완료.** 사용자 직접 운영 지시에 따라 [PR #17](https://github.com/chonghg22/nearbook/pull/17)과 로그인 연결 누락 보완 [PR #18](https://github.com/chonghg22/nearbook/pull/18)을 배포했다. 아래 진행·미반영 문구는 단계별 이력이다. 실제 로그인·개인 쓰기·인증된 신규 보유 API 양성 live 확인은 수행하지 않았다.

- base/main `a516a5eb0c2e29eed02bfcaf2ab400b27b0c0673`
- branch `fix/p1-10-wishlist-libraries-20261015`
- worktree `/Users/jack/local/nearbook-p1-10`
- tested head `6d1d31ff133824310a295855528428e5261b2029`
- 사용자 ‘검증 후 운영 웹/API 반영’ 승인 수신. API 컨테이너 교체 중 짧은 요청 실패 가능성을 사전 설명했다.
- 원본 누적 변경은 보존하고 새 worktree에 가져오거나 reset하지 않았다.

## 변경 요약

개인 목록 실패/정상 빈 목록 구분·로그인/재조회 복구, strict parser, no-store/SDK bearer의 same-origin 개인 요청, 계정 변경/로그아웃·늦은 응답/StrictMode 보호. 찜/도서관 widget은 상태 확인 후 쓰기/중복 방지/성공 read-back, 찜 후 기본 도서관·위시리스트 조회로 안내한다. 내 도서관 공개 검색→명시 등록·기본 선택·삭제·안전한 공식 사이트/길찾기를 제공한다. 실패한 쓰기는 결과가 불확실할 수 있어 재조회 전 추가 쓰기를 막는다.

서버: 사용자 행 잠금 안에서 한도/재등록 확인·카드 존재·기본 타깃 소유권 검증, 트랜잭션으로 기존 default 해제/타깃 설정을 함께 처리한다. 재등록은 한도 도달 시에도 기존 행을 반환한다. 기존 무료10권/도서관1개, plan/email은 덮어쓰지 않는다. 별칭을 전송하지 않았으면 보존하며 빈 PATCH/잘못된 boolean도 처리한다.

새 인증 `GET /me/wishlists/:isbn/holdings?libraryId=...`는 본인 찜/정확한 단일 default 검증 후 기존 정보나루 helper1회, 응답 전 다시 검증한다. 오류 unknown을 미소장으로 바꾸지 않고 거리도 만들지 않는다. 목록 로드 때 전체 조회하지 않고 버튼을 누른 책 한 권/기본 도서관 한 곳만 확인한다.

로그인 SDK 시작 중복/안전한 오류 안내 및 같은 origin 내부 복귀 경로를 검증한다. OAuth 권한/허용 URL은 변경하지 않는다. 공개 도서관 상세의 불필요한 SSR 개인 상태 중복 조회는 제거하고 widget에서 확인한다.

DB 스키마/마이그레이션·요금·알림 동의/정책/발송·지도 URL·서비스워커/개인정보 캐시·lockfile·강제 갱신·P1-11 제외. 기존 Pro CTA 제품 결정은 P2-01에 남는다.

## 로컬 검증

- frozen install, lint(no warnings/errors), type-check, build, test success
- **773개 = Node237 + Vitest364(33파일) + API Jest172(13파일)**, 신규78
- 로그인/콜백 SDK 및 계정 API는 mock: 실제 DOM으로 익명 복귀/로그인 실패·중복/카드 등록→기본→찜→한 곳 조회, 실패/한도/빈 상태/늦은 응답/로그아웃·계정 변경/StrictMode 등 검증.
- DB는 query/order/소유권/트랜잭션 예외 전파 mock. 실제 PostgreSQL 경합/rollback 장애 주입이나 실제 운영 계정 변경을 했다고 주장하지 않는다. AuthGuard 자체의 익명/잘못된 bearer 거부 및 private no-store metadata 검증.
- 새 개인 경로는 기존 rewrite를 재사용하며 CORS/권한을 넓히지 않는다. bearer·same-origin/no-store 및 외부/모호한 경로 차단 회귀 포함.
- 초기 개발 중 not_held 상태가 두 곳 표시돼 단수 DOM selector 실패 → 복수 표시도 확인하도록 정확히 수정. Jest.each의 array 행 언패킹 TS 오류 → object fixture 수정. SDK/계정 변경 및 StrictMode에서 abort 경계를 보완한 최종본으로 전체 검증했다.
- 최종 로그: `/private/tmp/nearbook-p110-{install,lint-final3,typecheck-final4,build-final2,test-final2}.log`.

## 프리뷰/배포 gate

- GitHub CI #33 [run38683070820](https://github.com/chonghg22/nearbook/actions/runs/38683070820) success. install/lint/type-check/build/test 통과, 최종 head `6d1d31f`. API Jest172/Vitest364 통과 로그 확인, Node237을 포함해 총773개다.
- Vercel `dpl_HvkogGAQx9MDHWUcRT9uTR27mUff` preview Ready/check success. 생성2026-10-15 13:44:20 KST, build1m12s. immutable `https://nearbook-4y8chhhnv-chonghg22s-projects.vercel.app`, 고정 `https://nearbook-web-git-fix-p1-10-wishlist-ed3317-chonghg22s-projects.vercel.app`. CLI inspect는 배포 상태 증거이며 브라우저 화면 확인 증거가 아니다.
- PR #17 open/mergeable, 실제 화면 사용자 확인 대기. 이전 프리뷰 접근 제한을 다른 URL/alias/프로필/CLI로 우회하는 시도는 하지 않았다. 운영 미반영.
- 사용자 확인 항목: `/book/9788954682152`의 찜 상태 또는 익명 ‘로그인하고 찜하기’와 로그인 화면이 깨지지 않는지. 이미 로그인되어 있다면 `/me/libraries`, `/me/wishlist`의 기존 목록·안내를 읽기 전용으로 확인한다. 등록/삭제/기본 변경이나 실제 OAuth 로그인을 검증 전제 조건으로 요구하지 않는다. 새 보유 API의 배포 전404 가능성은 아래와 같이 별도 구분한다.
- 프리뷰는 기존 운영 API를 사용한다. 새 holdings endpoint는 API 배포 전404가 가능하므로 이를 positive live 실패/성공 증거로 혼동하지 않는다. 새 계약은 모의 양성/오류 검증으로 구분하고, 프리뷰 화면/기존 개인 목록·복귀 경로 검증이 필요하다.
- 이전 브라우저 접근 차단을 새 URL/alias/프로필/CLI로 우회하지 않는다. 실제 로그인/찜·도서관 설정 변경을 에이전트가 하지 않는다. 사용자 직접 확인과 자동 DOM/HTTP를 구분한다.
- 승인된 exact head/base/CI 확인 후 merge. 운영 웹 Ready/alias, API CD source revision/build-pull digest, health·공개 회귀·익명 개인 endpoint401을 확인한다. 인증된 긍정 live 확인은 사용자의 기존 찜/default로 읽기 전용 확인이 가능할 때 요청한다.
- 운영 merge/deploy·강제 갱신·실제 계정 writes는 아직 수행하지 않았다.

## 운영 반영 지시 및 배포 시작

- 프리뷰 화면 확인이 남아 있으며 새 private API는 운영 배포 전 양성 live 검증을 할 수 없음을 안내한 후, 사용자가 **‘운영 반영해’**라고 직접 지시했다. 이는 별도 실제 프리뷰 스크린샷/로그인 검증 완료 증거로 기록하지 않는다. 해당 지시에 따라 기존 자동 검증 증거를 기반으로 운영 반영을 진행한다.
- exact head `6d1d31ff133824310a295855528428e5261b2029` / base `a516a5eb0c2e29eed02bfcaf2ab400b27b0c0673`, CI #33 success 및 Vercel preview success/PR open·mergeable을 재확인하고 expected_head_sha 조건으로 병합했다.
- main/source `0c60b52622e34c3596c24bf3a519619ceeec57fb`, 2026-10-15 13:50 KST.
- Vercel production `dpl_4F33MqsF89PXzpdG2ofxVX7yZqR1` 빌드 및 [API CD #71](https://github.com/chonghg22/nearbook/actions/runs/38683602047)/job `116253355352` 진행 중. 배포 성공·readiness·실운영 응답은 아직 완료로 기록하지 않는다.
- 이후 공개 운영 GET·익명 개인 endpoint401만 확인하며, 실제 계정 쓰기/DB 변경/강제 데이터 갱신은 하지 않는다.

## 첫 운영 배포와 점검 중 발견한 연결 누락

- Vercel production `dpl_4F33MqsF89PXzpdG2ofxVX7yZqR1` Ready/check success, build1m17s. `www.near-book.com`/`near-book.com` alias 연결, immutable `https://nearbook-pps8nss51-chonghg22s-projects.vercel.app`.
- API CD #71/job116253355352 success. source/revision `0c60b52622e34c3596c24bf3a519619ceeec57fb`, build containerimage.digest와 Oracle pull Digest 모두 `sha256:a9132ef2f78abb884f3465a8e2d99fad0f6ea356966e56ed925f531c9a45b45a` 일치.
- 교체 중 첫 익명 `/me/wishlists` GET에서502를 관측했다. 뒤의 직접/proxy 개인 GET5종은 각각401로 회복했다. 배포 작업 성공만으로 무중단을 주장하지 않는다.
- 첫 운영 HTTP 자산 검사에서 홈/검색/도서관/책 페이지와 새 찜·도서관 안내 bundle은 확인됐으나 `/login`의 새 오류 안내 문자열 assertion이 실패했다. 소스 확인 결과 `LoginInner`가 실제 page에 연결되지 않고 기존 `LoginContent`가 계속 사용되는 누락이었다. 앞선 inner 단독 DOM 테스트로 실제 라우트 연결까지 검증했다고 주장하지 않는다. 사용자에게 발견 사실과 웹 전용 보완을 안내했다.
- [보완 PR #18](https://github.com/chonghg22/nearbook/pull/18), branch `fix/p1-10-login-entry-20261015`, head `c4a415f11343d35db89e0dc4099fbab4dba84fc0`, base `0c60b52`. 실제 page에서 LoginInner를 렌더링하고 중복 기존 구현을 제거. 기존 두 테스트는 실제 page 렌더로 강화하고 callback 실패 안내/자동 OAuth 없음 테스트1개 추가.
- 보완본 로컬 lint/type-check/build/test 통과: Node237 + Vitest365 + API Jest172 = **774개**. `/private/tmp/nearbook-p110-entry-{lint,types,build,test}.log`. API/DB/의존성/알림/OAuth권한 변경 없음. 최종 CI #34·Ready 프리뷰 확인 후 웹만 재배포하며 최종 자산 assertion을 다시 수행한다.
- 첫 도서관 SSR12399ms 지연도 관측했으며 성공200과 별개로 성능 해결 증거가 아니다. P1-13/14의 관측·readiness 개선 대상으로 남긴다.
- 첫 API 후속 검증 전체는 종료0. 개인 페이지2종 익명307→동일 origin 로그인(next=/me, 기존 layout 동작), 직접·proxy 개인GET5종 각각401, 검색10건/total105/462ms 및 strict parser 통과. 공개 holdings는 HTTP200/15705ms·후보30/조회10/unknown10/checked0/unchecked20으로 계약은 유효하나 공급자 보유 양성 확인 성공이 아니다. 직접health8275ms·proxy454ms 모두200/ok. 이 결과를 대출 가능이나 성능 정상 보장으로 바꾸지 않는다.
- 보완 CI #34 [run38683938378](https://github.com/chonghg22/nearbook/actions/runs/38683938378)/job116254407486 success, 774개. Vercel preview `dpl_6iUSCws6UJrLWA3GDjf7ezWrYfFd` Ready/check success, build1m12s. actual route DOM 회귀와 preview 배포 상태 증거이며 live 브라우저 렌더링 확인과 구분한다.
- 보완 exact head `c4a415f11343d35db89e0dc4099fbab4dba84fc0`/base `0c60b52`·CI/status/mergeable 재검증 후 expected head 조건 병합. 최종 웹 main `d03897b11121f299c615fa2e2516b3cdb94cf306`, 운영 웹 배포 진행 중. API는 CD #71 source `0c60b52` 유지.

## 최종 운영 검증 완료 (2026-10-15 13:58 KST)

- 웹 main `d03897b11121f299c615fa2e2516b3cdb94cf306`. Vercel production `dpl_D83dxUMzj31AkXY8UJqbLuW1gu1A` Ready/check success, build1m8s, `www.near-book.com`/`near-book.com` alias 연결. immutable `https://nearbook-1pr37tx99-chonghg22s-projects.vercel.app`.
- 보완 main SHA의 Actions run0건(API CD 재실행 없음). API CD #71 source/revision `0c60b52`와 위 build/pull digest 그대로 유지한다. 웹과 API의 source SHA가 다른 것은 의도된 웹 전용 보완이다.
- `/private/tmp/nearbook-p110-verify.mjs` 최종 전체 실행 종료0, 로그 `/private/tmp/nearbook-p110-prod-final.log`. 공개 운영 GET과 자산 확인만 했으며 프리뷰 차단 우회·실제 계정/OAuth·수정/삭제/강제 갱신은 없다.
- 홈881ms·검색페이지544ms·도서관2542ms·책1678ms·로그인548ms, 모두HTTP200. 고유 CSS/JS 자산28개 HTTP200/MIME 정상. 새 찜 로그인/오류 복구/기본 도서관·위시리스트 안내와 도서관 등록 복구 bundle 검증. 누락을 발견했던 **실제 로그인 page JS의 새 오류 안내 assertion도 최종 통과**. HTTP 자산 증거는 브라우저 live 렌더링/실제 OAuth 완료 증거가 아니다.
- 서비스워커는 현재 source와 byte 동일. 개인정보 캐시 정책 변경 없음.
- 내 도서관·위시리스트 익명 접근은307→동일 origin `/login?next=/me`, 기존 보호 layout 동작 유지. 모든 진입 경로가 exact child next를 보장한다고 주장하지 않는다. 책/도서관 찜 widget의 복귀와 실제 로그인 route의 안전한 next/실패·중복은 강화된 DOM 테스트로 검증했다.
- 개인 API5종(찜 목록/카드 목록/각 상태/새 보유 경로), 직접 `api.near-book.com` 및 same-origin `/api` 각각 총10개 GET 모두401, 개인 데이터 필드 없음. 새 경로404가 아닌 guard401 확인. 인증된 양성 조회·실제 DB 경합·실제 계정 저장은 mock/DOM/API 테스트 증거와 분리한다.
- 공개 검색 strict parser 통과,10건/total105/240ms. 공개 보유 strict parser 통과,HTTP200/1164ms, 후보30/조회10/checked10/held10/available9/borrowed1/unknown0/unchecked20/limited=true. 조회 범위 밖20곳·실제 방문 시 대출 상태는 보장하지 않는다.
- 최종 직접/proxy health HTTP200/status ok,292/157ms. 앞선 unknown10/15.7초와 health8.3초·교체 중502는 뒤 재점검에서 회복했으나 원인 규명·무중단·전 요청 성능 보장을 주장하지 않고 P1-13/14에 기록했다.
- 최종 자동 검증 **774개(Node237+Vitest365+API Jest172)**/CI #34 success. 기존 무료 한도·요금·알림 정책/발송·DB스키마·OAuth권한/허용 URL·지도 설정 유지. 실제 개인 설정 변경 없음, P1-11 미착수.
