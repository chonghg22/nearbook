'use client'
import { useState, useRef } from 'react'
import { MapPin, ChevronDown } from 'lucide-react'
import { useLocationContext } from '@/lib/use-location-context'
import { LocationModal } from './location-modal'
import { locationDescription } from '@/lib/location-state'

export function LocationBar({ showDescription = false, changeButtonLabel = '지역·도서관 변경' }: { showDescription?: boolean; changeButtonLabel?: string }) {
  const { location, isLoaded } = useLocationContext()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const description = locationDescription(location)

  return (
    <>
      <div className="space-y-1.5 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            {description.title}:{' '}
            <span className="font-semibold text-foreground">{description.label}</span>
          </span>
          <button
            ref={triggerRef}
            type="button"
            disabled={!isLoaded}
            aria-haspopup="dialog"
            onClick={() => setIsModalOpen(true)}
            className="ml-1 flex items-center gap-1 rounded-full border border-primary-200 px-3 py-1.5 font-medium text-primary hover:bg-primary-50 disabled:opacity-50"
          >
            {changeButtonLabel} <ChevronDown className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
        {showDescription && (
          <p className="text-xs leading-5">
            {isLoaded ? description.detail : '저장된 기준 위치를 확인하고 있습니다.'}
          </p>
        )}
      </div>

      <LocationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        returnFocusRef={triggerRef}
      />
    </>
  )
}
