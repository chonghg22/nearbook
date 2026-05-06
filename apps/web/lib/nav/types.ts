import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon?: LucideIcon
  disabled?: boolean
  disabledReason?: string
  requireAuth?: boolean
  children?: NavItem[]
}
