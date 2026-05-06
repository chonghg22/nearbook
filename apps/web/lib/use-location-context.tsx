'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { REGION_COORDS } from './region-coords'

export type LocationMode = 'gps' | 'region' | 'library'

export interface GpsLocation {
  mode: 'gps'
  lat: number
  lng: number
  label: string
}

export interface RegionLocation {
  mode: 'region'
  regionSlug: string
  lat: number
  lng: number
  label: string
}

export interface LibraryLocation {
  mode: 'library'
  libraryId: number
  libraryName: string
  lat: number
  lng: number
  label: string
}

export type LocationContext = GpsLocation | RegionLocation | LibraryLocation

interface LocationContextValue {
  location: LocationContext
  isLoaded: boolean
  requestGps: () => Promise<GpsLocation>
  selectRegion: (regionSlug: string) => void
  selectLibrary: (lib: { id: number; name: string; lat: number; lng: number }) => void
  toSearchParams: () => Record<string, string>
}

const STORAGE_KEY = 'nearbook_location_ctx'
const DEFAULT_LOCATION: LocationContext = {
  mode: 'region',
  regionSlug: 'seoul',
  lat: 37.5665,
  lng: 126.9780,
  label: '서울 전체',
}

const LocationContext = createContext<LocationContextValue | undefined>(undefined)

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocationState] = useState<LocationContext>(DEFAULT_LOCATION)
  const [isLoaded, setIsLoaded] = useState(false)

  // localStorage에서 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed: LocationContext = JSON.parse(saved)
        setLocationState(parsed)
      }
    } catch {
      // ignore
    }
    setIsLoaded(true)
  }, [])

  const setLocation = useCallback((ctx: LocationContext) => {
    setLocationState(ctx)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx))
    } catch {
      // ignore
    }
  }, [])

  const requestGps = useCallback((): Promise<GpsLocation> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('geolocation not supported'))
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const ctx: GpsLocation = {
            mode: 'gps',
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            label: '현재 위치',
          }
          setLocation(ctx)
          resolve(ctx)
        },
        (err) => reject(err),
        { timeout: 8000, maximumAge: 60000 },
      )
    })
  }, [setLocation])

  const selectRegion = useCallback((regionSlug: string) => {
    const coord = REGION_COORDS[regionSlug]
    if (!coord) return
    const ctx: RegionLocation = {
      mode: 'region',
      regionSlug,
      lat: coord.lat,
      lng: coord.lng,
      label: coord.label,
    }
    setLocation(ctx)
  }, [setLocation])

  const selectLibrary = useCallback((lib: {
    id: number
    name: string
    lat: number
    lng: number
  }) => {
    const ctx: LibraryLocation = {
      mode: 'library',
      libraryId: lib.id,
      libraryName: lib.name,
      lat: lib.lat,
      lng: lib.lng,
      label: lib.name,
    }
    setLocation(ctx)
  }, [setLocation])

  const toSearchParams = useCallback((): Record<string, string> => {
    if (location.mode === 'library') {
      return { libraryId: String(location.libraryId) }
    }
    if (location.mode === 'region') {
      return {
        regionSlug: location.regionSlug,
        lat: String(location.lat),
        lng: String(location.lng),
      }
    }
    return {
      lat: String(location.lat),
      lng: String(location.lng),
    }
  }, [location])

  return (
    <LocationContext.Provider value={{
      location,
      isLoaded,
      requestGps,
      selectRegion,
      selectLibrary,
      toSearchParams,
    }}>
      {children}
    </LocationContext.Provider>
  )
}

export function useLocationContext() {
  const context = useContext(LocationContext)
  if (context === undefined) {
    throw new Error('useLocationContext must be used within a LocationProvider')
  }
  return context
}
