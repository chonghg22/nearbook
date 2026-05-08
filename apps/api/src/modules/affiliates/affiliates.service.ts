import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import { parseStringPromise } from 'xml2js'
import { AffiliateItemDto } from './dto/affiliate-item.dto'

@Injectable()
export class AffiliatesService {
  private readonly logger = new Logger(AffiliatesService.name)
  private readonly ttbKey: string

  constructor(private readonly config: ConfigService) {
    this.ttbKey = this.config.get<string>('ALADIN_TTB_KEY') ?? ''
  }

  async getAffiliateOptions(isbn: string): Promise<AffiliateItemDto[]> {
    const [newBook, usedBook] = await Promise.allSettled([
      this.fetchAladin(isbn, 'new'),
      this.fetchAladin(isbn, 'used'),
    ])

    const results: AffiliateItemDto[] = []

    if (newBook.status === 'fulfilled' && newBook.value) results.push(newBook.value)
    if (usedBook.status === 'fulfilled' && usedBook.value) results.push(usedBook.value)

    results.push(...this.getEbookDeepLinks(isbn))
    results.push(...this.getAudiobookDeepLinks(isbn))

    return results
  }

  async buildLinks(isbn: string) {
    return this.getAffiliateOptions(isbn)
  }

  private async fetchAladin(
    isbn: string,
    type: 'new' | 'used',
  ): Promise<AffiliateItemDto | null> {
    if (!this.ttbKey) {
      this.logger.warn('ALADIN_TTB_KEY not set')
      return null
    }

    try {
      const response = await axios.get(
        'https://www.aladin.co.kr/ttb/api/ItemSearch.aspx',
        {
          params: {
            ttbkey: this.ttbKey,
            Query: isbn,
            QueryType: 'ISBN',
            SearchTarget: type === 'used' ? 'Used' : 'Book',
            output: 'xml',
            Version: '20131101',
          },
          timeout: 3000,
        },
      )

      const parsed = await parseStringPromise(response.data, { explicitArray: false })
      const rawItem = parsed?.object?.item
      const item = Array.isArray(rawItem) ? rawItem[0] : rawItem

      if (!item) return null

      return {
        provider: type === 'used' ? 'aladin-used' : 'aladin',
        type,
        price: item.priceSales ? Number(item.priceSales) : null,
        url: item.link ?? `https://www.aladin.co.kr/search/wsearchresult.aspx?SearchWord=${isbn}`,
        available: item.stockStatus !== '품절',
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.warn(`Aladin API failed isbn=${isbn}: ${msg}`)
      return null
    }
  }

  private getEbookDeepLinks(isbn: string): AffiliateItemDto[] {
    return [
      {
        provider: 'millie',
        type: 'ebook',
        price: null,
        url: `https://www.millie.co.kr/v3/search?keyword=${isbn}`,
        available: true,
      },
      {
        provider: 'ridi',
        type: 'ebook',
        price: null,
        url: `https://ridibooks.com/search?q=${isbn}`,
        available: true,
      },
    ]
  }

  private getAudiobookDeepLinks(isbn: string): AffiliateItemDto[] {
    return [
      {
        provider: 'welaaa',
        type: 'audiobook',
        price: null,
        url: `https://www.welaaa.com/search?q=${isbn}`,
        available: true,
      },
    ]
  }
}
