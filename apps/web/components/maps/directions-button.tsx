'use client'
import { useState } from 'react'
import { openNaverDirections, openKakaoDirections, setPreferredMapApp } from '@/lib/maps'

interface Props {
  lat: number
  lng: number
  name: string
}

export function DirectionsButton({ lat, lng, name }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-700 text-sm"
      >
        🗺 길찾기 {open ? '▴' : '▾'}
      </button>
      {open && (
        <div className="absolute mt-2 bg-white border rounded shadow-lg z-10 min-w-[180px]">
          <button
            onClick={() => { openNaverDirections(lat, lng, name); setPreferredMapApp('naver'); setOpen(false) }}
            className="block w-full text-left px-4 py-3 hover:bg-gray-50 text-sm"
          >
            🟢 네이버지도
          </button>
          <button
            onClick={() => { openKakaoDirections(lat, lng, name); setPreferredMapApp('kakao'); setOpen(false) }}
            className="block w-full text-left px-4 py-3 hover:bg-gray-50 text-sm"
          >
            🟡 카카오맵
          </button>
        </div>
      )}
    </div>
  )
}
