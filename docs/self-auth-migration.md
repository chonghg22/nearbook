# Supabase Auth → Nearbook 자체 로그인 전환

2026-11-03 작성. DB는 2026-11-01에 이미 `jack-server` PostgreSQL로 이관됐고(`nearbook_live_20261101`), 이 문서는 마지막 남은 Supabase 의존인 **카카오 로그인/세션**을 옮기는 절차다.

## 구조

```
브라우저 ──/auth/kakao──▶ Next(웹) ──302──▶ 카카오 authorize (state: httpOnly nb_oauth 쿠키)
카카오 ──/auth/callback?code&state──▶ Next ──POST /auth/kakao/session {code, redirectUri}──▶ API
API: 카카오 code 교환 → /v2/user/me → auth_identities(kakao id) ↔ users → auth_sessions 생성
API ──{accessToken(15분 JWT), refreshToken}──▶ Next ──httpOnly 쿠키 nb_at / nb_rt──▶ 브라우저
```

- 액세스 토큰: HS256, `iss=nearbook-api`, `aud=nearbook`, `sub=users.supabase_user_id`, 15분. API와 웹이 `AUTH_JWT_SECRET`을 공유한다.
- 리프레시 토큰: 256bit 랜덤, DB에는 SHA-256만 저장. 회전 없이 유휴 30일(최대 90일) 슬라이딩 만료. 로그아웃 시 폐기.
- 웹 미들웨어가 만료 60초 전 `/auth/refresh`로 갱신한다. 브라우저 JS는 `/auth-api/session`으로만 액세스 토큰을 받아 기존처럼 `Authorization: Bearer`로 API를 호출한다.
- `users.supabase_user_id`는 이름만 남은 내부 사용자 식별자로 계속 쓴다(기존 찜·도서관 카드 보존). 신규 사용자는 랜덤 UUID.
- API는 전환 기간 동안 `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`가 설정돼 있으면 기존 Supabase 토큰도 계속 받는다.

## 환경 변수

| 위치 | 이름 | 값 |
|---|---|---|
| API `/opt/stacks/nearbook/.env.api` | `AUTH_JWT_SECRET` | 32자 이상 랜덤 (`openssl rand -base64 48`) — 웹과 동일 |
| | `KAKAO_REST_API_KEY` | 카카오 앱 REST API 키 |
| | `KAKAO_CLIENT_SECRET` | 카카오 로그인 Client Secret (사용 설정 시) |
| | `AUTH_REDIRECT_URIS` | `https://www.near-book.com/auth/callback` |
| Vercel (Production) | `AUTH_JWT_SECRET` | API와 동일 |
| | `KAKAO_REST_API_KEY` | API와 동일 |

카카오 개발자 콘솔 → 카카오 로그인 → Redirect URI에 `https://www.near-book.com/auth/callback` 추가. 기존 Supabase callback URI는 전환 완료까지 유지.

## 전환 순서 (API → 웹)

1. **DB**: `packages/db/src/migrations/0011_self_auth.sql`을 `nearbook_live_20261101`에 적용(추가 전용, 재실행 안전). 적용 전 백업 1회.
2. **기존 사용자 연결**: Supabase `auth.identities`(provider=kakao)의 `provider_id`(카카오 회원번호)를 `auth_identities`에 넣는다.
   ```sql
   -- Supabase(읽기): \copy (SELECT user_id::text, provider_id FROM auth.identities WHERE provider='kakao') TO 'kakao_ids.csv' CSV
   -- 서버 DB:
   CREATE TEMP TABLE legacy_kakao(supabase_user_id text, provider_id text);
   \copy legacy_kakao FROM 'kakao_ids.csv' CSV
   INSERT INTO nearbook.auth_identities(user_id, provider, provider_user_id)
   SELECT u.id, 'kakao', l.provider_id FROM legacy_kakao l JOIN nearbook.users u ON u.supabase_user_id = l.supabase_user_id
   ON CONFLICT (provider, provider_user_id) DO NOTHING;
   ```
   로컬 users 행이 없는 Supabase 계정(데이터 없음)은 첫 로그인 때 새로 만들어진다.
3. **API 배포**: main의 새 이미지를 서버에서 빌드하고 env 추가 후 교체. `/ready` 통과, 익명 개인 API 401, `POST /auth/refresh` 잘못된 토큰 401 확인.
4. **웹 배포**: Vercel env 설정 → main 배포. 기존 Supabase 세션 쿠키(`sb-*`)는 미들웨어가 지운다. 사용자는 1회 재로그인.
5. **실사용 확인**(사용자): 카카오 로그인 → 기존 찜 유지 → 새로고침/15분 후 유지 → 로그아웃.

## 롤백

API 새 이미지는 Supabase 토큰과 자체 토큰을 모두 받으므로 웹만 Vercel에서 이전 배포로 되돌리면 Supabase 로그인이 그대로 동작한다. DB 변경은 테이블 추가뿐이라 되돌릴 필요가 없다.

## 2단계 정리 (안정화 후)

- API env에서 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` 제거 → 레거시 검증 경로 비활성.
- 코드에서 레거시 Supabase 검증 제거, Vercel의 `NEXT_PUBLIC_SUPABASE_*` 제거.
- 서버 DB의 `auth.uid()/role()/jwt()` 호환 함수와 RLS 정책 12개 정리(API는 소유자 권한이라 RLS 미사용). 컬럼명 `supabase_user_id` 변경은 선택.
- Supabase 프로젝트: 최종 백업 후 일시중지/삭제(별도 승인).

## 알려진 사항

- API의 전역 rate limit(`ThrottlerGuard`)은 `req.ip` 기준인데 Cloudflare 터널 뒤라 모든 요청이 하나의 IP로 묶인다(기존 문제). 인증 엔드포인트에는 별도 제한을 두지 않았다.
- 개인정보처리방침의 인증 문구를 카카오 로그인 기준으로 바꿨다. 시행일(`UPDATED_AT`) 갱신 여부는 게시 전에 결정한다.
