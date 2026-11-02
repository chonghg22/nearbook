# 도서관 검색 안내 페이지 운영

2026-11-02: `/guides`, `/guides/national-library-search`, `/guides/national-digital-library` 추가.

## 콘텐츠와 기술 정책

- 기관 이름 자체보다 실제 이용 질문(책 검색, 판본 확인, 원문 이용 조건)을 해결한다. 기관 공식 서비스로 오인할 표현이나 원문·대출 제공 약속을 하지 않는다.
- 본문, 제목, 공식 출처, 목차, 검색 폼은 서버에서 렌더링한다. 검색 폼은 JavaScript 없이도 GET `/search?q=...`로 이동한다.
- 기존 메타데이터 정책으로 운영 환경에서만 색인과 JSON-LD를 허용한다. 각 안내는 자체 canonical과 Article/BreadcrumbList를 가진다. FAQ 리치 결과는 보장하지 않는다.
- 홈, 공통 푸터, FAQ, 두 안내의 상호 링크에서 발견할 수 있다. 사이트맵에는 안내 세 URL만 새로 추가하고 실제 내용이 바뀐 홈·FAQ의 수정일도 갱신한다.
- 공식 안내 변경 시 내용을 재확인하고 `GUIDES_UPDATED_AT`을 갱신한다. 변경 없이 날짜만 매일 바꾸지 않는다. 비슷한 지역명·기관명만 바꾼 안내를 대량 생성하지 않는다.

## 배포 후 확인

1. 세 URL의 HTTP 200, 한국어 본문, 자체 canonical, 운영 환경의 index/follow, JSON-LD를 확인한다.
2. `/sitemap.xml`에 세 URL이 있는지 확인한다. 검색 결과(`/search`)는 기존 noindex 정책을 유지한다.
3. Google Search Console과 네이버 서치어드바이저에서 `https://www.near-book.com`의 소유권을 확인하고 사이트맵을 제출한다. 이미 등록된 경우 재등록하지 않는다. 소유권 확인 코드와 토큰은 저장소에 넣지 않는다.
4. Google URL 검사로 두 안내의 수집 상태를 확인하고 필요하면 색인 생성을 요청한다. 제출과 색인/순위 상승은 별개다.

## 성과 확인 (배포 후 28일, 이후 동일 기간 비교)

- Search Console: 페이지를 `/guides/`로 필터링하고 국립중앙도서관·국가전자도서관 관련 검색어의 노출수, 클릭수, CTR, 평균 게재순위를 확인한다. 각 안내 URL별로도 나눠 본다. 검색량이나 순위를 미리 가정하지 않는다.
- 네이버 서치어드바이저: 수집·색인 현황 및 제공되는 노출/클릭 보고서를 확인한다.
- 기존 자체 분석: 검색 폼의 `source=guide-national-library-search` 또는 `source=guide-national-digital-library`가 기존 세션 분석의 `payload.trafficSource`로 전달된다. `search_request_completed`/`search_result_view` → `book_detail_view` → `library_click` 흐름을 확인한다. 검색 폼 자체는 별도 JavaScript 클릭 이벤트를 추가하지 않는다.
- `source`는 검색을 시작한 안내를 식별하는 값이다. 검색 엔진의 유입 키워드나 최초 유입 채널을 뜻하지 않는다. 세션 단위의 최선 노력 수집으로, 정확히 한 번의 전송이나 완전한 전환 집계를 보장하지 않는다.
- 색인이 안 되면 먼저 robots/noindex/canonical/HTTP 응답을 확인한다. 노출은 있지만 클릭이 적으면 실제 검색어에 맞춰 제목과 요약을 다듬고, 검색 이후 이탈이 높으면 결과 품질과 사용 흐름을 개선한다.

## 공식 근거

- https://www.nl.go.kr/NL/contents/N10100000000.do
- https://dlibrary.go.kr/
- https://dlibrary.go.kr/intro/help.do
- https://www.nl.go.kr/NL/contents/N10700000000.do
- https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- https://searchadvisor.naver.com/guide/content-basic

Search Console·서치어드바이저 등록/제출은 해당 계정의 접근이 있어야 수행할 수 있다. 이 문서 추가만으로 외부 등록이나 색인 요청이 이루어지지 않는다.
