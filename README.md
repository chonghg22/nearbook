# NearBook

우리동네책(`near-book.com`)은 공공도서관 데이터를 기반으로 인기 도서, 카테고리별 추천, 도서관별 신착 도서, 도서 상세 정보를 탐색할 수 있는 서비스입니다. 사용자는 주변 도서관을 찾고, 관심 도서를 저장하고, 외부 구매/구독 옵션까지 한 화면에서 확인할 수 있습니다.

## 고도화 작업 관리

- [해야 할 일 체크리스트](TODO.md): 우선순위, 작업 ID, 완료 기준과 착수 순서.
- [운영 화면·소스 분석 보고서](docs/upgrade-analysis-2026-10-12.md): 문제 근거와 개선 방향.

## 프로젝트 기획

### 문제 정의
- 공공도서관 데이터는 존재하지만 일반 사용자가 소비하기 쉽게 가공된 경험은 부족합니다.
- 어떤 도서관에 어떤 책 흐름이 있는지, 지금 많이 빌리는 책이 무엇인지, 신착도서가 무엇인지 한 번에 보기 어렵습니다.
- 도서 검색 이후의 행동이 분산돼 있어 보관, 제휴 링크 이동, 피드백 수집 흐름이 단절되기 쉽습니다.

### 해결 방향
- 정보나루 기반 데이터를 앱 친화적인 큐레이션 형태로 가공합니다.
- 검색, 인기/급상승/카테고리/신착 큐레이션을 웹 중심으로 빠르게 탐색할 수 있게 제공합니다.
- 사용자의 도서관 카드, 위시리스트, 피드백, 외부 구매 옵션을 하나의 서비스 흐름으로 연결합니다.

### 주요 사용자 경험
- 도서 검색 및 상세 조회
- 인기 도서 / 급상승 도서 / 추천 키워드 탐색
- 카테고리별 도서 큐레이션 탐색
- 도서관별 신착 도서 탐색
- 내 도서관 카드 / 위시리스트 관리
- 피드백 제출
- 도서 상세에서 AdSense 광고와 알라딘 TTB 기반 제휴 옵션 제공

## 현재 구현 범위

### Frontend
- 홈, 검색, 인기, 급상승, 카테고리, 도서관, 신착도서, 마이페이지, 공지/약관/개인정보 페이지
- 책 상세 페이지에서 제휴 옵션과 광고 슬롯 노출
- `robots.txt`, `sitemap.xml`, canonical, JSON-LD, `ads.txt` 적용

### Backend
- 도서, 검색, 도서관, 위시리스트, 피드백, 공지, 인증 API
- 정보나루 연동 및 큐레이션 캐시 적재
- 인기/키워드/신착/카테고리 큐레이션 cron 및 수동 적재 스크립트
- 알라딘 TTB 기반 제휴 링크 API

### 최근 반영 작업
- Google AdSense 스크립트 및 광고 슬롯 통합
- `ads.txt` 배포
- 알라딘 TTB + 전자책/오디오북 딥링크 기반 제휴 옵션 추가
- 카테고리 / 신착도서 화면의 빈 데이터 처리 및 큐레이션 로직 보정
- 정보나루 응답 오류 처리 강화 및 큐레이션 적재 스크립트 추가
- `www.near-book.com` 기준 canonical / sitemap / robots / structured data 정리

## 기술 구성

### Monorepo
- `pnpm workspace`
- `Turborepo`

### Frontend
- `Next.js 15`
- `React 19`
- `TypeScript`
- `Tailwind CSS`
- `SWR`
- 자체 세션/인증 클라이언트 (Kakao OAuth + JWT)

### Backend
- `NestJS`
- `TypeScript`
- `Axios`
- `xml2js`
- `Jest`

### Database
- `PostgreSQL`
- `Drizzle ORM`
- `PostGIS`
- self-hosted (Docker 컨테이너 `nearbook-db`) — 자체 인증은 API의 Kakao OAuth + JWT(`AUTH_JWT_SECRET`)

### External Services
- `도서관 정보나루` API
- `Google AdSense`
- `Aladin TTB`
- `Naver Map` 클라이언트 연동용 환경변수 사용

## 저장소 구조

```text
.
├── apps
│   ├── api        # NestJS API
│   └── web        # Next.js 웹 앱
├── packages
│   ├── db         # Drizzle schema, migrations, DB client
│   ├── config     # 공용 설정
│   └── shared-types
└── .github
    └── workflows  # CI/CD
```

## 핵심 아키텍처

### Web
- App Router 기반 SSR/ISR 페이지
- API 서버와 분리된 프론트엔드 배포
- SEO 메타데이터, sitemap, robots, JSON-LD 제공

### API
- NestJS 모듈형 구조
- 외부 API 호출 결과를 DB 큐레이션 테이블로 캐시
- 요청량 제한이 있는 정보나루 호출을 cron/수동 스크립트로 보완

### Data
- `nearbook` 스키마 기준으로 테이블 분리
- 주요 테이블:
  - `libraries`
  - `book_cache`
  - `wishlists`
  - `events`
  - `home_curations`
  - `library_curations`
  - `category_curations`
  - `pending_lookups`

## 로컬 실행

### 요구 사항
- Node.js 20+
- pnpm 9+
- PostgreSQL 연결 정보 (self-hosted PostGIS)

### 설치
```bash
pnpm install
```

### 환경변수
- 루트 예시: `.env.example`
- 웹 예시: `apps/web/.env.example`
- API/DB는 각 앱의 실제 `.env`를 별도로 구성

주요 값:
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_SITE_URL=https://www.near-book.com
NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-...
DATABASE_URL=postgres://...
JEONGBONARU_API_KEY=...
ALADIN_TTB_KEY=ttb...
```

### 개발 서버
```bash
pnpm dev
```

### 개별 실행
```bash
pnpm --filter @nearbook/web dev
pnpm --filter @nearbook/api dev
```

### 타입 체크 / 빌드
```bash
pnpm type-check
pnpm build
```

### 큐레이션 수동 적재
```bash
pnpm --filter @nearbook/api refresh:curations --scope=categories,libraries
```

## 배포

### Frontend
- 플랫폼: `jack-server` 자가호스팅 (Docker 컨테이너 `nearbook-web`, Cloudflare Tunnel 뒤)
- 대상: `apps/web`
- 운영 도메인: `https://www.near-book.com`
- 배포: 서버에서 `scripts/deploy-web.sh` 실행 (현재 git HEAD로 이미지 빌드 → compose `web` 교체 → health check·스모크테스트, `--rollback` 지원)
- 스택/설정: `/opt/stacks/nearbook/compose.yaml`, 빌드 공개값 `/opt/stacks/nearbook/.env.web-build`

### Backend
- 플랫폼: `jack-server` 자가호스팅 (Cloudflare Tunnel 뒤)
- 실행 형태: Docker 컨테이너
- 대상: `apps/api`
- 포트: `3001`

### Backend 배포 방식
- jack-server의 self-hosted GitHub Actions 러너가 `main`의 `apps/api/**`·`packages/**` 변경 시 `.github/workflows/cd-api.yml`로 배포
- 러너가 서버 로컬 `scripts/deploy-api-server.sh` 실행: 이미지 빌드 → compose `api` 교체 → `/ready` 레디니스 확인 → 실패 시 자동 롤백(`--rollback`)
- 스택/런타임 env: `/opt/stacks/nearbook/compose.yaml`, `/opt/stacks/nearbook/.env.api`
- (구 `.github/workflows/cd.yml`의 ghcr→Oracle SSH 배포는 **폐기**, 수동 트리거만 남김)

### CI
- Pull Request 기준으로 GitHub Actions에서 아래 항목 실행
  - install
  - lint
  - type-check
  - build

## 웹 트래픽 분석 (Umami)

- 플랫폼: `jack-server` 자가호스팅 Umami (`/opt/stacks/umami`), Cloudflare Tunnel 뒤
- 대시보드: `https://analytics.near-book.com`
- 계측: `apps/web/app/layout.tsx`의 추적 스크립트. `NEXT_PUBLIC_UMAMI_WEBSITE_ID`/`NEXT_PUBLIC_UMAMI_SRC` build-arg로 주입 (Vercel Analytics 대체)
- 참고: 검색·보유 등 **제품 이벤트 분석**은 자체 이벤트 파이프라인(별도)이며 `docs/analytics-runbook.md` 참고

## 광고 및 수익화

### AdSense
- 전역 AdSense 스크립트 삽입
- 광고 슬롯 컴포넌트 기반 배치
- `public/ads.txt` 제공

### Affiliate
- 책 상세에서 제휴 옵션 노출
- 알라딘 TTB API로 신간/중고 조회
- 전자책/오디오북 서비스는 검색 딥링크 제공
- 클릭 이벤트는 웹 analytics API에서 수집 가능하도록 구조 마련

## 운영 체크 포인트

- 웹 빌드 공개값(`/opt/stacks/nearbook/.env.web-build`)의 `NEXT_PUBLIC_SITE_URL`은 반드시 `https://www.near-book.com`
- AdSense 검증 시 `ads.txt`, AdSense 스크립트, 크롤링 가능 여부 확인
- Search Console에는 `https://www.near-book.com/sitemap.xml` 제출
- 정보나루는 호출 한도와 IP 등록 여부에 따라 적재 성공 여부가 달라질 수 있음

## 명령어 요약

```bash
pnpm dev
pnpm build
pnpm type-check
pnpm --filter @nearbook/web type-check
pnpm --filter @nearbook/api type-check
pnpm --filter @nearbook/api refresh:curations
```
