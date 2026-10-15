export const HOLDING_RADII = [5, 10, 20] as const
export type HoldingRadius = (typeof HOLDING_RADII)[number]

export function nextHoldingRadius(radius: HoldingRadius): HoldingRadius | null {
  return HOLDING_RADII.find((value) => value > radius) ?? null
}

// This is a title search, not an assertion that results are the same edition.
export function alternativeEditionSearch(title?: string): string | null {
  const text = title?.trim()
  if (!text) return null
  const q = (text.split(/[:：]/, 1)[0]?.trim() || text).slice(0, 200)
  return `/search?${new URLSearchParams({ q, searchType: 'title' })}`
}
