'use client'
import { useEffect, useState, useMemo } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'

interface RegionSelectorProps {
  onChange: (region: string) => void
}

// "서울특별시 강남구" → { city: "서울특별시", district: "강남구" }
function parseRegion(region: string): { city: string; district: string } {
  const parts = region.split(' ')
  return {
    city: parts[0] ?? '',
    district: parts.slice(1).join(' '),
  }
}

export function RegionSelector({ onChange }: RegionSelectorProps) {
  const [regions, setRegions] = useState<string[]>([])
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [selectedDistrict, setSelectedDistrict] = useState<string>('')

  useEffect(() => {
    fetch(`${API_BASE}/libraries/regions`)
      .then((r) => r.json())
      .then((d) => setRegions(d.regions ?? []))
      .catch(console.error)
  }, [])

  // 시 목록 (중복 제거)
  const cities = useMemo(() => {
    const set = new Set(regions.map((r) => parseRegion(r).city))
    return Array.from(set).sort()
  }, [regions])

  // 선택한 시에 해당하는 구군 목록
  const districts = useMemo(() => {
    if (!selectedCity) return []
    const set = new Set(
      regions
        .filter((r) => parseRegion(r).city === selectedCity)
        .map((r) => parseRegion(r).district)
        .filter(Boolean),
    )
    return Array.from(set).sort()
  }, [regions, selectedCity])

  const handleCityChange = (city: string) => {
    setSelectedCity(city)
    setSelectedDistrict('')
    if (city) onChange(city) // 시만 선택해도 해당 시 전체 표시
  }

  const handleDistrictChange = (district: string) => {
    setSelectedDistrict(district)
    if (selectedCity && district) onChange(`${selectedCity} ${district}`)
    else if (selectedCity) onChange(selectedCity)
  }

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <label className="text-sm font-medium text-gray-600">지역</label>

      {/* 시 셀렉트 */}
      <select
        value={selectedCity}
        onChange={(e) => handleCityChange(e.target.value)}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white
                   focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                   min-w-[140px] cursor-pointer"
      >
        <option value="">-- 시/도 선택 --</option>
        {cities.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </select>

      {/* 구군 셀렉트 (시 선택 후 활성) */}
      <select
        value={selectedDistrict}
        onChange={(e) => handleDistrictChange(e.target.value)}
        disabled={!selectedCity || districts.length === 0}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white
                   focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                   min-w-[140px] cursor-pointer
                   disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
      >
        <option value="">-- 구/군 선택 --</option>
        {districts.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      {/* 초기화 */}
      {(selectedCity || selectedDistrict) && (
        <button
          onClick={() => {
            setSelectedCity('')
            setSelectedDistrict('')
          }}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          초기화
        </button>
      )}
    </div>
  )
}
