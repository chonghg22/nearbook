export const SEARCH_TYPES = ['all', 'title', 'author', 'isbn', 'publisher'] as const
export type SearchType = (typeof SEARCH_TYPES)[number]

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]/gu, '')
}

/** Only recognized contributor-role syntax is stripped; names and other parentheses remain. */
export function authorNames(value: string): string {
  const roles = '지은이|저자|글|글쓴이|옮긴이|역자|번역|그린이|그림|엮은이|편저|편집'
  return value
    .replace(new RegExp(`(?:${roles})\\s*[:：]\\s*`, 'g'), '')
    .replace(new RegExp(`[（(\\[]\\s*(?:${roles})\\s*[）)\\]]`, 'g'), '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,;])/g, '$1')
    .replace(/([,;])\s*/g, '$1 ')
    .trim()
}

function isbnCharacters(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/^ISBN(?:-1[03])?\s*:?\s*/i, '')
    .replace(/[\s\-\u2010-\u2015]/g, '')
    .toUpperCase()
}

/** Checksum validated; ISBN-10 maps to its 978 ISBN-13. Never strip arbitrary text. */
export function normalizeSearchIsbn(value: string): string | null {
  const isbn = isbnCharacters(value)
  const isbn13 = (prefix: string) => {
    const sum = [...prefix].reduce((n, digit, i) => n + Number(digit) * (i % 2 ? 3 : 1), 0)
    return prefix + String((10 - (sum % 10)) % 10)
  }
  if (/^97[89]\d{10}$/.test(isbn)) return isbn13(isbn.slice(0, 12)) === isbn ? isbn : null
  if (!/^\d{9}[\dX]$/.test(isbn)) return null
  const sum = [...isbn].reduce(
    (n, digit, i) => n + (digit === 'X' ? 10 : Number(digit)) * (10 - i),
    0
  )
  return sum % 11 === 0 ? isbn13('978' + isbn.slice(0, 9)) : null
}

export function searchIsbnAliases(isbn13: string): string[] {
  if (!isbn13.startsWith('978')) return [isbn13]
  const base = isbn13.slice(3, 12)
  const sum = [...base].reduce((n, digit, i) => n + Number(digit) * (10 - i), 0)
  const check = (11 - (sum % 11)) % 11
  return [isbn13, base + (check === 10 ? 'X' : String(check))]
}

export function resolveSearchInput(value: string, requested: string = 'all') {
  const type: SearchType = SEARCH_TYPES.includes(requested as SearchType)
    ? (requested as SearchType)
    : 'all'
  const text = value.normalize('NFKC').trim().replace(/\s+/g, ' ')
  const isbn = normalizeSearchIsbn(text)
  const looksIsbn = /^(?:\d{9}[\dX]|97[89]\d{10})$/.test(isbnCharacters(text))
  if (type === 'isbn' || (looksIsbn && (type === 'all' || type === 'title'))) {
    return { q: isbn ?? text, searchType: 'isbn' as SearchType, invalidIsbn: !isbn }
  }
  return { q: type === 'author' ? authorNames(text) : text, searchType: type, invalidIsbn: false }
}

/** Title annotations only, not an assertion about unlabelled editions or interchangeable ISBNs. */
export function searchEditionLabels(title: string): string[] {
  const labels: string[] = []
  const text = title.normalize('NFKC')
  if (/큰\s*글(?:자|씨)(?:\s*(?:책|도서))?|대활자(?:본|판)?|large\s*print/i.test(text))
    labels.push('큰글자 표기')
  if (/필사(?:책|본|집|노트|북)|따라\s*쓰기|(?:^|[\s[(])필사(?:$|[\s)\]])/.test(text))
    labels.push('필사 표기')
  return labels
}
