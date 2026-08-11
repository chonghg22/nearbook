# 검색 유입 중심 SEO 개선 (seo-growth)

## 목표

우리동네책(`https://www.near-book.com`)을 검색 유입 중심으로 개선한다. SEO를 meta tag 작업으로 좁히지 않고 색인 정책, 콘텐츠 품질, canonical, sitemap, JSON-LD, internal linking, 배포 환경까지 하나의 정책으로 다룬다.

## 배경 (실측 결과)

계획 작성 시점(2026-08-10)에 운영 배포와 운영 API를 직접 조회해 확인한 사실이다.

| 관측 | 값 |
|---|---|
| `https://www.near-book.com/sitemap.xml` URL 수 | **44개** (책 0, 도서관 20, 카테고리 15, 정적 9) |
| `GET /books/popular?limit=5000` | `{"data":[]}` — `popular_books` 테이블이 비어 있음 |
| `GET /libraries` 기본 응답 | 20건 (`ListQueryDto`: `limit` 기본 20, `@Max(100)`) |
| 실제 도서관 총 수 | 약 **1,588건** (`limit=100` 기준 page 16까지, 15×100+88) |
| 보충 소스 도서 수 | **608권** (by-category 15종×40 + loan-item 20 + hot-trend 5, 중복 제거 후) — 전부 ISBN-13 체크섬 유효 |
| `/popular` `/rising` `/keywords` `/new-books` `/libraries` `/explore` `/search` `/library/[id]` canonical | 전부 `https://www.near-book.com` (루트) |
| `/category/novel` title | `소설 인기 대출도서 \| 우리동네책 \| 우리동네책` |

즉 현재 문제는 "meta tag가 부족하다"가 아니라 **색인 가능한 페이지가 사실상 홈과 카테고리 15개뿐**이라는 것이다. 책·도서관이라는 실제 자산 약 2,200 URL이 canonical과 sitemap 양쪽에서 동시에 차단되어 있다.

### 확인한 12개 문제

| # | 문제 | 결과 | 단계 |
|---|---|---|---|
| 1 | 루트 layout canonical `/`가 하위 페이지에 상속 | 사실. 위 표 참조 | P0 |
| 2 | title template로 `\| 우리동네책` 중복 | 사실. 9개 이상 라우트 | P0 |
| 3 | noindex인 `/search`가 sitemap에 포함 | 사실 (`sitemap.ts`) | P0 |
| 4 | sitemap 누락 indexable route | 사실. `/rising` `/keywords` `/qna` `/notices` `/notices/[id]` `/feedback` | P0 |
| 5 | 5만권+도서관 URL의 단일 sitemap 한도 초과 | **사실 아님.** 실제 44 URL. 정반대로 URL이 부족 | P0 |
| 6 | sitemap API timeout 시 URL 대량 소실 | 사실. `catch → []` + `cache: 'no-store'` | P0 |
| 7 | lastModified를 무조건 현재 시각 | 사실 | P1 |
| 8 | preview/dev 색인 가능성 | 사실. `VERCEL_ENV` 미고려 | P0 |
| 9 | `/library/[id]` canonical·OG·JSON-LD 부재 | 사실. 4중 결함 | P0 |
| 10 | JSON-LD script 안전 직렬화 부재 | 사실. 홈·책·카테고리 3곳 | P0 |
| 11 | 목록 화면이 DB/cron/timeout 구현을 설명 | 사실. `/popular` `/rising` `/new-books` `/explore` | P1 |
| 12 | metadata·화면·JSON-LD 문구 불일치 | 사실. `/qna`, `/category/[slug]`의 `TOP 0` | P1 |

### 추가로 발견한 문제

- 책 상세 → 도서관 internal link 부재. `LibraryCard`에 `/library/{id}` anchor가 전혀 없다.
- `/libraries`는 h1 없는 클라이언트 전용 지도. SSR HTML에 도서관 anchor가 없다.
- 루트 layout에 `openGraph`/`twitter`/`siteName`/`locale` 기본값이 없고, OG 이미지 asset도 없다.
- Google/Naver verification 미설정.
- `/books/categories`는 1자리 KDC(`"8"`,`"3"`)를 반환하는데 `category-config.ts`는 2자리(`"81"`,`"32"`)를 쓴다. `count > 0` 필터에서 대부분 탈락해 카테고리 간 internal link가 끊긴다.
- `@nearbook/web`에 test runner가 없다.

---

## 색인 정책 (indexable / noindex route 표)

| Route | 현재 색인 상태 | 변경 후 | sitemap | 검색 의도 / target keyword |
|---|---|---|---|---|
| `/` | index, canonical `/` | 유지 | 포함 | "도서관 책 검색", "동네 도서관 책" |
| `/book/[isbn]` | index, canonical 정상 | 유지 + Breadcrumb | 포함 | "{책제목} 도서관", "{책제목} 대출", "{책제목} 빌리기" |
| `/library/[id]` | **canonical=홈 → 사실상 비색인** | index + self canonical | 포함 | "{도서관명}", "{도서관명} 신착도서", "{도서관명} 인기도서" |
| `/category` | canonical=홈 | index + self canonical | 포함 | "도서관 분야별 인기 도서" |
| `/category/[slug]` | index, title 중복 | 유지 + title 정리 | 포함 | "{분야} 인기 도서", "{분야} 도서관 대출 순위" |
| `/popular` | canonical=홈 | index + self canonical | 포함 | "도서관 인기 대출 도서", "많이 빌리는 책" |
| `/rising` | canonical=홈, sitemap 누락 | index + self canonical | 포함 | "요즘 뜨는 책", "대출 급상승 도서" |
| `/new-books` | canonical=홈 | index, canonical은 쿼리 제외한 `/new-books` 고정 | 포함 | "도서관 신착도서", "새로 들어온 책" |
| `/keywords` | canonical=홈, sitemap 누락 | index + self canonical | 포함 | "이달의 도서 키워드", "요즘 많이 찾는 책 키워드" |
| `/libraries` | index, thin (h1·anchor 없음) | **SSR 콘텐츠 보강과 동시에** index + self canonical | 보강 완료 시 포함 | "우리 동네 도서관", "지역별 공공도서관" |
| `/explore` | canonical=홈 | index + self canonical | 포함 | 내부 허브 |
| `/qna` | index | 유지 + FAQPage | 포함 | "우리동네책 이용 방법" |
| `/notices` `/notices/[id]` | index, sitemap 누락 | 유지 | 포함 | 브랜드·신뢰 |
| `/terms` `/privacy` | index | 유지 | 포함 | 브랜드·신뢰 |
| `/feedback` | index, sitemap 누락 | 유지 | 포함 | 브랜드·신뢰 |
| `/search` | noindex + **sitemap 포함(모순)** | noindex, follow + **sitemap 제외** | 제외 | — (색인 자산은 카테고리·지역) |
| `/scan` | index | noindex, follow (카메라 기능 화면) | 제외 | — |
| `/events` `/events/[id]` | index | noindex, follow (신청 데모, 개인화·마감 콘텐츠) | 제외 | — |
| `/me/*` | robots.txt disallow만 | noindex, nofollow + disallow | 제외 | — |
| `/login` `/auth/*` `/auth-api/*` | disallow | noindex, nofollow + disallow | 제외 | — |
| `/offline` | noindex | 유지 | 제외 | — |
| `/unsubscribe` `/digest/downgrade` | index (토큰 URL) | noindex, nofollow | 제외 | — |
| `/api/*` | disallow | 유지 | 제외 | — |

원칙: **sitemap에 들어가는 URL 집합과 indexable 집합은 항상 같다.** 한쪽만 바꾸는 변경은 금지한다.

---

## canonical 정책

1. 루트 `layout.tsx`에서 `alternates.canonical`을 제거한다. 루트에 두면 metadata를 선언하지 않은 모든 하위 페이지가 `/`를 상속한다.
2. 홈 canonical은 `app/page.tsx`에서 `/`로 명시한다.
3. 모든 indexable 페이지는 self canonical을 **절대 URL**로 명시한다.
4. canonical은 `toAbsoluteSiteUrl(path)` 하나만 사용한다. 쿼리스트링과 해시는 항상 제거한다.
5. 쿼리로 화면이 바뀌는 페이지(`/new-books?libraryId=`)의 canonical은 쿼리 없는 기본 경로로 고정한다.
6. metadata canonical과 JSON-LD의 `url`/`@id`는 **같은 헬퍼**에서 생성한다. 테스트로 일치를 강제한다.
7. 기존 공개 URL은 변경하지 않는다. 이번 작업에서 새로 만드는 공개 URL은 없다.

## title / description 규칙

- 루트 template `%s | 우리동네책`는 유지한다. **각 페이지 title에서는 브랜드 suffix를 쓰지 않는다.**
- 홈만 `title.absolute`로 `우리동네책 | 한국 공공도서관 통합 책 검색`을 유지한다(기존 검색 결과 title 보존).
- 페이지 title은 핵심 키워드를 앞쪽에 둔다. 예: `소설 인기 대출도서`, `{도서관명} 인기도서·신착도서`.
- description은 60~155자, 행동 동사("확인하세요", "빌려보세요")를 포함하고 페이지마다 고유해야 한다.
- 화면에 없는 수치·주장(평점, 재고, 예약 가능)을 description에 쓰지 않는다.
- 데이터 건수를 title/description에 넣지 않는다. 일시적으로 0건이 되면 `TOP 0` 같은 문구가 색인된다.

## Open Graph / Twitter 규칙

- 루트 layout에 공통 기본값을 둔다: `openGraph.type=website`, `siteName=우리동네책`, `locale=ko_KR`, `url`, `twitter.card=summary`.
- **존재하지 않는 OG asset 경로를 만들지 않는다.** `public/`에 OG 이미지가 없으므로 이번 작업에서 `images`는 선언하지 않는다. OG 이미지 제작·`opengraph-image` 생성은 P2.
- 책 상세는 표지 URL이 있을 때만 `og:image`를 넣고, 이때만 `twitter.card=summary_large_image`로 올린다.
- 도서관 상세는 이미지가 없으므로 `card=summary`를 유지한다.
- verification 값은 hardcode하지 않고 `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` / `NEXT_PUBLIC_NAVER_SITE_VERIFICATION`에서 읽는다. 값이 없으면 태그 자체를 출력하지 않는다. 운영 배포가 아니면 출력하지 않는다.

## JSON-LD 타입 매핑

| 화면 | 타입 |
|---|---|
| `/` | `Organization` + `WebSite`(`SearchAction` 포함) — 하나의 `@graph` |
| `/book/[isbn]` | `Book` + `BreadcrumbList` |
| `/library/[id]` | `Library` + `BreadcrumbList` |
| `/category/[slug]`, `/popular`, `/rising` | `CollectionPage` + `ItemList` + `BreadcrumbList` |
| `/qna` | `FAQPage` (화면 항목과 1:1) |

원칙:

- 안전 직렬화(`<` → `<`)를 거치는 공통 `JsonLd` 컴포넌트로만 출력한다.
- **JSON-LD 때문에 API를 추가 호출하지 않는다.** 페이지가 이미 가져온 데이터만 재사용한다.
- 값이 비어 있는 필드는 객체에서 제거한다. 빈 문자열/`undefined`를 남기지 않는다.
- 화면에 없는 정보(평점, 리뷰 수, 가격, 재고, 대출 가능 여부)는 만들지 않는다.
- `@id`와 `url`은 canonical과 동일한 헬퍼에서 만든다.
- 운영 배포가 아니면 출력하지 않는다(preview에서 잘못 수집되는 것을 막는다).

## sitemap 구조 및 실패 정책

### 구조 결정: 단일 `/sitemap.xml` 유지

Next.js 15의 `generateSitemaps`는 `/sitemap/[id].xml` 형식을 만들고(v15부터 dev·prod 동일), **`app/sitemap.ts`에 도입하는 순간 기존 `/sitemap.xml`이 사라진다.** `/sitemap.xml`은 이미 Search Console·Naver Search Advisor에 제출된 URL이고, Next는 sitemap index를 자동 생성하지 않으므로 index route를 직접 작성해야 한다.

현재 규모는 정적/카테고리 약 30 + 도서관 약 1,588 + 책 약 608 = **약 2,230 URL**로 한도(50,000 URL / 50MB)의 5% 미만이다. 따라서:

- **지금은 단일 `/sitemap.xml`을 유지한다.** 제출 URL을 바꾸지 않고, 분할로 인한 복잡도도 만들지 않는다.
- 대신 URL 수집을 `lib/seo/sitemap-source.ts`로 분리하고, `SITEMAP_MAX_URLS = 45000`(안전 여유 10%) 기준의 `shardEntries()` 헬퍼와 초과 감지 로직을 지금 넣는다.
- 한도를 넘으면 조용히 넘기지 않는다. `console.error`로 경고하고 **앞에서부터 45,000개로 잘라** 유효한 sitemap을 서빙한다(초과 sitemap은 Google이 전체를 거부하므로 절단이 안전하다).
- 5만 URL을 넘길 시점의 전환 절차를 아래 "확장 절차"에 문서로 남긴다.

### 확장 절차 (URL이 45,000을 넘을 때)

1. `app/sitemap.ts`에 `generateSitemaps()`를 추가한다 → 실제 URL은 `/sitemap/0.xml`, `/sitemap/1.xml` … 이 된다. (Next 15에서는 `id`가 값으로, Next 16부터는 Promise로 전달된다.)
2. `/sitemap.xml`은 자동 생성되지 않으므로 `app/sitemap.xml/route.ts`에 `<sitemapindex>`를 직접 작성해 각 shard를 나열한다. 이렇게 하면 **제출된 `/sitemap.xml` URL을 그대로 유지**할 수 있다.
3. `robots.txt`의 `Sitemap:`은 계속 `/sitemap.xml` 하나만 가리킨다.
4. Search Console에는 index만 제출하면 되고 재제출은 필요 없다. shard URL을 개별 제출하지 않는다.

### 책 URL 소스 우선순위

`popular_books` 파이프라인이 복구되면 **코드 수정 없이** 주 소스로 전환되도록 구성한다.

1. **1순위** `GET /books/popular?region=전국&limit=5000` (`popular_books` ⨝ `book_cache`)
2. 1순위 결과가 `MIN_PRIMARY_BOOKS = 200`건 미만이면 **보충**한다.
   - `GET /books/by-category?categoryCode={15종}&limit=100`
   - `GET /books/loan-item?limit=20`
   - `GET /books/hot-trend?limit=20`
   - 1순위 결과를 앞에 두고 보충분을 뒤에 붙인 뒤 중복을 제거한다(1순위 우선).
3. 1순위가 200건 이상이면 보충 소스를 **호출하지 않는다**(불필요한 API 부하 방지). 파이프라인 복구 시 자동으로 이 경로로 전환된다.
4. ISBN 유효성 검증: 공백·하이픈 제거 후 13자리 숫자 + `978`/`979` prefix + ISBN-13 체크섬. 실패 건은 제외한다.
5. 중복 제거는 정규화된 ISBN 기준.
6. 수집 결과를 `{ primary, fallback, invalid, duplicate, total, usedFallback }` 통계로 반환하고 `console.info('[sitemap] books ...')`로 남긴다. 통계는 테스트로 검증한다.

### 도서관 URL 수집

`/libraries`는 `limit` 최대 100이므로 `page`를 증가시키며 전량 수집한다. 안전장치: 최대 40페이지(4,000건), 빈 페이지 또는 100건 미만 응답에서 종료.

### 호출 페이싱 (구현 중 확인한 필수 조건)

API에는 `@nestjs/throttler`로 **초당 10회 / 분당 100회** 제한이 걸려 있다(`apps/api/src/app.module.ts`).

첫 구현에서 보충 소스 15종을 `Promise.allSettled`로 병렬 호출했더니 대부분 **429**로 실패해 책 608권 중 65권만 수집됐고, 도서관도 1,588개 중 900개에서 중단됐다. 따라서:

- 모든 수집을 **순차 실행**한다. 책 → 도서관 → 공지 순서로, 각 컬렉터 내부도 순차다.
- 요청 사이에 `DEFAULT_REQUEST_SPACING_MS = 150`(약 6.6 req/s) 간격을 둔다.
- 실패는 **1회 재시도**한다(`MAX_ATTEMPTS = 2`, 기본 1.5초 대기). 일시적 429로 URL이 통째로 빠지지 않게 한다.
- sitemap은 6시간에 한 번만 생성되므로 총 ~35회 요청에 20초 남짓 걸려도 문제가 없다. 속도보다 완결성을 택한다.
- 테스트는 `{ spacingMs: 0, retryDelayMs: 0 }`을 주입해 대기 없이 실행한다.

`/notices`의 `pageSize` 상한은 50이다(`ListNoticesDto`). 100을 넘기면 400이 떨어진다.

### 실패 정책

- `sitemap.ts`는 `cache: 'no-store'`를 쓰지 않는다. `export const revalidate = 21600`(6시간)으로 두어 **API 장애 시 직전 성공 결과가 계속 서빙**되게 한다.
- 섹션별 독립 실패: 정적·카테고리 URL은 API와 무관하게 항상 포함한다. 책 수집이 실패해도 도서관 URL은 남고, 그 반대도 같다.
- 도서관 페이지네이션 중 일부 페이지가 실패하면 **그때까지 수집한 페이지는 유지**하고 중단한다. 전체를 버리지 않는다.
- 모든 동적 수집이 실패해도 정적 URL만으로 유효한 sitemap을 반환한다. 빈 sitemap을 반환하지 않는다.
- 실패는 `console.error`로 남긴다. 조용히 삼키지 않는다.

## production / preview / dev 색인 정책

판별 우선순위(충돌 시 **noindex가 기본값**):

1. `APP_ENV`가 있으면 이것만 본다. `APP_ENV === 'production'`일 때만 운영으로 취급한다.
2. `VERCEL_ENV`가 `production`이 아닌 값(`preview`, `development`)이면 **`NEXT_PUBLIC_SITE_URL`과 무관하게 운영이 아니다.** preview에 운영 도메인 값이 주입되어도 색인되지 않아야 한다.
3. `NEXT_PUBLIC_SITE_URL`이 없거나 파싱 불가면 운영이 아니다.
4. 호스트가 `near-book.com` / `www.near-book.com`이 아니면 운영이 아니다.
5. 위를 모두 통과하고 `VERCEL_ENV === 'production'`이거나, `VERCEL_ENV`가 없고 `NODE_ENV === 'production'`일 때만 운영이다.

운영이 아닐 때의 3중 차단:

- 루트 metadata `robots: { index: false, follow: false, googleBot: { index: false, follow: false } }`
- `robots.txt`: `User-agent: * / Disallow: /` (sitemap 링크도 노출하지 않음)
- `sitemap.xml`: 빈 배열
- 추가로 JSON-LD와 verification 태그도 출력하지 않는다.

## thin content 판정 및 noindex 기준

**데이터 0건은 그 자체로 noindex 사유가 아니다.** 빌드/렌더 시점의 일시적 API 장애로 정상 페이지가 갑자기 noindex로 바뀌면 색인이 통째로 빠지고 회복도 느리다.

판정 기준(둘 다 만족해야 index):

1. **고유 설명 콘텐츠가 코드 상수로 보장**되는가 — 고유한 `h1`, 고유한 설명문, 화면 목적 설명. API 응답과 무관하게 항상 렌더된다.
2. **저장 데이터 기반 목록**인가 — 큐레이션/DB에 적재되는 데이터로, 일시적 0건이 정상 상태가 아닌 경우.

적용:

- `/popular` `/rising` `/keywords` `/new-books` `/category/[slug]`: 두 조건 모두 만족 → **목록이 0건이어도 index를 유지한다.** 대신 고유 설명문을 강화한다.
- `/library/[id]`: 도서관 레코드 자체가 없으면 `notFound()`(404). 레코드가 있으면 주소·연락처·운영시간이라는 고유 정보가 있으므로 인기/신착이 0건이어도 index.
- `/libraries`: 원래 조건 1을 만족하지 못했다(h1·설명·anchor 없음). 이번 P1에서 SSR 콘텐츠(h1, 설명문, 도서관 100개 anchor, 시도별 시군구 목록)를 보강해 **index + self canonical로 전환 완료**했다. noindex로 남기지 않았다.
- `/search`: 쿼리마다 결과가 달라 고유 콘텐츠를 보장할 수 없다 → 항상 noindex.

## internal linking 전략

모든 링크는 **SSR HTML에 실제 `<a href>`로** 나와야 한다. 클라이언트에서만 렌더되는 링크는 내부 링크로 세지 않는다.

| 출발 | 도착 | 구현 |
|---|---|---|
| 책 상세 | 저자 검색 `/search?q={author}` | 저자명 링크 |
| 책 상세 | 카테고리 허브 `/category`, 인기 `/popular` | 하단 탐색 블록 |
| 책 상세 | 보유 도서관 `/library/{id}` | `LibraryCard`에 anchor 추가 (현재 링크 없음) |
| 책 상세 | 관련 책 `/book/{isbn}` | 기존 `BookCard` 유지 (이미 SSR anchor) |
| 도서관 상세 | 같은 시군구 도서관 `/library/{id}` | `GET /libraries/by-region?sido=&sigungu=` |
| 도서관 상세 | 신착·인기 도서 `/book/{isbn}` | 기존 목록에 anchor 유지 |
| 도서관 상세 | `/libraries` | breadcrumb |
| 카테고리 상세 | 다른 카테고리 `/category/{slug}` | count 매칭 실패 시에도 전체 카테고리를 노출하도록 수정 |
| `/libraries` | 시도별 도서관 목록, 개별 `/library/{id}` | SSR 목록 추가 |
| 전역 footer | 주요 허브 | 기존 유지 |

## 예상 테스트 시나리오

`describe`/`it` 설명은 한국어로 작성한다.

- `describe("배포 환경 판별")`
  - `it("APP_ENV가 production이면 다른 값과 무관하게 운영으로 판단한다")`
  - `it("APP_ENV가 production이 아니면 운영 도메인이어도 운영이 아니다")`
  - `it("VERCEL_ENV가 preview면 NEXT_PUBLIC_SITE_URL이 운영 도메인이어도 운영이 아니다")`
  - `it("운영 도메인이 아닌 preview 도메인은 운영이 아니다")`
  - `it("NEXT_PUBLIC_SITE_URL이 없으면 안전하게 운영이 아니라고 판단한다")`
  - `it("잘못된 형식의 NEXT_PUBLIC_SITE_URL은 운영이 아니라고 판단한다")`
- `describe("사이트 URL 헬퍼")`
  - `it("끝의 슬래시를 제거한 origin을 반환한다")`
  - `it("쿼리와 해시를 제거한 절대 canonical URL을 만든다")`
- `describe("metadata 생성")`
  - `it("페이지 title에 브랜드 suffix를 중복해서 넣지 않는다")`
  - `it("indexable 페이지에 self canonical을 설정한다")`
  - `it("운영 배포가 아니면 robots를 noindex로 설정한다")`
  - `it("verification 환경변수가 없으면 verification을 출력하지 않는다")`
- `describe("JsonLd 직렬화")`
  - `it("script 종료 문자열에 쓰일 수 있는 < 를 이스케이프한다")`
  - `it("</script> 문자열이 그대로 출력되지 않는다")`
  - `it("값이 비어 있는 필드를 제거한다")`
- `describe("JSON-LD 빌더")`
  - `it("홈은 Organization과 WebSite를 하나의 그래프로 만든다")`
  - `it("책 상세는 Book과 BreadcrumbList를 만들고 표지가 없으면 image를 넣지 않는다")`
  - `it("도서관 상세는 Library와 주소·좌표를 만들고 없는 값은 제외한다")`
  - `it("목록은 CollectionPage와 ItemList를 만들고 ISBN 없는 항목은 제외한다")`
  - `it("Q&A는 화면 항목 수와 같은 FAQPage를 만든다")`
  - `it("JSON-LD URL과 canonical이 같은 값이다")`
- `describe("robots 메타 라우트")`
  - `it("운영 배포는 공개 경로와 sitemap을 노출한다")`
  - `it("preview 배포는 전체 경로를 차단하고 sitemap을 노출하지 않는다")`
  - `it("AI 크롤러 차단 규칙을 유지한다")`
- `describe("sitemap 메타 라우트")`
  - `it("운영 배포는 정적·카테고리·책·도서관 URL을 반환한다")`
  - `it("preview 배포에서는 빈 목록을 반환하고 API를 호출하지 않는다")`
  - `it("noindex 라우트인 /search를 포함하지 않는다")`
  - `it("책 수집이 실패해도 정적과 도서관 URL은 유지한다")`
  - `it("도서관 페이지네이션 중간 실패 시 그때까지 수집한 URL은 유지한다")`
  - `it("변경되지 않는 정적 페이지에 현재 시각을 lastModified로 쓰지 않는다")`
- `describe("책 sitemap 소스")`
  - `it("popular_books 결과가 충분하면 보충 소스를 호출하지 않는다")`
  - `it("popular_books가 비어 있으면 보충 소스로 URL을 확보한다")`
  - `it("유효하지 않은 ISBN을 제외한다")`
  - `it("중복 ISBN을 한 번만 포함한다")`
  - `it("소스별 확보 건수를 통계로 반환한다")`

## 엣지케이스 / 실패 시나리오

- `popular_books`가 복구되어 5,000건이 들어와도 보충 소스를 호출하지 않고 정상 동작해야 한다.
- 책 API가 200을 반환하지만 `data`가 배열이 아닐 수 있다. 방어적으로 처리한다.
- ISBN에 하이픈·공백·`X`가 섞여 들어올 수 있다. 정규화 후 검증한다.
- 도서관 수집 중 page 5에서 timeout이 나면 page 1~4의 결과는 유지한다.
- 도서관 `region` 값에 `"-"`, `"경상북도 "`(공백만) 같은 오염 데이터가 있다. 지역 파싱 시 걸러낸다.
- 책 제목·저자에 `<`, `&`, `"`가 들어와도 JSON-LD script가 깨지지 않아야 한다.
- 책 표지 URL이 없으면 `og:image`와 JSON-LD `image`를 모두 생략한다.
- 도서관에 좌표가 없으면 `geo`를 생략한다.
- `/new-books?libraryId=999`처럼 잘못된 쿼리가 와도 canonical은 `/new-books`다.
- 운영 도메인 환경변수가 preview에 잘못 주입되어도 색인되면 안 된다.
- `NEXT_PUBLIC_SITE_URL`이 `https://www.near-book.com/`처럼 슬래시로 끝나도 canonical에 `//`가 생기면 안 된다.
- 목록 API가 일시적으로 0건을 반환해도 페이지가 noindex로 바뀌면 안 된다.

## 검증 기준

- `pnpm --filter @nearbook/web type-check` 통과
- `pnpm --filter @nearbook/web lint` 통과. 실패 시 원인을 그대로 보고하고 대체 검증을 제시한다(성공으로 위장하지 않는다).
- `pnpm --filter @nearbook/web test` 통과
- `pnpm --filter @nearbook/web build` 통과
- `git status` / `git diff --stat`로 범위 밖 변경과 기존 미추적 파일 훼손이 없는지 확인
- 색인 정책표의 indexable 집합과 sitemap URL 집합이 일치

## 단계별 작업 범위

### P0 — 색인 차단 해소 (이번 작업)

1. `lib/seo/site-url.ts`, `lib/seo/deployment-environment.ts`, `lib/seo/metadata.ts`, `components/seo/json-ld.tsx` 추가
2. 루트 layout canonical 제거, OG/Twitter/locale/siteName 기본값, 환경변수 기반 verification, 비운영 noindex
3. 전 라우트 title 중복 제거 + indexable 라우트 self canonical
4. `/library/[id]` metadata·canonical 정상화
5. sitemap 재구성(소스 우선순위, ISBN 검증, 도서관 전량 수집, `/search` 제외, 누락 라우트 추가, revalidate, 실패 내성, preview 빈 목록, shard 확장 준비)
6. robots preview 차단 + noindex 라우트 disallow 정리
7. vitest 도입 및 테스트 작성

### P1 — 콘텐츠·구조화 데이터 (이번 작업)

1. JSON-LD 5종 적용
2. 개발자용 문구를 검색 의도 문장으로 교체, 출처·갱신 정보는 보조 문구로 분리
3. internal linking 표 전체 반영
4. `/libraries` SSR 콘텐츠 보강 후 index 전환
5. 카테고리 count 코드 불일치로 끊긴 카테고리 간 링크 복구

### P2 — 후속

1. **지역 SEO** (`/regions`, `/region/[sido]`, `/region/[sido]/[sigungu]`) — 아래 별도 절
2. OG 이미지 제작 및 `opengraph-image` 동적 생성
3. `popular_books` 파이프라인 복구 (백엔드 과제, 아래 별도 절)
4. `/libraries` 지도 화면의 지역 필터를 지역 페이지와 통합
5. hreflang·다국어 (해당 시)

---

## P2 설계: 지역 SEO

### 목표 URL

- `/regions` — 시도 목록
- `/region/[sido]` — 예: `/region/seoul`
- `/region/[sido]/[sigungu]` — 예: `/region/seoul/gangnam-gu`, `/region/gyeonggi/seongnam-si`

### 데이터 확인 결과

- `libraries.region`은 `"서울특별시 노원구"`처럼 시도+시군구가 결합된 단일 문자열이다.
- `GET /libraries/regions` → distinct region 문자열 목록 (오염 값 `"-"`, `"경상북도 "` 포함).
- `GET /libraries/by-region?sido=&sigungu=` → 해당 지역 도서관 목록(최대 200, `id`/`name`/`lat`/`lng`).
- `GET /libraries?region={시도 시군구}&limit=100` → 주소 포함 목록.
- `apps/web/app/libraries/_components/libraries-map-view.tsx`에 이미 시도→시군구 `REGION_MAP` 상수가 있다. slug 매핑의 출발점으로 재사용한다.

### 생성 조건

- **실제 도서관 데이터가 있는 지역만 생성한다.** 행정구역 조합을 전수 생성하지 않는다.
- 시군구 페이지는 도서관 3곳 이상일 때만 생성한다. 1~2곳이면 시도 페이지에 흡수하고 개별 URL을 만들지 않는다.
- 도서관 수가 기준 미만이거나 지역 고유 설명을 만들 수 없으면 `noindex`.
- 각 페이지에 지역 고유 설명, 도서관 수, 실제 도서관 목록(anchor)을 제공한다. 가능하면 지역 인기 도서·신착도서를 덧붙인다.
- 시도/시군구 breadcrumb와 상하위 internal link를 제공한다.

### slug 전략

- 시도 slug는 **하드코딩 매핑 테이블**로 고정한다(`서울특별시 → seoul`, `경기도 → gyeonggi`, `강원특별자치도 → gangwon` …). 자동 로마자 변환은 쓰지 않는다. 행정구역 명칭이 바뀌어도(강원도→강원특별자치도) slug는 유지해 URL을 보존한다.
- 시군구 slug도 매핑 테이블로 관리한다. 표기 흔들림(`중구`, `남구` 등)이 많아 자동 변환은 위험하다.
- **중복 지역명**(강원 고성군 / 경남 고성군, 여러 시도의 `중구`·`남구`)은 시도 하위 경로에 두어 충돌을 피한다. 시군구 단독 URL은 만들지 않는다.
- slug 변경이 필요해지면 기존 slug를 alias 테이블에 남기고 301 redirect한다. slug를 조용히 교체하지 않는다.
- 오염 region 값(`"-"`, 공백만 있는 값, 시군구 없는 값)은 매핑 테이블에 없으므로 자동으로 제외된다.

### 후속 API/DB 과제 (이번 작업에서 손대지 않음)

- `libraries.region`을 `sido` / `sigungu` 컬럼으로 정규화 → **production schema 변경이므로 별도 작업**으로 분리한다.
- `"-"`, `"경상북도 "` 등 오염 region 데이터 정리 → 별도 데이터 마이그레이션 작업.
- 지역별 도서관 수 집계 엔드포인트(`GET /libraries/regions/summary`) 추가 시 `/regions` 페이지가 정확한 수치를 제공할 수 있다.

---

## 후속 과제: `popular_books` 파이프라인

`GET /books/popular`가 빈 배열을 반환한다. `popular_books` 테이블이 비어 있어 다음 두 곳이 동시에 무력화된 상태다.

- `app/sitemap.ts`의 책 URL 수집
- `app/book/[isbn]/generateStaticParams` (운영에서 5,000건을 기대하지만 0건)

이번 작업에서는 web 측 보충 소스로 약 608권을 확보해 sitemap을 정상화하지만, 이는 임시 대응이다. **API/cron 측에서 `popular_books` 적재를 복구해야 책 상세 색인이 실질적으로 확장된다.** production 데이터·스키마는 이번 작업에서 변경하지 않는다.

---

## 환경변수

| 이름 | 용도 | 필수 |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | canonical·sitemap·robots의 origin | 운영 필수 (`https://www.near-book.com`) |
| `APP_ENV` | 배포 환경 명시 판별(최우선) | 선택 (없으면 `VERCEL_ENV`+도메인으로 판정) |
| `VERCEL_ENV` | Vercel 자동 주입 | 자동 |
| `INTERNAL_API_URL` | 서버측 API 호출 | 필수 |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Search Console 소유 확인 | 선택 |
| `NEXT_PUBLIC_NAVER_SITE_VERIFICATION` | Naver Search Advisor 소유 확인 | 선택 |

## 구현 중 확인한 기타 사항

- `app/events/[id]/page.tsx`의 `params`가 Promise가 아닌 동기 타입이라 **`next build`가 이미 실패하는 상태**였다(HEAD 기준 동일). SEO 작업의 build 검증을 진행할 수 없어 Next 15 규약에 맞게 `Promise<{ id: string }>`로 수정했다. SEO와 무관한 기존 결함이다.
- 책 상세의 "주변 도서관 보유 현황"은 `LibraryCard`에 `/library/{id}` 링크를 추가했지만, 기본 좌표(서울시청) 기준으로 `GET /books/{isbn}/with-libraries`가 빈 배열을 반환하는 경우가 많아 실제 anchor가 렌더되지 않는 책이 있다. 링크 구조는 준비됐고, 노출은 소장 데이터 적재에 달려 있다(후속 과제).
- 로컬 `.env.local`에는 `NEXT_PUBLIC_SITE_URL`이 없다. 이 상태에서 빌드하면 설계대로 `robots.txt = Disallow: /`, `sitemap = 빈 목록`이 생성된다(안전 기본값이 동작함을 확인).

## 변경 이력

- 2026-08-10: 초안. 운영 배포·API 실측 기반 작성.
- 2026-08-10: P0·P1 구현 반영. API rate limit 대응(순차 수집·페이싱·재시도), `/libraries` index 전환 완료, notices pageSize 상한 반영.
