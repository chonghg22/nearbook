import { cn } from '@/lib/utils'

export type Status = 'available' | 'waiting' | 'unavailable'

const STATUS_CONFIG = {
  available:   { label: '대출 가능', dotColor: 'bg-available-dot',   className: 'badge-available'   },
  waiting:     { label: '예약 대기', dotColor: 'bg-waiting-dot',     className: 'badge-waiting'     },
  unavailable: { label: '소장 없음', dotColor: 'bg-unavailable-dot', className: 'badge-unavailable' },
} as const

interface StatusBadgeProps {
  status: Status
  count?: number | undefined
  className?: string | undefined
}

export function StatusBadge({ status, count, className }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1',
        'text-xs font-medium rounded-full',
        cfg.className,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dotColor)} />
      {cfg.label}
      {count !== undefined && count > 0 && (
        <span className="opacity-70">{count}명</span>
      )}
    </span>
  )
}
