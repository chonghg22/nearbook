# 배포 작업 로그

## 인프라 구성

| 서비스 | 플랫폼 | 배포 방식 |
|--------|--------|-----------|
| Web (Next.js) | Vercel | GitHub 연동 자동 배포 |
| API (NestJS) | Oracle Cloud VM | GitHub Actions → Docker → SSH |
| DB | Supabase | 관리형 |

---

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
- [ ] VM에 Docker 설치
- [ ] VCN Security List 설정 (포트 22, 80, 443, 3001 인바운드 허용)
- [ ] GitHub Secrets 등록 (`ORACLE_HOST`, `ORACLE_USER`, `ORACLE_SSH_KEY`, `GHCR_TOKEN`)
- [ ] VM에 `.env` 파일 생성 (`/home/<user>/nearbook/.env`)
- [ ] Nginx reverse proxy + SSL (Let's Encrypt) 설정
- [ ] 첫 배포 테스트
- [ ] 배포 후 Vercel 환경변수에 `INTERNAL_API_URL` 업데이트

### 기타
- [ ] CI 워크플로(ci.yml)에서 web/api 각각 path filter 적용 고려
- [ ] 모니터링/로깅 설정
