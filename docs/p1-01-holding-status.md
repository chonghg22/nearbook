# P1-01 보유·대출 상태 모델 정리

작성일: 2026-10-14
상태: 구현/로컬 회귀 검증 중. 운영 미변경.

## 근거와 범위

- 기준 main: `1961f0784902f0c3a47094a2534c9b4e51be3dcb`. 기존 dirty worktree와 P0-01~04를 보존한다.
- 서버는 bookExist 실패·잘못된 응답을 holdingCount0/loanAvailable0으로 바꾸고 제외한다. 화면은 Y/N을1권/0권 대출 가능으로 표시하고 소장 도서관 수를 대출 가능 도서관 수로 계측한다.
- [정보나루 API 안내](https://data4library.kr/apiUtilization)의 bookExist는 소장/대출 가능 여부이지 권수 조회가 아니다. [공식 개선 공지](https://data4library.kr/noticeV?cn=129)는 대출 상태의 시차를 명시한다. 실시간 재고나 실제 대출 사유를 추정하지 않는다.
- 사용자 승인: 수정·전체 CI·프리뷰 검증 후 운영 웹/API 반영. 컨테이너 교체 중 짧은 요청 실패 가능성 안내. 데이터 강제 갱신·다음 항목 착수 제외.

## 구현

- shared-types에 available/borrowed/not_held/unknown, hasBook/loanAvailable(nullable), checkedAt/lastAttemptAt/source/stale와 확인 범위 집계를 정의한다.
- Y/Y=available, Y/N=borrowed, N/(N 또는 생략)=not_held. Y/생략은 소장만 확인한 unknown. 잘못된/모순 응답과 timeout/429/한도/5xx는 미소장이 아닌 unknown이다.
- 내부 borrowed 상태의 UI는 '대출 불가'로 표시한다. N만으로 실제 대출 중인지 별치/열람용인지 확정할 수 없다.
- 근처 후보 최대30곳 중 소장 인덱스는 조회 우선순위에만 사용하고 최대10곳 bookExist를 확인한다. 인덱스에 없는 도서관을 미소장으로 추정하지 않는다. 인덱스 실패는 근처 후보로 대체하며 unknown 후보를 같은 요청에서 다시 조회하지 않는다.
- 성공 관측만5분 cache. 버전 키로 기존 시각 없는 raw cache와 분리. cache hit에서 checkedAt을 현재 시각으로 바꾸지 않는다. 중복 exist cache는 제거한다.
- `/books/:isbn/holdings`는 메타데이터/제휴 요청과 독립하며 ISBN/좌표/반경 입력을 검증한다. 기존 with-libraries 배열도 같은 상태를 사용한다. Y/N을 권수로 변환한 holdingCount는 제거한다.
- unknown/미소장 행을 숨기지 않고 상태별 카드로 표시한다. 주변 도서관 없음/진짜 미소장/조회 실패/미확인 후보를 구분하며 정상 부분 결과를 유지한다. 재시도·지역 변경 중 이전 결과는 로딩으로 숨기고 이전 요청을 취소한다.
- 서비스 조회 시각·정보나루 출처·실시간 재고가 아니라는 안내.5분이 지난 화면은 주기적으로 이전 조회 경고와 재확인 버튼을 표시한다. 보유/대출 가능 도서관 수를 각각 계측한다.
- 기존 PWA의 전체 API 5초 후 캐시 대체가10초 내 보유 조회와 충돌할 수 있어 새 holdings 경로만 service worker intercept에서 제외한다. API도 no-store 응답. 개인 캐시 전반 개선은 P1-02에 남긴다.

## 검증 계획

- API: 상태 매핑/모순/오류 원인, 정상 cache시각 유지/실패 후 복구/unknown 미캐시, 한도/부분실패/인덱스 장애/최대10회/주변없음, 메타데이터·제휴 분리 및 입력 검증.
- Node: 새 응답 계약/기존 응답 거부,4상태/범위 집계, 진짜미소장·미확인 구분, TTL 경과, HTTP404/429/5xx/네트워크/본문·요청timeout/라이프사이클 취소와 재시도.
- React SSR:4상태/권수 표현 없음/부분결과/확인범위/시각/오래된 자료/재시도.
- 전체 CI와 실제 프리뷰, 승인된 운영 배포 후 실제 응답·대표 책·지역 변경·모바일·health를 읽기 전용으로 확인한다. 실제 장애 유발/DB 갱신/강제 API 호출은 하지 않는다.

## 다음 범위

공식 홈페이지/길찾기 CTA 확장은 P1-05, 공통 client는 P1-03, 알림 채널/작업 운영은 P1-11/12에서 진행한다. 이번 작업에서 이 항목들을 완료 처리하지 않는다.
