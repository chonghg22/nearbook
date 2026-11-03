# P1-06 검색 유형·순위·ISBN·판본 표기 검증 (2026-10-14)

## 상태·권한

- 다음 작업 요청 및 ‘검증 후 운영 웹/API 반영’ 승인 수신. API 컨테이너 교체 중 짧은 요청 실패 가능성을 안내했다.
- 기반 운영 `56947d67cd61a94b3fc5044824ce11c7cdb76595`.
- 별도 worktree `/Users/jack/local/nearbook-p1-06`, 브랜치 `fix/p1-06-search-ranking-20261014`.
- [PR #13](https://github.com/chonghg22/nearbook/pull/13), 최신 tested head `db00074ae2a843cefd56c8b947361cd5102de92a` (초기 `fd45280`).
- 로컬 및 최신 CI #28 전체620개 성공/Vercel 프리뷰 Ready/check success. 사용자 ‘응 통합 검색으로 돌아와’ 확인 수신. 기존 운영 웹/API 반영 승인 및 정상 head/base 조건 검증 후 PR #13 merge main `0979c1b6b6fe1345691db414158e42a11dd71ab0` (2026-10-14 16:55 KST).
- 운영 웹/API 반영 완료: Vercel Ready, API CD #69 success, 실제 운영 HTTP/검색/상태 검증 완료. P1-07 미착수이며 아래 첫 검색 지연을 다음 항목의 근거로 기록한다. 아래 프리뷰 대기/운영 미반영 문구는 배포 전 이력이다.

## 운영 배포 및 실데이터 확인 (2026-10-14 17:02 KST)

- tested head `db00074`, 기준 main `56947d6`, CI #28/620개 성공 및 사용자 프리뷰 통합 복귀 확인 후 예상 head SHA 조건으로 PR #13 병합.
- 운영 main/web/API source `0979c1b6b6fe1345691db414158e42a11dd71ab0`.
- Vercel production `dpl_AaGnE6ZU2uCbMANETCyGRkkrVE19` Ready/commit check success. build1m42s, 불변 https://nearbook-p488la956-chonghg22s-projects.vercel.app , `www.near-book.com`/`near-book.com` alias 연결 확인.
- [API CD #69](https://github.com/chonghg22/nearbook/actions/runs/38531516408)/job `115744261736` success. `sha-0979c1b`/revision label 일치, build `containerimage.digest`와 Oracle pull `Digest` 모두 `sha256:c8f0cbe8e3eb3a9aabe66449f259fcb66ab41c9fd03ebad98ec8009827c5b1bf`로 일치. 기존 Docker 컨테이너 교체 및 image-prune 배포 스크립트 사용. DB/강제 refresh/rebuild/cron/권한 변경 없음.
- 실제 운영 검색 페이지 `/search?q=8936434128` HTTP200, CSS200/`text/css`, 연결 JS bundle200 및 통합 옵션/ISBN 감지 안내/입력 안내/판본 한계 문구 포함 확인. 운영 live 화면은 직접 브라우저에서 관측하지 않았으며 사용자 프리뷰 확인과 HTTP/메타데이터 검증을 구분한다.
- same-origin 검색 API + 최종 엄격 파서:
  - ISBN-10 `8936434128` 및 하이픈13 `978-89-364-3412-0`, `searchType=isbn`: 각각 HTTP200/total1/정확 ISBN `9788936434120` 한 건.
  - `8936434128&searchType=all`: HTTP200/total1/동일 ISBN. 새 enum/자동 ISBN 서버 경로 동작 확인.
  - `9788936434121&searchType=isbn`: HTTP400 (정상 빈 검색·503으로 오인하지 않음).
  - `소년이 온다&searchType=title&pageSize=10`: HTTP200/total133/10건. 제목 정규화 순위 `[0,1,1,1,1,1,1,1,2,2]`, 전체 구문이 부분 일치보다 먼저임을 검사했다. 이전 첫5건에 들어 있던 ‘소년이로’·‘소년이 그랬다’는 9·10번째로 내려갔다.
  - `한강&searchType=author`: HTTP200/total107/10건, 표시 역할 정리 후 첫10건 저자 한강.
  - `창비&searchType=publisher`: HTTP200/total5048/10건, 첫10건 출판사 창비.
- 직접 API/proxy health는 배포 후 HTTP200/status `ok`. `/sw.js` HTTP200 및 변경 없는 worktree source와 byte 일치, 기존 개인정보/보유 상태 캐시 제외 유지.
- 건강 상태는 관측 시점의 응답으로, 컨테이너 교체 동안 무중단이었다는 보장은 아니다. 샘플링에서 실패를 관측하지 않았지만 기존 교체 구조의 짧은 실패 가능성은 유지된다.

### 남은 P1-07 성능/데이터 한계

- 첫 운영 제목 GET은18284ms, 저자1180ms, 출판사10659ms, all ISBN688ms. 제목 요청은 웹의15000ms deadline을 초과할 수 있다. HTTP200/정확 순위 확인과 브라우저 첫 요청 완료는 서로 다른 검증이며, 이 지연을 숨기지 않는다.
- 기존 동기 정보나루 보충/remoteTotal 혼합·cache 정책은 P1-07 범위로 남겼다. 이번 배포에서 latency 개선 완료나 모든 페이지 총건수 정합성을 주장하지 않는다. DB 데이터 강제 갱신/재색인을 실행하지 않는다.
- 첫 결과의 오디오 자료/제목에 판본 표기 없는 기존 데이터는 ISBN별로 유지한다. 제목만으로 인쇄 일반판 여부나 모든 개정/오디오 판본을 확정하지 않으며 별도 ISBN을 확인해야 한다.
- 원본 dirty worktree의 소스 변경을 포함하지 않았으며 DB/강제 refresh/rebuild/cron/지도 SDK·허용URL/권한/PWA 변경은 없다.

## 구현

- ‘도서명’이 저자/출판사도 검색하던 불일치를 없애고 기본 ‘통합’ 모드 추가. 명시 제목/저자/출판사 검색은 해당 인덱스 필드만 사용한다.
- NFKC/대소문자/공백/문장부호 정규화 후 정확 제목 → 전체 구문 → 부분 토큰 순으로 관련도 정렬. 실제 Orama comparator는 전체 후보에 적용하고 나서 offset/limit을 자른다. 랭크를 요청별 Map에 캐시하며 동점은 기존 BM25/ISBN. 명시 인기·최신 정렬은 유지한다.
- 제목 근거 큰글자/필사 표기, 별도 ISBN 노출, 같은 일치 등급에서는 표시된 파생 판본을 뒤로 둔다. 명시 판본 검색은 페널티 없음. 다른 ISBN을 합치거나 표기 없는 책을 일반판으로 확정하지 않는다.
- 체크 숫자 검증 및 ISBN-10→13(X 포함)/공백·하이픈·전각/자동감지/정확 검색/잘못된 입력 안내·API400. 기존 ISBN-10 인덱스 alias로 migration 없이 조회한다.
- ISBN 미등록이면 기존 정확 서지 조회를 사용하고, 키워드/제목 fallback 및 원격 총건수를 섞지 않는다.
- 저자 역할 문구 정리 및 원문 tooltip, 알라딘 Title/Author/Publisher 선택, 정보나루 기존 keyword/typed 보충, sync throttle 유형 분리.
- 웹/API 공통 순수 helper를 shared-types에서 빌드한다. API Jest는 TS만 ts-jest로 변환하여 compiledJS 처리 경고 방지.

## 검증 증거

- 초기 frozen-install/lint/type-check/build/test 및 [CI #27](https://github.com/chonghg22/nearbook/actions/runs/38530561066) 통과: Node237 + Vitest252 + API130 =619 (head `fd45280`).
- 자동 감지 ISBN 모드가 새 제목 검색에 남지 않도록 요청한 타입과 자동 감지 결과를 구분했다. 후속 DOM1개 및 전체 lint/type-check/build/test 성공: Node237 + Vitest253 + API130 =620 (head `db00074`). 의존성/lockfile은 동일하다.
- 최종 [CI #28](https://github.com/chonghg22/nearbook/actions/runs/38530971541)/job `115742505805` success: frozen install/lint/type-check/build/test 성공, Node237 + Vitest253 + API130 =620. head `db00074`와 Vercel check success 일치.
- 실제 Orama3.1.18/기존 tokenizer/격리 fixture index로 대표40개(제목30·저자5·출판사3·ISBN2) 기대 첫 결과 및 필드 제외 검증. 추가 관련도 전역 페이지 순서·인기/최신·판본 명시·legacy10자리alias·입력/역할 테스트.
- API 검색 영역76개(기존4 포함) 및 실제 SearchPageInner 요청/유형/자동ISBN/잘못된ISBN 무요청/판본·ISBN 링크/필터·503/새 제목 검색 DOM12개 성공.
- fixture/mock ISBN·도서·업스트림 fake key는 테스트용이며 운영 DB/파일에 쓰지 않았다. test index persist를 mock해 파일 저장하지 않음.
- 운영 기준선 GET 관측(수정 전): `/api/search?q=소년이 온다&searchType=title&pageSize=5` HTTP200/total137, 첫5건 중 ‘소년이로’, ‘소년이 그랬다’가 전체구문 제목보다 앞에 위치. 저자 ‘한강’ HTTP200/107건, ISBN13 하이픈 입력 HTTP200/정확1건. 정상 일반 조회만 실행했다.
- [Orama 공식 sorter 문서](https://docs.orama.com/docs/orama-js/search/sorting)와 설치 source에서 pagination 전 comparator를 확인했다. [알라딘 공식 가이드](https://www.aladin.co.kr/ttb/apiguide.aspx) GET200으로 Title/Author/Publisher 지원 확인, [정보나루 공개API](https://dlib.data4library.kr/apiUtilization) 및 기존 exact metadata 경로 사용.
- 전체 fixture 정확순위 성공은 운영 모든 도서의 품질을 보장하는 지표가 아니다. 운영 metadata에서 판본 표시가 없으면 제목만으로 확정할 수 없으며, 별도ISBN으로 확인해야 한다.

## 프리뷰/운영 배포 순서

- 최신 Vercel `dpl_EHJFEdoQzVRY4wQn8Ye2YbJUKksY` Ready (build1m41s), 불변 주소 https://nearbook-23kjcig9k-chonghg22s-projects.vercel.app . 고정 alias https://nearbook-web-git-fix-p1-06-search-ra-2bcf8e-chonghg22s-projects.vercel.app CLI inspect 확인.
- 사용자 검증 URL: https://nearbook-web-git-fix-p1-06-search-ra-2bcf8e-chonghg22s-projects.vercel.app/search?q=8936434128 . canonical13 `9788936434120`/유형ISBN/ISBN별 링크 표시 및 새 제목 ‘소년이 온다’ 입력 후 통합 복귀 확인 요청. 직접 live UI나 실제 필터 조작은 아직 관측하지 않았다.
- 프리뷰 웹은 운영 API를 사용한다. 통합 모드의 요청은 `searchType`을 생략하여 기존 API와 호환되게 하고, ISBN은 웹에서 canonical13으로 변환한다.
- 프리뷰 UI에서 통합/유형 선택, ISBN10 자동감지·13자리 안내·개별ISBN, invalidISBN 안내를 확인한다. 새 API 관련도/엄격한 유형은 아직 CI에서만 검증된 상태이며 운영 API 배포 후 실제 검색으로 확인한다.
- 기존 브라우저 연결 해제/프리뷰 접근 차단을 다른 프로필·자동화로 우회하지 않고 사용자 직접 화면 검증을 요청한다.
- CI success/프리뷰 Ready/사용자 화면 확인 후 예상 SHA로 병합한다. API CD의 build/pull digest 일치·최종 health, 웹 Ready/alias·실제 검색을 확인한 뒤 완료 처리한다.
- DB 스키마/강제 전체 데이터 갱신/지도 설정/P1-07은 포함하지 않는다.
