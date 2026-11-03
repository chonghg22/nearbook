# P1-05 도서관 공식 확인·길찾기 검증 기록 (2026-10-14)

## 상태

- 사용자 요청: 다음 작업 시작. 이후 ‘검증 후 운영 웹 반영’ 승인 수신. 검증 완료를 조건으로 한 승인이다.
- 기반 운영 커밋 `6ec2b818ffb36ba421fb51ab5c263bae0aaadc3d`.
- 별도 worktree `/Users/jack/local/nearbook-p1-05`, 브랜치 `fix/p1-05-library-cta-20261014`.
- [PR #12](https://github.com/chonghg22/nearbook/pull/12), 최종 tested head `d7cf86fcc658c5600da953108c510cb2283a10fd` (1차 head `8a7a3e0`).
- 사용자 ‘정상 반영 확인했어’로 후속 프리뷰 정상 확인 수신. 기존 ‘검증 후 운영 웹 반영’ 승인 및 CI #26/536개 성공 조건 충족 후 PR #12 병합. main `56947d67cd61a94b3fc5044824ce11c7cdb76595` (2026-10-14 16:24 KST).
- 운영 웹 반영 완료: Vercel production `dpl_BycU91FSfqHVXZR3wWt4NWG3udui` Ready/check success, `www.near-book.com`/`near-book.com` alias 연결. 다음 항목 P1-06 미착수. 아래 대기 문구/1차 실패 기록은 배포 전 이력이다.

## 운영 배포 및 확인 (2026-10-14 16:26 KST)

- 검증된 head `d7cf86f`, 기반 main `6ec2b81`, 최종 CI #26/536개/Vercel preview check success/사용자 정상 확인 후 예상 head SHA 조건을 사용해 병합했다.
- 운영 main `56947d67cd61a94b3fc5044824ce11c7cdb76595`, [PR #12](https://github.com/chonghg22/nearbook/pull/12) merged.
- Vercel production `dpl_BycU91FSfqHVXZR3wWt4NWG3udui`, build1m36s, Ready 및 GitHub commit check success. 불변 주소 https://nearbook-gmiwl8rb1-chonghg22s-projects.vercel.app . 운영 도메인 두 개 alias를 CLI inspect에서 확인했다.
- 실제 운영 `https://www.near-book.com/book/9788954682152` HTTP200: 책 제목/주변 도서관 섹션 SSR 정상. 연결된 CSS200/`text/css`, 해당 책 페이지 JS bundle200 및 공식 확인 CTA/카카오맵 링크/same-origin `/api`/예약 접수 아님 안내 포함을 확인했다.
- same-origin `/api/books/9788954682152/holdings?lat=37.5665&lng=126.978` 및 ISBN `9788936434120` 응답200/각10곳, 운영 응답을 최종 파서로 검증했으며 각10곳에 공식 링크·목적지 좌표가 있다. 서울도서관은 검증한 HTTPS 루트로 변환된다.
- `/api/health` HTTP200/status `ok`. `/sw.js` HTTP200 및 변경 없는 로컬 source와 정확한 byte 일치: 기존 개인정보/보유 상태 캐시 제외 정책 유지.
- main diff는 웹/문서10파일뿐이며 API/공용 패키지/DB/CD 설정 변화 없음. merge SHA의 Actions runs 조회도0건: API CD/컨테이너 교체 없음. API 운영 소스는 기존 `de38fc8` 유지.
- 지도 SDK·허용 URL·권한, DB/강제 갱신, 외부 도서관 로그인·실제 예약은 변경/수행하지 않았다.
- 사용자 후속 프리뷰 정상 확인을 근거로 배포했다. 운영 새 live UI/외부 탭 이동은 별도 브라우저 관측을 하지 않았고, HTTP/배포 메타데이터/코드 bundle/실제 API 증거와 구분한다.

## 사용자 화면에서 발견한 조회 경로 누락 및 수정

- 사용자가 보낸 `작별하지 않는다`(ISBN `9788954682152`) 상세 화면에서 도서관 카드가 아니라 ‘보유 현황을 잠시 불러올 수 없습니다’ 및 재시도 표시. 따라서 공식 확인·길찾기 버튼은 화면에 없으며 1차 프리뷰 검증은 통과로 처리하지 않는다.
- 해당 ISBN과 기존 검증 ISBN `9788936434120`의 운영 same-origin holdings GET은 HTTP200/10곳/새 파서 정상.
- 직접 API에 운영 Origin을 넣은 GET: HTTP200/`access-control-allow-origin: https://www.near-book.com`.
- 동일 API에 P1-05 고정 프리뷰 Origin을 넣은 GET: HTTP200/`access-control-allow-origin` 없음. 서버 측 GET 성공과 브라우저 CORS 허용은 다른 조건이다.
- 코드 확인: `LibraryStatus`만 `PUBLIC_API_BASE_URL` 절대 주소에 `loadHoldings`로 직접 요청하는 코드가 남아 있었다. `publicApiJson`으로 변경하여 기존 `/api` rewrite 및 same-origin credentials/no-store/15초 deadline/AbortController/엄격한 파서 사용. API CORS 설정/프리뷰 허용 목록은 수정하지 않는다.
- 실제 화면 컴포넌트에 회귀 테스트2개 추가: 절대 API 환경변수를 모킹한 상태에서 외부 요청은 CORS 실패시키되 same-origin 요청만 성공; 사용자 ISBN의 공식 확인·길찾기 카드 렌더링까지 확인. 실제503 오류 표시 후 재시도 성공도 검증.
- 신규39개 링크/실제 요청 경로 DOM 테스트 성공. 후속 수정 head `d7cf86fcc658c5600da953108c510cb2283a10fd` (PR #12 그대로), 최종 로컬 frozen-install(의존성 변경 없음)/lint/type-check/build/test 성공: Node237 + Vitest241 + API58 =536. 후속 CI #26 및 프리뷰 재검증 진행.
- 중간 head `be43f39`의 build는 기존 Node 소스 검사가 `loadHoldings(` 호출 이름을 고정해 실패했다. 해당 회귀 검사도 새 public client import/호출·strict parser·15초 deadline·signal 및 절대 URL 호출 부재를 검사하도록 갱신했다. 직접 실행19개 통과. 기능 검사를 없애지 않았다.
- 최종 [CI #26](https://github.com/chonghg22/nearbook/actions/runs/38527783869)/job `115732135605` success: 전체 frozen install/lint/type-check/build/test 및 Node237 + Vitest241 + API58 =536개 통과.
- 최신 Vercel `dpl_DxztvDZdN1R4MgAswyKT559qJ3bx` Ready/commit check success, 불변 주소 https://nearbook-nlx5vzq81-chonghg22s-projects.vercel.app . CLI inspect에서 아래 기존 고정 프리뷰 alias 연결 확인. build1m8s. 아래 1차 배포 ID/CI #24는 이전 head 이력이다.
- 재확인 주소: https://nearbook-web-git-fix-p1-05-library-c-79c62f-chonghg22s-projects.vercel.app/book/9788954682152 . 사용자에게 새로고침 후 도서관 카드 하단 버튼/실제 이동 확인 요청. 운영 미반영.

## 구현

- 기존 API가 보내는 도서관 홈페이지·좌표를 웹 파서와 상태에서 보존하여 책 상세 카드에 공식 확인/목적지 길찾기를 연결한다.
- 웹 전용 추가 타입으로 API/공용 패키지/DB 변경을 피했다. 추가 조회 요청이나 API 컨테이너 교체가 필요하지 않다.
- HTTP(S) URL만 표시하고 자격증명·상대 경로·실행 스킴을 거른다. 잘못되거나 없는 링크만 숨기고 정상 보유 상태와 내부 도서관 상세 링크를 유지한다.
- 카카오맵 목적지 URL은 [공식 문서](https://apis.map.kakao.com/web/guide/#routeurl) 형식을 사용한다. 사용자 GPS/출발지/저장 위치를 전송하지 않는다. 네이버 지도 SDK 인증/허용 URL과 독립적이다.
- 새 탭/보호 rel/접근성 이름/44px 이상 터치 타깃 및 기존 `library_click` 액션을 유지한다.
- 검증된 도서관별 책 검색·예약 링크가 없으므로 홈페이지로 안내한다. 이 서비스가 예약을 접수하지 않는다고 명시한다.
- 상태·기준점 거리·확인 시각을 CTA보다 먼저 표시하고, 광고·제휴는 기존대로 도서관 섹션 뒤에 둔다.

## 로컬 및 공개 API 증거

- 의존성 frozen 설치 통과, 새 의존성/lockfile 변경 없음.
- 신규 단위·DOM 테스트 37개 통과. 링크·좌표 오류, 누락, 네 대출 상태, stale/재파싱, 예약 오인 방지, 새 탭 보호/키보드 포커스/클릭 액션/CTA 순서 포함.
- 최종 전체 lint/type-check/build/test 통과: Node237 + Vitest239 + API58 =534. 로컬의 변경 없는 API58개 등은 Turbo 캐시 결과이며, CI에서 전체 재검증한다.
- [CI #24](https://github.com/chonghg22/nearbook/actions/runs/38526677362) success (job `115728563691`): frozen install/lint/type-check/build/test 성공. Node237 + Vitest239 + API58 =534. PR head `8a7a3e0`와 Vercel commit check success 확인.
- 운영 `/api/books/9788936434120/holdings?lat=37.5665&lng=126.978` HTTP200/10곳, 새 파서 및 두 번째 재파싱에서 실제 홈페이지·좌표가 보존됨을 확인했다. 정상 GET 조회이며 강제 갱신/DB 변경은 하지 않았다.
- 서울도서관 원본 `http://lib.seoul.go.kr/`: HEAD/GET 시간 초과. `https://lib.seoul.go.kr/`: GET200. 이 정확한 루트 URL만 HTTPS로 안내하고 다른 도서관/임의 경로는 일괄 변경하지 않는다.
- 종로도서관 원본 HTTP는 HTTPS로 redirect 후 HEAD200. 카카오맵 목적지 URL HEAD200 및 서울도서관 목적지 redirect 확인.
- 외부 도서관 로그인/실제 대출·예약은 수행하지 않았다. 다른 모든 도서관 홈페이지의 외부 가용성을 보장하는 검사는 아니다.

## 프리뷰 확인 기준

- Vercel `dpl_ACYadUvU3QBQ6NHLWZVsyqjBAh5X` Ready (CLI inspect), build1m18s.
- 고정 주소: https://nearbook-web-git-fix-p1-05-library-c-79c62f-chonghg22s-projects.vercel.app
- 불변 주소: https://nearbook-5ypx875et-chonghg22s-projects.vercel.app
- 이전 브라우저 연결이 해제돼 이번 프리뷰의 live UI/외부 탭 목적지 화면은 아직 관측하지 않았다. 다른 프로필/자동화로 우회하지 않고 사용자 화면 확인을 요청했다. CLI Ready/로컬 DOM 테스트는 live UI 검증과 구분한다.
- `/book/9788936434120`의 도서관 카드에서 ‘공식 사이트에서 확인’과 ‘길찾기’ 확인.
- 공식 확인 클릭: 해당 도서관 홈페이지 새 탭. 서울도서관은 HTTPS 루트.
- 길찾기 클릭: 카카오맵에 해당 도서관이 목적지로 지정됨. 출발지는 사용자가 외부 사이트에서 선택.
- 운영 반영 승인은 수신했으며, 남은 사용자 화면 확인 이후 예상 head SHA를 검증하고 병합한다.
