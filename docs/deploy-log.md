# 배포 작업 로그

## 인프라 구성

| 서비스 | 플랫폼 | 배포 방식 |
|--------|--------|-----------|
| Web (Next.js) | Vercel | GitHub 연동 자동 배포 |
| API (NestJS) | Oracle Cloud VM | GitHub Actions → Docker → SSH |
| DB | Supabase | 관리형 |

---

## 2026-10-12: Vercel 서버 API 요청의 국가 차단 해제

- Vercel의 `https://api.near-book.com` 요청에서 403이 발생하고, Cloudflare의 한국 외 국가 차단 규칙에 미국 `node` 요청이 차단되는 것을 확인했다.
- 사용자의 명시적 승인 후 규칙 `6cc08baadf60473cabf2cd940f156cbb`만 변경했다. API 호스트 전체를 이 국가 차단 규칙에서 제외했으며, 순서·Block action·Active 상태는 유지했다.
- 적용 식: `(ip.src.country ne "KR" and not cf.client.bot and http.host ne "api.near-book.com")`
- 해외에서도 API 접근이 가능해지는 영향은 승인 시 설명했다. 기존 API 인증·Nest throttling은 변경하지 않았다. DNS·TLS·Vercel 환경변수도 변경하지 않았다.
- 19:57:02 KST Vercel의 지도 프록시 `/api/libraries/in-bounds` HTTP 200과 실제 목록을 확인했다. `/libraries` 목록, 홈 인기대출·급상승 도서, 서울도서관 상세도 표시됐다.
- 특정 책 상세의 not-found와 `/popular`의 준비 중 화면은 남아 있으며 후속 진단이 필요하다. 로컬 주소 정책 수정은 아직 배포하지 않았다.
- rollback 식과 상세 검증/제약은 [P0-01 기록](p0-01-api-routing.md)에 보관했다.

## 2026-10-12: 운영 HTTPS 복구

- 장애: `https://www.near-book.com/` 접속 시 Cloudflare `526 Invalid SSL certificate` 발생.
- 실제 운영 Vercel 프로젝트는 `chonghg22s-projects/nearbook-web`. 로컬 CLI 연결도 이 프로젝트로 수정했다.
- Vercel Domains 화면에서 두 웹 도메인이 `Invalid Configuration`이며 Cloudflare 프록시를 끄도록 안내하는 것을 확인했다.
- 다음 두 레코드의 CNAME 대상은 유지하고 프록시만 `DNS only`로 변경했다.

| 이름 | 타입 | 대상 | 프록시 |
|------|------|------|--------|
| `near-book.com` | CNAME | `09b687c301b1526c.vercel-dns-017.com` | DNS only |
| `www.near-book.com` | CNAME | `09b687c301b1526c.vercel-dns-017.com` | DNS only |

- `api.near-book.com`의 Oracle Cloud A 레코드와 Cloudflare 프록시는 유지했다. SSL/TLS 모드도 변경하지 않았다.
- 변경 후 Vercel이 SSL 인증서를 발급했고, 두 웹 도메인 모두 `Valid Configuration`으로 전환됐다.
- 브라우저에서 인증서 경고 없이 HTTPS 홈페이지 접속을 확인했다. `https://near-book.com/`도 `https://www.near-book.com/`으로 이동한다.
- 이 확인은 HTTPS와 도메인 연결에 대한 것이며, 검색·도서관 데이터 등 API 기능 전체를 검증한 것은 아니다.
- 후속 조회: `vercel domains inspect www.near-book.com`, `cf dns records list --zone near-book.com`.

## 2026-05-07: Vercel 배포 설정

### 완료된 작업

1. **`output: 'standalone'` 제거** (`apps/web/next.config.ts`)
   - Docker용 설정이었음. Vercel은 자체 serverless 모드가 최적.

2. **Vercel 대시보드 설정 가이드 정리** (아래 참고)

### Vercel 대시보드에서 해야 할 설정

1. **New Project** → GitHub repo `nearbook` 연결
2. **Root Directory**: `apps/web`
3. **Framework Preset**: Next.js (자동 감지됨)
4. **Build Command**: `cd ../.. && pnpm turbo build --filter=@nearbook/web`
   - 또는 기본값 `next build`도 동작함 (turbo 캐시 활용하려면 위 명령 권장)
5. **Install Command**: (비워두기 — Vercel이 pnpm workspace 자동 감지)
6. **Output Directory**: (비워두기 — 기본값 `.next`)
7. **Node.js Version**: 20.x

### 환경변수 (Vercel Dashboard → Settings → Environment Variables)

```
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
NEXT_PUBLIC_API_BASE_URL=<oracle-cloud-api-url>  # API 서버 배포 후 설정
INTERNAL_API_URL=<oracle-cloud-api-url>          # rewrites 프록시용
```

> `INTERNAL_API_URL`은 서버사이드에서 API 서버로 프록시할 때 사용 (next.config.ts rewrites).
> Oracle Cloud API 배포 전까지는 임시값 또는 빈 값으로 둬도 됨.

### 배포 흐름

```
git push main → Vercel webhook 자동 감지 → 빌드 + 배포
PR 생성 → Preview URL 자동 생성
```

### 도메인 연결 (Cloudflare + Vercel) — 완료

- **도메인 DNS**: Cloudflare 관리
- **Vercel**: Settings → Domains에서 도메인 추가
- **Cloudflare DNS 레코드**:
  - `CNAME` `@` → `cname.vercel-dns.com` (DNS only)
  - `CNAME` `www` → `cname.vercel-dns.com` (DNS only)
- **주의**: Cloudflare 프록시(주황색 구름) 끄고 **DNS only(회색)** 사용
  - Vercel 자체 SSL과 충돌 방지
  - 프록시 사용 시 SSL/TLS → Full (strict) 필요

---

## 2026-05-07: Oracle Cloud API 배포 설정

### VM 사양

- **Shape**: VM.Standard.E2.1.Micro (Always Free)
- **OCPU**: 1 / **RAM**: 1GB + 4GB swap
- VM에서 Docker 빌드 금지 (메모리 부족) → GitHub Actions에서 빌드, VM은 pull만

### CD 워크플로 (`.github/workflows/cd.yml`) — 완료

- **트리거**: `main` push + `apps/api/**`, `packages/**` 변경 시
- **흐름**: GitHub Actions에서 Docker 빌드 → GHCR push → Oracle VM SSH 접속 → docker pull → 컨테이너 교체
- 컨테이너명: `nearbook-api`, 포트 3001

### GitHub Secrets 등록 필요

| Secret | 값 |
|--------|-----|
| `ORACLE_HOST` | VM 공인 IP |
| `ORACLE_USER` | SSH 유저명 (보통 `ubuntu` 또는 `opc`) |
| `ORACLE_SSH_KEY` | SSH private key |
| `GHCR_TOKEN` | GitHub PAT (packages:read 권한) |

### VM 사전 준비 작업

1. Docker 설치
2. `.env` 파일 생성: `/home/<user>/nearbook/.env`
   ```
   DATABASE_URL=<supabase-db-url>
   SUPABASE_URL=<supabase-url>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   PORT=3001
   JEONGBONARU_API_KEY=<api-key>
   JEONGBONARU_DAILY_LIMIT=500
   ```
3. VCN Security List에서 인바운드 포트 허용: 22, 80, 443, 3001
4. Nginx + SSL 설정 (Let's Encrypt)

---

## 앞으로 해야 할 작업

### Vercel (추가)
- [x] Vercel 대시보드에서 실제 프로젝트 생성 및 GitHub repo 연결
- [x] 환경변수 입력
- [x] 커스텀 도메인 연결 (Cloudflare DNS 설정 완료)
- [ ] 첫 배포 확인 및 빌드 에러 수정 (있을 경우)

### Oracle Cloud (API 배포)
- [x] GitHub Actions CD 워크플로 완성 (SSH 배포 포함)
- [x] VM에 Docker 설치 (이미 설치됨)
- [x] VCN Security List 설정 (포트 22, 3001 인바운드 허용)
- [x] GitHub Secrets 등록 (`ORACLE_HOST`, `ORACLE_USER`, `ORACLE_SSH_KEY`, `GHCR_TOKEN`)
- [x] VM에 `.env` 파일 설정 (`/home/ubuntu/nearbook/apps/api/.env`)
- [x] 첫 배포 테스트 완료 — API 서버 정상 가동 (`http://140.245.78.138:3001`)
- [ ] Nginx reverse proxy + SSL (Let's Encrypt) 설정
- [ ] 배포 후 Vercel 환경변수에 `INTERNAL_API_URL` 업데이트

### 기타
- [ ] CI 워크플로(ci.yml)에서 web/api 각각 path filter 적용 고려
- [ ] 모니터링/로깅 설정
