# P2-03 정상 콘텐츠 기반 SEO·공유 개선

기준: 2026-10-20, KAN-122. main defc8a4 이후 독립 작업. 운영 반영 전 검토용 구현이다.

## 동작

- `/regions`에서 실제 등록 도서관이 3곳 이상인 시도로 이동한다. `/region/[sido]`에 실제 도서관 이름·주소·상세 링크와 등록 목록 기준의 수를 SSR한다.
- 17개 시도 고정 slug를 사용한다. 강원도/강원특별자치도, 전라북도/전북특별자치도는 같은 slug로 묶는다. 시군구 없는 오염 값은 제외하고 단일 계층인 세종은 허용한다.
- 기존 목록 API를 100건씩 끝까지 읽는다. 잘못된 응답·중복 ID·중간 실패·40페이지 상한 초과 시 부분 목록으로 지역 URL/수를 만들지 않는다. 요청별 최대4초·전체15초, 순차150ms 간격. 성공한 스냅샷만6시간 캐시하며 metadata/page는 같은 렌더의 결과를 공유한다. 기존 캐시가 있으면 갱신 중 직전 성공 결과가 제공될 수 있다.
- 데이터 미확보 시 지역 화면은 복구 안내·noindex, 존재하지 않거나 기준 미달 지역은404/noindex다. sitemap에도 동일한 캐시와 기준으로 적합한 지역 URL만 추가한다. 새 URL에 임의 lastModified를 넣지 않는다.
- 지역 CollectionPage·ItemList·BreadcrumbList는 화면의 실제 도서관 목록·canonical과 일치한다. `/libraries`·도서관 상세에서 지역 목록으로 이어진다.
- 1200×630 공용 PNG 공유 카드를 추가한다. 실제 책 표지가 있으면 유지하고, 없으면 공용 카드로 대체한다. canonical/OG URL은 쿼리를 제거한다. 외부 이미지 메타데이터는 HTTP(S)만 허용한다.
- 책·도서관 상세의 필수 데이터 실패/404 시 metadata는 noindex·canonical/이미지 미출력이다. 페이지는 기존 오류/404 경로를 유지하며 오류를 정상 데이터로 바꾸지 않는다.
- 명시적인 Vercel preview/development는 복사된 APP_ENV=production보다 우선해 항상 noindex/robots 차단/sitemap 비노출을 유지한다.

## 범위

시군구별 전용 URL은 이번에 생성하지 않는다. 고정 slug 매핑과 고유 콘텐츠 기준이 준비되기 전에는 시도 페이지의 실제 목록에서 탐색한다. 도서관별 인기/신착은 기존 상세의 실제 자료와 빈/오류 구분을 유지하며, 없는 콘텐츠를 별도 유입 페이지로 만들지 않는다. 지역별 실시간 대출 가능 수를 주장하지 않는다.

API/DB/크론/외부 API 예산·인증·요금·발송을 변경하지 않는다. P1-11 보류, PR22 검토 상태는 별개다. 검색엔진 실제 색인·순위 개선이나 외부 공유 서비스의 캐시 갱신은 코드 검증만으로 보장하지 않는다.

## 공유 카드 원본

`docs/assets/share-default.html`을1200×630, deviceScaleFactor1로 렌더한 `apps/web/public/images/share-default.png`. 기존 @fontsource/pretendard의700 CSS와 로컬 폰트 파일을 data URL로 주입한 Playwright Chromium에서 document.fonts.ready 후 캡처했다. 생성 시 외부 네트워크/이미지 생성 모델을 쓰지 않았으며 PNG 육안 검증 완료. 원본 수정 시 같은 크기로 다시 내보낸다. 런타임 이미지 생성이나 새 폰트/브라우저 의존성은 없다.

## 검증 기록

- 2026-10-20 14:30 KST 운영 목록 GET16회: 도서관1,588건, 적합 시도17개. 이때 수치이며 실제 페이지는 갱신된 스냅샷을 쓴다. DB 읽기 API만 사용했고 공급자 강제 조회·개인 쓰기 없음.
- 웹402건·type-check·lint 통과. 최종 CI와 로컬 운영 빌드 HTML 확인은 후속 기록에 추가한다.

### 운영 번들·브라우저 검증

격리 API·가짜 인증 설정으로 Next 운영 번들 빌드 통과. 정상 HTML4종의 self canonical/OG·책 표지 없는 공용 PNG와 지역 JSON-LD 실제3건 일치를 확인했다. 없는 페이지4종과 상세 장애2종은 noindex·정상 entity 미출력. Next 스트리밍 특성상 없는 책/책 오류는 HTTP200일 수 있으므로 상태 코드만으로 성공 판정하지 않았다. 지역 API503 상태로 빈 캐시를 기동해 두 지역 화면의 noindex/복구 안내/JSON-LD 미출력 및 API 복구 직후 실제 목록 회복을 확인했다. 위 notFound/404 설명은 렌더 동작이며 스트리밍 응답 코드 보장은 아니다.

Chromium1280/390px에서 지역 선택·도서관3개 anchor·가로 넘침 없음·pageerror0을 확인하고 스크린샷을 육안 검토했다. 모든 외부 요청과 실제 계정/발송은 차단했다. 외부 공유 미리보기 서비스에서 직접 게시한 검증은 아니다.

로컬 빌드는 APP_ENV/VERCEL_ENV 비설정, 운영 site URL과 NODE_ENV=production으로 SEO의 운영 판정을 실행했다. 실제 API는 localhost fixture, Supabase는 가짜 URL/키다. APP_ENV=production의 loopback API 차단을 우회하는 제품 코드는 추가하지 않았다. 최종 원격 CI/preview는 PR에 연결한다.
