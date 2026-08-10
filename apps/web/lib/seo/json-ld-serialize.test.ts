import { describe, expect, it } from 'vitest'
import { compactJsonLd, serializeJsonLd } from './json-ld-serialize'

describe('JsonLd 직렬화', () => {
  it('script 종료 문자열에 쓰일 수 있는 < 를 이스케이프한다', () => {
    const serialized = serializeJsonLd({
      '@context': 'https://schema.org',
      '@graph': [{ '@type': 'Book', name: '수학 < 과학' }],
    })

    expect(serialized).not.toContain('<')
    expect(serialized).toContain('\\u003c')
  })

  it('</script> 문자열이 그대로 출력되지 않는다', () => {
    const serialized = serializeJsonLd({
      '@context': 'https://schema.org',
      '@graph': [{ '@type': 'Book', name: '</script><img src=x onerror=alert(1)>' }],
    })

    // `<`만 이스케이프해도 script 조기 종료와 태그 주입이 모두 막힌다.
    expect(serialized).not.toContain('</script>')
    expect(serialized).not.toContain('<img')
    expect(serialized).toContain('\\u003c/script>')
  })

  it('이스케이프 후에도 원래 값으로 되돌릴 수 있는 JSON이다', () => {
    const serialized = serializeJsonLd({
      '@context': 'https://schema.org',
      '@graph': [{ '@type': 'Book', name: '수학 < 과학' }],
    })

    expect(JSON.parse(serialized)['@graph'][0].name).toBe('수학 < 과학')
  })
})

describe('JSON-LD 필드 정리', () => {
  it('값이 비어 있는 필드를 제거한다', () => {
    expect(
      compactJsonLd({
        name: '도서관',
        telephone: undefined,
        homepage: null,
        address: '   ',
        tags: [],
        rating: 0,
      }),
    ).toEqual({ name: '도서관', rating: 0 })
  })

  it('숫자 0과 false는 유효한 값으로 남긴다', () => {
    expect(compactJsonLd({ count: 0, closed: false })).toEqual({ count: 0, closed: false })
  })
})
