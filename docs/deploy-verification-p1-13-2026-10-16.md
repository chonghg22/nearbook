# P1-13 검증 기록 — 2026-10-16

상태: 사용자 **“반영해”** 승인(2026-10-16) 수신 후 최종 gate 재확인/PR20 merge, **운영 반영 및 HTTP 검증 완료**. 기동 DB 재색인/컨테이너 교체의 요청 실패 가능성을 고지한 범위만 승인받았다. P1-12 배포 승인을 재사용하지 않았다.

- 최종 source/main: `fb956109c9e4d44f27380b46565fd0b5b3e1f80f` (merge13:25KST)
- API [CD #73](https://github.com/chonghg22/nearbook/actions/runs/38850514646), job `116810466736`, **SUCCESS**. build revision `fb956109c9e4d44f27380b46565fd0b5b3e1f80f`, build `containerimage.digest`와 Oracle pull `Digest` 일치: `sha256:c2d1a09b7e289e6e014e8c9003b854ea2f7c35af1a8b65bf7379c4b976d3579d`.
- Vercel production `dpl_4VFVyvy9cNQLwiUQA1dva8pXhRkM` Ready/build1m2s/두 운영 도메인 연결 확인. 웹 UI source 변화 없음.
- 신규 `/operations/search`의 운영 direct/proxy 응답과 live DB 재색인 성공까지 확인해, CD 성공만으로 준비됐다고 판단하지 않았다. 교체 중 502 표본(658ms) 후 복구됐으며 무중단은 아니다.

## 소스와 범위

- 기반 운영 main: `f7f344d1a0737c59e209d0bc1af153a9162d11be`
- 작업: `/Users/jack/local/nearbook-p1-13`, branch `fix/p1-13-search-index-20261016`
- head: `7849dcf25faa63a667f721c00309401bdea319ed`
- [PR #20](https://github.com/chonghg22/nearbook/pull/20), 12 files/+1075/-211 (formatting 포함).
- [설계/한계](https://github.com/chonghg22/nearbook/blob/7849dcf25faa63a667f721c00309401bdea319ed/docs/p1-13-search-index.md)
- 기존 dirty 원본 worktree/다른 작업의 소스는 수정하거나 초기화하지 않는다. 원본에는 이 검증 기록과 TODO만 추가한다.

캐시 canonical singleton과 만료 후 동일 size/hit/miss, 별도 검색 결과 cache revision 정책. 전체 DB repeatable-read metadata+최신 전국 rank snapshot을 별도 generation에 완성한 뒤 교체하고 실패하면 기존 generation 유지. 디스크 restore/persist 제거/매 부팅 DB 재생성 명시. 주기당4×500건 PK순환 replay/성공 cursor/경합 queue/같은 작업 합치기. payload 대신 현재 DB metadata로 갱신하고 인기 기준 유지, 일일 전체 rebuild로 빠진 rank/삭제 제거. no-store 공개 aggregate GET `/operations/search`, key/value/검색어/ISBN cursor/개인자료/자격증명 비노출.

## 로컬 최종 검증

Frozen install, lint/type-check/build/diff-check 통과.

총 **853개**: Node237 + Vitest365(33 files) + API251(18 suites). API에는 기존 quota 실PG9개와 이번 search 실PG6개를 포함, skips0. 전체 test를 Turbo cache 없이 재실행해 API/Vitest를 확인했고 Node도 직접237개를 재실행했다.

- `/private/tmp/nearbook-p113-install.log`
- `/private/tmp/nearbook-p113-lint-final.log`
- `/private/tmp/nearbook-p113-types-final.log`
- `/private/tmp/nearbook-p113-build-final.log`
- `/private/tmp/nearbook-p113-node-tests-final.log`
- `/private/tmp/nearbook-p113-tests-no-cache2.log`
- `/private/tmp/nearbook-p113-pg-tests.log`
- `/private/tmp/nearbook-p113-stress2.log`

실제 AppModule 기동/HTTP로 검색·health·신규 상태 route·개인 wishlist401·색인/캐시 단일 인스턴스를 확인했다. 모듈 등록 후 테스트 cron은 정지하고 enrichment는 mock으로 실제 공급자/발송 호출을 하지 않는다. HTTP 화면/개인 로그인 양성 live 검증과 구분한다.

실제 Orama로 재색인 중 완전한 이전 generation 제공, 완료시 교체/실패 유지, queued 최신 DB upsert,32 queue cap,2,501건 다회차/뒤늦은 insert/update/실패 replay/중복 방지,인기 정렬 유지/제거,partial upsert rollback와 복구 실패503,삭제 후 rebuild를 확인했다. 격리 실제PG는 PK pagination/aliases/SQL parameterization/최신 전국기간/중복rank/동시commit 격리/재시작/upsert/rebuild/1,200건 추가·삭제·rank 제거를 검증했다.

20,000권 단순 합성 재색인 표본:343ms/40회 동시 검색/최대7ms(단독),438ms/최대8ms(전체동시). 두 경우 old/new generation만 반환. 모의 metadata/짧은 반복 제목/Jest 메모리 수치는 운영DB IO·용량·p95/p99·최대RSS/과거지연 원인 보장이 아니다.

테스트용 PostgreSQL17 컨테이너 `nearbook-p113-index-test-20261016`, ID `c50ba7f6656fade5ebcdb437c9bd9d4f4f70e59244d3da9b1dfb019de1a96918`, localhost 랜덤 포트/고정 격리 DB명만 허용, 앱 .env/운영 DB는 읽거나 변경하지 않았다. 최종 테스트 후 ID/name/image를 확인해 해당 컨테이너만 stop했고 --rm으로 임시 테스트 DB와 함께 정리됐다. 이후 해당 ID의 docker ps -a 결과 없음. 사용자/운영 자료는 건드리지 않았고 검증 로그는 남겼다.

## CI/preview

[CI #36](https://github.com/chonghg22/nearbook/actions/runs/38850204320) **SUCCESS**, 최종 head `7849dcf`, job `116809526796`. frozen install/lint/type-check/build/test 모두 통과. 실제 실행 **838개=Node237+Vitest365+API236**. 기존 workflow는 수정하지 않았고 PG 서비스가 없어 실PG15개/2 suites skip, API 보고251개 중236개 통과를 로그에서 확인했다. CI 통과를 실SQL15개 실행으로 표현하지 않는다. CI 합성 workload는2121ms/40회/최대34ms로 운영 보장과 구분한다.

Vercel 자동 웹 프리뷰 `dpl_BXuSjhPx82rRf2uo3quiwjdY1jeK` **Ready/check SUCCESS**, build1m1s. immutable `https://nearbook-jxch02vc2-chonghg22s-projects.vercel.app`, 고정 `https://nearbook-web-git-fix-p1-13-search-in-f7d9e0-chonghg22s-projects.vercel.app`. 배포 메타데이터만 확인, 프리뷰 HTTP/브라우저를 열지 않았다. API 프리뷰 서버는 없으므로 이 배포에서 새 API가 서비스된다고 주장하지 않는다. 웹 UI 소스 변경 없음. 브라우저/프리뷰 접근 제한을 우회하지 않았고 화면 검증 완료로 기록하지 않는다.

CLI PR create는 연결 identity의 collaborator 권한 부족으로 실패했다. credential/scope를 확장하거나 바꾸지 않고 기존 사용자 GitHub 연결(chonghg22)에서 PR20을 생성했다. workflow 권한 부족은 이전과 같아서 CI service 변경 없음. 로컬 초기 테스트의 dependency dist 미생성/타입 오류 및 테스트 URL 오류는 수정했고 최종 전체 통과와 구분한다.

## 운영 읽기 전용 관측

2026-10-16 13:16KST 기존 `/api/operations/status` 한 번 조회. loan03:10KST 성공/609ms/20건/2026-10-16,trend03:20 성공/522ms/5건/2026-10-15. 이전 loan5월 자료는 자연 스케줄로 갱신됨. monthly keywords는2026-04/10건/lastRun:null/매월1일 등록이며 과거 원인·다음 성공을 확정하지 않는다. category·신착partial(일부scope skipped),최신저장840/122. quota는called500/effective500/modeblocked. 공급자 실제 남은 한도와 로컬 장부를 혼동하지 않는다. 강제 갱신·provider probe·한도/스케줄 변경 없음.

## 운영 최종 검증

스크립트 `/private/tmp/nearbook-p113-verify.mjs`, 로그 `/private/tmp/nearbook-p113-prod.log`, exit0 (13:28~13:29KST). 사용자/계정 쓰기·수동 작업 실행 없음.

- 운영 direct/proxy `/operations/search`:200/no-store/944·463ms. ready=true/revision1/documents13572/pendingWrites0. 부팅 rebuild count13572/state success/22549ms(13:28:04.788~13:28:27.335KST).
- search:reconcile/search:popularity/search:rebuild 세 이름 모두 SchedulerRegistry 등록. 첫 검사 시 reconciliation lastRun:null이었고, 13:30KST **자연 정기 실행**에서 success/count2000/endedAt13:30:00.217을 후속 관측했다. cursorInProgress:true/completedSweeps0/revision1/documents13572/pendingWrites0으로 다음 회차를 기다리는 상태이며 전체 순환 성공으로 확대하지 않는다. 로그 `/private/tmp/nearbook-p113-natural-sync.log`, 수동 cron/rebuild 실행 아님.
- direct/proxy 실제 검색 계약 parser 통과: 한 글자 ‘책’ 10건/total591/384·157ms, 기저장 ISBN9788936434120 정확히1건/468·154ms, enrichmentPending:false. 한 글자와 기저장 ISBN을 사용해 불필요한 enrichment를 피했다. 임의 provider probe/강제 갱신 아님.
- direct/proxy health:200/ok/312·154ms. 공유 캐시 신규 인스턴스 및 정책 응답 확인. size는 요청 사이 정상 유입으로0→1이므로 시각이 다른 값의 동일성을 강제하지 않는다.
- 기존 `/operations/status` direct/proxy200/no-store, curation5+quota observer 등록/pending disabled 유지. quota500=성공446+실패54/remaining0/blocked/resetAt2026-10-16T15:00:00Z(로컬10/17 00KST). 기동/검증 전후 장부500 유지, 한도 증액/삭제/재계산 없음. 외부 보유 조회 양성 성공은 이번 검증에 포함하지 않았다.
- 홈/검색 페이지/책 상세/도서관 상세:HTTP200/550·561·887·1721ms 및 Next 자산 참조. 이는 HTTP/HTML 검사이며 실제 브라우저 픽셀/지도/로그인 양성 검증 아님.
- 비로그인 개인 API3종401(131·380·168ms), 실제 계정 설정 미변경.
- 운영 index.popularityPeriod:null. 최신 전국의 **유효 rank 1~10000 저장 집계가 확인되지 않았다**는 상태이며, 테이블 전체 부재/원인/실제 인기 순위를 단정하지 않는다. metadata/restart/rebuild/순위 제거 일관성은 실PG/Orama 테스트 증거이고 운영 양성 rank 검증과 구분한다. 인기 데이터 강제 재생성/새 공급자 작업 활성화는 하지 않았다.
- 월간 키워드2026-04/10건은 기존 저장 상태 유지. 재시작 후 curation lastRun:null은 이력 메모리 초기화이지 오늘 새벽 작업 실패의 증거가 아니다. 배포 전 자연 스케줄 성공 결과는 위 기록으로 보존했다.
- 자연 sync 이후 추가 읽기 검증(`/private/tmp/nearbook-p113-post-sync.log`,exit0):검색10건/total591/356ms,health200/ok185ms,quota500/blocked157ms 유지.

## 남은 한계/제외

- 운영 API와 자동 Vercel rebuild까지 반영 완료. 두 generation 동시 유지 시 최대 메모리 여유/오래된 지연 원인은 추가 관측 필요. 이번22549ms 부팅 결과를 모든 데이터 규모의 재색인 성능 보장으로 확대하지 않는다. 기존stop/run 배포의502를 확인했고 readiness/커밋 고정 rollback/P1-14는 미구현.
- 삭제는 cyclic upsert만으로 즉시 감지하지 않고 daily/weekly rebuild 또는 재기동에 반영. 순환 지연은 DB건수에 비례하며 즉시 change feed 아님.
- 알림·이메일·푸시·동의/주기·실제 발송·새 작업 활성화·DB 스키마·강제 운영 rebuild/공급자 갱신·요금/한도 증액·지도URL·실제 계정 변경 없음.
