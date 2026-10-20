# P1-14 / KAN-119 — 준비 상태·배포 판정·복구

최신 상태: 사용자 운영 배포 지시 후 PR21/main `d619481` 운영 반영·검증 완료. [2026-10-19 최종 배포 검증](deploy-verification-p1-14-2026-10-19.md). 아래 로컬 미반영/미검증 문구는 배포 전 이력이다.

2026-10-19. **로컬 구현·검증 단계, 운영 미반영.** 브랜치 `fix/p1-14-readiness-rollback-20261019`, 기준 main `fb956109c9e4d44f27380b46565fd0b5b3e1f80f`. 기존 변경이 많은 `nearbook` worktree는 보존하고 `nearbook-p1-14`에서 작업했다.

## 확인한 근거

- [KAN-119](https://chonghg22-1791900037339.atlassian.net/browse/KAN-119): 다음 순서, liveness/readiness 분리·준비 확인·commit/digest 고정·복구 검증. 10월19일 MCP로 본문/전이를 조회한 뒤 `진행 중`으로 전이했다.
- [고도화 현황](https://chonghg22-1791900037339.atlassian.net/wiki/spaces/~5e9a693934f7b90c0fd20d8d/pages/458753), [운영 구조·검증](https://chonghg22-1791900037339.atlassian.net/wiki/spaces/~5e9a693934f7b90c0fd20d8d/pages/393218): 둘 다 version 1을 원격 조회했다. 이전 stop/remove/run 배포에서 502가 관측됐고 P1-13 재색인 표본은 22.549초였다. 과거 수치를 현재 성능 보장으로 사용하지 않는다.
- KAN-13 하위 이슈를 JQL로 확인했다. P1-11/KAN-115 알림 개선은 사용자 보류이며 이번 작업에서 재개하지 않는다. 기존 관리자 백로그와 공개 API 작업을 구분한다.

## 구현

- `/health`는 기존 저비용 liveness를 유지한다. `/ready`는 DB read-only transaction의 SELECT 1과 완성된 검색 generation을 확인하고 `200 ready` 또는 `503 not_ready`/no-store를 반환한다. 1.5초 SQL timeout·2초 응답 deadline·진행 중 DB check 공유로 pool 장애 시 대기 요청의 무제한 증가를 막는다. 비밀값/DB 오류 원문은 응답하지 않는다. 두 상태 경로는 일반 요청 throttle에서 제외했다.
- `/ready`에 40자리 source revision과 scheduler 모드를 포함한다. `API_SCHEDULER_ENABLED=false`인 후보는 cron/interval/timeout을 등록하지 않으며 부팅 DB rebuild는 수행한다. 기본 운영 모드는 기존 스케줄을 유지한다.
- CD는 build 출력 digest로 이미지를 고정하고 OCI source revision label을 확인한다. GitHub concurrency와 호스트 flock으로 배포를 직렬화한다. 동일 이미지에 포함한 배포 스크립트/검증기를 꺼내 사용한다.
- 기존 컨테이너가 정상일 때만 후보를 시작한다. 후보는 공개 포트를 열지 않으며 스케줄이 꺼진 상태로 준비를 확인한다. 후보를 제거한 뒤 기존 컨테이너를 stop/rename하여 보존하고, 운영 모드 새 컨테이너를 시작한다. 프로세스 내부 readiness·호스트 게시 포트·공개 HTTPS 경로의 revision/mode를 검사한다.
- 교체 실패 시 새 컨테이너를 제거하고 보존한 **동일 이전 컨테이너**를 rename/start하여 로컬·공개 경로를 확인한다. 복구 성공도 원래 배포는 실패로 종료한다. 복구 검증까지 실패하면 exit 2/`ROLLBACK FAILED`로 드러낸다. 이전 컨테이너/이미지는 자동 삭제하지 않는다.
- 최초 도입의 이전 버전에는 `/ready`가 없다. 그 버전만 `/health`와 `/operations/search.index.ready`로 확인한다. 이는 새 DB readiness 계약을 검증한 것과 다르다. 이후 새 계약이 있는 이전 버전은 해당 revision의 `/ready`로 복구를 확인한다.
- `scripts/monitor-core.mjs`는 실제 TLS/HTTP, direct+same-origin 상태, 저장 ISBN 자동완성, 저장 도서관과 공식 URL을 GET으로 점검한다. 기본 경로는 provider/검색로그/개인정보 쓰기를 사용하지 않는다. `--web`은 책·도서관 SSR/공식 링크까지 확인하지만 기존 부가 provider 조회가 일어날 수 있어 별도 명시 옵션이다. 외부 공식 사이트로 이동하거나 예약/발송하지 않는다. 주기 실행은 새로 설치하지 않았다.

## 검증

- frozen install, 전체 lint/type-check/build/test를 로컬 확인했다. API 243개 성공/기존 실제 PostgreSQL 15개는 환경 미지정으로 skip, 웹 Vitest 365개와 기존 Node 계약 237개 성공(변경 없는 작업은 Turbo 캐시 재사용). 새 readiness 6개와 실제 AppModule 배선 1개를 포함한다.
- 실제 AppModule을 모의 DB/repository·가짜 auth 설정으로 띄워 `/ready`·`/health` HTTP를 검증했다. 후보 모드 cron/interval/timeout 등록 0개, 실제 Orama bootstrap 완료를 확인했다. DB 연결/발송/공급자 자격증명은 사용하지 않았다.
- `python3 scripts/test-deploy-api.py`: 4개 테스트 그룹/12개 시나리오. 성공 후 이전 버전 보존, 후보 실패·이미지 mismatch·기존 후보·잠금 충돌의 교체 차단, run/준비/공개경로/게시포트/rename/stop 실패 복구, 복구 자체 실패를 검증했다. **Docker/호스트 명령의 상태 모델 테스트이며 실제 Oracle 장애 주입이나 Docker 컨테이너 복구 리허설은 아니다.**
- `node --test apps/api/scripts/check-readiness.test.cjs`: 3그룹/9응답 사례. 실제 로컬 HTTP 서버로 성공·revision/mode/의존성 mismatch·HTTP503·HTML 오류·legacy index 상태를 확인했다. bash 문법과 CI/CD YAML 파싱도 확인했다.
- 운영 변경 전 `node scripts/monitor-core.mjs --legacy` 1회 성공: direct/proxy 각 health·index·ISBN9791161571195 자동완성·도서관111314가 HTTP200, 공식 링크 host `lib.seoul.go.kr`. 표본 응답172~953ms이며 성능 보장이 아니다. `/ready` 신규 코드나 `--web` HTML은 운영 미검증이다. 처음 쓴 한 글자 `책`은 자동완성 최소2자 계약으로 빈 응답이었고, 저장 ISBN으로 점검기를 수정했다.
- CI/CD 연결 코드는 준비했지만 원격 push/CI/PR/merge/운영 배포는 실행하지 않았다. 로컬 로그: `/private/tmp/nearbook-p114-{final-lint,final-types,final-build,final-tests,preflight-tests,monitor-baseline}.log`.

## 배포 및 복구 절차

1. 리뷰/CI 후 승인된 source SHA와 build digest를 확보한다. Oracle의 Docker·curl·flock·env 파일과 후보 추가 메모리 여유를 확인한다. env 비밀값을 출력하지 않는다. 이미지가 해당 SHA를 label로 포함해야 한다.
2. CD에서 `bash scripts/deploy-api.sh IMAGE@sha256:DIGEST FULL_SOURCE_SHA SERVER_ENV_FILE`을 실행한다. `latest`를 실행하지 않는다. 후보/활성/공개 readiness 중 하나라도 실패하면 CD를 성공 처리하지 않는다.
3. 성공 출력의 이전 컨테이너 이름과 image ID, 새 digest/source SHA, CD 결과를 배포 기록에 남긴다. `EXPECTED_API_REVISION=FULL_SOURCE_SHA node scripts/monitor-core.mjs`로 direct/proxy 일치를 확인한다. 허용된 경우에만 `--web`으로 실제 SSR을 추가 확인한다.
4. 사후 회귀로 수동 복구할 때는 동일 호스트 배포 잠금 아래에서 기록된 이전 컨테이너 이름/image ID를 확인하고 현재 컨테이너를 보존·정지한 뒤 이전 컨테이너를 `nearbook-api`로 rename/start한다. 현재 버전이 정상화될 때까지 삭제하지 않는다. 검증기는 `docker exec -i nearbook-api node - PREVIOUS_SHA true < apps/api/scripts/check-readiness.cjs`와 공개 origin 인자로 확인한다. 최초 legacy는 SHA 대신 `legacy`. 자동 복구 경로의 모델 검증과 실제 운영 수동 복구 실증을 구분한다.
5. 배포 실패/인터럽트 뒤 남은 candidate·이전 컨테이너는 먼저 inspect한다. 스크립트는 기존 candidate를 임의 제거하지 않는다. 전원 단절/SIGKILL은 trap으로 복구할 수 없으므로 실제 활성 컨테이너/포트/이전 image ID를 확인해 복구한다.

## 남은 운영 검증과 한계

후보와 이전 프로세스의 동시 메모리 여유, Oracle에서 실제 실패/복구 리허설, 새 `/ready`와 공개/프록시 revision 일치, 정상 사용자 화면, 승인된 운영 반영은 남아 있다. 후보 확인 후 운영 모드로 다시 기동하므로 재색인 중 짧은 중단은 남는다. **무중단/blue-green 전환 구현이 아니다.** DB schema rollback이나 데이터 복원을 자동 수행하지 않는다. 새 revision은 기존 DB와의 호환성을 유지해야 한다. 이 항목은 진행 중으로 두며 운영 검증 전 완료 처리하지 않는다.
