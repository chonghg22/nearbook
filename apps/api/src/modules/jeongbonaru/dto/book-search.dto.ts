export class BookSearchResultDto {
  isbn!: string
  title!: string
  author!: string
  publisher!: string
  publishedYear!: number | null
  coverUrl!: string | null
  loanCount!: number
}
