import { cn } from '@/lib/utils'

export type Status = 'available' | 'borrowed' | 'none'

const STATUS_CONFIG = {
  available: { label: '대출 가능', dotColor: 'bg-green-500', className: 'bg-green-50 text-green-700' },
  borrowed: { label: '대출 중', dotColor: 'bg-orange-500', className: 'bg-orange-50 text-orange-700' },
  none: { label: '소장 없음', dotColor: 'bg-gray-400', className: 'bg-gray-100 text-gray-500' },
} as const

interface StatusBadgeProps {
  status: Status
  count?: number | undefined
  className?: string | undefined
}

export function StatusBadge({ status, count, className }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.none
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
