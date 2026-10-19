# Product Analytics Runbook — P2-02

[요구사항 KAN-121](https://chonghg22-1791900037339.atlassian.net/browse/KAN-121). 새 이벤트는 `payload.schemaVersion=2`로 구분한다. 배포 전에는 운영 데이터가 있다는 뜻이 아니다. 기존 이벤트 행을 수정·재집계해서 v2로 가장하지 않는다.

## 지표 정의

주간 핵심 지표는 **보유 상태를 한 곳 이상 확인한 세션 수**다. `holdings_request_completed`의 `checkedCount > 0`인 complete/partial만 사용한다. 소장이 확인됐다는 뜻이나 실시간 재고 보장은 아니다. 과거 `library_status_view`만으로 조회 완료를 집계하던 SQL은 교체했다.

| 이벤트 | 발생 시점·의미 |
| --- | --- |
| visit | 공개 경로의 첫 이벤트, 같은 탭의 분석 세션당 한 번. 30분 비활동 뒤 다음 이벤트는 새 세션 |
| page_view | 공개 경로 pathname 변경. 검색어만 바뀌는 것은 별도 page_view로 세지 않음 |
| search_submit | 홈·헤더·모바일 헤더·검색 화면/인기 검색어의 명시적 제출. source 구분, 정규화 query·searchType·invalidIsbn |
| book_result_click | 실제 결과/자동완성 선택. results/suggestion surface와 순위. 결과 목록은 전체 페이지 기준 rank, 자동완성은 표시 목록 기준 rank |
| search_request_completed / failed | 실제 검색 요청 결과. ready/pending/enrichment_failed와 HTTP/timeout/network/invalid-response 등을 구분. pending은 정상 0건 아님 |
| search_result_view | 성공한 최종 결과 화면 노출. zeroResult는 이 이벤트에서만 결과 없음으로 사용. 같은 조건·총건수의 재렌더 중복 제외 |
| search_filter_change / search_page_change | 검색 유형·정렬/페이지 이동. 새 search_submit으로 세지 않음 |
| book_detail_view | 정상 책 상세의 클라이언트 마운트. StrictMode 중복 제외, 다른 ISBN이면 새 노출 |
| holdings_request_completed | 유효한 보유 응답 수신. complete/partial/unknown/no_candidates, 후보·조회·확인·소장·대출 가능·미소장·확인 불가·미조회 수 각각 제공 |
| holdings_request_failed | HTTP429/5xx·timeout·네트워크·잘못된 응답 등. 정상 0건으로 합치지 않음. 취소/화면 이탈 후 응답은 완료/실패로 기록하지 않음 |
| library_status_view | 해당 보유 응답의 상태 화면 노출. requestId로 조회 완료와 연결하되 완료 수에 더하지 않음 |
| library_click | 실제 공식 사이트/길찾기 클릭. action=library_site/directions, source=book_holdings/library_detail. 내부 상세 이동을 공식 사이트 클릭으로 세지 않음 |
| wishlist_add / affiliate_click | 기존 성공한 찜 추가/제휴 링크 클릭. 실제 대출·예약·구매 완료가 아님 |

`durationMs`는 브라우저 요청 시작부터 응답 계약 검사까지의 시간이다. 검색 API 자체 시간은 `serviceDurationMs`이며 결과 화면의 기존 durationMs와 혼합하지 않는다. SWR 재검증·추가 정보 polling·수동 재시도는 여러 요청이므로 요청 수가 사용자 행동/세션 수와 같지 않다.

보유 응답의 `staleCount`·`oldestCheckedAt`를 함께 본다. stale/캐시 응답도 알려진 상태 수에 포함될 수 있다. heldCount와 availableCount는 서로 다른 도서관 수이며 권수가 아니다. unknown에는 예산 소진 등이 포함될 수 있으나 원시 오류/응답을 수집해 원인을 추정하지 않는다. 좌표·지역명·도서관까지의 거리·인증 정보는 새 계측에 보내지 않는다. URL 메타데이터는 공개 source와 /search의 q·유형·정렬·페이지로 제한하고 개인/인증/구독·digest 경로는 공개 방문에서 제외한다.

## 집계와 해석

`docs/analytics-weekly.sql`의 6개 SELECT를 읽기 전용으로 실행한다. 기존 events 스키마만 사용하며 migration은 없다.

1. legacy/v2 수집 상태를 분리한다.
2. visit → 유효한 검색 제출 → 같은 query의 책 선택 → 같은 ISBN의 상세 → 같은 ISBN의 상태 확인 → 같은 ISBN의 다음 행동 순서로 세션을 집계한다. 공식/길찾기 클릭은 requestId까지 일치해야 한다. 같은 세션의 두 번째 검색/책/재시도도 전환할 수 있다.
3. 응답 결과/실패·시간·소장·대출 가능·오래된 정보의 관측 수를 별도로 본다.
4. 정상 결과 없음과 선택 순위/필터/정렬을 본다.
5. 공식 사이트 클릭과 길찾기를 나누고 도서관 상세의 독립 유입도 별도 집계한다.
6. 7일 관측이 끝난 브라우저 코호트의 **7일 내 다른 세션 방문**을 계산한다. D7의 정확한 `[7일,8일)` 방문은 8일 관측 완료 코호트에서 별도로 계산한다. 8일 이후 방문을 7일 내 방문에 포함하지 않는다.

모든 퍼널 단계는 기간 안에서 관측된 사건이므로 기간 경계·이탈·수집 실패로 과소 집계할 수 있다. 직접 책 상세 유입·자동완성 선택은 검색 제출 퍼널을 건너뛸 수 있어 SQL1/3/5와 함께 본다. 첫 방문의 trafficSource를 세션 유입으로 사용한다. 행동 중 새 source 링크로 바뀐 개별 이벤트의 값과 섞지 않는다.

SQL은 스키마의 timestamp without time zone인 created_at을 UTC 저장 기준으로 해석한다. KST 표시 시 UTC→Asia/Seoul로 변환한다. 배포 시 실제 DB의 저장 시간 기준을 읽기 전용으로 확인한다. 순서 판정은 서버 수신 시각과 5분 이내인 13자리 clientTimeMs만 보조 사용하고 그 밖에는 서버 시각으로 대체한다. 이 검사는 조작 방지나 신뢰할 수 있는 서버 전환 추적이 아니다.

anonymousId는 기존 localStorage 브라우저 ID다. 탭마다 sessionStorage 세션을 사용하므로 다른 탭은 다른 세션일 수 있다. 기기·브라우저 변경/저장소 삭제는 다른 코호트가 되고, 공용 기기는 한 브라우저로 보인다. 최초 v2 관측은 실제 신규 사용자 가입일이 아니다. 저장소 거부·네트워크·광고 차단·이탈로 유실될 수 있다. 전송은 best effort, 재전송 큐나 exactly-once 저장 보장은 없다. schemaVersion/eventId/clientTimeMs는 클라이언트가 보낸 값이며 공개 수집 API의 지표를 보안·정산 근거로 쓰지 않는다.

## 검증

- 웹 자동 회귀: 실제 컴포넌트 제출·순위·응답 실패/재시도·unknown/stale·공식 링크 및 StrictMode/취소·분석 세션 경계 검사.
- SQL: `scripts/test-analytics-sql.mjs`는 명시한 localhost의 `*_test` DB에서 임시 테이블만 만든다. `ANALYTICS_TEST_DATABASE_URL=postgresql://…/nearbook_analytics_test node scripts/test-analytics-sql.mjs`. 순서 역전·다른 ISBN·다음 책·재시도·네트워크 순서·legacy·잘못된 숫자·미성숙/기한 초과/정확한 7일 경계를 검사한다. 운영 DB에는 실행하지 않는다.
- 운영 스모크는 배포 후 DevTools의 /api/analytics/event 요청과 최근 v2 수집 행을 대조한다. 분석 응답202만으로 저장 성공을 단정하지 않는다. 테스트용 실제 계정 변경·발송이나 외부 홍보는 하지 않는다.

기존 `source` 홍보 링크 규칙은 유지한다. 예: `/?source=community-bookclub`. 분석 계측은 최근 본 책 저장 기능이나 P1-11 알림 개선을 활성화하지 않는다.
