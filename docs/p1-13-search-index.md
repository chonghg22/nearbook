# P1-13 캐시·검색 인덱스 운영 정리

기반: 운영 main `f7f344d1a0737c59e209d0bc1af153a9162d11be`. 알림 작업(P1-11)은 사용자 요청으로 계속 보류한다. 이 문서는 구현/검증 설계이며 운영 배포 완료를 뜻하지 않는다.

## 확인한 문제

- 두 CacheService 클래스/글로벌 모듈 때문에 도서 서비스와 정보나루/health가 다른 메모리 캐시를 사용했다.
- 전체 rebuild가 즉시 live index를 비운 뒤 offset 페이지를 채웠다. 중간 검색/실패가 부분 결과를 노출할 수 있었다.
- 동기화가 `cached_at > 지금-5분 LIMIT 500`에만 의존했다. 긴 실행·중단·500건 초과·늦은 커밋의 재처리 기준이 없었다.
- 일반 metadata upsert/rebuild는 DB 컬럼이 아닌 popularityScore를 0으로 만들고, 일일 인기 갱신만 5,000건 N+1 조회로 임시 점수를 넣었다. 과거 기간/중복 rank도 섞일 수 있었다.
- 기존 CD에는 `/data` 볼륨 마운트가 없다. 컨테이너 내부 binary 파일을 재시작/교체 이후의 최신 원본으로 취급할 수 없다. 기존 토크나이저를 포함한 복구 동작도 검증되어 있지 않았다.
- 과거 7~15초 응답 지연의 원인은 확정하지 않았다. 이번 구조 개선이나 로컬 합성 시험을 운영 지연 해결의 증거로 쓰지 않는다.

## 결정 및 구현

### 원본은 DB, 인덱스는 매 기동 재생성

기존 `book_cache`와 최신 **전국 popular_books 기간**을 read-only/repeatable-read 트랜잭션 하나로 읽는다. PK keyset 500건씩 별도 generation에 적재하고 트랜잭션 완료 후 참조를 원자적으로 교체한다. 전체 스냅샷 동안 metadata와 인기 기준이 혼합되지 않는다. 첫 기동 실패는 부팅 실패이고, 운영 중 rebuild 실패는 이전 generation을 유지한다.

디스크 restore/persist/hourly persist cron을 제거한다. 기존 파일을 삭제하거나 볼륨/환경 변수/워크플로를 바꾸지 않는다. `SEARCH_INDEX_PATH`는 더 이상 사용하지 않는다. 별도 저장 형식/권한/복구 동작 대신 명시적인 DB 재생성을 선택했다. 외부 API 호출과 원본 DB 쓰기는 없다.

빌드가 끝날 때까지 첫 listen을 기다리는 기존 Nest bootstrap 특성은 유지된다. 기존 CD의 stop/remove/run 방식에서는 준비까지 중단이 늘 수 있다. readiness·롤백·무중단 배포는 **미구현**, P1-14 범위다. rebuild 중에는 이전/새 인덱스가 동시에 메모리에 존재하므로 운영 데이터 규모에서 메모리/기동 시간을 확인해야 한다.

### 동기화와 경합

`cached_at`는 앱 시각이지 커밋 순서의 watermark가 아니다. 스키마/CDC 추가 없이 무손실 delta를 주장하는 대신 **주기적 PK 전체 순환 재처리**를 선택했다.

- 기존 5분 주기를 유지하고 회당 최대 4페이지 × 500건 처리한다. 성공한 페이지 뒤에만 cursor를 옮긴다. 실패하면 같은 페이지부터 다시 처리한다.
- 끝에 도달하면 cursor를 처음으로 되돌린다. 이미 지나간 ISBN의 늦은 삽입/변경도 다음 순환에 반영된다. 시각 조건이 없어 중단/500건 제한으로 영구 누락되지 않는다.
- cursor/상태는 프로세스 메모리에만 둔다. 재시작 시 DB 전체 rebuild가 선행하므로 cursor 영속화를 요구하지 않는다.
- 이 방식은 즉시 동기화가 아니다. `N`행에서 대략 5분 × ceil(N/2000) + 마지막 빈 페이지 확인까지 한 순환이 걸릴 수 있다. 오류/동시 쓰기가 있으면 더 길어진다.
- 원본 삭제는 순환 upsert만으로 감지하지 않는다. 일일 04:30 및 주간 전체 rebuild/재기동 때 제거된다. 즉시 삭제 전파를 보장하지 않는다.
- PostgreSQL의 PK collation으로 WHERE/ORDER BY를 통일해 JS 시각/문자열 정렬에 커서를 의존하지 않는다.

rebuild/동기화/upsert는 같은 writer queue를 사용한다(최대 32개 대기, 같은 rebuild/sync 중복 합치기). rebuild는 live 읽기 큐를 점유하지 않는다. 일반 갱신은 100권씩 읽기와 직렬화하고 매 chunk 후 event loop에 제어를 돌려준다. 같은 문서는 재색인/캐시 revision을 불필요하게 변경하지 않는다.

provider 응답이나 지연된 작업의 payload를 원본으로 쓰지 않고 ISBN에 해당하는 **현재 DB metadata를 다시 읽는다**. 저장되지 않은 문서는 성공으로 가장하지 않는다. upsert 오류를 insert로 감추지 않고 기존 문서를 복구한다. 복구도 실패한 generation은 ready=false/검색503으로 처리하고 전체 rebuild로 회복한다.

### 인기 정렬

전국 최신 기간만 사용하고 같은 ISBN의 중복 rank는 min(rank), 유효 rank 1~10000만 선택한다. 점수는 `10001-rank`, 랭킹에 없으면 0이다. metadata upsert는 generation의 인기 기준을 유지한다. 일일 04:30 작업은 같은 스냅샷 전체 rebuild로 교체하여 빠진 rank도 0으로 되돌린다. 최신 기간의 완전성이 공급자 수준에서 보장된다는 뜻은 아니며, DB의 최신 저장 기간을 기준으로 한다.

### 캐시/관측

레거시 캐시 경로는 canonical CacheService의 재수출이고 CommonModule도 CacheModule을 가져온다. 두 경로가 동일 Nest token/인스턴스다. 기존 namespace/TTL/10,000 cap은 유지한다. health와 상태 조회의 size는 만료 항목 제거 후 같은 캐시를 집계한다.

`GET /operations/search`는 no-store/read-only aggregate다. 준비 여부, revision/문서 수/대기 수, 마지막 rebuild/sync/순환, 인기 기준 기간, 실제 cron 등록, 공유 캐시 hit/miss/size, 별도 검색 결과 캐시 정책을 제공한다. 검색어/ISBN cursor/캐시 key/value/사용자 목록/자격증명/경로는 노출하지 않는다. 상태는 현재 프로세스 증거이며 영속 이력/DB readiness/새로고침 명령이 아니다. 기존 `/operations/status` 계약은 유지한다.

## 검증 방법과 한계

- 실제 Orama: 이전 generation 제공/완성 후 교체/실패 유지, queued 최신 DB upsert, queue cap/오류 복구, 인기 점수 유지·제거, 2,501건 다중 회차/뒤늦은 삽입·갱신/재시도/중복 방지, rollback 실패503, 삭제 후 rebuild.
- 실제 AppModule HTTP: 검색/health/operations/search/개인 목록401, index와 캐시 단일 인스턴스. 외부 enrichment는 mock이고 등록 후 cron을 정지해 실제 발송/정기 작업을 실행하지 않는다.
- 실제 격리 PostgreSQL: SQL aliases/PK pagination/파라미터화, 최신 전국 기간·중복·rank 필터, 동시 커밋 snapshot 격리, 재시작/metadata upsert/rebuild의 인기 정렬, 1,200건 추가 후 재처리, 삭제/rank 제거.
- 로컬 20,000건 **단순 합성 데이터** rebuild 중 응답은 항상 완성된 old/new generation이었다. 별도 실행 표본 343ms/rebuild·40회 동시 조회·최대 7ms/조회는 Jest 프로세스/메모리 mock 원본의 결과다. 운영 용량·DB IO·장문 tokenizer·p95/p99·최대 RSS 성능 보장이 아니다. 전체 테스트 동시 실행 수치는 달라질 수 있다.
- 실 DB 테스트는 `NEARBOOK_QUOTA_TEST_DATABASE_URL`을 명시할 때만 실행한다. localhost의 정확한 `nearbook_quota_test` DB만 허용하고 앱 .env를 읽지 않는다. 기존 quota 9개 + 이번 search 6개다. CI는 workflow scope 부족이 해결되지 않아 PG service를 추가하지 않았고 15개가 skip된다. CI 통과와 실 SQL 통과를 구분한다.
- DB 스키마·워크플로·의존성·웹 UI·지도 허용 URL·알림/동의·계정 데이터·한도 증액·강제 갱신·수동 운영 rebuild는 제외한다.

## 오래된 큐레이션 읽기 전용 후속 점검

2026-10-16 13:16 KST `/api/operations/status` 관측: loan 정기 작업이 03:10 KST 성공/20건/2026-10-16, trend도 성공/5건/2026-10-15였다. P1-12에서 발견한 loan의 5월 자료는 자연 스케줄로 갱신됐다. keywords는 여전히 2026-04/10건이며 매월 1일 작업으로 이 프로세스의 lastRun=null이다. 과거 월별 실패 원인/다음 실행 성공을 확정하지 않는다. categories/new-arrivals는 일부 scope 건너뜀(partial)이며 최신 저장 건수840/122였다.

그 시각 quota는 called=500/effective limit=500/mode=blocked였다. 이번 상태 GET은 공급자 호출을 하지 않는다. 한도 변경·강제 갱신·작업 수동 실행 없이 기록만 남긴다. 보유 unknown이나 공급자 차단을 검색 인덱스 장애로 혼동하지 않는다.
