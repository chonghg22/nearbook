import {
  pgSchema,
  serial,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  jsonb,
  uniqueIndex,
  index,
  customType,
  doublePrecision,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

// 모든 테이블은 nearbook 스키마에 위치 (public 금지)
export const nearbookSchema = pgSchema('nearbook')

// PostGIS geography type (위치 좌표)
const geography = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'geography'
  },
})

// 1. 사용자
export const users = nearbookSchema.table('users', {
  id: serial('id').primaryKey(),
  supabaseUserId: varchar('supabase_user_id', { length: 64 }).notNull().unique(),
  email: varchar('email', { length: 256 }).unique(),
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
  feedbacks: many(feedback),
}))

// 2. 도서관 (1,400+ 마스터)
export const libraries = nearbookSchema.table('libraries', {
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
  locationIdx: index('libraries_location_gix').using('gist', t.location),
}))

// 3. 사용자 도서관 카드
export const libraryCards = nearbookSchema.table('library_cards', {
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
export const bookCache = nearbookSchema.table('book_cache', {
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
  titleSearchIdx: index('book_cache_title_trgm_idx').using('gin', t.title.op('gin_trgm_ops')),
  expiresIdx: index('book_cache_expires_idx').on(t.expiresAt),
}))

// 5. 위시리스트
export const wishlists = nearbookSchema.table('wishlists', {
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
export const searchLogs = nearbookSchema.table('search_logs', {
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

// 7. 피드백
export const feedback = nearbookSchema.table('feedback', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  category: varchar('category', { length: 32 }).notNull(),
  title: varchar('title', { length: 256 }).notNull(),
  body: text('body').notNull(),
  contactEmail: varchar('contact_email', { length: 256 }),
  pageUrl: varchar('page_url', { length: 512 }),
  userAgent: varchar('user_agent', { length: 512 }),
  status: varchar('status', { length: 16 }).notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  userIdx: index('feedback_user_idx').on(t.userId),
}))

export const feedbackRelations = relations(feedback, ({ one }) => ({
  user: one(users, { fields: [feedback.userId], references: [users.id] }),
}))

// 8. 인기도서 집계
export const popularBooks = nearbookSchema.table('popular_books', {
  id: serial('id').primaryKey(),
  region: varchar('region', { length: 64 }).notNull(),
  period: varchar('period', { length: 16 }).notNull(),
  rank: integer('rank').notNull(),
  isbn: varchar('isbn', { length: 20 }).notNull(),
  loanCount: integer('loan_count').notNull(),
  computedAt: timestamp('computed_at').notNull().defaultNow(),
}, (t) => ({
  regionPeriodIdx: index('popular_books_region_period_idx').on(t.region, t.period),
  isbnIdx: index('popular_books_isbn_idx').on(t.isbn),
}))

// 9. 분석 이벤트
export const events = nearbookSchema.table('events', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  type: varchar('type', { length: 32 }).notNull(),
  payload: jsonb('payload'),
  sessionId: varchar('session_id', { length: 64 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  typeIdx: index('events_type_idx').on(t.type),
  createdIdx: index('events_created_idx').on(t.createdAt),
  userIdx: index('events_user_idx').on(t.userId),
}))

// 10. API 호출 한도 추적
export const apiUsage = nearbookSchema.table('api_usage', {
  id: serial('id').primaryKey(),
  provider: varchar('provider', { length: 32 }).notNull(),
  endpoint: varchar('endpoint', { length: 128 }).notNull(),
  statusCode: integer('status_code'),
  cachedHit: boolean('cached_hit').notNull().default(false),
  durationMs: integer('duration_ms'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  providerCreatedIdx: index('api_usage_provider_created_idx').on(t.provider, t.createdAt),
}))

// 11. 공지사항
export const notices = nearbookSchema.table('notices', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 256 }).notNull(),
  content: text('content').notNull(),
  category: varchar('category', { length: 32 }).notNull().default('general'),
  isPinned: boolean('is_pinned').notNull().default(false),
  isPublished: boolean('is_published').notNull().default(true),
  publishedAt: timestamp('published_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  publishedIdx: index('notices_published_idx').on(t.isPublished, t.publishedAt),
}))

// 12. 비동기 정보 조회 큐 (정보나루 한도 초과 시 사용)
export const pendingLookups = nearbookSchema.table('pending_lookups', {
  id: serial('id').primaryKey(),
  lookupType: varchar('lookup_type', { length: 32 }).notNull(), // 'isbn', 'keyword', 'lib_book'
  dedupeKey: varchar('dedupe_key', { length: 256 }).unique(),
  payload: jsonb('payload').notNull(),
  priority: varchar('priority', { length: 16 }).notNull().default('LOW'), // 'HIGH', 'LOW'
  retryCount: integer('retry_count').notNull().default(0),
  requestedAt: timestamp('requested_at').notNull().defaultNow(),
  processedAt: timestamp('processed_at'),
  lastError: text('last_error'),
}, (t) => ({
  statusIdx: index('pending_lookups_status_idx').on(t.processedAt, t.retryCount),
}))

// 13. 홈 큐레이션 캐시 (정보나루 홈 섹션)
export const homeCurations = nearbookSchema.table('home_curations', {
  id: serial('id').primaryKey(),
  section: varchar('section', { length: 32 }).notNull(),
  periodKey: varchar('period_key', { length: 16 }).notNull(),
  rank: integer('rank').notNull(),
  isbn: varchar('isbn', { length: 20 }),
  word: varchar('word', { length: 128 }),
  title: varchar('title', { length: 512 }),
  author: varchar('author', { length: 256 }),
  publisher: varchar('publisher', { length: 128 }),
  coverUrl: varchar('cover_url', { length: 512 }),
  loanCount: integer('loan_count'),
  difference: integer('difference'),
  baseWeekRank: integer('base_week_rank'),
  pastWeekRank: integer('past_week_rank'),
  weight: doublePrecision('weight'),
  sourceDate: varchar('source_date', { length: 16 }),
  fetchedAt: timestamp('fetched_at').notNull().defaultNow(),
}, (t) => ({
  sectionPeriodIdx: index('home_curations_section_period_idx').on(t.section, t.periodKey),
  uniqueSectionPeriodRank: uniqueIndex('home_curations_section_period_rank_idx').on(t.section, t.periodKey, t.rank),
}))

// 14. 도서관별 큐레이션 캐시 (신착도서 등 도서관 조건 API)
export const libraryCurations = nearbookSchema.table('library_curations', {
  id: serial('id').primaryKey(),
  libraryId: integer('library_id').notNull().references(() => libraries.id, { onDelete: 'cascade' }),
  section: varchar('section', { length: 32 }).notNull(),
  periodKey: varchar('period_key', { length: 16 }).notNull(),
  rank: integer('rank').notNull(),
  isbn: varchar('isbn', { length: 20 }),
  title: varchar('title', { length: 512 }),
  author: varchar('author', { length: 256 }),
  publisher: varchar('publisher', { length: 128 }),
  coverUrl: varchar('cover_url', { length: 512 }),
  category: varchar('category', { length: 64 }),
  sourceDate: varchar('source_date', { length: 16 }),
  fetchedAt: timestamp('fetched_at').notNull().defaultNow(),
}, (t) => ({
  librarySectionPeriodIdx: index('library_curations_library_section_period_idx').on(t.libraryId, t.section, t.periodKey),
  uniqueLibrarySectionPeriodRank: uniqueIndex('library_curations_library_section_period_rank_idx').on(
    t.libraryId,
    t.section,
    t.periodKey,
    t.rank,
  ),
}))

// 15. 카테고리별 큐레이션 캐시 (KDC 대분류 기반)
export const categoryCurations = nearbookSchema.table('category_curations', {
  id: serial('id').primaryKey(),
  categoryCode: varchar('category_code', { length: 8 }).notNull(),
  categoryName: varchar('category_name', { length: 64 }).notNull(),
  periodKey: varchar('period_key', { length: 16 }).notNull(),
  rank: integer('rank').notNull(),
  isbn: varchar('isbn', { length: 20 }).notNull(),
  title: varchar('title', { length: 512 }).notNull(),
  author: varchar('author', { length: 256 }),
  publisher: varchar('publisher', { length: 128 }),
  coverUrl: varchar('cover_url', { length: 512 }),
  loanCount: integer('loan_count'),
  sourceDate: varchar('source_date', { length: 16 }),
  fetchedAt: timestamp('fetched_at').notNull().defaultNow(),
}, (t) => ({
  categoryPeriodIdx: index('category_curations_category_period_idx').on(t.categoryCode, t.periodKey),
  uniqueCategoryPeriodRank: uniqueIndex('category_curations_category_period_rank_idx').on(
    t.categoryCode,
    t.periodKey,
    t.rank,
  ),
}))

// 16. 사용자 알림 설정
export const notificationPreferences = nearbookSchema.table('notification_preferences', {
  userId: integer('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  emailOnAvailable: boolean('email_on_available').notNull().default(true),
  unsubscribeToken: varchar('unsubscribe_token', { length: 64 }).notNull().unique(),
  emailStatus: varchar('email_status', { length: 16 }).notNull().default('active'),
  softBounceCount: integer('soft_bounce_count').notNull().default(0),
  digestFrequency: varchar('digest_frequency', { length: 16 }).notNull().default('daily'),
  weeklyDigestDayOfWeek: integer('weekly_digest_dow').notNull().default(1),
  lastDigestSentAt: timestamp('last_digest_sent_at'),
  lastBounceAt: timestamp('last_bounce_at'),
  lastBounceReason: varchar('last_bounce_reason', { length: 256 }),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  unsubscribeTokenIdx: uniqueIndex('notification_preferences_unsubscribe_token_idx').on(t.unsubscribeToken),
}))

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, { fields: [notificationPreferences.userId], references: [users.id] }),
}))

// 17. 발송 로그
export const notificationLogs = nearbookSchema.table('notification_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 32 }).notNull(),
  isbn: varchar('isbn', { length: 20 }).notNull(),
  libraryId: integer('library_id').notNull().references(() => libraries.id),
  resendMessageId: varchar('resend_message_id', { length: 64 }),
  status: varchar('status', { length: 16 }).notNull(),
  deliveryStatus: varchar('delivery_status', { length: 16 }).default('queued'),
  deliveryUpdatedAt: timestamp('delivery_updated_at'),
  sentAt: timestamp('sent_at').notNull().defaultNow(),
}, (t) => ({
  userIsbnLibIdx: index('notif_user_isbn_lib_idx').on(t.userId, t.isbn, t.libraryId),
  sentAtIdx: index('notif_sent_at_idx').on(t.sentAt),
}))

export const notificationLogsRelations = relations(notificationLogs, ({ one }) => ({
  user: one(users, { fields: [notificationLogs.userId], references: [users.id] }),
  library: one(libraries, { fields: [notificationLogs.libraryId], references: [libraries.id] }),
}))

// 18. 웹 푸시 구독
export const pushSubscriptions = nearbookSchema.table('push_subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: varchar('p256dh', { length: 256 }).notNull(),
  auth: varchar('auth', { length: 128 }).notNull(),
  userAgent: varchar('user_agent', { length: 256 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at').notNull().defaultNow(),
}, (t) => ({
  userIdx: index('push_sub_user_idx').on(t.userId),
}))

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, { fields: [pushSubscriptions.userId], references: [users.id] }),
}))
