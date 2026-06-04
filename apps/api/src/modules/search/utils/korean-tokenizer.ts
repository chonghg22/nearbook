import type { Tokenizer } from '@orama/orama'

const KOREAN_STOPWORDS = new Set([
  '의', '를', '은', '는', '이', '가', '에', '와', '과', '도', '만', '으로', '에서',
])

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function tokenize(raw: string, language?: string, prop?: string): string[] {
  if (!raw) return []

  const cleaned = String(raw)
    .toLowerCase()
    .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, ' ')

  const tokens = new Set<string>()

  for (const part of cleaned.split(/\s+/)) {
    const word = part.trim()
    if (!word || word.length < 1) continue
    if (KOREAN_STOPWORDS.has(word)) continue

    tokens.add(word)

    if (/[가-힣]/.test(word) && word.length >= 2) {
      // bigram
      for (let i = 0; i <= word.length - 2; i++) {
        tokens.add(word.slice(i, i + 2))
      }
      // 3-gram
      if (word.length >= 3) {
        for (let i = 0; i <= word.length - 3; i++) {
          tokens.add(word.slice(i, i + 3))
        }
      }
    }
  }

  return Array.from(tokens)
}

export const koreanTokenizer: Tokenizer = {
  language: 'korean',
  normalizationCache: new Map(),
  tokenize,
}
