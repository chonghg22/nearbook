import { resolveSearchInput } from '@nearbook/shared-types'
import { ApiRequestError } from './api-request.mjs'
import type { LinkedHoldingsResult } from './library-links.mjs'

export function searchSubmission(query: string, requestedType: string, source: string) {
  const input = resolveSearchInput(query, requestedType)
  return { query: input.q, searchType: input.searchType, invalidIsbn: input.invalidIsbn, source }
}

export function requestFailure(error: unknown) {
  return error instanceof ApiRequestError
    ? { errorKind: error.kind, ...(error.status === undefined ? {} : { httpStatus: error.status }) }
    : { errorKind: 'unknown' }
}

export function holdingsOutcome(result: LinkedHoldingsResult) {
  const h = result.holdings
  const checked = result.libraries.flatMap((row) => (row.checkedAt ? [row.checkedAt] : []))
  return {
    ...h,
    outcome:
      h.nearbyCount === 0
        ? 'no_candidates'
        : h.checkedCount === 0
          ? 'unknown'
          : h.unknownCount > 0 || h.uncheckedCount > 0
            ? 'partial'
            : 'complete',
    staleCount: result.libraries.filter((row) => row.stale).length,
    oldestCheckedAt: checked.sort((a, b) => Date.parse(a) - Date.parse(b))[0] ?? null,
  }
}
