# P1-07 검색 응답 시간·페이지 정합성 검증 (2026-10-15)

## 현재 상태

구현 및 로컬/최종 CI #29 검증 완료. Vercel 프리뷰 Ready/check 성공 및 사용자 정상 동작 확인 수신. 예상 head/base 재검증 후 PR #14 병합, **운영 웹/API 반영 및 공개 응답 검증 완료**. P1-08 미착수. 아래 진행 중 문구는 배포 전 이력이다.

- 사용자: 다음 작업 진행 요청 및 ‘검증 후 운영 웹/API 반영’ 승인. API 컨테이너 교체 중 짧은 요청 실패 가능성 안내.
- 기반 운영/main: `0979c1b6b6fe1345691db414158e42a11dd71ab0`
- 별도 worktree: `/Users/jack/local/nearbook-p1-07`
- 브랜치: `fix/p1-07-search-latency-20261015`
- PR: https://github.com/chonghg22/nearbook/pull/14
- 최신 head: `d031eb84bd76eabca1730664d1b7991cbbec57eb`
- CI #29: https://github.com/chonghg22/nearbook/actions/runs/38654041158 (success), job `116159440865`: Node 237 + Vitest 261 + Jest 147 = 645개 로그 확인.
- Vercel preview: `dpl_BvY21XsSxAHQh4vTnGN8YV6YWHhj` Ready/check success, build 1m18s.
- 고정 프리뷰: https://nearbook-web-git-fix-p1-07-search-la-cc6768-chonghg22s-projects.vercel.app
- immutable: https://nearbook-m0w4v42p1-chonghg22s-projects.vercel.app
- 사용자 ‘아 그럼 잘 되고있는거 확인헀ㅇ ㅓ’로 프리뷰 정상 동작 확인. ‘첫 페이지’가 같은 검색 결과 1페이지임을 설명한 뒤 확인 수신했으며 홈 이동 확인으로 기록하지 않는다.
- 운영 main/source: `4fa98837e666ba77f5070a25be6255296f78ddc4` (2026-10-15 09:07 KST 병합).
- 운영 Vercel `dpl_23CQG6b5EDUcrbyM3ejk1wnHw8fD` Ready, API CD #70 https://github.com/chonghg22/nearbook/actions/runs/38658237708 success.

기존 `/Users/jack/local/nearbook`의 누적 dirty 소스는 보존했다. 이번 코드·설계 문서만 clean worktree에서 커밋했다. 이 문서와 TODO는 기존 프로젝트 로컬 기록이다.

## 변경

- 로컬 Orama `hits`/`total` 동일 조회 결과를 즉시 반환, 외부 보충·통계 DB·추천 SQL은 검색 응답 경로에서 제거.
- 외부 총건수를 UI 페이지 수에 사용하지 않음. 공개 total은 현재 색인에서 검색 가능한 결과이며 전체 외부 카탈로그 수가 아님.
- 검색어/유형별 보충 병합, 공급자 첫 페이지(정보나루 60권·알라딘 10권)만 조회, 최대 동시 16개 작업. 로컬 페이지 번호로 공급자 페이지 다운로드하지 않음.
- ISBN 정확 metadata/10→13/검색 순위 유지. 다른 ISBN의 metadata는 수용하지 않음.
- 선택적 `enrichmentPending`/`enrichmentFailed` boolean 타입·실행시 파서·DTO 추가. 이전 API 응답과 호환.
- cold 검색 확인 중 상태와 정상 0건/오류 구분. 웹 2초 간격 최대 15회 재확인 후 수동 재시도, 화면 변경 시 타이머 정리.
- 응답 LRU 500개/60초, 보충 상태 LRU 500개/성공 1시간·실패 30초, 만료 정리·색인 revision 변경으로 캐시 무효화.
- 범위 밖 기존 페이지 URL은 첫 페이지 복귀 안내. 총건수 의미·추가 정보의 다음 검색 반영 안내.
- 정보나루 보충 timeout/잘못된 response는 정상 빈 결과가 아니라 실패로 전달.
- DB schema/강제 갱신·reindex·cron·색인 포맷·지도 허용 URL·PWA 변경 없음.

## 로컬 검증

Node 22.19.0, pnpm 9.15.9. 새 의존성 및 lockfile 변경 없음.

- frozen install 성공: `/private/tmp/nearbook-p107-install.log`
- lint 성공: `/private/tmp/nearbook-p107-lint-final.log`
- type-check 성공: `/private/tmp/nearbook-p107-typecheck-final.log`
- build 성공 및 Node 237개: `/private/tmp/nearbook-p107-build-final.log`
- 전체 테스트 성공, Vitest 261 + API Jest 147: `/private/tmp/nearbook-p107-test.log`
- 총 645개. `git diff --check` 성공, 커밋 후 worktree clean.

실제 Orama 대표 검색 40개/순위·페이지·revision, 외부 응답 미완료에도 로컬 즉시 반환, timeout 이후 기존 결과 유지, 공급자 병합/ISBN/최대16개/쿼리 유형 격리, remote total 배제, TTL/500개 상한/LRU 읽기 승격/만료 정리/다른 검색어 및 조회 중 색인 변경 무효화, cold 성공·실패·재시도 억제를 검증했다. DOM에서는 초기 로딩/확인 중/0건/오류, 최대15회 재확인·언마운트·수동 재시도, 범위 밖 페이지·잘못된 page·페이지 수 및 파서 호환을 검증했다.

초기 검증 시 빌드 전 공유 패키지 부재, 명령 인자 위치, 기존 source assertion 및 fake timer/performance 연결 때문에 실패했으며 모두 수정 후 전체 통과했다. 테스트의 모의 outage warning 및 기존 Turbo output 경고는 실제 운영 장애 관측이 아니다.

## 프리뷰 및 운영 검증 경계

현재 브라우저 직접 접근은 이전 연결/권한 제한 때문에 수행하지 않았다. 기존 사용자 직접 프리뷰 확인 경로를 유지한다. 우회 브라우저나 차단된 프리뷰에 대한 HTTP 우회 조회를 사용하지 않는다.

프리뷰 웹은 기존 운영 API를 사용한다. 따라서 새로운 비동기 플래그·로컬 우선 속도·총건수는 CI/DOM/실제 Orama 회귀로 먼저 검증하고, 운영 API 배포 후 공개 API·health·자산·응답 시간으로 별도 확인해야 한다. 프리뷰 화면만으로 새 백엔드가 실행됐다고 주장하지 않는다.

배포 조건: exact head 최종 CI 성공·Vercel Ready·프리뷰 검증 후 merge. 운영 웹 Ready/alias, API CD 성공 및 build/pull digest/revision 일치, 공개 API/health/검색·ISBN·페이지·자산 검증 후 완료 처리한다.

## 제한

보충은 제한된 첫 공급자 페이지이며 전체 카탈로그 수집이 아니다. 이미 로컬 결과가 있는 화면은 자동 순위 변동 없이 다음 검색에 보충을 반영한다. 동시 작업은 프로세스 단위이고 DB가 무기한 멈추면 최대16개 슬롯은 유지된다. 로컬 조회는 계속 응답하며 cold UI는 재확인 제한 뒤 수동 재시도를 제공한다. 외부 강제 timeout이나 실운영 대량 갱신을 유발하지 않는다.

## 운영 배포 완료 및 실측 (2026-10-15)

- 사용자 프리뷰 정상 확인 후 tested head `d031eb84bd76eabca1730664d1b7991cbbec57eb`, base `0979c1b` 및 CI #29 success/645개/Vercel preview check success를 재검증하고 expected head 조건으로 병합했다.
- 운영 main/source: `4fa98837e666ba77f5070a25be6255296f78ddc4`.
- Vercel production `dpl_23CQG6b5EDUcrbyM3ejk1wnHw8fD` Ready/check success, build1m7s. immutable https://nearbook-5rj5a990t-chonghg22s-projects.vercel.app . `www.near-book.com` 및 `near-book.com` alias 연결 확인.
- [API CD #70](https://github.com/chonghg22/nearbook/actions/runs/38658237708)/job `116173017609` success. tag `sha-4fa9883`, revision `4fa98837e666ba77f5070a25be6255296f78ddc4` 확인. build `containerimage.digest`와 Oracle pull `Digest` 모두 `sha256:a38dcc6a9ea6dcaaedbfa2bc9917a593db876c5b95607af0d1b5603e63a1d513`로 일치. 기존 컨테이너 교체/image-prune 배포 방식이며 별도 서버 명령·DB 변경·강제 데이터 작업 없음.
- API CD 성공 직후 첫 검색에서 HTTP502를 관측했다. 다음 직접/proxy health는 HTTP200/status ok로 회복했다. CD 성공만으로 readiness/무중단을 주장하지 않으며 이 기존 배포 구조는 별도 운영 안정성 항목에 남는다.

### 실제 운영 HTTP/엄격 파서

프리뷰 차단을 우회하지 않고 공개 운영 주소만 일반 GET으로 확인했다. Node/HTTP 검증이며 새 운영 화면을 직접 브라우저에서 관측한 것은 아니다.

| 검색 | HTTP | 실제 total / items | GET 시간 | 비고 |
| --- | --- | --- | --- | --- |
| 소년이 온다 / title / page1 | 200 | 134 / 10 | 847ms | API duration13ms, pending/failed false |
| 한강 / author | 200 | 65 / 10 | 166ms | API duration4ms |
| 창비 / publisher | 200 | 260 / 10 | 343ms | API duration89ms, 외부 총건수5048을 광고하지 않음 |
| ISBN10 8936434128 / isbn | 200 | 1 / 1 | 2738ms | 정확9788936434120 |
| 하이픈 ISBN13 / isbn | 200 | 1 / 1 | 428ms | 정확 동일 ISBN |
| ISBN10 / all | 200 | 1 / 1 | 9492ms | 자동 감지·enum 정상, 지연도 함께 기록 |
| ISBN10 / isbn / page99 | 200 | 1 / 0 | 500ms | 범위 밖 페이지를 책 부재와 구분할 수 있는 응답 |
| 잘못된 ISBN9788936434121 | 400 | 해당 없음 | — | 정상 0건/503 아님 |

모든 성공 검색은 새 boolean `enrichmentPending`/`enrichmentFailed` 및 최종 `parseSearchResult` 검증을 통과했다. 기본 관련도·도서 ISBN 링크는 유지한다.

- 제목 페이지 1·2·14·15의 total은 모두134. 마지막14페이지4건, 15페이지0건, 1·2페이지 ISBN중복없음. GET 시간 각각425/7498/8489/5705ms. 따라서 이 검증에서 페이지 수와 마지막 항목 수가 일치했지만 모든 후속 요청이 1초 이내였다고 주장하지 않는다.
- 마지막 추가 page3: same-origin HTTP200/10건/total134/207ms, 직접 API HTTP200/596ms. 해당 신규 page3의 API duration4ms.
- 마지막 직접/proxy health: HTTP200/status ok, 각각637/163ms. 앞선 검증 중 health에도9749/4868ms 지연이 관측됐다.
- 운영 `/search?q=8936434128&page=99` HTTP200(967ms). 연결 CSS HTTP200/`text/css`, 연결 검색 JS HTTP200 및 새 상태 필드·범위 밖 페이지·첫 페이지 복귀·총건수 의미 안내 포함. `/sw.js` HTTP200 및 worktree source와 byte 일치.

### 성능 해석과 잔여 위험

첫 제목 GET847ms는 P1-06의18284ms 관측보다 짧고, 코드/테스트에서 외부 대기 경로 제거를 확인했다. 다만 한 번씩의 관측을 통계적 성능 보장으로 취급하지 않는다. 배포 직후/보충 병행 시 일부 검색과 health에서7~9.7초 지연이 있었으며 뒤의 page3/health는 정상 범위로 회복했다. 일시적 지연의 원인이 공급자 대기인지, 색인 upsert/persist/GC 또는 네트워크인지 이 HTTP 증거만으로 확정하지 않는다. 지연이 재발하면 별도 프로파일링/관측이 필요하다.

실운영에서 공급자 timeout을 강제로 유발하거나 cold 상태를 만들기 위한 가짜 ISBN/대량 검색은 하지 않았다. cold pending/failure·자동 재확인 제한·외부 timeout 때 기존 결과 사용은 격리된 API/DOM 테스트로 검증했다. 사용자 프리뷰 확인·CI/DOM·운영 HTTP 증거를 서로 구분한다.
