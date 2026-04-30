export class BookExistDto {
  isbn!: string
  hasBook!: boolean
  loanAvailable!: boolean
  title!: string
  author!: string
  publisher!: string
  publishedYear!: number | null
  coverUrl!: string | null
  callNumber!: string | null
}
