# P2-02 운영 반영 — 2026-10-20

사용자 운영 반영 지시 후 [PR24](https://github.com/chonghg22/nearbook/pull/24) 병합. 웹 source `defc8a449964e3a32bb7b9161d41fd30f49e4a1c`.

- Vercel production `dpl_HFZk4cjVhrXNj1f7YAqtQZfZcdoQ` READY. 배포 metadata source와 www.near-book.com/near-book.com 양쪽 alias의 배포 ID 일치.
- API CD 없음, API source `d619481242a89a3e39e68dcf848561def267a218` 유지. 웹 계측과 분석 문서/CI 변경이다.
- [CI39342645093](https://github.com/chonghg22/nearbook/actions/runs/39342645093)·preview 성공: 웹388·API243·Node237 및 실제 격리PG의 SQL6개/fixture. 기존 API 실제PG15개 생략과 구분.
- 운영 monitor-core --web exit0: direct/proxy ready·저장 ISBN9791161571195 suggest·도서관111314 API와 책/도서관 SSR 총8개 HTTP200. canonical·공식 링크 lib.seoul.go.kr 계약 통과. 익명 /api/me/wishlists401.
- 실제 익명 Chromium: source `codex-p202-deploy-20261020`, visit/page_view/search_submit/search_request_completed/search_result_view/book_result_click/book_detail_view/holdings_request_completed/library_status_view/library_click 등 12건 모두 schemaVersion2·202/ok:true. 공식 사이트 클릭과 보유 응답 requestId 일치, pageerror0.
- 운영 보유 표본은 outcome unknown, checked0/held0/available0/stale0. 화면이 확인 불가로 표시됐으며 정상 미소장/상태 확인 완료로 확대하지 않는다. 정상 양성/partial·실패·재시도는 CI fixture 검증 근거다.
- 스모크에서 외부 위젯·광고·이미지·공식 목적지 탭은 차단했다. 공식 링크 클릭 의도를 확인한 것이며 실제 외부 도착/대출 재고/로그인 쓰기 검증은 아니다. 초기 hydration 전 입력으로 중단된 시도에서 visit/page_view2건도 생성됐다. hydration 대기 후 재실행 성공했다. 분석 시 이 source의 테스트 세션을 구분한다.
- 저장 API의 성공 응답을 확인했으나 DB 접속 설정 부재로 실제 events 행 재조회·운영 DB TimeZone은 미확인. 수동 집계 SQL은 운영 실행하지 않았고 사용 전 UTC 저장 전제 확인이 필요하다.
- KAN-121 완료, Confluence458753 v6 갱신·재조회. P1-15 PR22 미병합 유지. 다음 미착수 P2-03. 계정·요금/한도·발송·강제 갱신 변경 없음.
