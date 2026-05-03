'use client'
import { useState } from 'react'
import { MapPin, ChevronDown } from 'lucide-react'
import { useLocationContext } from '@/lib/use-location-context'
import { LocationModal } from './location-modal'

export function LocationBar() {
  const { location, isLoaded } = useLocationContext()
  const [isModalOpen, setIsModalOpen] = useState(false)

  if (!isLoaded) return null

  return (
    <>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        <span>
          <span className="font-semibold text-foreground">{location.label}</span>
          {location.mode !== 'library' && ' 주변 도서관 기준'}
          {location.mode === 'library' && ' 도서관 기준'}
        </span>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-0.5 text-primary hover:text-primary-600 font-medium ml-1"
        >
          변경
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      <LocationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
