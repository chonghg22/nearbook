# @nearbook/db

Drizzle ORM + Supabase Postgres. 모든 테이블은 `nearbook` 스키마에 위치 (`public` 미사용).

## 사전 준비
1. Supabase Dashboard → Database → Extensions: `postgis`, `pg_trgm` 활성화
2. SQL Editor에서 `sql/00_init_schema.sql` 실행
3. `.env` 작성 (`.env.example` 참고)

## 마이그레이션
```bash
pnpm --filter @nearbook/db db:generate   # SQL 마이그레이션 생성
pnpm --filter @nearbook/db db:push       # Supabase에 적용
```
4. SQL Editor에서 `sql/01_postgis_functions.sql` 실행
5. `pnpm --filter @nearbook/db db:studio`로 검증