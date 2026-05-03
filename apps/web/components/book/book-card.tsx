import Image from 'next/image'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { StatusBadge, type Status } from '@/components/ui/status-badge'

interface BookCardProps {
  isbn: string
  title: string
  author: string
  publisher?: string | undefined
  coverUrl?: string | undefined
  availableCount?: number | undefined
  totalCount?: number | undefined
  status?: Status | undefined
}

export function BookCard({
  isbn, title, author, publisher,
  coverUrl, availableCount, totalCount, status,
}: BookCardProps) {
  return (
    <Link href={`/book/${isbn}`} className="group block">
      <article className="card-interactive flex gap-3 p-3.5">
        {/* 표지 */}
        <div className="shrink-0 w-[60px] h-[84px] rounded-sm overflow-hidden
                        bg-canvas-muted border border-border/50">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={`${title} 표지`}
              width={60} height={84}
              className="object-cover w-full h-full
                         group-hover:scale-[1.03] transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-muted-foreground/40" />
            </div>
          )}
        </div>

        {/* 정보 */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <p className="text-sm font-semibold text-foreground leading-snug
                          line-clamp-2 text-pretty">
              {title}
            </p>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {author}
              {publisher && (
                <span className="text-subtle-foreground"> · {publisher}</span>
              )}
            </p>
          </div>

          <div className="flex items-center justify-between mt-2">
            {status && <StatusBadge status={status} />}
            {totalCount !== undefined && (
              <span className="text-2xs text-subtle-foreground ml-auto">
                {availableCount}/{totalCount}권
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}
