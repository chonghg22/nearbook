import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

const TTB_KEY_PLACEHOLDER = 'YOUR_ALADIN_TTB_KEY'

@Injectable()
export class AffiliatesService {
  private readonly ttbKey: string

  constructor(private readonly config: ConfigService) {
    this.ttbKey = this.config.get<string>('ALADIN_TTB_KEY') ?? TTB_KEY_PLACEHOLDER
  }

  buildLinks(isbn: string) {
    const encoded = encodeURIComponent(isbn)
    return [
      {
        provider: 'aladin',
        type: 'new',
        url: `https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=${encoded}&ttbkey=${this.ttbKey}&partner=api`,
        price: null,
        available: true,
      },
      {
        provider: 'aladin-used',
        type: 'used',
        url: `https://www.aladin.co.kr/shop/usedshop/wc2b_search.aspx?isbn=${encoded}`,
        price: null,
        available: true,
      },
      {
        provider: 'yes24',
        type: 'new',
        url: `https://www.yes24.com/Product/Search?domain=BOOK&query=${encoded}`,
        price: null,
        available: true,
      },
    ]
  }
}
