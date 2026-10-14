'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import {
  DEFAULT_LOCATION,
  LOCATION_STORAGE_KEY,
  libraryLocation,
  regionLocation,
  restoreLocation,
} from './location-state'
import type { GpsLocation, LocationContext } from './location-state'
import { GpsError, requestBrowserLocation } from './location-gps'
export type {
  GpsLocation,
  RegionLocation,
  LibraryLocation,
  LocationMode,
  LocationContext,
} from './location-state'

interface LocationContextValue {
  location: LocationContext
  isLoaded: boolean
  requestGps: (signal?: AbortSignal) => Promise<GpsLocation>
  selectRegion: (regionSlug: string) => void
  selectLibrary: (lib: { id: number; name: string; lat: number; lng: number }) => void
  toSearchParams: () => Record<string, string>
}

const Context = createContext<LocationContextValue | undefined>(undefined)

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocationState] = useState<LocationContext>(DEFAULT_LOCATION)
  const [isLoaded, setIsLoaded] = useState(false)
  const version = useRef(0)
  const mounted = useRef(false)

  // localStorage에서 복원
  useEffect(() => {
    mounted.current = true
    version.current++
    try {
      setLocationState(restoreLocation(localStorage.getItem(LOCATION_STORAGE_KEY)))
    } catch {
      // ignore
    }
    setIsLoaded(true)
    return () => {
      mounted.current = false
    }
  }, [])

  const setLocation = useCallback((ctx: LocationContext) => {
    version.current++
    setLocationState(ctx)
    try {
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(ctx))
    } catch {
      // ignore
    }
  }, [])

  const requestGps = useCallback(
    async (signal?: AbortSignal): Promise<GpsLocation> => {
      const current = ++version.current
      const coords = await requestBrowserLocation(navigator.geolocation, signal)
      if (!mounted.current || version.current !== current || signal?.aborted)
        throw new GpsError('cancelled')
      const ctx: GpsLocation = { mode: 'gps', ...coords, label: '현재 GPS 위치' }
      setLocation(ctx)
      return ctx
    },
    [setLocation]
  )

  const selectRegion = useCallback(
    (regionSlug: string) => {
      const ctx = regionLocation(regionSlug)
      if (ctx) setLocation(ctx)
    },
    [setLocation]
  )

  const selectLibrary = useCallback(
    (lib: { id: number; name: string; lat: number; lng: number }) => {
      const ctx = libraryLocation(lib)
      if (ctx) setLocation(ctx)
    },
    [setLocation]
  )

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
    <Context.Provider
      value={{
        location,
        isLoaded,
        requestGps,
        selectRegion,
        selectLibrary,
        toSearchParams,
      }}
    >
      {children}
    </Context.Provider>
  )
}

export function useLocationContext() {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error('useLocationContext must be used within a LocationProvider')
  }
  return context
}
