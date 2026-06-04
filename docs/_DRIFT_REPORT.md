# 우리동네책 — Code ↔ Spec Drift Report

- 생성일: 2026-05-19
- 브랜치: main @ 01f2206
- 분석 범위: nearbook_docs/**/*.md + nearbook/docs/**/*.md + apps/** + packages/**

---

## 1. 요약

- 총 .md 파일 수: 64 (nearbook/docs/ 4 + nearbook_docs/ 60)
- 총 코드 엔트리포인트: pages=27, next_api_routes=6, controllers=13, services=23, tables=19
- Drift 카운트: 🟢 29 / 🟡 18 / 🔴 8 / ⚪ 9 / 🆕 52
- Severity 분포: P0=2, P1=22, P2=35, P3=21
- Direction 분포: UPDATE_SPEC=58, UPDATE_CODE=5, DISCUSS=12

> **핵심**: 코드가 스펙을 크게 앞질렀습니다. API 엔드포인트 ~40개, DB 테이블 10개, 페이지 라우트 10개가 CODE_ONLY 상태이며, 디자인 시스템(색상 체계)은 완전히 재설계되었습니다.

---

## 2. 인벤토리

### 2.1 코드 엔트리포인트

#### Pages (27개)
| 라우트 | 파일 | 렌더링 |
|---|---|---|
| `/` | apps/web/app/page.tsx | ISR revalidate=60s |
| `/book/[isbn]` | apps/web/app/book/[isbn]/page.tsx | ISR revalidate=30d |
| `/library/[id]` | apps/web/app/library/[id]/page.tsx | ISR revalidate=7d |
| `/libraries` | apps/web/app/libraries/page.tsx | CSR (지도) |
| `/search` | apps/web/app/search/page.tsx | CSR, noindex |
| `/popular` | apps/web/app/popular/page.tsx | ISR |
| `/rising` | apps/web/app/rising/page.tsx | ISR |
| `/explore` | apps/web/app/explore/page.tsx | ISR |
| `/keywords` | apps/web/app/keywords/page.tsx | ISR |
| `/new-books` | apps/web/app/new-books/page.tsx | ISR |
| `/category` | apps/web/app/category/page.tsx | ISR |
| `/category/[slug]` | apps/web/app/category/[slug]/page.tsx | ISR |
| `/scan` | apps/web/app/scan/page.tsx | CSR |
| `/me` | apps/web/app/me/page.tsx | CSR, Auth |
| `/me/wishlist` | apps/web/app/me/wishlist/page.tsx | CSR, Auth |
| `/me/libraries` | apps/web/app/me/libraries/page.tsx | CSR, Auth |
| `/me/notifications` | apps/web/app/me/notifications/page.tsx | CSR, Auth |
| `/(auth)/login` | apps/web/app/(auth)/login/page.tsx | CSR |
| `/qna` | apps/web/app/qna/page.tsx | SSG |
| `/feedback` | apps/web/app/feedback/page.tsx | CSR |
| `/privacy` | apps/web/app/privacy/page.tsx | SSG |
| `/terms` | apps/web/app/terms/page.tsx | SSG |
| `/notices` | apps/web/app/notices/page.tsx | ISR |
| `/notices/[id]` | apps/web/app/notices/[id]/page.tsx | ISR |
| `/unsubscribe` | apps/web/app/unsubscribe/page.tsx | CSR |
| `/digest/downgrade` | apps/web/app/digest/downgrade/page.tsx | CSR |
| `/offline` | apps/web/app/offline/page.tsx | SSG (PWA fallback) |

#### Next.js API Routes (6개)
| 경로 | 메서드 | 용도 |
|---|---|---|
| `/api/static-map` | GET | Naver Static Map 프록시 (30일 캐시) |
| `/api/libraries/in-bounds` | GET | 지도 뷰포트 도서관 프록시 |
| `/api/libraries/region-center` | GET | 시도·시군구 중심 좌표 계산 |
| `/api/analytics/event` | POST | 이벤트 로깅 |
| `/auth/callback` | GET | Supabase OAuth 콜백 |
| `/auth-api/logout` | POST | 로그아웃 |

#### NestJS Controllers (13개, 총 ~70 엔드포인트)
| 컨트롤러 | 주요 엔드포인트 수 |
|---|---|
| app (health) | 1 |
| auth | 1 |
| libraries | 12 |
| search | 4 |
| books | 9 |
| wishlists | 5 |
| library-cards | 6 |
| affiliates | 1 |
| jeongbonaru-proxy | 20 |
| notices | 2 |
| feedback | 2 |
| webhooks/resend | 1 |
| notifications | 10 |

#### DB Tables (19개, 모두 `nearbook` 스키마)
users, libraries, library_cards, book_cache, wishlists, search_logs, feedback, popular_books, events, api_usage, notices, pending_lookups, home_curations, library_curations, category_curations, notification_preferences, notification_logs, push_subscriptions, search_stats

#### 환경변수 (주요)
- Supabase: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET
- API: NEXT_PUBLIC_API_BASE_URL, INTERNAL_API_URL, DATABASE_URL, PORT
- 외부 API: JEONGBONARU_API_KEY, ALADIN_TTB_KEY, NAVER_MAP_CLIENT_ID/SECRET
- 수익화: NEXT_PUBLIC_ADSENSE_CLIENT, NEXT_PUBLIC_ADSENSE_SLOT_*
- 알림: RESEND_API_KEY, VAPID_PRIVATE_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY
- 모니터링: SENTRY_DSN, NEXT_PUBLIC_GA_MEASUREMENT_ID

### 2.2 문서 카탈로그

#### nearbook_docs/specs/ (40개)
| 카테고리 | 파일 |
|---|---|
| product (4) | 01_problem_solution, 02_target_users, 03_success_metrics, 04_monetization |
| architecture (4) | 01_stack, 02_system_diagram, 03_data_flow, 04_deployment |
| db (4) | 01_drizzle_schema, 02_jeongbonaru_api, 03_cache_strategy, 04_data_seeding |
| pages (7) | 01_route_map, 02_page_book_isbn, 03_page_library_id, 04_page_search, 05_page_user, 06_page_home, 07_design_guide |
| api (5) | 01_endpoints, 02_auth, 03_book_lookup, 04_library_match, 05_search |
| seo (4) | 01_isr_strategy, 02_sitemap, 03_meta_tags, 04_robots_txt |
| ads (3) | 01_adsense_setup, 02_affiliate_slots, 03_legal_disclosure |
| ops (4) | 01_monitoring, 02_security, 03_terms_privacy, 04_backup |
| phases (4) | 01_phase0_mvp_1week, 02_phase0_mvp_2week, 03_phase1_flutter, 04_phase2_scale |

#### nearbook_docs/prompts/ (16개)
00_master_brief, 01_scaffolding, 02_drizzle_setup, 03_supabase_setup, 04_jeongbonaru_client, 05_book_page, 06_library_page, 07_search_page, 08_user_auth, 09_wishlist, 10_isr_caching, 11_sitemap_seo, 12_adsense_affiliate, 13_deployment, 14_naver_static_map, 15_monitoring

#### nearbook_docs/ 기타 (5개)
README.md, README.old.md, 00_overview.md, WORKFLOW.md, decisions/README.md

#### nearbook/docs/ (4개)
deploy-log.md, 06_page_home.md, 14_naver_static_map.md, 14b_naver_dynamic_map.md

---

## 3. 카테고리별 Drift

### 3.1 Routes

| # | 항목 | 스펙 | 코드 | 상태 | Sev | Dir | 비고 |
|---|---|---|---|---|---|---|---|
| 1 | `/` | specs/04_pages/01_route_map.md | apps/web/app/page.tsx | 🟡 PARTIAL | P1 | UPDATE_SPEC | revalidate 1일→60초; 섹션 구성 변경 |
| 2 | `/book/[isbn]` | route_map.md | book/[isbn]/page.tsx | 🟢 SYNC | - | - | revalidate 30일 일치 |
| 3 | `/library/[id]` | route_map.md | library/[id]/page.tsx | 🟢 SYNC | - | - | revalidate 1주 일치 |
| 4 | `/search` | route_map.md | search/page.tsx | 🟢 SYNC | - | - | CSR, noindex 일치 |
| 5 | `/me` | route_map.md | me/page.tsx | 🟢 SYNC | - | - | Auth+CSR 일치 |
| 6 | `/me/wishlist` | route_map.md | me/wishlist/page.tsx | 🟢 SYNC | - | - | |
| 7 | `/me/libraries` | route_map.md | me/libraries/page.tsx | 🟢 SYNC | - | - | |
| 8 | `/(auth)/login` | route_map.md (`/login`) | (auth)/login/page.tsx | 🟡 PARTIAL | P2 | UPDATE_SPEC | 경로 차이; /signup 없음 (카카오 전용) |
| 9 | `/auth/callback` | route_map.md | auth/callback/route.ts | 🟡 PARTIAL | P1 | UPDATE_SPEC | route group 밖에 위치 |
| 10 | `/popular` | route_map.md | popular/page.tsx | 🟡 PARTIAL | P2 | UPDATE_SPEC | revalidate 1일→1시간 |
| 11 | `/category/[slug]` | route_map.md (`[category]`) | category/[slug]/page.tsx | 🟡 PARTIAL | P2 | UPDATE_SPEC | slug명 다름; revalidate 1주→1시간 |
| 12 | `/terms` | route_map.md | terms/page.tsx | 🟢 SYNC | - | - | |
| 13 | `/privacy` | route_map.md | privacy/page.tsx | 🟢 SYNC | - | - | |
| 14 | `/region/[region]` | route_map.md | — | ⚪ SPEC_ONLY | P1 | DISCUSS | `/libraries` 지도로 대체됨 |
| 15 | `/about` | route_map.md | — | ⚪ SPEC_ONLY | P3 | DISCUSS | 홈에 인라인 AboutSection |
| 16 | `/contact` | route_map.md | — | ⚪ SPEC_ONLY | P3 | DISCUSS | Phase 2+ |
| 17 | `/signup` | route_map.md | — | ⚪ SPEC_ONLY | P2 | UPDATE_SPEC | 카카오 OAuth로 불필요 |
| 18 | `/me/settings` | route_map.md | — | ⚪ SPEC_ONLY | P3 | DISCUSS | Phase 1+ |
| 19 | `/me/notifications` | — | me/notifications/page.tsx | 🆕 CODE_ONLY | P2 | UPDATE_SPEC | 알림 설정 |
| 20 | `/libraries` | — | libraries/page.tsx | 🆕 CODE_ONLY | P1 | UPDATE_SPEC | 도서관 지도 (/region 대체) |
| 21 | `/rising` | — | rising/page.tsx | 🆕 CODE_ONLY | P2 | UPDATE_SPEC | 대출 급상승 |
| 22 | `/explore` | — | explore/page.tsx | 🆕 CODE_ONLY | P2 | UPDATE_SPEC | 탐색 허브 |
| 23 | `/keywords` | — | keywords/page.tsx | 🆕 CODE_ONLY | P2 | UPDATE_SPEC | 이달의 키워드 |
| 24 | `/new-books` | — | new-books/page.tsx | 🆕 CODE_ONLY | P2 | UPDATE_SPEC | 신착도서 |
| 25 | `/category` (인덱스) | — | category/page.tsx | 🆕 CODE_ONLY | P2 | UPDATE_SPEC | 카테고리 목록 |
| 26 | `/scan` | — | scan/page.tsx | 🆕 CODE_ONLY | P2 | UPDATE_SPEC | 바코드 스캔 |
| 27 | `/qna` | — | qna/page.tsx | 🆕 CODE_ONLY | P3 | UPDATE_SPEC | 묻고답하기 |
| 28 | `/feedback` | — | feedback/page.tsx | 🆕 CODE_ONLY | P2 | UPDATE_SPEC | 피드백 |
| 29 | `/notices`, `/notices/[id]` | — | notices/page.tsx, notices/[id]/page.tsx | 🆕 CODE_ONLY | P2 | UPDATE_SPEC | 공지사항 |
| 30 | `/unsubscribe` | — | unsubscribe/page.tsx | 🆕 CODE_ONLY | P2 | UPDATE_SPEC | 이메일 해지 |
| 31 | `/digest/downgrade` | — | digest/downgrade/page.tsx | 🆕 CODE_ONLY | P3 | UPDATE_SPEC | 다이제스트 주기 |
| 32 | `/offline` | — | offline/page.tsx | 🆕 CODE_ONLY | P3 | UPDATE_SPEC | PWA 오프라인 |

### 3.2 API Endpoints

| # | 항목 | 스펙 | 코드 | 상태 | Sev | Dir | 비고 |
|---|---|---|---|---|---|---|---|
| 1 | GET /health | 01_endpoints.md | app.controller.ts | 🟢 SYNC | - | - | |
| 2 | GET /auth/me | 01_endpoints.md (`/me`) | auth.controller.ts | 🟡 PARTIAL | P1 | UPDATE_SPEC | 경로 `/me` → `/auth/me` |
| 3 | PATCH /me | 01_endpoints.md | — | ⚪ SPEC_ONLY | P1 | UPDATE_CODE | 프로필 수정 미구현 |
| 4 | DELETE /me | 01_endpoints.md | — | ⚪ SPEC_ONLY | P2 | UPDATE_CODE | 계정 삭제 미구현 |
| 5 | GET /books/:isbn | 03_book_lookup.md | books.controller.ts | 🟢 SYNC | - | - | |
| 6 | GET /books/:isbn/with-libraries | 03_book_lookup.md | books.controller.ts | 🟡 PARTIAL | P3 | UPDATE_SPEC | `radius` 파라미터 추가 |
| 7 | GET /books/:isbn/availability | 03_book_lookup.md | — | ⚪ SPEC_ONLY | P1 | DISCUSS | with-libraries에 통합 가능? |
| 8 | GET /books/:isbn/affiliates | 02_affiliate_slots.md | affiliates.controller.ts | 🟡 PARTIAL | P3 | UPDATE_SPEC | 별도 controller 분리 |
| 9 | GET /books/:isbn/related | 03_book_lookup.md | — | ⚪ SPEC_ONLY | P2 | UPDATE_CODE | 미구현 |
| 10 | GET /books/popular | 01_endpoints.md | books.controller.ts | 🟡 PARTIAL | P2 | UPDATE_SPEC | `period` 파라미터 차이 |
| 11 | GET /books/recent | 01_endpoints.md | books.controller.ts | 🟢 SYNC | - | - | |
| 12 | GET /books/:isbn/analysis | — | books.controller.ts | 🆕 CODE_ONLY | P2 | UPDATE_SPEC | 대출 분석 |
| 13 | GET /books/loan-item | — | books.controller.ts | 🆕 CODE_ONLY | P2 | UPDATE_SPEC | |
| 14 | GET /books/hot-trend | — | books.controller.ts | 🆕 CODE_ONLY | P2 | UPDATE_SPEC | |
| 15 | GET /books/categories | — | books.controller.ts | 🆕 CODE_ONLY | P2 | UPDATE_SPEC | |
| 16 | GET /books/by-category | — | books.controller.ts | 🆕 CODE_ONLY | P2 | UPDATE_SPEC | |
| 17 | GET /libraries | 04_library_match.md | libraries.controller.ts | 🟡 PARTIAL | P2 | UPDATE_SPEC | `q` 검색 파라미터 추가 |
| 18 | GET /libraries/near | 04_library_match.md | libraries.controller.ts | 🟢 SYNC | - | - | |
| 19 | GET /libraries/:id | 04_library_match.md | libraries.controller.ts | 🟢 SYNC | - | - | |
| 20 | GET /libraries/:id/popular | 04_library_match.md | libraries.controller.ts | 🟢 SYNC | - | - | |
| 21 | GET /libraries/:id/recent | 04_library_match.md | libraries.controller.ts | 🟢 SYNC | - | - | |
| 22 | GET /libraries/in-bounds | — | libraries.controller.ts | 🆕 CODE_ONLY | P1 | UPDATE_SPEC | 지도 핵심 기능 |
| 23 | GET /libraries/by-region | — | libraries.controller.ts | 🆕 CODE_ONLY | P2 | UPDATE_SPEC | |
| 24 | GET /libraries/regions | — | libraries.controller.ts | 🆕 CODE_ONLY | P1 | UPDATE_SPEC | 홈 드롭다운 |
| 25 | GET /libraries/popular | — | libraries.controller.ts | 🆕 CODE_ONLY | P2 | UPDATE_SPEC | |
| 26 | GET /libraries/featured-new-arrivals | — | libraries.controller.ts | 🆕 CODE_ONLY | P2 | UPDATE_SPEC | |
| 27 | GET /libraries/:id/new-arrivals | — | libraries.controller.ts | 🆕 CODE_ONLY | P2 | UPDATE_SPEC | |
| 28 | GET /libraries/:id/trends | — | libraries.controller.ts | 🆕 CODE_ONLY | P2 | UPDATE_SPEC | |
| 29 | GET /search | 05_search.md | search.controller.ts | 🟡 PARTIAL | P2 | UPDATE_SPEC | DTO 파라미터 차이 |
| 30 | GET /search/suggest | 05_search.md | search.controller.ts | 🟢 SYNC | - | - | |
| 31 | GET /search/trending | — | search.controller.ts | 🆕 CODE_ONLY | P2 | UPDATE_SPEC | |
| 32 | GET /search/monthly-keywords | — | search.controller.ts | 🆕 CODE_ONLY | P2 | UPDATE_SPEC | |
| 33 | GET /me/wishlists | 01_endpoints.md | wishlists.controller.ts | 🟢 SYNC | - | - | |
| 34 | POST /wishlists | 01_endpoints.md | wishlists.controller.ts | 🟢 SYNC | - | - | |
| 35 | PATCH /wishlists/:isbn | 01_endpoints.md | wishlists.controller.ts | 🟢 SYNC | - | - | |
| 36 | DELETE /wishlists/:isbn | 01_endpoints.md | wishlists.controller.ts | 🟢 SYNC | - | - | |
| 37 | GET /me/wishlists/:isbn/status | — | wishlists.controller.ts | 🆕 CODE_ONLY | P3 | UPDATE_SPEC | |
| 38 | GET /me/library-cards | 04_library_match.md | library-cards.controller.ts | 🟢 SYNC | - | - | |
| 39 | POST /library-cards | 04_library_match.md | library-cards.controller.ts | 🟢 SYNC | - | - | |
| 40 | PATCH /library-cards/:id | 04_library_match.md | library-cards.controller.ts | 🟢 SYNC | - | - | |
| 41 | DELETE /library-cards/:id | 04_library_match.md | library-cards.controller.ts | 🟢 SYNC | - | - | |
| 42 | GET /me/library-cards/:libraryId/status | — | library-cards.controller.ts | 🆕 CODE_ONLY | P3 | UPDATE_SPEC | |
| 43 | DELETE /library-cards/by-library/:libraryId | — | library-cards.controller.ts | 🆕 CODE_ONLY | P2 | UPDATE_SPEC | |
| 44 | POST /analytics/event | 01_endpoints.md | — | ⚪ SPEC_ONLY | P2 | DISCUSS | Next.js route에 존재 |
| 45 | GET /notices (list) | — | notices.controller.ts | 🆕 CODE_ONLY | P1 | UPDATE_SPEC | |
| 46 | GET /notices/:id | — | notices.controller.ts | 🆕 CODE_ONLY | P1 | UPDATE_SPEC | |
| 47 | POST /feedback | — | feedback.controller.ts | 🆕 CODE_ONLY | P1 | UPDATE_SPEC | OptionalAuth, throttle |
| 48 | GET /me/feedback | — | feedback.controller.ts | 🆕 CODE_ONLY | P2 | UPDATE_SPEC | |
| 49 | POST /webhooks/resend | — | resend.controller.ts | 🆕 CODE_ONLY | P2 | UPDATE_SPEC | |
| 50 | Notifications (10 endpoints) | — | notifications.controller.ts | 🆕 CODE_ONLY | P1 | UPDATE_SPEC | 전체 도메인 미문서화 |
| 51 | Jeongbonaru Proxy (20 endpoints) | — | jeongbonaru-proxy.controller.ts | 🆕 CODE_ONLY | P1 | UPDATE_SPEC | 전체 프록시 미문서화 |
| 52 | POST /admin/cron/wishlist-digest | — | notifications.controller.ts | 🆕 CODE_ONLY | P2 | UPDATE_SPEC | |
| 53 | GET /admin/notifications/health | — | notifications.controller.ts | 🆕 CODE_ONLY | P2 | UPDATE_SPEC | |

### 3.3 DB

| # | 항목 | 스펙 | 코드 | 상태 | Sev | Dir | 비고 |
|---|---|---|---|---|---|---|---|
| 1 | Schema namespace | 01_drizzle_schema.md: `pgTable` (public) | packages/db/src/schema.ts: `pgSchema('nearbook')` | 🔴 DIVERGED | P0 | UPDATE_SPEC | **모든 테이블에 영향** |
| 2 | users | 01_drizzle_schema.md | schema.ts | 🟡 PARTIAL | P1 | UPDATE_SPEC | email nullable 변경, feedbacks relation 추가 |
| 3 | libraries | 01_drizzle_schema.md | schema.ts | 🟢 SYNC | P3 | - | geography dataType 미세 차이 |
| 4 | library_cards | 01_drizzle_schema.md | schema.ts | 🟢 SYNC | - | - | |
| 5 | book_cache | 01_drizzle_schema.md | schema.ts | 🟡 PARTIAL | P2 | UPDATE_SPEC | trgm 인덱스 `gin_trgm_ops` 추가 |
| 6 | wishlists | 01_drizzle_schema.md | schema.ts | 🟢 SYNC | - | - | |
| 7 | search_logs | 01_drizzle_schema.md | schema.ts | 🟢 SYNC | - | - | |
| 8 | popular_books | 01_drizzle_schema.md | schema.ts | 🟢 SYNC | - | - | |
| 9 | events | 01_drizzle_schema.md | schema.ts | 🟢 SYNC | - | - | |
| 10 | api_usage | 01_drizzle_schema.md | schema.ts | 🟢 SYNC | - | - | |
| 11 | users.email | 01_drizzle_schema.md: `.notNull()` | schema.ts: nullable | 🔴 DIVERGED | P1 | DISCUSS | 카카오에서 email 미제공 케이스 대응 추정 |
| 12 | feedback | — | schema.ts | 🆕 CODE_ONLY | P1 | UPDATE_SPEC | 피드백 테이블 (7 컬럼) |
| 13 | notices | — | schema.ts | 🆕 CODE_ONLY | P1 | UPDATE_SPEC | 공지사항 (5 컬럼) |
| 14 | pending_lookups | — | schema.ts | 🆕 CODE_ONLY | P1 | UPDATE_SPEC | 비동기 정보나루 조회 큐 |
| 15 | home_curations | — | schema.ts | 🆕 CODE_ONLY | P1 | UPDATE_SPEC | 홈 큐레이션 캐시 |
| 16 | library_curations | — | schema.ts | 🆕 CODE_ONLY | P1 | UPDATE_SPEC | 도서관별 큐레이션 |
| 17 | category_curations | — | schema.ts | 🆕 CODE_ONLY | P1 | UPDATE_SPEC | 카테고리별 인기도서 |
| 18 | notification_preferences | — | schema.ts | 🆕 CODE_ONLY | P1 | UPDATE_SPEC | 알림 설정 (bounce tracking 포함) |
| 19 | notification_logs | — | schema.ts | 🆕 CODE_ONLY | P1 | UPDATE_SPEC | 발송 로그 (Resend 연동) |
| 20 | push_subscriptions | — | schema.ts | 🆕 CODE_ONLY | P1 | UPDATE_SPEC | 웹 푸시 구독 |
| 21 | search_stats | — | schema.ts | 🆕 CODE_ONLY | P2 | UPDATE_SPEC | 검색 통계 캐시 |

### 3.4 External Integrations

| # | 항목 | 스펙 | 코드 | 상태 | Sev | Dir | 비고 |
|---|---|---|---|---|---|---|---|
| 1 | 정보나루 Client | 02_jeongbonaru_api.md, prompts/04_jeongbonaru_client.md | jeongbonaru.client.ts | 🟢 SYNC | - | - | API 호출, authKey 인젝션, 캐시, 로깅 일치 |
| 2 | 정보나루 daily limit | spec: 500 | code: JEONGBONARU_DAILY_LIMIT default 500 (.env.example), client: 30,000 | 🟡 PARTIAL | P2 | DISCUSS | .env default vs client default 불일치 |
| 3 | 정보나루 Proxy | — | jeongbonaru-proxy.controller.ts (20 endpoints) | 🆕 CODE_ONLY | P1 | UPDATE_SPEC | 프록시 전체 미문서화 |
| 4 | Naver Static Map | prompts/14_naver_static_map.md, docs/14_naver_static_map.md | api/static-map/route.ts | 🟢 SYNC | - | - | 프록시 패턴, 캐시 30일, 헤더 인증 일치 |
| 5 | Naver Dynamic Map | docs/14b_naver_dynamic_map.md | naver-interactive-map.tsx, use-naver-map.ts | 🟢 SYNC | - | - | SDK v3, 마커, InfoWindow 일치 |
| 6 | Kakao OAuth | 02_auth.md | login/page.tsx, auth/callback/route.ts | 🟡 PARTIAL | P2 | UPDATE_SPEC | scope `profile_nickname`만 (spec: email 필수) |
| 7 | 알라딘 fallback | prompts/12_adsense_affiliate.md | aladdin-fallback.service.ts | 🟡 PARTIAL | P2 | UPDATE_SPEC | 독립 서비스 (spec: AffiliatesService 내장) |
| 8 | 알라딘 TTB API | 02_affiliate_slots.md | aladdin-fallback.service.ts | 🟡 PARTIAL | P2 | UPDATE_SPEC | quota 5,000; 80% guard 추가 (spec에 없음) |

### 3.5 Auth

| # | 항목 | 스펙 | 코드 | 상태 | Sev | Dir | 비고 |
|---|---|---|---|---|---|---|---|
| 1 | Kakao OAuth 흐름 | 02_auth.md | login/page.tsx → callback → session | 🟢 SYNC | - | - | 기본 흐름 일치 |
| 2 | 동의 항목 | spec: 닉네임+이메일 필수 | code: `scope: 'profile_nickname'` | 🔴 DIVERGED | P1 | DISCUSS | 이메일 미수집 → users.email nullable과 연결 |
| 3 | NestJS AuthGuard JWT | 02_auth.md | auth 모듈 | 🟢 SYNC | - | - | Bearer JWT verify 일치 |
| 4 | Next.js middleware | 02_auth.md: middleware.ts로 세션 리프레시 | code: middleware.ts 존재 여부 [UNCERTAIN] | 🟡 PARTIAL | P2 | DISCUSS | middleware 파일 미확인 |
| 5 | OptionalAuthGuard | — | feedback.controller.ts | 🆕 CODE_ONLY | P2 | UPDATE_SPEC | 인증 선택적 가드 |
| 6 | 미인증 허용 라우트 | 02_auth.md: 대부분 public | code: AuthGuard 패턴 일치 | 🟢 SYNC | - | - | |

### 3.6 Pages & Design

| # | 항목 | 스펙 | 코드 | 상태 | Sev | Dir | 비고 |
|---|---|---|---|---|---|---|---|
| 1 | **Primary 색상** | 07_design_guide.md: `#3b82f6` (파란색) | tailwind.config.ts: `#2F704F` (딥그린) | 🔴 DIVERGED | P0 | UPDATE_SPEC | **완전히 다른 색상 체계** |
| 2 | Canvas 색상 | — | `#FAF9F6` cream off-white | 🆕 CODE_ONLY | P1 | UPDATE_SPEC | spec에 없음 |
| 3 | Gray palette | 07_design_guide.md: cool gray | warm tone `#1C1917` | 🔴 DIVERGED | P1 | UPDATE_SPEC | warm tone으로 변경 |
| 4 | Accent 색상 | spec: `#10b981` | available/waiting/unavailable 세분화 | 🔴 DIVERGED | P1 | UPDATE_SPEC | |
| 5 | Font sans | spec: Pretendard | code: Pretendard | 🟢 SYNC | - | - | |
| 6 | Font serif | spec: Noto Serif KR | — | ⚪ SPEC_ONLY | P3 | DISCUSS | 미사용 |
| 7 | Font mono | — | JetBrains Mono | 🆕 CODE_ONLY | P3 | UPDATE_SPEC | |
| 8 | 홈 섹션 구성 | 06_page_home.md | HeroSection + BookListSection ×3 + LibrariesNearMe | 🔴 DIVERGED | P1 | UPDATE_SPEC | NewBooks→loanItems/hotTrend로 변경 |
| 9 | 홈 HeroSearch | docs/06_page_home.md: 제거됨 | code: monthlyKeywords chips | 🟡 PARTIAL | P2 | UPDATE_SPEC | nearbook/docs는 반영, nearbook_docs는 미반영 |
| 10 | /search 컴포넌트 | 04_page_search.md: LoadMoreButton | Pagination + PopularQueries + PersonalizeToggle | 🟡 PARTIAL | P2 | UPDATE_SPEC | 무한스크롤→페이지네이션 |
| 11 | /book/[isbn] LibrariesNear | spec: CSR geolocation | code: 서버사이드 기본좌표 + 클라이언트 | 🔴 DIVERGED | P1 | UPDATE_SPEC | |
| 12 | /book/[isbn] BookAnalysis | — | BookAnalysisSection | 🆕 CODE_ONLY | P1 | UPDATE_SPEC | 대출추이, 독자층 분석 |
| 13 | /library/[id] JSON-LD | spec: Library JSON-LD 명시 | code: JSON-LD 없음 | 🔴 DIVERGED | P2 | UPDATE_CODE | |
| 14 | /library/[id] generateStaticParams | spec: 1,400 전체 빌드 | code: on-demand ISR | 🟡 PARTIAL | P2 | DISCUSS | |
| 15 | /library/[id] LibraryTrendCard | — | 요일/시간별 대출 패턴 | 🆕 CODE_ONLY | P2 | UPDATE_SPEC | |
| 16 | /me 대시보드 | 05_page_user.md: 미리보기 데이터 | code: 인사말+링크만 | 🟡 PARTIAL | P2 | UPDATE_CODE | |

### 3.7 SEO

| # | 항목 | 스펙 | 코드 | 상태 | Sev | Dir | 비고 |
|---|---|---|---|---|---|---|---|
| 1 | ISR /book/[isbn] 30일 | 01_isr_strategy.md | revalidate=2592000 | 🟢 SYNC | - | - | |
| 2 | ISR generateStaticParams 5,000권 | 01_isr_strategy.md | code: popular limit=5000 in sitemap; page 자체는 [UNCERTAIN] | 🟡 PARTIAL | P2 | DISCUSS | |
| 3 | sitemap 정적 페이지 | 02_sitemap.md: /, /popular, /about, /terms, /privacy | code: /search, /popular, /libraries, /explore, /category, /new-books | 🟡 PARTIAL | P2 | UPDATE_SPEC | /about 없음; 신규 페이지들 추가됨 |
| 4 | sitemap /region/* | 02_sitemap.md: 17 시도 | code: 없음 | ⚪ SPEC_ONLY | P2 | UPDATE_SPEC | /region 라우트 미구현 |
| 5 | robots.txt | 04_robots_txt.md | robots.ts | 🟡 PARTIAL | P2 | UPDATE_SPEC | AI 크롤러 차단 (GPTBot 등) spec에 없음 |
| 6 | 메타 title template | 03_meta_tags.md | layout.tsx `'%s | 우리동네책'` | 🟢 SYNC | - | - | |
| 7 | OG images | 03_meta_tags.md: opengraph-image.tsx | [UNCERTAIN] | 🟡 PARTIAL | P2 | DISCUSS | 파일 존재 여부 미확인 |

### 3.8 Monetization

| # | 항목 | 스펙 | 코드 | 상태 | Sev | Dir | 비고 |
|---|---|---|---|---|---|---|---|
| 1 | AdSense Script | 01_adsense_setup.md | layout.tsx Script 로드 | 🟢 SYNC | - | - | |
| 2 | AdSense 슬롯 (홈 footer) | 01_adsense_setup.md | NEXT_PUBLIC_ADSENSE_SLOT_HOME_FOOTER | 🟢 SYNC | - | - | |
| 3 | AdSense 슬롯 (book inline) | 01_adsense_setup.md | NEXT_PUBLIC_ADSENSE_SLOT_BOOK_INLINE | 🟢 SYNC | - | - | |
| 4 | Affiliate 프로바이더 | 02_affiliate_slots.md: 알라딘+예스24+교보+밀리+리디+윌라 | code: [UNCERTAIN] 실제 프로바이더 수 | 🟡 PARTIAL | P2 | DISCUSS | 알라딘 확인됨; 나머지 deep link 구현 미확인 |
| 5 | 법적 고지 | 03_legal_disclosure.md | /terms, /privacy 페이지 존재 | 🟡 PARTIAL | P2 | DISCUSS | 광고 고지 문구 구현 여부 미확인 |

### 3.9 Ops & Deployment

| # | 항목 | 스펙 | 코드 | 상태 | Sev | Dir | 비고 |
|---|---|---|---|---|---|---|---|
| 1 | Web: Vercel | 04_deployment.md | deploy-log.md 확인 | 🟢 SYNC | - | - | |
| 2 | API: Hetzner+Docker+Caddy | 04_deployment.md | deploy-log.md 확인 | 🟢 SYNC | - | - | |
| 3 | GET /health | 01_monitoring.md | app.controller.ts | 🟢 SYNC | - | - | |
| 4 | Sentry | 01_monitoring.md | SENTRY_DSN env var | 🟡 PARTIAL | P2 | DISCUSS | 통합 코드 확인 필요 |
| 5 | GA4 | 01_monitoring.md | NEXT_PUBLIC_GA_MEASUREMENT_ID | 🟡 PARTIAL | P2 | DISCUSS | 통합 코드 확인 필요 |
| 6 | Better Stack uptime | 01_monitoring.md | [UNCERTAIN] | 🟡 PARTIAL | P3 | DISCUSS | 외부 설정이라 코드에서 미확인 |
| 7 | Resend email | — | resend.controller.ts, RESEND_API_KEY | 🆕 CODE_ONLY | P1 | UPDATE_SPEC | 이메일 알림 시스템 미문서화 |
| 8 | Web Push | — | VAPID keys, push_subscriptions | 🆕 CODE_ONLY | P1 | UPDATE_SPEC | 웹 푸시 시스템 미문서화 |
| 9 | GitHub Actions CI/CD | 04_deployment.md | [UNCERTAIN] | 🟡 PARTIAL | P3 | DISCUSS | |

### 3.10 Phases

| # | 항목 | 스펙 | 코드 | 상태 | Sev | Dir | 비고 |
|---|---|---|---|---|---|---|---|
| 1 | Phase 0 Week 1 | 01_phase0_mvp_1week.md | 대부분 구현됨 | 🟢 SYNC | - | - | Turborepo, Supabase, 정보나루, NestJS |
| 2 | Phase 0 Week 2 | 02_phase0_mvp_2week.md | 대부분 구현됨 + 초과 | 🟡 PARTIAL | P2 | UPDATE_SPEC | 알림, 피드백, 큐레이션 등 Phase 0 초과 기능 다수 |
| 3 | Phase 1 항목 | 03_phase1_flutter.md | Flutter 미시작; 인터랙티브 맵 부분 구현 | 🟡 PARTIAL | P2 | DISCUSS | 웹에서 Phase 1 일부 선행 구현 |
| 4 | Phase 0 초과 기능 | — | notifications, push, feedback, notices, curations, scan, categories | 🆕 CODE_ONLY | P1 | DISCUSS | Phase 정의에 없는 기능들이 대거 구현됨 |

---

## 4. 중복·이중 문서

| 묶음 | 파일들 | canonical 후보 | 권장 조치 | 이유 |
|---|---|---|---|---|
| 검색 페이지 | specs/04_pages/04_page_search.md ↔ prompts/07_search_page.md | 04_page_search.md | 07은 구현 프롬프트로 보존, 04에 최종 상태 반영 | 04가 spec 디렉토리에 있어 canonical; 07은 프롬프트 |
| 홈페이지 | specs/04_pages/06_page_home.md ↔ nearbook/docs/06_page_home.md | nearbook/docs/06_page_home.md | nearbook_docs/specs 것을 nearbook/docs 기준으로 갱신 | nearbook/docs 버전이 HeroSearch 제거 등 최신 상태 반영 |
| 배포 | specs/02_architecture/04_deployment.md ↔ prompts/13_deployment.md ↔ nearbook/docs/deploy-log.md | specs/04_deployment.md (설계) + deploy-log.md (실행 로그) | 13은 프롬프트로 보존 | 역할 분리: spec vs prompt vs log |
| 모니터링 | specs/08_ops/01_monitoring.md ↔ prompts/15_monitoring.md | specs/01_monitoring.md | 15는 프롬프트로 보존 | 동일 패턴 |
| ISR/캐시 | specs/06_seo/01_isr_strategy.md ↔ prompts/10_isr_caching.md | specs/01_isr_strategy.md | 10은 프롬프트로 보존 | 동일 패턴 |
| Sitemap/SEO | specs/06_seo/02_sitemap.md + 03_meta_tags.md ↔ prompts/11_sitemap_seo.md | specs 쪽 | 11은 프롬프트로 보존 | 동일 패턴 |
| AdSense/Affiliate | specs/07_monetization/01+02 ↔ prompts/12_adsense_affiliate.md | specs 쪽 | 12는 프롬프트로 보존 | 동일 패턴 |
| Naver Map | nearbook/docs/14_naver_static_map.md ↔ prompts/14_naver_static_map.md ↔ docs/14b_naver_dynamic_map.md | nearbook/docs/ 쪽 통합 | 14 (static) + 14b (dynamic) 유지; prompts/14 보존 | nearbook/docs가 코드와 가까움 |
| 정보나루 | specs/03_data/02_jeongbonaru_api.md ↔ prompts/04_jeongbonaru_client.md | specs/02가 API spec, prompts/04가 구현 가이드 | 역할 다르므로 둘 다 보존 | spec vs prompt |

> **참고**: `prompts/` 디렉토리의 파일은 구현 프롬프트(1회성 지침)이고, `specs/` 디렉토리가 살아있는 사양 문서입니다. 중복처럼 보이지만 역할이 다르므로, `specs/`를 canonical로 삼고 `prompts/`는 히스토리로 보존하는 것이 적절합니다.

---

## 5. 우선순위 액션 리스트

### P0 (서비스 차단/보안 — 2건)

| # | 항목 | Direction | Effort | 설명 |
|---|---|---|---|---|
| 1 | DB schema namespace `nearbook` | UPDATE_SPEC | S | 01_drizzle_schema.md의 `pgTable` → `nearbookSchema.table()` 반영 |
| 2 | 디자인 가이드 색상 체계 전면 갱신 | UPDATE_SPEC | M | primary #3b82f6→#2F704F, canvas 추가, warm gray, accent 세분화 |

### P1 (기능 결함 — 22건)

| # | 항목 | Direction | Effort | 설명 |
|---|---|---|---|---|
| 1 | 홈 revalidate + 섹션 구성 | UPDATE_SPEC | S | 60s revalidate, loanItems/hotTrend 섹션 반영 |
| 2 | /auth/me 경로 불일치 | UPDATE_SPEC | S | `/me` → `/auth/me` |
| 3 | PATCH /me (프로필 수정) | UPDATE_CODE | M | spec에 있으나 미구현 |
| 4 | GET /books/:isbn/availability | DISCUSS | M | with-libraries에 통합 vs 별도 |
| 5 | Notifications 도메인 (10 endpoints) | UPDATE_SPEC | M | 신규 섹션 작성 |
| 6 | Notices 도메인 | UPDATE_SPEC | S | 신규 섹션 작성 |
| 7 | Feedback 도메인 | UPDATE_SPEC | S | 신규 섹션 작성 |
| 8 | 정보나루 Proxy (20 endpoints) | UPDATE_SPEC | M | 신규 섹션 작성 |
| 9 | GET /libraries/in-bounds | UPDATE_SPEC | S | 지도 핵심 기능 문서화 |
| 10 | GET /libraries/regions | UPDATE_SPEC | S | 홈 드롭다운 문서화 |
| 11 | DB 신규 테이블 10개 | UPDATE_SPEC | L | schema.md에 추가 |
| 12 | users.email nullable | DISCUSS | S | 카카오 email 미수집 정책 결정 |
| 13 | /libraries 지도 페이지 | UPDATE_SPEC | S | route_map.md에 추가 |
| 14 | /region/[region] 폐기 여부 | DISCUSS | S | /libraries로 대체 확정? |
| 15 | /auth/callback 위치 | UPDATE_SPEC | S | route group 외부 위치 반영 |
| 16 | 홈 HeroSearch 제거 | UPDATE_SPEC | S | nearbook_docs/specs 버전 갱신 |
| 17 | /book/[isbn] LibrariesNear 동작 변경 | UPDATE_SPEC | S | 서버사이드 기본좌표 방식 반영 |
| 18 | BookAnalysisSection | UPDATE_SPEC | S | 신규 기능 문서화 |
| 19 | Canvas/Gray 색상 체계 | UPDATE_SPEC | S | design guide 갱신 (P0 #2에 포함) |
| 20 | Resend 이메일 시스템 | UPDATE_SPEC | M | 미문서화 |
| 21 | Web Push 시스템 | UPDATE_SPEC | M | 미문서화 |
| 22 | Phase 0 초과 기능 정리 | DISCUSS | M | Phase 정의 갱신 필요 |
| 23 | Kakao OAuth scope 불일치 | DISCUSS | S | email 필수 vs profile_nickname만 |

### P2 (문서 정합성 — 35건)

주요 항목:
- Books 신규 endpoints 5개 (analysis, loan-item, hot-trend, categories, by-category)
- Libraries 신규 endpoints 4개 (by-region, popular, featured-new-arrivals, :id/trends 등)
- Search 신규 endpoints 2개 (trending, monthly-keywords)
- DELETE /me 미구현
- GET /books/:isbn/related 미구현
- /search 무한스크롤→페이지네이션 변경
- /popular revalidate 변경 (1일→1시간)
- /category/[slug] slug명 변경
- sitemap 신규 페이지 반영
- robots.txt AI 크롤러 차단 규칙
- /library/[id] JSON-LD 누락 (UPDATE_CODE)
- /me 대시보드 미리보기 데이터 (UPDATE_CODE)
- 알라딘 fallback 서비스 분리 구조
- Phase 0 Week 2 초과 기능

### P3 (cosmetic — 21건)

- /about, /contact, /me/settings SPEC_ONLY (Phase 2+)
- 위시리스트/도서관카드 status endpoint
- Font mono/serif 차이
- geography dataType SRID 표기
- /qna, /offline, /digest/downgrade CODE_ONLY
- 기타 minor 파라미터 차이

---

## 6. DISCUSS (사용자 결정 필요)

| # | 항목 | 옵션 | 트레이드오프 |
|---|---|---|---|
| 1 | `/region/[region]` 폐기 | A) `/libraries` 지도로 완전 대체 확정 B) region 페이지 별도 유지 | A: 지도가 더 직관적이나 SEO URL 손실; B: 유지보수 부담 |
| 2 | `users.email` nullable 정책 | A) nullable 유지 (카카오 email 미수집) B) email 필수로 복원 (scope 변경) | A: 가입 마찰 ↓, 이메일 알림 불가 사용자 존재; B: 알림 기능 100% 보장 |
| 3 | Kakao OAuth scope | A) `profile_nickname`만 유지 B) `account_email` 추가 | #2와 연동. B 선택 시 기존 사용자 재동의 필요 |
| 4 | `GET /books/:isbn/availability` | A) with-libraries에 통합 (현행) B) 별도 endpoint 구현 | A: API 콜 줄임; B: 실시간 대출 여부만 빠르게 확인 가능 |
| 5 | `/library/[id]` generateStaticParams | A) on-demand ISR 유지 B) 1,400 전체 사전 빌드 | A: 빌드 빠름; B: 첫 방문 UX 개선 |
| 6 | Phase 정의 갱신 | A) 현재 구현을 Phase 0에 포함시켜 재정의 B) Phase 0.5 중간 단계 신설 | 구현이 spec을 크게 넘어섰으므로 Phase 문서 재정렬 필요 |
| 7 | Affiliate 프로바이더 범위 | A) 알라딘만 Phase 0 B) 6개 전체 Phase 0 | 코드에서 실제 구현된 프로바이더 확인 필요 [UNCERTAIN] |
| 8 | `/about`, `/contact` 페이지 | A) 홈 인라인으로 충분, spec에서 제거 B) Phase 1에서 별도 구현 | 1인 운영이므로 별도 페이지 불필요할 수 있음 |
| 9 | Next.js middleware 인증 | A) middleware.ts로 세션 리프레시 (spec) B) layout.tsx guard (현행) | 코드의 middleware.ts 존재 여부 확인 후 결정 |
| 10 | 검색 무한스크롤 vs 페이지네이션 | A) 페이지네이션 유지 (현행) B) 무한스크롤로 변경 (spec) | A: SEO-friendly, 간단; B: 모바일 UX 좋음 |
| 11 | OG image 동적 생성 | A) opengraph-image.tsx 구현 B) 정적 기본 OG 이미지만 | A: SNS 공유 시 책 커버 표시; B: 구현 비용 절감 |
| 12 | 모니터링 도구 통합 상태 | Sentry, GA4, Better Stack 실제 설정 여부 확인 필요 | 외부 서비스라 코드만으로 완전 확인 불가 [UNCERTAIN] |

---

## 7. UNCERTAIN

| # | 항목 | 이유 |
|---|---|---|
| 1 | Next.js middleware.ts 존재 여부 | 파일 직접 확인 미완 |
| 2 | opengraph-image.tsx 구현 여부 | 파일 직접 확인 미완 |
| 3 | Affiliate 실제 구현된 프로바이더 수 | affiliates.service.ts 상세 미확인 |
| 4 | AdSense 인피드 광고 /search 배치 여부 | ResultList 컴포넌트 내부 미확인 |
| 5 | 모니터링 (Sentry/GA4/Better Stack) 실제 통합 코드 | 설정 파일 직접 확인 미완 |
| 6 | 정보나루 DAILY_LIMIT .env default(500) vs client default(30,000) 의도 | 의도적 차이인지 실수인지 불명 |
| 7 | /book/[isbn] generateStaticParams 코드 구현 여부 | page.tsx 전체 미확인 (sitemap에만 5,000건 존재) |
| 8 | 광고 법적 고지 문구 UI 구현 여부 | 03_legal_disclosure.md 요구사항 vs 실제 컴포넌트 미확인 |
| 9 | Search DTO 실제 필드 목록 | SearchQueryDto 클래스 정의 미확인 |
