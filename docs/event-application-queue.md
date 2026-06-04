# 이벤트 참가 신청 폭주 대응 설계

## 문제 정의

문화행사 신청은 기능 자체는 단순하지만, 오픈 직후 많은 사용자가 동시에 신청하면 정원 체크와 신청 저장이 같은 API 요청 안에서 경쟁한다. 이때 동시 요청이 DB row를 과도하게 잠그거나, 중복 클릭이 여러 신청으로 기록되거나, API 서버가 확정 처리를 기다리며 응답 지연을 만들 수 있다.

이 프로젝트의 데모는 신청 접수와 확정 처리를 분리한다. API는 요청을 빠르게 큐에 넣고 `202 Accepted`를 반환하며, worker가 제한된 배치로 큐를 처리한다.

## 구현 방식

- 신청 API 앞단에는 Admission Gate를 둔다. 기본은 `memory` 모드이고, 운영에서는 `redis` 모드로 바꿀 수 있다.
- Admission Gate는 프로그램별 초당 진입량을 제한하고, 짧게 기다린 뒤 토큰을 얻지 못하면 `429 Too Many Requests`를 반환한다.
- `library_event_programs`는 행사와 정원, 현재 확정 인원 수를 가진다.
- `event_application_requests`는 신청 요청 큐다. `queued`, `confirmed`, `waitlisted`, `cancelled`, `rejected` 상태를 가진다.
- `(program_id, user_id)` 유니크 인덱스로 같은 사용자의 중복 신청을 막는다.
- `(program_id, idempotency_key)` 유니크 인덱스로 같은 클라이언트 재시도 요청을 멱등하게 처리한다.
- worker는 `FOR UPDATE SKIP LOCKED`로 처리할 신청 row를 잠근다. 여러 API 인스턴스나 worker가 동시에 실행되어도 같은 신청을 중복 처리하지 않는다.
- 정원 확정은 행사 row를 트랜잭션 안에서 잠근 뒤 `confirmed_count < capacity`일 때만 증가시킨다.

## 트래픽 급증 시 동작

1. 사용자가 신청 버튼을 누른다.
2. API는 신청 기간과 중복 신청을 확인한다.
3. 새 신청이면 Admission Gate에서 짧게 순서를 기다린다.
4. 토큰을 얻은 요청만 큐 row를 만든다. 토큰을 얻지 못하면 `429`를 반환한다.
5. API는 확정을 기다리지 않고 접수 상태를 반환한다.
6. worker가 일정 주기로 큐를 작은 배치만큼 처리한다.
7. 정원 안쪽 신청은 `confirmed`, 초과 신청은 `waitlisted`가 된다.

이 구조는 순간 요청량이 증가해도 확정 처리의 DB 부하를 worker 배치 크기로 제한한다. 사용자는 즉시 접수 피드백을 받고, 확정 상태는 나중에 갱신된다.

## Redis / 비Redis 운영 모드

`EVENT_ADMISSION_MODE=memory`는 로컬 데모와 단일 서버용이다. 같은 프로세스 안에서는 초당 진입량을 제한하지만, API 서버가 여러 대이면 각 서버가 따로 카운트하므로 전체 요청량 제어는 정확하지 않다.

`EVENT_ADMISSION_MODE=redis`는 운영 권장 모드다. Redis `INCR`와 `EXPIRE`로 프로그램별 fixed-window token bucket을 만든다. 여러 API 서버가 같은 Redis 키를 공유하므로 다중 서버에서도 진입량을 제한할 수 있다.

`EVENT_ADMISSION_MODE=off`는 기능을 끄는 모드다. 장애 대응이나 비교 테스트 때 사용한다.

핵심은 Admission Gate가 DB 종류와 독립적이라는 점이다. 회사가 MySQL이나 MSSQL을 사용하더라도 신청 로직 중간에 `waitForTurn(programId, userId)` 같은 메서드를 추가해 DB 쓰기 전에 유입량을 줄일 수 있다. 이후 정원 확정은 각 DB의 트랜잭션과 락 문법에 맞춰 구현하면 된다.

## 확장안

현재 구현은 Postgres 큐를 유지하면서 앞단 진입량 제어에 Redis를 선택적으로 사용할 수 있다. 신청량이 더 커지면 BullMQ 같은 외부 큐를 도입해 큐 저장과 worker 스케일링을 분리할 수 있다. 다만 정원 확정의 최종 일관성은 여전히 DB 트랜잭션과 유니크 인덱스로 보호해야 한다.

## 수동 검증 시나리오

- 로그인 후 `/events`에서 문화행사를 열고 신청한다.
- 신청 버튼을 여러 번 눌러도 같은 신청 상태가 반환되는지 확인한다.
- 정원보다 많은 계정으로 신청했을 때 초과분이 `waitlisted`가 되는지 확인한다.
- `/me/events`에서 내 신청 상태가 표시되는지 확인한다.
- 확정된 신청을 취소하면 행사 확정 인원 수가 감소하는지 확인한다.
