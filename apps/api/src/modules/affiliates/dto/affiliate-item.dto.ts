export type AffiliateProvider =
  | 'aladin'
  | 'aladin-used'
  | 'millie'
  | 'ridi'
  | 'welaaa'

export type AffiliateType = 'new' | 'used' | 'ebook' | 'audiobook'

export class AffiliateItemDto {
  provider!: AffiliateProvider
  type!: AffiliateType
  price!: number | null
  url!: string
  available!: boolean
}
