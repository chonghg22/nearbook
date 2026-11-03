# P0-04 운영 배포 검증 — 2026-10-13

## 배포와 승인

- 사용자 승인: 전체 CI·프리뷰 검증 후 운영 웹/API 반영. 기존 컨테이너 교체 중 짧은 요청 실패 가능성 안내. 실제 수집/DB 갱신·마이그레이션 제외.
- [PR #7](https://github.com/chonghg22/nearbook/pull/7), head `f1b71dddac84b5d073580e6245ed9ad05a78a554`, merge `1961f0784902f0c3a47094a2534c9b4e51be3dcb`.
- [CI #15](https://github.com/chonghg22/nearbook/actions/runs/38364026580) 성공: lint/type-check/build, Node143·Web114·API16 = 273개. 실제 Drizzle0.33의 기존 alias 누락 오류 재현·수정 query 생성 통과.
- [최종 프리뷰](https://nearbook-r35d0k6pe-chonghg22s-projects.vercel.app/) source f1b71dd Ready. 앞선19196d6 프리뷰의 runtime 검증과 동일하며 마지막 커밋은 테스트 host 독립성 보완만 포함한다.
- [Vercel 운영 배포](https://vercel.com/chonghg22s-projects/nearbook-web/ESjAd9JnKpMqmeBhz8feTM18Z7Xp): Production Ready, source1961f07, www.near-book.com 연결 확인.
- [API CD](https://github.com/chonghg22/nearbook/actions/runs/38366149303), job115191650473 성공. image revision1961f07, 빌드와 서버 pull digest 모두 `sha256:274c3e56222600f2e528ffd35673a47fe93ba8a56a7b2acae76472ecdaac2e81`.

## 읽기 전용 운영 확인

| 대상 | 결과 |
| --- | --- |
| featured 신착 API | 기존500에서 data배열12곳으로 복구. periodKey/bookCount/fetchedAt 포함 |
| `/new-books` 오류 → 재시도 | 웹 먼저 배포/API 교체 전 기존500을 오류로 표시. 재시도 클릭 후 도서관12곳과 대치도서관10권 표시 |
| 도서관 변경 | 즐거운도서관 선택 → `?libraryId=111056`, 제목·10개 카드·수집 시점 변경. canonical은 query 없는 운영 `/new-books` |
| `/popular` | 20개 카드, canonical유지. 저장기간2026-05-07 / 마지막수집2026.5.7 22:29 KST / 이전자료경고 |
| `/category`, `/category/novel` | 각40개 카드, 분야링크15개 유지. 저장기간2026-07 / 마지막수집2026.7.7 03:35 KST / 이전자료경고. canonical유지 |
| 모바일390×844 | 실제viewport390, bodyclient/scroll384/384, 도서관 선택과2열 도서카드 표시. 검증 탭errorlog없음. viewport복구 |
| `/api/health` | 2026-10-13T08:03:40.931Z status:ok |

## 증거

- [운영 도서관 선택](../../.tools/nearbook-evidence/p0-04-production-new-books.jpg)
- [운영 신착도서 카드와 수집 시점](../../.tools/nearbook-evidence/p0-04-production-new-books-cards.jpg)
- [운영390px 도서카드](../../.tools/nearbook-evidence/p0-04-production-mobile.jpg)
- [프리뷰 오류/재시도](../../.tools/nearbook-evidence/p0-04-preview-new-books-error.jpg)
- [프리뷰 이전 저장 자료](../../.tools/nearbook-evidence/p0-04-preview-category-stale.jpg)

## 남은 범위

조회 기능은 복구했지만 저장된 자료 자체는 최신이 아니다. 선택한 즐거운도서관은2026-07, 대치는2026-05이며 일부 featured도서관은2025-12 기간을 가진다. 강제 수집·cron 변경은 실행하지 않았다. job 성공/실패 추적과 갱신 운영은 P1-12에서 다룬다.

기존 dirty worktree와 앞선 P0 변경을 보존했다. 이 최종 검증 기록은 로컬 문서/PR 설명에 남기며 문서만을 위한 추가 운영 배포는 하지 않는다.
