import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common'
import { create, insertMultiple, insert, search, count, upsert } from '@orama/orama'
import type { AnyOrama } from '@orama/orama'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { persistToFile, restoreFromFile } = require('@orama/plugin-data-persistence/server')
import { koreanTokenizer } from './korean-tokenizer'
import { db, bookCache } from '@nearbook/db'
import * as fs from 'fs/promises'
import * as path from 'path'

const SCHEMA = {
  isbn: 'string',
  title: 'string',
  author: 'string',
  publisher: 'string',
  category: 'string',
  coverUrl: 'string',
  publishedYear: 'number',
  popularityScore: 'number',
} as const

@Injectable()
export class OramaIndexService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(OramaIndexService.name)
  private index!: AnyOrama
  private dirtyCount = 0
  private readonly indexPath = process.env.SEARCH_INDEX_PATH || '/data/orama-books.msgpack'

  async onApplicationBootstrap() {
    await this.loadOrBuild()
  }

  async onApplicationShutdown() {
    await this.persist()
  }

  private async loadOrBuild() {
    const t0 = Date.now()
    try {
      await fs.access(this.indexPath)
      this.index = await restoreFromFile('binary', this.indexPath)
      const c = await count(this.index)
      this.logger.log(`Restored Orama index from disk: ${c} docs in ${Date.now() - t0}ms`)
      return
    } catch {
      this.logger.log('No disk index — building from book_cache')
    }

    this.index = create({
      schema: SCHEMA,
      components: { tokenizer: koreanTokenizer },
    })

    await this.fullRebuild()
    this.logger.log(`Built Orama index in ${Date.now() - t0}ms`)
  }

  async fullRebuild() {
    // Re-create a fresh index to avoid duplicates
    this.index = create({
      schema: SCHEMA,
      components: { tokenizer: koreanTokenizer },
    })

    const batchSize = 1000
    let offset = 0
    let total = 0

    while (true) {
      const rows = await db.select().from(bookCache).limit(batchSize).offset(offset)
      if (rows.length === 0) break

      await insertMultiple(this.index, rows.map(this.toDoc))
      offset += batchSize
      total += rows.length
    }

    this.dirtyCount = total
    await this.persist()
    this.logger.log(`Rebuilt index with ${total} docs`)
  }

  async upsertOne(book: any) {
    const doc = this.toDoc(book)
    try {
      await upsert(this.index, doc)
    } catch {
      await insert(this.index, doc)
    }
    this.dirtyCount++
    if (this.dirtyCount >= 50) await this.persist()
  }

  async upsertMany(books: any[]) {
    if (books.length === 0) return
    for (const book of books) {
      try {
        await upsert(this.index, this.toDoc(book))
      } catch {
        await insert(this.index, this.toDoc(book))
      }
    }
    this.dirtyCount += books.length
    if (this.dirtyCount >= 50) await this.persist()
  }

  async query(args: {
    q: string
    limit: number
    offset: number
    category?: string
    sort?: 'relevance' | 'popular' | 'recent'
  }) {
    const sortBy =
      args.sort === 'recent' ? { property: 'publishedYear' as const, order: 'DESC' as const } :
      args.sort === 'popular' ? { property: 'popularityScore' as const, order: 'DESC' as const } :
      undefined

    const where: Record<string, any> = {}
    if (args.category) where.category = args.category

    // 짧은 한글 쿼리(2글자 이하)는 fuzzy 매칭 비활성화 — "부모" → "부의" 방지
    const tolerance = args.q.length <= 2 ? 0 : 1

    const result = await search(this.index, {
      term: args.q,
      limit: args.limit,
      offset: args.offset,
      ...(Object.keys(where).length > 0 && { where }),
      ...(sortBy && { sortBy }),
      tolerance,
      properties: ['title', 'author', 'publisher'],
      boost: { title: 2.0, author: 1.5 },
    })

    return {
      hits: result.hits.map(h => h.document),
      total: result.count,
      elapsedMs: result.elapsed.formatted,
    }
  }

  async persist() {
    try {
      await fs.mkdir(path.dirname(this.indexPath), { recursive: true })
      await persistToFile(this.index, 'binary', this.indexPath)
      this.dirtyCount = 0
    } catch (e) {
      this.logger.warn(`Persist failed: ${e}`)
    }
  }

  private toDoc(row: any) {
    return {
      id: row.isbn,
      isbn: row.isbn,
      title: row.title ?? '',
      author: row.author ?? '',
      publisher: row.publisher ?? '',
      category: row.category ?? '',
      coverUrl: row.coverUrl ?? '',
      publishedYear: row.publishedYear ?? 0,
      popularityScore: row.popularityScore ?? 0,
    }
  }
}
