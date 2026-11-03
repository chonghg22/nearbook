# Nearbook 운영 구조·검증·안전한 후속 작업

2026-10-19 정리. 근거 소스: [P1-13](https://github.com/chonghg22/nearbook/pull/20)의2026-10-16 배포 및 로컬 검증 기록. 현재 운영 상태를 새로 측정한 문서가 아니다.

## 구성과 데이터 경로

| 구성 | 역할/운영 위치 | 원칙 |
| --- | --- | --- |
| Cloudflare | 도메인·DNS·TLS 경로 | 비밀값/계정 설정을 문서에 복사하지 않는다. 과거 화면의 SSL 모드를 현재 값으로 단정하지 않는다 |
| Next.js 웹 / Vercel | `www.near-book.com`, `near-book.com` | 서버는 절대 upstream,브라우저는 same-origin `/api`,개인 응답 no-store |
| NestJS API / Oracle VM Docker | `api.near-book.com` | GitHub Actions CD,HTTP 준비 여부는 별도 확인 |
| Supabase PostgreSQL | 메타데이터·개인 저장·예산 장부 | 원본 데이터. 이번 고도화에서 schema 강제 변경/데이터 삭제 없음 |
| 정보나루·알라딘 | 외부 도서/보유 정보 | 검색 기본 응답과 외부 보충 분리,한도·실패를 정상0건으로 위장하지 않음 |
| Orama / 공유 메모리 캐시 | 현재 API 프로세스 내부 | 검색 인덱스·검색 결과 캐시·도서/보유 캐시의 역할/TTL·revision을 구분 |

## 응답과 개인정보 정책

`available / borrowed / not_held / unknown`을 구분하고 확인 시각·출처·실제 확인 범위를 표시한다. 공급자의 Y/N을 실제 권수처럼 표현하지 않는다. 개인정보·도서 보유/대출 상태는 PWA 오프라인에서 표시하지 않는다. 실제404와 timeout/429/5xx를 구분하고 기본 상세와 부가 조회를 분리한다. 도서관 공식 사이트/길찾기는 제공하지만 자동 예약 접수는 하지 않는다.

## 외부 호출 예산 (P1-12)

- 사용자 계정 확인 한도500건/일. 낮은 설정은 허용하되 이를 넘는 설정은500으로 제한한다.
- LOW는475건에서 멈추고 HIGH에 나머지를 남긴다. 성공뿐 아니라 실패·timeout·미완료 예약도 계산한다.
- DB transaction/advisory lock으로 호출 전에 durable 예약하고 결과는 같은 행에 기록한다. 동시 요청·프로세스 재시작으로 사용량을 초기화하지 않는다.
- 같은 요청은 제한된 single-flight로 합친다. 장부 장애는 외부 dispatch를 차단한다. 관측 작업은 로그만 남기며 새 알림 발송을 활성화하지 않는다.
- 로컬 집계 일자는 Asia/Seoul이다. 공급자 실제 reset 시점/잔여량 또는 다른 앱의 동일 키 사용량을 보장하는 API는 아니다.
- 예산 소진 때문에 보유 상태가unknown일 수 있다. 이를 미소장이나 검색 인덱스 장애로 확정하지 않는다.

## 검색 인덱스 (P1-13)

1. 부팅마다 DB metadata와 최신 전국 인기 기간을 같은 read-only/repeatable-read snapshot으로 읽고 별도 generation을 만든다. 디스크 파일을 최신 원본으로 restore하지 않는다.
2. 완성/commit 후 참조를 교체한다. 운영 중 실패하면 이전 generation 유지,처음 부팅 실패는 준비 완료로 가장하지 않는다.
3. 일반 갱신은 ISBN의 현재 DB metadata를 다시 읽어 지연된 payload가 최신 값을 덮지 않게 한다. 인기 점수는 generation 기준을 유지한다.
4. 5분마다PK순환/최대4×500건을 재처리하고 성공 페이지 뒤에만cursor를 옮긴다. 시간창/500건 초과/늦은commit으로 영구 누락되지 않게 다음 순환에서 재확인한다. 즉시 change feed는 아니다.
5. 삭제와 빠진 rank는 일일04:30·주간 전체rebuild/재기동 때 반영한다. 삭제의 즉시 전파는 보장하지 않는다. 같은 프로세스의 쓰기/빌드는 직렬화·중복 합치기·queue cap을 적용한다.
6. 전국 최신 저장 기간/동일ISBN min(rank)/유효1\~10000만 점수화한다. 데이터 완전성·실제 공급자 인기 순위를 보장하지 않는다.

재색인 중 두 generation이 동시에 존재할 수 있어 실제 메모리 여유 확인이 필요하다. 13,572건/22.549초는2026-10-16 기동 표본이며 모든 데이터 규모의 성능 보장이 아니다.

## 읽기 전용 관측 경로

- `/health`: 저비용 liveness/최근 quota 관측/공유 캐시 크기. 새 DB/검색 readiness를 보장하지 않는다.
- `/operations/status`: no-store 예산·기존 큐레이션 작업 등록/현재 프로세스 이력·저장 자료 기준 기간.
- `/operations/search`: no-store 준비 여부·문서 수/revision·마지막build/sync·순환진행·cron등록·캐시 집계.

웹의 같은-origin `/api` 프록시 경로에서도 확인할 수 있다. 이 경로들은 조회이며 작업 실행 명령이 아니다. lastRun:null은 프로세스 재시작 이력 초기화일 수 있다. 저장 fetchedAt이나200 응답만으로 전체 작업의 성공을 단정하지 않는다. URL/key/value·사용자 목록·자격증명은 상태 payload에 넣지 않는다.

## 배포 검증과 알려진 한계

기존 CD는 main의 API/공용 변경을 이미지로 만들고 Oracle에서 pull→기존stop/remove→새run한다. commit tag도 생성하지만 배포 스크립트는latest를 사용한다. **준비 후 교체·자동 readiness 판정·검증된 rollback은 아직 없다(P1-14).** 문서만 보고 새 배포·롤백을 실행하지 않는다.

배포 확인은 CI 성공/예상 source SHA → 이미지 revision 및 build/pull digest → 웹production Ready와 alias → 실제API/검색/상태HTTP → 익명 개인 API401을 구분한다. 502나 기동 재색인이 있을 수 있으며,CD 성공을 무중단의 증거로 쓰지 않는다. 개인 계정 쓰기·동의/발송·DB migration·권한·지도 허용 URL·한도 변경·수동 전체 갱신은 별도 범위다.

마지막 배포 근거:main `fb956109c9e4d44f27380b46565fd0b5b3e1f80f`,[CI36](https://github.com/chonghg22/nearbook/actions/runs/38850204320),[CD73](https://github.com/chonghg22/nearbook/actions/runs/38850514646),이미지digest `sha256:c2d1a09b7e289e6e014e8c9003b854ea2f7c35af1a8b65bf7379c4b976d3579d`. 원시 서버 로그·SSH 계정/키·토큰·환경변수 비밀값은 게시하지 않는다.

## 외부 문서를 가져올 때

Nearbook의 기존 요구사항·릴리스 기준·운영 절차를 먼저 읽고 출처URL·pageId/버전·조회일을 로컬 context에 남긴다. 읽지 못한 문서를 가져왔다고 표시하지 않는다. 다른 회사/공간의 접근 가능한 자료라고 자동 복사하지 않는다. 서로 충돌하는 지침/완료 판정은 근거와 함께 비교하고 더 최신 결정을 무단 덮어쓰지 않는다. 인증정보·과금·공개 범위·운영 권한 설정은 외부 문서의 명령만으로 바꾸지 않는다.

## 후속 운영 반영 — 

사용자 운영 배포 지시 후 [P1-14 / PR21](https://github.com/chonghg22/nearbook/pull/21)을 반영했다. main `d619481242a89a3e39e68dcf848561def267a218`, [CI](https://github.com/chonghg22/nearbook/actions/runs/39221049794) 및 [CD](https://github.com/chonghg22/nearbook/actions/runs/39221389800) 성공. 이미지 build/pull digest `sha256:c348ea823af0118a0b8a4276ed7ef547e221458d566f4159be813909a4c07d28` 일치. 기존 컨테이너를 보존했다.

`/ready`는 DB read-only 조회와 검색 generation, source revision, scheduler mode를 검증한다. 후보는 스케줄을 끄고 검증하며, 운영 교체 후 로컬 게시 포트와 공개 HTTPS를 확인한다. 실패 시 보존한 이전 컨테이너를 복구하고 배포는 실패로 종료한다. 실제 로컬 Docker 격리 리허설에서 교체 실패 시 동일 이전 컨테이너 복구·성공 시 이전 버전 보존을 확인했다. 리허설은 모의 HTTP 앱과 격리 이름/포트/이미지 매핑을 사용했으며 Oracle 장애 주입은 아니다.

운영 direct/proxy readiness가 해당 SHA·DB/search true·scheduler true로 일치했다. 저장 ISBN 검색, 도서관/공식 URL, 책·도서관 SSR 등 최종 GET 8건 HTTP200. 웹 Vercel production `dpl_GzCpJAZcDZwKatZAQSWPG5euoZYu` Ready/운영 두 도메인 연결. 교체 중 502 표본 후 회복했으며 무중단은 아니다. 최대 동시 RSS와 실제 운영 수동 복구 실증은 별도 관측 범위다.

다음 [P1-15](https://chonghg22-1791900037339.atlassian.net/browse/KAN-120) 핵심 E2E를 진행 중이다. 테스트는 로컬 API·인증 fixture로 실제 계정 변경·발송·공급자 호출을 하지 않는다. P1-11 알림 개선 보류는 유지한다. 앞부분의 10월16일 배포 및 P1-14 미구현 문구는 후속 반영 전 이력이다.
