# P1-08 보유·대출 상태의 다음 행동 검증 (2026-10-15)

## 현재 상태·승인

구현/로컬 및 최종 CI #30 검증 완료, Vercel 프리뷰 Ready/check success. 사용자 정상 확인 후 exact head/base/CI 재검증 및 PR #15 병합. **운영 웹 반영 및 공개 응답/자산 검증 완료**. P1-09 미착수.

- 사용자 다음 작업 요청 및 ‘검증 후 운영 웹 반영’ 승인 수신. 웹만 변경하며 API 컨테이너 교체·DB·자동 찜/알림 설정 변경이 없음을 안내했다.
- 기반 운영 main `4fa98837e666ba77f5070a25be6255296f78ddc4`.
- worktree `/Users/jack/local/nearbook-p1-08`, branch `fix/p1-08-holdings-alternatives-20261015`.
- [PR #15](https://github.com/chonghg22/nearbook/pull/15), head `0e97ff59be9946aad21c3b4b4298fe7b254a850f`.
- [CI #30](https://github.com/chonghg22/nearbook/actions/runs/38659685273)/job `116177729775` success. 로그에서 Node237 + Vitest279 + API Jest147 = 663개 및 install/lint/type-check/build/test 성공 확인.
- Vercel preview `dpl_5ET2PzWMMy5GikntPRJxyGhPrPyZ` Ready/check success, build1m3s.
- 고정 프리뷰 https://nearbook-web-git-fix-p1-08-holdings-79129d-chonghg22s-projects.vercel.app . immutable https://nearbook-2vhmys638-chonghg22s-projects.vercel.app .
- 확인 요청 경로 `/book/9788999147555`: 반경5/10/20km·대출 가능0/오류의 대안 패널·10km 확대 시 반경 변경·다른 지역/판본/찜/알림 링크. 정상 상태 변화로 대출 가능이 생기면 대안 패널은 나오지 않는 것이 정상이다.
- 사용자 ‘정상 운영 확인’ 수신. 이전 프리뷰 확인 요청에 대한 정상 확인으로 이해한다고 안내한 뒤, 기존 ‘검증 후 운영 웹 반영’ 승인에 따라 배포했다. 새 운영 live 화면을 사용자가 이미 확인했다고 주장하지 않는다.
- 운영 main/source `5440144d6896bcaf4296ffe77c136df330ae4468`. 운영 Vercel `dpl_DVCVpnCizhP58HCG75wKQ7nmdEpM` Ready/check success. main SHA의 API CD 실행은0건으로 확인했다.
- 원본 dirty worktree는 보존했다. 이번 코드/설계만 별도 clean worktree에서 커밋했다. 이 문서와 TODO는 원본 프로젝트의 로컬 기록이다.

## 구현·권한 경계

- 실제 API가 기존에 지원하던 반경1~20km 중5/10/20km를 웹에 노출. 기본5km, 클릭할 때만 변경, 로딩 중 비활성화 및 같은 값 무요청. 책/기준 위치 변경 시5km 복귀, 다시 옛 지역으로 이동해도 과거 확대 반경이 되살아나지 않음.
- 기존 공개 same-origin `/api/books/:isbn/holdings`·15초 제한·strict parser 유지. 서버 API·schema·의존성·lockfile은 변경하지 않음.
- 대출 가능0곳 또는 endpoint 실패에 대안 패널. 기존 미소장/대출 불가/미확인/부분 미조회/후보 없음/오류를 구분하고 소장/공식 사이트 카드 유지.
- 기준 지역/도서관은 기존 위치 선택 모달 재사용. GPS 자동 요청 없음.
- 제목의 콜론 앞 부분으로 명시 title 검색에 이동해 ISBN/큰글자/필사 표기를 비교. 동일 판본/내용을 확정하거나 ISBN을 합치지 않음.
- 찜은 기존 상단 `#book-wishlist` native anchor로 이동하며 WishlistButton 중복 마운트/자동 저장 없음. 알림은 기존 `/me/notifications` 설정으로 연결하고 로그인/사용자 직접 설정/즉시 대출·예약 보장 불가를 안내.
- 카드 공식 사이트 정보는 그대로 사용하고 없는 경우 `/libraries`→도서관 상세/공식 사이트를 찾게 함. 예약/소장 검색 URL을 지어내지 않음.
- 패널 내 페이지 링크 prefetch 비활성화. timer는 stale 표시만 갱신하며 자동 반경 확대·retry·소장 미리보기 fan-out 없음.
- 후보 최대30곳 중 상태 최대10곳/공급자 기존 cache·상한 유지. 반경 확대 시 가까운 후보가 같으면 결과가 같을 수 있음을 고지. 전체 도서관 미소장을 주장하지 않음.
- API 컨테이너 교체·DB·강제 데이터 갱신/reindex·지도 허용URL·PWA·실계정 찜/수신 설정·알림 발송/예약·P1-09는 제외.

## 로컬 검증

Node22.19.0/pnpm9.15.9, 새 의존성/lockfile 변경 없음.

- frozen install: `/private/tmp/nearbook-p108-install.log` 성공.
- lint: `/private/tmp/nearbook-p108-lint-final.log` 성공.
- type-check: `/private/tmp/nearbook-p108-typecheck-final.log` 성공.
- build: `/private/tmp/nearbook-p108-build-final.log` 성공, Node237개.
- test: `/private/tmp/nearbook-p108-test-final.log` 성공, Vitest279 + API Jest147.
- 총663개. `git diff --check` 성공, 커밋 후 worktree clean.
- 새 DOM12개 및 helper6개. 실제 LocationProvider/LocationModal·LibraryStatus·public API client·strict parser·HoldingsView·LibraryCard를 포함해 비소장/대출 불가/unknown/부분 조회/후보 없음/endpoint실패/available, 정확한 다음 행동 링크, 기존 공식 링크 유지, 수동5→10→20/상한/동일값 무조회/로딩 비활성화, 실패 retry, 책/지역 변경5km 복귀·기존 요청 abort·늦은 응답 무시, 지역 선택/GPS 무요청, timer 무조회, 검색어 인코딩/최대200자/제목 없을 때 무링크를 검증했다.
- 기존 홈 위치17개와 보유/링크/검색/개인정보 worker 테스트 유지. 기존 Node source assertion은 다중행 코드 포맷에 맞춰 보완했고 실제 찜 anchor/BookTitle 전달도 검증한다.
- 첫 type-check의 exactOptionalPropertyTypes 오류는 선택적 제목 타입 보완 후 전체 재검증으로 해소. 초기 다중행 포맷/source assertion 불일치도 수정 후 전체 빌드 통과.

## 실운영 읽기 전용 기준선

프리뷰 화면에서 대안 패널을 확인할 책으로 기존 검색 결과에 있던 ISBN `9788999147555`를 사용한다. 공개 운영 holdings GET 한 번만 실행했으며 가짜 ISBN이나 강제 갱신을 만들지 않았다.

- `/api/books/9788999147555/holdings?lat=37.5665&lng=126.978&radius=5` HTTP200/strict parser 성공.
- 후보30/조회10/상태확인10/소장0/대출가능0/미소장10/미확인20/limited true.
- 이는 확인한10곳에 관한 결과다. 서울/전국 전체 미소장을 증명하지 않으며 추후 실제 상태는 달라질 수 있다.

## 프리뷰·배포 검증 조건

브라우저 연결/권한에 관한 기존 제한을 유지하며 우회 브라우저나 차단된 프리뷰의 HTTP 우회 조회를 사용하지 않는다. 사용자 직접 화면 확인을 요청한다. 이번에는 백엔드가 동일하므로 프리뷰에서 반경 선택/대안 패널을 기존 API로 검증할 수 있다.

최종 exact head CI 성공·Vercel Ready 및 사용자 화면 확인 후 운영 웹에 반영한다. API는 기존 P1-07 `4fa9883` 이미지를 유지하며 새 API CD가 없어야 한다. 배포 후 운영 alias·SSR·CSS/JS·기존 holdings반경 계약·health/worker를 확인하고 기록한다. 실제 개인 설정/찜/알림 발송·GPS 권한은 건드리지 않는다.

## 운영 반영 완료 및 실제 검증 (2026-10-15)

- tested head `0e97ff59be9946aad21c3b4b4298fe7b254a850f`, base `4fa9883`, CI #30 success/663개 및 preview check success를 재확인한 뒤 expected head SHA 조건으로 PR #15를 병합했다.
- 운영 main/web source `5440144d6896bcaf4296ffe77c136df330ae4468`.
- Vercel production `dpl_DVCVpnCizhP58HCG75wKQ7nmdEpM` Ready/check success. build1m6s, immutable https://nearbook-espmwrj5u-chonghg22s-projects.vercel.app , `www.near-book.com`/`near-book.com` alias 연결 확인.
- main SHA의 Actions 실행0건 확인, 변경 파일도 web/docs뿐이며 CD path filter에 해당하지 않음. API 재배포/컨테이너 교체 없이 기존 P1-07 API 배포를 유지했다. 서버 배포·DB·강제 갱신·지도·PWA·실제 찜/개인 설정·알림 발송·P1-09 작업 없음.

### 공개 운영 HTTP/계약

같은 서울 기준점(37.5665,126.978)과 검증용 ISBN9788999147555의 일반 GET만 실행했다. 실제 보유 상태는 변할 수 있으며 수치가 전체 도서관의 미소장을 뜻하지 않는다.

| 반경 | HTTP | GET 시간 | 후보/조회/소장/대출가능/미조회 |
| --- | --- | --- | --- |
| 5km | 200 | 829ms | 30 / 10 / 0 / 0 / 20 |
| 10km | 200 | 330ms | 30 / 10 / 0 / 0 / 20 |
| 20km | 200 | 294ms | 30 / 10 / 0 / 0 / 20 |

세 응답 모두 strict `parseHoldings` 성공, 상태 확인10곳/미소장10곳/unknown0/limited true. 반경 확대에도 후보/상태가 같을 수 있다는 UI 안내와 부합한다. 직접 공급자 호출량을 계측한 것은 아니며 응답의 후보/시도 상한과 기존 서버 테스트를 확인했다.

- 운영 `/book/9788999147555` HTTP200, 전체 본문 수신1611ms. SSR에 `book-wishlist` target 및 ‘조회 반경’ 포함.
- 연결 CSS HTTP200/`text/css`, 연결 book JS HTTP200. JS의 ‘책을 찾는 다른 방법’·확대·판본 검색·다른 지역·찜 anchor·알림 설정·radius 요청 코드 확인.
- 검증 스크립트의 첫 raw-string assertion은 minifier가 가운데점(·)을 `\\xb7`로 바꾼 탓에 실패했다. 실제 배포 JS 조각에서 escape를 확인하고 문자 escape를 정규화한 뒤 동일한 전체 문구 assertion을 통과했다. 앱 소스나 배포 코드를 바꿔 회피하지 않았다.
- 운영 `/sw.js` HTTP200, 변경 없는 worktree source와 byte 일치.
- 운영 웹 Ready 이후 직접 API/proxy health HTTP200/status ok, 각각957/412ms.

새 운영 live 화면을 직접 브라우저에서 클릭했다고 주장하지 않는다. 사용자 프리뷰 정상 확인, 실제 컴포넌트 DOM/CI663개, 운영 HTTP/SSR/자산/응답 계약 증거를 구분한다. 계정 로그인·찜 저장·수신 설정 변경·GPS·외부 예약은 수행하지 않았다.
