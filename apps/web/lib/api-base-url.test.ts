import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { SERVER_API_BASE_URL } from './constants'

/**
 * 서버에서 fetch하는 코드가 API base URL을 직접 계산하면
 * 환경변수가 모두 없을 때 빈 문자열로 떨어져 상대 URL이 만들어진다.
 * 이 경우 빌드 시 정적 생성이 그대로 멈춘다(/libraries가 실제로 이렇게 실패했다).
 * 값을 아는 곳은 lib/constants 한 곳뿐이어야 한다.
 */

const WEB_ROOT = path.resolve(import.meta.dirname, '..')
const SCAN_DIRS = ['app', 'lib', 'components']

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true })

  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) return []
      return collectSourceFiles(full)
    }
    // 테스트 파일은 배포되는 코드가 아니므로 스캔하지 않는다.
    if (/\.test\.tsx?$/.test(entry.name)) return []
    return /\.tsx?$/.test(entry.name) ? [full] : []
  })
}

const sourceFiles = SCAN_DIRS.flatMap((dir) => collectSourceFiles(path.join(WEB_ROOT, dir)))

describe('API base URL 계산', () => {
  it('스캔 대상 소스 파일을 찾는다', () => {
    expect(sourceFiles.length).toBeGreaterThan(0)
  })

  it('빈 문자열로 떨어지는 API base URL fallback이 없다', () => {
    // `process.env.NEXT_PUBLIC_API_BASE_URL ?? ''` / `|| ''` 형태를 잡는다.
    const emptyFallback = /NEXT_PUBLIC_API_BASE_URL\s*(\?\?|\|\|)\s*(''|"")/

    const offenders = sourceFiles
      .filter((file) => emptyFallback.test(readFileSync(file, 'utf-8')))
      .map((file) => path.relative(WEB_ROOT, file))

    expect(offenders).toEqual([])
  })

  it('constants의 SERVER_API_BASE_URL은 항상 절대 URL이다', () => {
    expect(() => new URL(SERVER_API_BASE_URL)).not.toThrow()
    expect(SERVER_API_BASE_URL).not.toBe('')
    expect(SERVER_API_BASE_URL.startsWith('/')).toBe(false)
  })

  it('/libraries 페이지는 공통 상수로 API base URL을 얻는다', () => {
    const source = readFileSync(path.join(WEB_ROOT, 'app/libraries/page.tsx'), 'utf-8')

    expect(source).toContain("from '@/lib/constants'")
    expect(source).toContain('SERVER_API_BASE_URL')
    expect(source).not.toContain('process.env.INTERNAL_API_URL')
  })
})
