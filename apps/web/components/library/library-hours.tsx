import type { LibraryOperatingHours } from '@nearbook/shared-types'

export function LibraryHours({ hours }: { hours: LibraryOperatingHours | null }) {
  if (!hours?.text && !hours?.closed) return null
  return (
    <>
      {hours.text && (
        <div className="flex justify-between gap-4 rounded-xl bg-gray-50 px-3 py-2 text-xs">
          <span className="text-subtle-foreground">운영시간</span>
          <span className="text-right font-medium text-foreground">{hours.text}</span>
        </div>
      )}
      {hours.closed && (
        <div className="flex justify-between gap-4 rounded-xl bg-gray-50 px-3 py-2 text-xs">
          <span className="text-subtle-foreground">휴관일</span>
          <span className="text-right font-medium text-foreground">{hours.closed}</span>
        </div>
      )}
    </>
  )
}
