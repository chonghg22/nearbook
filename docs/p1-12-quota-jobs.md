# P1-12 외부 API 예산·작업·갱신 상태

## 승인과 범위

2026-10-15 사용자가 정보나루 실제 계정 한도를 **하루500건**으로 확인했고, 전체 검증 후 운영 API 반영을 승인했다. P1-11 이메일·푸시·알림 발송 개선은 사용자 지시로 보류한다. 기존 발송 설정/동의/주기·요금·DB스키마·지도·웹UI·서비스워커는 변경하지 않는다. 강제 갱신/전체 수집/실제 발송·개인 설정 변경·미등록 pending 작업 활성화는 하지 않는다.

기반 main `d03897b`, clean worktree `nearbook-p1-12`, branch `fix/p1-12-quota-jobs-20261015`. 원본 dirty worktree는 보존한다.

## 발견

- Client는 프로세스 내 dailyCallCount만 증가시키며 재시작하면0이었다. 자정 reset의 호출 등록도 없었다. 기본30000과 env 예시500이 달랐다.
- 별도 QuotaModule/QuotaService/acquire는 실제 client에 연결되지 않았다. 기존 quota 집계는 status200만 세어 실패 호출을 제외했다.
- provider application error는 try와 catch에서 각각 usage를 기록해 중복될 수 있었다.
- PendingLookupCron/Service는 provider로 등록되지 않고 enqueue 호출 경로도 없었다. 이를 켜면 새로운 외부 호출/보고 발송이 활성화되므로 이번 승인 범위에서는 그대로 비활성이다.
- 갱신은 기존 스냅샷을 보존하지만 실패/빈 응답 구분이 약했고, 등록/실행/마지막 스냅샷을 한곳에서 확인할 수 없었다.

## 예산과 호출

- 사용자 확인 계정 상한500을 hard cap으로 두고 JEONGBONARU_DAILY_LIMIT는 더 낮게 설정할 수 있다. 미설정은500, 기존 설정이30000이면500으로 clamp하고 로그/status에서 표시한다. 잘못된 수치는 조용히 무제한으로 처리하지 않는다. 증액은 별도 계정 확인·결정이 필요하다.
- HIGH는 사용자 조회, LOW는 검색 백그라운드 보충/큐레이션 갱신이다.80%(500기준400)는 warn,95%(475)부터 LOW 차단,100%(500)부터 HIGH/LOW 모두 차단한다. 하위 예산 설정에도 비율을 적용한다. 별도 발송 모듈의400/500 문구·채널 정책은 보류된 P1-11에서 정리한다.
- 실제 HTTP 전, 기존 nearbook.api_usage에 status_code0의 **예약1행**을 commit한다. provider 전용 transaction-level advisory lock을 얻은 뒤 별도 READ COMMITTED statement에서 당일 count와 조건부 INSERT를 수행한다. provider HTTP는 DB lock/transaction 밖에서 실행한다. server-side lock/statement timeout을 설정한다.
- KST 자정~다음 자정 범위의 provider/non-cache 모든 예약·실패·미완료 행을 센다. 별도 초기화/delete/환불이 없어서 재시작·경합으로 예산이 늘어나지 않는다. HTTP가 실제로 나가기 전 프로세스가 죽어도 예약은 보수적으로 소비된 채 남는다.
- 완료는 같은 행의 status/duration만 비동기로 갱신한다. 기존처럼 HTTP 결과가 로그 DB 응답에 매달리지 않는다. 갱신 실패/중단은 unresolved로 남으며 예산은 복구하지 않는다. provider app error의 중복INSERT가 없어지고, 실패/429/timeout도1회 소비다. 예약 실패 시 외부 호출은 하지 않는다.
- 같은 endpoint/정렬된 params/priority/timeout의 동시 요청만 최대500개 in-flight map에서 합친다. 장기 콘텐츠 캐시나 자동 재시도는 추가하지 않는다. 완료/실패 후 지워 다음 명시적 요청은 다시 시도할 수 있다. 기존 유효 cache hit는 외부 요청/예약을 하지 않는다.
- proxy query로 서버 authKey/JSON format을 바꾸지 못하며 provider 오류/요청 URL/키를 새 로그나 상태 응답에 싣지 않는다. 사용자 쿼리 payload도 status에 노출하지 않는다.
- quota/accounting 차단 시 달력 fallback·큐레이션 순회를 중단한다. 사용자 보유 상태는 기존 unknown/quota로 매핑하고 미소장으로 바꾸지 않는다.
- 직접 proxy 호출의 예산 차단은 sanitized HTTP429, 예산 집계 불가는503이다. 실제 HTTP route 테스트로 상태코드/안내를 확인하며 운영 한도를 일부러 채우지 않는다.

이 예산은 **이 클라이언트가 기록한 로컬 DB 장부**이며 공급자 사이트에서 조회한 실제 잔여 횟수는 아니다. 다른 서버/스크립트가 같은 키를 직접 쓰는 호출은 보장할 수 없다. 과거 중복 로그도 삭제하지 않고 보수적으로 센다. 기존 행이 이미500 이상이면 다음 KST 날짜까지 새 호출은 차단되며 캐시/로컬 검색은 유지된다.

## 관측

- QuotaModule을 실제 JeongbonaruModule에 연결한다. quota:observe cron은 매분 집계/모드 전환 **로그만** 남긴다. 기존 미등록 quota 코드의 Discord 발송을 활성화하지 않는다.
- GET /naru/status: DB 기반 예산/성공·실패·unresolved/잔여/모드/관측시각·resetAt. no-store, 상태 DB 실패는 sanitized503이며0으로 위장하지 않는다.
- GET /operations/status: 위 quota + 기존 큐레이션5개 named cron의 실제 registry 등록 여부·KST schedule·현 프로세스 실행 상태/기간/건수/시각·DB 최신기간별 스냅샷 row수/min·max fetchedAt. aggregate read-only endpoint이며 인증키/개인정보/수동 갱신 기능은 없다. 의존 DB 실패는 sanitized503.
- GET /health는 새 DB 쿼리를 하지 않는다. quota는 마지막 관측시각/90초 초과stale 표시를 가진 snapshot이며 재시작/일자 변경 후 미관측은 called:null/mode:unknown이다. 이는 liveness이며 readiness 개선 전체를 끝낸 것은 아니다(P1-14).
- 기존03:10/03:20/월1일03:30/03:35/03:40 KST 갱신 스케줄은 유지한다. 중복 실행은 같은 프로세스에서 막는다. 성공/partial/empty/failed/blocked와 count/period/lastSuccessAt를 구조화 로그에 기록한다. 실패/빈/차단은 기존 저장 자료를 새 성공으로 덮어쓰지 않는다.
- runtime 이력은 프로세스 재시작 시 없어지고 lastRun:null로 표시한다. DB 스냅샷 fetchedAt는 저장 row의 시각으로, 전체 작업의 완전한 성공/실행 증거가 아니다. 분산 작업 lock·영구 작업 이력 저장소·자정 실제 대기 검증을 했다고 주장하지 않는다.
- pending lookup은 등록/실행되지 않았다고 명시한다. 큐 재처리/새 외부 발송은 별도 승인이 필요하다.

운영 확인은 /operations/status 또는 웹 /api/operations/status의 GET만으로 가능하다. 이 조회는 외부 정보나루 API나 갱신 작업을 실행하지 않는다. 실제 발송 상태는 다루지 않는다.

## 검증

- frozen install/lint/type-check/build/test 및 최종 GitHub CI. 의존성/lockfile 변경 없음.
- 별도 localhost PostgreSQL17 컨테이너/nearbook_quota_test DB에서 실제 SQL·두 service 인스턴스/20개 경합·5회 예산·475/500 경계·새 인스턴스 재시작·실패/미완료 장부·KST 날짜 경계·snapshot SQL 검증. 운영 DB/정보나루는 사용하지 않는다.
- 실제 provider/curation module graph와 scheduler를 부팅해 등록6개를 확인하고 /operations/status의 실제 HTTP 경로/no-store/응답을 검증한다. provider transport와 curation은 mock이며 실제 갱신/발송을 실행하지 않는다.
- Turbo test env에 NEARBOOK_QUOTA_TEST_DATABASE_URL을 명시한다. localhost+정확한 test DB명 이외의 URL은 테스트가 거부한다. **GitHub 연결에 workflow 수정 scope가 없어 CI PostgreSQL service 추가를 포함한 최초 push가 거부됐다.** 새 권한/다른 도구로 workflow 쓰기를 시도하지 않고 해당 변경을 제거해 기존 CI를 유지한다. PostgreSQL9개는 로컬 격리 DB에서 통과한 증거로만 남기며 CI는 env 미설정으로9개를 skip한다. CI skip을 PostgreSQL 통과로 세지 않는다. workflow service 연동은 권한 확보 후 별도 작업이다.
- 로컬 최종826개(Node237+Vitest365+API Jest224), PostgreSQL9개 포함/skip없음. 실제 route HTTP 강화 후에도 전체 CI를 다시 확인한다.
- 기존 CI에서 기대되는 실행은817개(Node237+Vitest365+API Jest215)와 PostgreSQL9개 skip이다. 최종 실제 로그의 숫자를 확인하며 CI에서826개 전부 실행됐다고 주장하지 않는다.
- 초기 lint는 테스트 require/미사용 import로 실패해 수정했다. 초기 Turbo 전체 test에서는 env가 전달되지 않아 integration8개가 skip된 것을 발견했고, env 선언과 최종9개 포함 재실행으로 해소했다. 초기 skip 실행을 전체 통과 증거로 쓰지 않는다.
- HTTP 예외 보완 중 import가 class 선언 뒤에 놓여 CommonJS 초기화 실패를 전체 테스트가 잡았다. import를 파일 최상단으로 옮긴 뒤 최종 전체 검사/CI를 다시 실행한다. 실패본은 운영에 배포하지 않았다.
- API 프리뷰 서버는 없으므로 새 status endpoint 양성은 격리 SQL/실제 module HTTP로 먼저 검증하고 승인된 배포 후 운영 GET으로 구분해 확인한다. 차단된 웹 프리뷰 브라우저를 우회하지 않는다. 새 UI 변경은 없다.

설계 참고: [PostgreSQL advisory locks](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS), [READ COMMITTED](https://www.postgresql.org/docs/current/transaction-iso.html), [Nest scheduler 등록과 named jobs](https://docs.nestjs.com/techniques/task-scheduling). 실제 계정500건은 사용자의 확인이며 위 공개 문서에서 계정별 한도를 검증했다고 주장하지 않는다.

## 배포 gate

사용자가 검증 후 운영 API 반영을 승인했다. exact head/base와 최종 CI/배포 상태를 확인해 merge한다. API CD revision/build-pull digest·운영 quota500/관측값·작업 registry·스냅샷/오류·health·기존 검색/개인 인증/보유 계약을 읽기 전용으로 검증한다. quota를 채우거나 실제 오류/전체 갱신·발송을 강제로 일으키지 않는다. DB schema/env/발송설정 변경 및 P1-13 착수는 제외한다.
