import {
  pgSchema, serial, text, varchar, timestamp, integer, boolean, jsonb,
  uniqueIndex, index, primaryKey, customType, doublePrecision,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

// nearbook 스키마 선언
export const nearbook = pgSchema('nearbook')

// PostGIS geography type
const geography = customType<{ data: string; driverData: string }>({
  dataType() { return 'geography(Point, 4326)' },
})

// 1. 사용자 (email nullable — 카카오는 이메일 미제공)
export const users = nearbook.table('users', {
  id: serial('id').primaryKey(),
  supabaseUserId: varchar('supabase_user_id', { length: 64 }).notNull().unique(),
  email: varchar('email', { length: 256 }),           // ← nullable로 변경
  nickname: varchar('nickname', { length: 64 }),
  region: varchar('region', { length: 64 }),
  plan: varchar('plan', { length: 16 }).notNull().default('free'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  emailIdx: uniqueIndex('users_email_idx').on(t.email),
  supabaseIdx: uniqueIndex('users_supabase_idx').on(t.supabaseUserId),
}))

export const usersRelations = relations(users, ({ many }) => ({
  wishlists: many(wishlists),
  libraryCards: many(libraryCards),
}))

// 2. 도서관
export const libraries = nearbook.table('libraries', {
  id: integer('id').primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  address: varchar('address', { length: 256 }).notNull(),
  region: varchar('region', { length: 64 }).notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  location: geography('location').notNull(),
  phone: varchar('phone', { length: 32 }),
  homepage: varchar('homepage', { length: 256 }),
  operatingHours: jsonb('operating_hours'),
  type: varchar('type', { length: 32 }),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  regionIdx: index('libraries_region_idx').on(t.region),
  locationIdx: index('libraries_location_gix').on(t.location).using(sql`gist`),
}))

// 3. 도서관 카드
export const libraryCards = nearbook.table('library_cards', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  libraryId: integer('library_id').notNull().references(() => libraries.id),
  nickname: varchar('nickname', { length: 64 }),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  userIdx: index('library_cards_user_idx').on(t.userId),
  uniqueUserLibrary: uniqueIndex('library_cards_unique').on(t.userId, t.libraryId),
}))

export const libraryCardsRelations = relations(libraryCards, ({ one }) => ({
  user: one(users, { fields: [libraryCards.userId], references: [users.id] }),
  library: one(libraries, { fields: [libraryCards.libraryId], references: [libraries.id] }),
}))

// 4. 책 메타 캐시
export const bookCache = nearbook.table('book_cache', {
  isbn: varchar('isbn', { length: 20 }).primaryKey(),
  title: varchar('title', { length: 512 }).notNull(),
  author: varchar('author', { length: 256 }),
  publisher: varchar('publisher', { length: 128 }),
  publishedYear: integer('published_year'),
  coverUrl: varchar('cover_url', { length: 512 }),
  summary: text('summary'),
  category: varchar('category', { length: 64 }),
  aladinItemId: varchar('aladin_item_id', { length: 32 }),
  cachedAt: timestamp('cached_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
}, (t) => ({
  titleIdx: index('book_cache_title_idx').on(t.title),
  expiresIdx: index('book_cache_expires_idx').on(t.expiresAt),
}))

// 5. 위시리스트
export const wishlists = nearbook.table('wishlists', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  isbn: varchar('isbn', { length: 20 }).notNull(),
  note: text('note'),
  addedAt: timestamp('added_at').notNull().defaultNow(),
}, (t) => ({
  userIdx: index('wishlists_user_idx').on(t.userId),
  uniqueUserBook: uniqueIndex('wishlists_unique').on(t.userId, t.isbn),
}))

export const wishlistsRelations = relations(wishlists, ({ one }) => ({
  user: one(users, { fields: [wishlists.userId], references: [users.id] }),
}))

// 6. 검색 로그
export const searchLogs = nearbook.table('search_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  query: varchar('query', { length: 256 }).notNull(),
  resultCount: integer('result_count').notNull(),
  region: varchar('region', { length: 64 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  queryIdx: index('search_logs_query_idx').on(t.query),
  createdIdx: index('search_logs_created_idx').on(t.createdAt),
}))

// 7. 인기도서
export const popularBooks = nearbook.table('popular_books', {
  id: serial('id').primaryKey(),
  region: varchar('region', { length: 64 }).notNull(),
  period: varchar('period', { length: 16 }).notNull(),
  rank: integer('rank').notNull(),
  isbn: varchar('isbn', { length: 20 }).notNull(),
  loanCount: integer('loan_count').notNull(),
  computedAt: timestamp('computed_at').notNull().defaultNow(),
}, (t) => ({
  regionPeriodIdx: index('popular_books_region_period_idx').on(t.region, t.period),
}))

// 8. 분석 이벤트
export const events = nearbook.table('events', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  type: varchar('type', { length: 32 }).notNull(),
  payload: jsonb('payload'),
  sessionId: varchar('session_id', { length: 64 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  typeIdx: index('events_type_idx').on(t.type),
  createdIdx: index('events_created_idx').on(t.createdAt),
}))

// 9. API 호출 한도 추적
export const apiUsage = nearbook.table('api_usage', {
  id: serial('id').primaryKey(),
  provider: varchar('provider', { length: 32 }).notNull(),
  endpoint: varchar('endpoint', { length: 128 }).notNull(),
  statusCode: integer('status_code'),
  cachedHit: boolean('cached_hit').notNull().default(false),
  durationMs: integer('duration_ms'),
  priority: varchar('priority', { length: 8 }),
  // 'HIGH' | 'LOW' | null (legacy 데이터 호환)
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  providerCreatedIdx: index('api_usage_provider_created_idx').on(t.provider, t.createdAt),
  providerDayIdx: index('api_usage_provider_day_idx').on(t.provider, t.statusCode, t.createdAt),
}))

// 10. 정보나루 호출 미스 큐 (한도 초과 시 적재, cron이 다음날 처리)
export const pendingLookups = nearbook.table('pending_lookups', {
  id: serial('id').primaryKey(),
  lookupType: varchar('lookup_type', { length: 16 }).notNull(),
  // 'isbn' | 'keyword' | 'lib_book'
  dedupeKey: varchar('dedupe_key', { length: 256 }).notNull(),
  // 정규화 형식: "isbn:{isbn13}" | "keyword:{normalizedKeyword}" | "lib_book:{isbn}:{libCode}"
  payload: jsonb('payload').notNull(),
  // lookupType별 호출 파라미터 jsonb
  priority: varchar('priority', { length: 8 }).notNull().default('LOW'),
  // 'HIGH' (사용자 직접 트리거) | 'LOW' (백그라운드)
  retryCount: integer('retry_count').notNull().default(0),
  lastError: text('last_error'),
  requestedAt: timestamp('requested_at').notNull().defaultNow(),
  processedAt: timestamp('processed_at'),
}, (t) => ({
  // 미처리 상태에서만 중복 INSERT 차단 (partial unique)
  dedupePartial: uniqueIndex('pending_lookups_dedupe_partial')
    .on(t.lookupType, t.dedupeKey)
    .where(sql`processed_at IS NULL`),
  // cron 처리용 큐 스캔 인덱스 (priority, requested_at 순)
  pendingIdx: index('pending_lookups_pending_idx')
    .on(t.priority, t.requestedAt)
    .where(sql`processed_at IS NULL`),
  // 회수율 분석용
  processedIdx: index('pending_lookups_processed_idx').on(t.processedAt),
}))

// 11. 공지사항
export const notices = nearbook.table('notices', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 256 }).notNull(),
  body: text('body').notNull(),
  category: varchar('category', { length: 32 }).notNull().default('general'),
  isPublished: boolean('is_published').notNull().default(true),
  isPinned: boolean('is_pinned').notNull().default(false),
  publishedAt: timestamp('published_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  publishedIdx: index('notices_published_idx').on(t.isPublished, t.publishedAt),
  categoryIdx: index('notices_category_idx').on(t.category),
}))

// 12. 오류 신고 / 개선 제안
export const feedback = nearbook.table('feedback', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  category: varchar('category', { length: 32 }).notNull(),
  title: varchar('title', { length: 256 }).notNull(),
  body: text('body').notNull(),
  contactEmail: varchar('contact_email', { length: 256 }),
  pageUrl: varchar('page_url', { length: 512 }),
  userAgent: varchar('user_agent', { length: 512 }),
  status: varchar('status', { length: 32 }).notNull().default('open'),
  adminNote: text('admin_note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  statusIdx: index('feedback_status_idx').on(t.status, t.createdAt),
  categoryIdx: index('feedback_category_idx').on(t.category),
  userIdx: index('feedback_user_idx').on(t.userId),
}))

