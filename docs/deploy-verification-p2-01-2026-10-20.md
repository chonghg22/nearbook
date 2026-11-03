# P2-01 운영 반영 — 2026-10-20

사용자 반영 지시 후 [PR23](https://github.com/chonghg22/nearbook/pull/23) 병합. 웹 source `c48a91bbbd9a89f0027e8d680866bd00070f1a31`.

- Vercel production `dpl_5BGpMzDyCbKkd6DrDvVtUgqGwv6a` READY, 배포 metadata source 일치. www.near-book.com / near-book.com 양쪽을 inspect하여 동일 배포 연결 확인.
- 찜·내 도서관의 비활성 Pro CTA/무제한 홍보를 무료 한도(책10권·도서관1곳)와 항목 교체 안내로 변경. 최근 본 책 등 재방문 기능은 실험안만 문서화했다.
- [CI39233248557](https://github.com/chonghg22/nearbook/actions/runs/39233248557) 성공: 웹365·API243·Node237, 기존 실제 PG15개 생략. 별도 P1-15 PR22의 브라우저 E2E28개를 이 CI 실행 수에 포함하지 않는다.
- 웹 변경으로 API CD 없음. API source `d619481242a89a3e39e68dcf848561def267a218` 유지. DB·계정·요금/한도·발송 설정 변경 없음.
- EXPECTED_API_REVISION=d619481… monitor-core --web exit0: direct/proxy ready·저장 ISBN9791161571195 suggest·도서관111314 API, 책/도서관 SSR 총8개 HTTP200. canonical·공식 링크 lib.seoul.go.kr 계약 통과.
- 익명 /me/wishlist·/me/libraries는307 로그인 이동, /api/me/wishlists는401. 실제 로그인/개인 데이터 쓰기는 수행하지 않았다. 로그인 후 개인 화면 육안 검증 근거로 확대하지 않는다.
- KAN-116 완료. Confluence 현황458753 v4 반영·재조회. P1-15 PR22는 검토 중/미병합 유지. 다음 미착수는 P2-02.
