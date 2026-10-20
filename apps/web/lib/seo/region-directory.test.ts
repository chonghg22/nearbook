import { describe, expect, it, vi } from 'vitest'
import { buildRegionDirectory, collectRegionLibraries, regionDescription } from './region-directory'

const library = (id: number, region = '서울특별시 중구') => ({
  id,
  name: `도서관 ${id}`,
  region,
  address: `주소 ${id}`,
})

describe('actual regional content eligibility', () => {
  it('keeps stable slugs, merges historical province aliases and only counts actual rows', () => {
    const directory = buildRegionDirectory([
      library(1, '강원도 고성군'),
      library(2, '강원특별자치도 춘천시'),
      library(3, '강원도 고성군'),
      library(4, '경상남도 고성군'),
      library(5, '경상남도 고성군'),
      library(6, '경상남도 창원시'),
      library(7, '-'),
      library(8, '경상북도 '),
      library(9, '없는도 중구'),
      library(10, '서울특별시 중구'),
      library(11, '서울특별시 중구'),
      library(12, '서울특별시 -'),
    ])
    expect(directory.map((entry) => entry.slug)).toEqual(['gangwon', 'gyeongnam'])
    expect(directory[0]?.libraries).toHaveLength(3)
    expect(directory[0]?.districts).toEqual(['고성군', '춘천시'])
    expect(regionDescription(directory[0]!)).toContain('3곳')
  })
  it('supports single-tier Sejong without inventing districts', () => {
    const entry = buildRegionDirectory([1, 2, 3].map((id) => library(id, '세종특별자치시')))[0]
    expect(entry).toMatchObject({ slug: 'sejong', districts: [] })
  })
})

describe('complete library directory collection', () => {
  it('fetches all pages, including the final empty page for a full 100-row page', async () => {
    const firstPage = Array.from({ length: 100 }, (_, id) => library(id + 1))
    const fetchPage = vi.fn(async (page) => ({ data: page === 1 ? firstPage : [] }))
    expect(await collectRegionLibraries(fetchPage)).toHaveLength(100)
    expect(fetchPage.mock.calls).toEqual([[1], [2]])
  })
  it('rejects a later failure rather than creating partial landings or counts', async () => {
    await expect(
      collectRegionLibraries(async (page) => {
        if (page > 1) throw new Error('timeout')
        return { data: Array.from({ length: 100 }, (_, id) => library(id + 1)) }
      })
    ).rejects.toThrow('timeout')
  })
  it('rejects repeated pagination, malformed records and invalid envelopes', async () => {
    for (const data of [
      null,
      {},
      { data: {} },
      { data: [null] },
      { data: [library(0)] },
      { data: [library(1), library(1)] },
      { data: [{ id: 1 }] },
    ]) {
      await expect(collectRegionLibraries(async () => data)).rejects.toThrow()
    }
  })
  it('does not silently publish a truncated scan at the safety cap', async () => {
    await expect(
      collectRegionLibraries(async (page) => ({
        data: Array.from({ length: 100 }, (_, id) => library((page - 1) * 100 + id + 1)),
      }))
    ).rejects.toThrow('page limit')
  })
})
