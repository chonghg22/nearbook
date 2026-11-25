# 정보나루 취득 예산과 공유 캐시

항목27 구현. 운영 미반영이며 main 병합·배포는 별도 승인 대상이다. 조사 표본의 17초 ISBN 순회와 도서관 부가 조회가 전체500을 소진하므로, 일반 초·분 요청 제한과 프로세스 single-flight에만 의존하지 않는다.

## 읽기와 취득

- 기본 설정에서 공개 `GET /books/:isbn`과 책 SSR·metadata·미들웨어는 DB 메타데이터만 읽는다. 만료 데이터도 읽을 수 있으며 이 경로는 새 정보나루 메타데이터를 취득하지 않는다. 새로운 ISBN을 계속 바꿔도 외부 메타데이터 예산은0이다. 운영자가 SSR 상한을 명시적으로 올리면 LOW 우선순위로 별도 ssr 예산과 전체 예산 안에서만 취득한다.
- 아직 가져오지 않은 책은 API409 `BOOK_NOT_ACQUIRED`, 공개 페이지503과 가져오기 안내를 반환한다. 빈 도서 페이지를200으로 내보내지 않는다. 기존 정상 캐시 도서는200과 기존 index/follow·canonical을 유지한다.
- `/book-request?isbn=...`는 noindex인 조작 화면이다. 화면을 열기만 해서는 취득하지 않는다. 버튼을 누르면 기존 로그인 세션으로 `POST /books/:isbn/acquire`를 호출한다. 계정별3회/분·10회/연속24시간 요청 제한을 DB에서 직렬화한다. 신뢰 헤더·User-Agent·사설IP만으로 허용하지 않는다. 인증은 기존 AuthGuard의 서명/세션 검증을 따른다.
- 명시 취득은 메타데이터만 우선 가져온다. 이후 공개 페이지의 부가 분석은 공유 갱신 예산으로 별도 제한한다. 정상 빈 공급자 응답은900초 저장하며 API404로 구별한다. 장애·quota는503으로 안내하고 부재로 저장하지 않는다.
- 운영 cron의 `getBookByIsbnAsCron`은 여전히 명시적으로 LOW 취득을 허용하며 아래 refresh 예산과 전체 예산을 적용한다. 공개 ISBN 검색은 기본 cache-only 메타데이터 조회이므로 미취득 ISBN의 우회 취득 경로가 되지 않는다.

## 공유 캐시 정책

`nearbook.provider_response_cache`는 여러 API 프로세스와 재시작 사이에 공유된다. key는 endpoint와 정렬된 실질 파라미터의 SHA-256이며 우선순위·timeout·로그인·공급자키는 데이터 key에 넣지 않는다. 인증키는 payload나 key에 저장하지 않는다.

| 공급자 endpoint | 정상 캐시 TTL | 사용처 |
|---|---|---|
| `/usageAnalysisList` | 24시간 | 책 부가 분석 |
| `/usageTrend` | 6시간 | 도서관 요일/시간 추이 각각 |
| `/loanItemSrch` | 6시간 | 도서관 인기/최근·기존 큐레이션 호출 |
| `/srchBooks` | 15분 | 명시 취득 동시 합치기·정상 빈 결과. 정상 메타데이터는 별도 book_cache의 기존365일 정책 유지 |

오류 응답·application error·잘못된 docs 형식은 성공 캐시로 저장하지 않는다. 정상 빈 배열은 성공 데이터이며 장애의 빈 배열과 구분한다. 만료된 성공 응답은 갱신 실패·quota·다른 프로세스 갱신 중에도 fallback한다. 성공 데이터가 없으면 일시 실패이며, 도서관 API는 이를503으로 응답해 프런트가 ‘자료 없음’과 구별한다. 분석의 실패 fallback에도 `availability: unavailable`을 포함한다.

API 응답의 `cacheInfo.fetchedAt`은 실제 성공 저장 UTC시각, `cacheInfo.stale`은 TTL 초과 여부다. 도서관 목록 항목·책 분석·추이 응답에 포함하며 UI는 한국 시각과 이전 데이터 안내를 표시한다. 정상 빈 도서관 목록의 취득 시각은 DB에 남지만 현재 배열 응답에는 별도 meta를 추가하지 않는다.

DB lease는40초이며 HTTP timeout 상한30초보다 길다. 같은 키는 한 프로세스만 취득한다. 기존 client의 in-flight map도 유지한다. 다른 프로세스는 stale이 있으면 즉시 반환하고, cold miss는 최대1초 동안10회 확인 후 아직 준비 중이면503으로 재시도를 안내한다. 최초 취득 자체가 실패하거나 quota가 막히면30초 재시도 억제를 DB에 기록한다. lease token으로 늦게 끝난 이전 소유자의 저장을 막는다. 취득 도중 프로세스가 죽으면 lease 만료 후 다시 시도하며 기존 예약은 환불하지 않는다.

성공 캐시는 TTL 만료 후에도 자동 삭제하지 않아 장애 시 기존 데이터를 보존한다. 운영자는 데이터 증가량을 관측해 별도 보관 정책을 결정해야 한다. `payload IS NULL`이고 lease가 없고 retry_after가 하루 이상 지난 실패 placeholder와 30일 지난 요청 제한 이력은 유지보수 시 삭제할 수 있다. 이번 변경에는 자동 삭제·운영 SQL 실행이 없다.

## 일일 예산

기존 전체 보호 LOW475/HIGH500을 유지한다. `QuotaService.acquire`의 동일 advisory transaction lock과 같은 INSERT에서 전체와 scope 조건을 함께 검사한다. 실패·timeout·미완료도 예약1건으로 남고 캐시 hit는 INSERT가 없다. 여러 프로세스·서로 다른 ISBN·서로 다른 endpoint도 동일 일일 예산을 공유한다. 경계는 KST자정이며 provider의 실제 reset/다른 앱의 동일키 사용량을 보장하지 않는다.

| 설정 | 시작값 | 범위 |
|---|---:|---|
| `JEONGBONARU_DAILY_LIMIT` | 기존500 | 기존 검증 상한500 유지 |
| `JEONGBONARU_REFRESH_DAILY_LIMIT` | 100 | 자동 도서관·분석 갱신과 cron·검색 보충·보유 조회 등 명시 취득 이외 client 호출 전체의 하루 예약 상한 |
| `JEONGBONARU_EXPLICIT_DAILY_LIMIT` | 50 | 로그인 사용자의 명시 메타데이터 취득 하루 예약 상한 |
| `JEONGBONARU_SSR_DAILY_LIMIT` | 0 | 공개 읽기·SSR·metadata·ISBN 검색의 새 메타데이터 취득 상한. 0 유지를 권고 |

새 scope 상한은0~500 정수만 허용하고0은 해당 취득을 중단한다. 환경 설정이 잘못되면 취득을 허용하지 않는다. 100·50·0은 최적 트래픽 추정이 아닌 보수적 시작값이며 모두 전체500 안에서만 쓴다. 기본으로는 하루 최대150 예약이며, 기존 예산보다 적게 활용한다. 이를 늘리려면 가용성과 비용을 보고 설정을 조정해야 한다. SSR 상한을 올리면 봇의 ISBN 순회도 그 상한까지 사용할 수 있으므로 기본0 유지를 권고한다. 이미 누적된 scope 없는 장부도 전체500에는 계속 포함한다. 상태 `/naru/status`와 `/operations/status`의 quota에 `budgets.refresh/explicit/ssr` 사용·상한을 추가한다.

refresh의 적용 범위가 도서관/분석보다 넓으므로 정기 큐레이션·보유 상태 갱신도100에 도달하면 멈출 수 있다. 저장된 큐레이션·메타데이터와 성공 shared cache는 계속 읽는다. scope 예산이 남아 있어도 전체 LOW/HIGH 한도가 우선한다.

## 공개 프록시와 우회 경로

`/naru/*` 테스트 프록시의 공급자 호출 handler는 guard에서404로 비활성화한다. `/naru/status`만 전체/범주 장부를 읽고 공급자를 호출하지 않는다. 운영용 비밀 기본값·공개 키·신뢰 헤더 우회는 추가하지 않았다. 저장소 앱은 `/naru/*` 호출에 의존하지 않으며 서비스와 client를 직접 사용한다. 이 경로를 쓰던 저장소 밖의 도구는 작동하지 않으므로 운영 전 의존성 확인이 필요하다.

책 `/with-libraries`는 메타데이터 읽기가 성공한 후에만 보유/제휴를 조회한다. 공개 `/analysis`도 저장된 메타데이터가 없는 ISBN의 취득을 시작하지 않는다. 검색의 ISBN 보충도 cache-only다. 키워드 정보나루 검색 보충·보유 API·cron 등 남은 정보나루 경로는 refresh100과 전체500으로 제한한다. 알라딘은 기존 별도 공급자이며 ISBN 검색은 알라딘 fallback을 하지 않는다. 새 취득 기능을 알라딘이나 `/naru/*` 우회로에 연결하지 않았다.

## 운영 반영 순서와 되돌리기

1. PR 체크·리뷰 완료 뒤 오너가 merge·운영 반영을 별도로 승인한다. 이 PR 자체로 배포하지 않았다.
2. 기존 DB 백업·backend 역할 권한을 확인한 뒤 **API 코드 배포 전에** `packages/db/src/migrations/0012_provider_acquisition.sql`을 적용한다. 기존 마이그레이션처럼 수동 SQL 파일이며 앱 startup에서 실행하지 않는다. 새 nullable scope 열과 두 테이블·인덱스·RLS를 추가한다. 직접 브라우저/anon 권한은 주지 않고 backend 역할만 사용한다.
3. 환경 설정(기본100/50)을 확인하고 API 다음 web을 반영한다. 구 API는 추가 열/테이블이 있어도 동작한다. 새 web이 구 API를 먼저 만나면 명시 조작이404일 수 있으므로 이 순서를 지킨다. 서버/워크플로 파일은 이 PR에서 수정하지 않는다.
4. `/naru/status` 범주 사용량과 캐시된 정상 책200, 미취득 책503·조작 링크, 로그인 POST, 프록시404를 제한 점검한다. 실제 공급자 사용을 일으키는 POST는 별도 운영 검증 예산 안에서만 수행한다.
5. 문제 발생 시 이전 web/API 이미지로 되돌린다. 추가 스키마는 호환되므로 즉시 삭제하지 않는다. 단, 이전 API로 되돌리면 옛 자동 취득과 공개 프록시가 다시 열릴 수 있다. 이 비용 위험을 알고 rollback 여부를 결정해야 한다. 장부·캐시를 초기화하거나500을 증액해 회복시키지 않는다.

이 변경만으로 Cloudflare301, 요청자 IP/UA 규명, Search Console 수정 검증·색인 정상화를 완료했다고 보지 않는다. 항목17·18·19의 미완료 상태는 유지한다.

## 격리 검증

- `NEARBOOK_QUOTA_TEST_DATABASE_URL`은 **localhost의 `nearbook_quota_test`**만 허용한다. 전용 빈 PostgreSQL DB에 대해 `pnpm --filter @nearbook/api exec jest --runInBand`를 실행하면 실제 SQL 예약 경쟁·일 경계·프로세스 간 lease/재시작·stale/오류 구분을 검증한다. 이 테스트는 해당 DB의 fixture 테이블을 초기화하므로 다른 DB URL을 허용하지 않는다. 라이브 공급자는 fake 함수로 대체한다.
- 위 환경 변수가 없으면 PostgreSQL 통합 suite는 명시적으로 skip한다. 기존 CI workflow는 변경하지 않았으므로 SQL 동시성 검증은 로컬 격리 DB 실행 결과와 CI의 일반 단위 테스트 결과를 구분해서 읽어야 한다.
- Web 단위 테스트는 `pnpm --filter @nearbook/web test`, 프로덕션 번들 브라우저 검증은 `pnpm --filter @nearbook/web test:e2e`다. E2E는 loopback fixture API만 사용하고 브라우저의 외부 트래픽을 차단한다. 미취득503 → 명시 조작 → 정상 책200과 기존 검색·보유·로그인 회귀를 포함한다.
- 일반 `pnpm build`는 기존 정적 홈 목록 생성 때문에 기본 API URL을 읽는다. 운영을 호출하지 않는 빌드 검증은 로컬 fixture를 시작하고 `INTERNAL_API_URL=http://127.0.0.1:4101`, `NEXT_PUBLIC_API_BASE_URL=/api`, `APP_ENV=test`를 설정해서 수행한다. 새 ISBN을 운영에 보내거나 한도를 강제로 바꾸는 검증은 사용하지 않는다.
