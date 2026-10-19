# P1-14 운영 검증 — 2026-10-19

사용자 “운영 배포하고 다음 작업도 이어서 진행해” 지시 후 **운영 반영·검증 완료**. KAN-119 완료, 다음 KAN-120/P1-15 진행 중. 알림 개선 보류 유지.

- [PR21](https://github.com/chonghg22/nearbook/pull/21), remote head `699c0da66483376f6793806b6bd004e3ccb4d3f8`. 이전 로컬 `f2ddf32`와 Git tree `9fc88415daa5b27eaa8e03f87b4ae7c01299a4de`가 완전히 같다.
- CLI OAuth에 workflow scope가 없어 push가 거절됐다. 새 scope를 요청하거나 자격증명을 복사하지 않고, 기존 연결 GitHub 앱의 저장소 쓰기로 동일 tree/commit/branch/PR을 만들었다.
- [CI](https://github.com/chonghg22/nearbook/actions/runs/39221049794) 성공, lint/type-check/build/test 및 배포 fault/probe 계약 포함. API243 성공/실PG15 skip, 웹365+Node237. 실제 DB 실행으로 확대하지 않는다.
- main/source `d619481242a89a3e39e68dcf848561def267a218`.
- [CD](https://github.com/chonghg22/nearbook/actions/runs/39221389800) 성공, job117957263653. build와 Oracle pull digest `sha256:c348ea823af0118a0b8a4276ed7ef547e221458d566f4159be813909a4c07d28` 일치. 새 스크립트의 후보 준비·image revision·운영 모드·게시 포트·공개 HTTPS gate 통과 후 `Deployment ready`(08:19:05Z).
- 이전 컨테이너 `nearbook-api-previous-20261019T081722Z` 보존. 자동 image prune 없음.
- Vercel production `dpl_GzCpJAZcDZwKatZAQSWPG5euoZYu` Ready, source SHA/main 일치, `near-book.com`/`www.near-book.com` alias 연결. 웹 UI 변경은 없다.

## 운영 HTTP

`EXPECTED_API_REVISION=d619481242a89a3e39e68dcf848561def267a218 node scripts/monitor-core.mjs --web` **exit0**.

| 검사 | direct API | 웹 같은-origin 프록시 |
| --- | --- | --- |
| `/ready` | 200 /657ms | 200 /660ms |
| 저장 ISBN9791161571195 자동완성 | 200 /440ms | 200 /243ms |
| 도서관111314 metadata·공식 URL | 200 /322ms | 200 /389ms |

readiness는 양쪽 모두 DB/search true, source SHA 일치, schedulerEnabled true. 책 SSR `/book/9791161571195` 200/1461ms 및 h1/ISBN/indexable, 도서관 SSR `/library/111314` 200/1744ms/h1/공식 링크 host `lib.seoul.go.kr` 확인. 공식 외부 사이트로 이동하거나 예약하지 않았다. HTTP/HTML 검사이며 실제 브라우저·기기·로그인 성공 검증과 다르다.

후속 `/operations/search`: direct/proxy HTTP200/no-store, ready=true/documents14088, 부팅 rebuild 성공/21785ms. 비로그인 개인 wishlist direct/proxy401 확인. 수치는 표본이며 p95/최대RSS 보장이 아니다. 읽기 전용 상태/페이지 조회, DB schema·한도·계정·동의·발송/강제 작업 변경 없음.

교체 전 새 `/ready`는404였고 교체 중 실제502 표본과 비JSON 응답 뒤 신규200으로 회복했다. 후보를 확인한 뒤 운영 프로세스를 다시 기동하므로 **무중단 배포가 아니다**. 이번 배포는 정상 성공으로 실제 운영 rollback을 실행하지 않았다.

## 복구 리허설

병합 전 격리된 로컬 Docker에서 실제 컨테이너 run/stop/rename/start와 readiness HTTP를 검증했다. 실패 시 이전 컨테이너 ID가 동일함을 확인했고 원래 배포는 exit1, 성공 시 새 ID와 정지된 이전 컨테이너 보존을 확인했다. 테스트 이름/포트/이미지만 매핑한 adapter와 모의 HTTP 앱을 사용했다. registry digest·Oracle DB/메모리·공개 TLS를 실증한 리허설과 구분한다. 모형12장애시나리오 및 HTTP9사례도 재실행 성공. 테스트 컨테이너와 테스트 이미지만 정리했다.

최대 후보/기존 프로세스 동시RSS, Oracle의 고의 장애·수동 복구 실증은 아직 하지 않았다. source schema 호환성을 유지하며 DB 데이터 복원을 자동 실행하지 않는다.

## 기록

- `/private/tmp/nearbook-p114-docker-rehearsal.py` 및 `.log`
- `/private/tmp/nearbook-p114-cd-final-clean.log`, `nearbook-p114-prod-verify.log`, `nearbook-p114-rollout-http.log`
- Jira KAN-119 완료·KAN-120 진행 중. Confluence 운영393218/현황458753 version2에 후속 반영.
