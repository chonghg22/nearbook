# Product Analytics Runbook

이 문서는 홍보 실험 전후에 `nearbook.events`를 확인하는 최소 운영 절차다.

## 목적

우리동네책의 핵심 퍼널은 다음 순서로 본다.

```text
방문 -> 검색 -> 책 상세 -> 도서관 보유/대출 가능성 확인 -> 도서관 클릭 또는 위시리스트
```

주간 핵심 지표는 `도서관 확인 완료 세션 수`다. 현재 구현상 `library_status_view`가 이 지표의 기준 이벤트다.

## 확인 방법

1. Supabase Dashboard로 이동한다.
2. SQL Editor를 연다.
3. `docs/analytics-weekly.sql`의 쿼리를 순서대로 실행한다.
4. 결과를 주간 단위로 기록한다.

## 배포 직후 Smoke Check

다음 이벤트가 최근 10분 안에 들어오는지 확인한다.

```sql
select
  type,
  count(*) as events,
  max(created_at at time zone 'Asia/Seoul') as latest_seen_kst
from nearbook.events
where created_at >= now() - interval '10 minutes'
group by type
order by latest_seen_kst desc;
```

브라우저에서 직접 확인할 행동:

- 홈에서 검색 실행: `search_submit`, `search_result_view`
- 검색 결과에서 책 클릭: `book_result_click`
- 책 상세 진입: `book_detail_view`, `library_status_view`
- 위시리스트 추가: `wishlist_add`
- 구매/대여 옵션 클릭: `affiliate_click`

## 홍보 링크 규칙

모든 외부 홍보 링크에는 `source`를 붙인다.

예시:

```text
https://www.near-book.com/?source=community-bookclub
https://www.near-book.com/search?q=한강&source=community-parenting
https://www.near-book.com/book/9788936434120?source=seo-test
```

`source` 값은 analytics payload의 `trafficSource`로 저장된다.

권장 이름:

- `community-bookclub`
- `community-parenting`
- `community-local`
- `blog-reading-list`
- `seo-book-detail`
- `pwa`
- `scan`

## 주간 판단 기준

초기 기준값은 운영 데이터가 쌓이면 조정한다.

- 검색 실행률: 방문 세션 대비 30% 이상이면 유입 메시지가 맞는 편이다.
- 검색 -> 책 상세 전환율: 25% 이상이면 검색 결과 품질이 무난하다.
- 책 상세 -> 도서관 확인 전환율: 50% 이상이면 책 상세가 핵심 가치로 이어진다.
- 도서관 클릭 또는 위시리스트 추가: 둘 중 하나가 낮으면 CTA와 사용 흐름을 점검한다.
- zero-result query가 반복되면 검색 보강 또는 인기 도서 캐시를 우선 개선한다.

## 주의사항

- `anonymousId`는 브라우저 localStorage 기반이라 기기/브라우저가 바뀌면 다른 사용자로 잡힌다.
- `trafficSource`는 세션 단위로 유지되며, 사용자가 새 source 링크로 들어오면 갱신된다.
- `library_status_view`는 책 상세 진입 시 초기 도서관 상태 확인에서도 발생한다.
- `affiliate_click`은 클릭 수만 의미하며 실제 구매 전환은 제휴 플랫폼 리포트와 대조해야 한다.
