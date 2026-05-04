/**
 * 한국어 비속어/금칙어 필터 (간이).
 * Phase 1+ 에서 badwords-ko 패키지로 교체 가능.
 */
const BANNED_WORDS = new Set<string>([
  '시발', '씨발', 'ㅅㅂ', '병신', 'ㅂㅅ', '개새끼', '좆',
  '한남', '김치녀', '맘충',
  '야동', '섹스', 'porn',
  // SEO 어뷰징 의심
  'https://', 'http://', '.com', '.kr', '.net',
])

export function isProfane(query: string): boolean {
  const normalized = query.toLowerCase().replace(/\s+/g, '')
  for (const word of BANNED_WORDS) {
    if (normalized.includes(word)) return true
  }
  return false
}
