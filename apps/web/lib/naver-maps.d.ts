declare namespace naver {
  namespace maps {
    class Map {
      constructor(element: string | HTMLElement, options: MapOptions)
      getBounds(): LatLngBounds
      getCenter(): LatLng
      setCenter(latlng: LatLng): void
      setZoom(zoom: number): void
      panTo(latlng: LatLng): void
    }

    class LatLng {
      constructor(lat: number, lng: number)
      lat(): number
      lng(): number
    }

    class LatLngBounds {
      getSW(): LatLng
      getNE(): LatLng
    }

    class Marker {
      constructor(options: MarkerOptions)
      setMap(map: Map | null): void
      getPosition(): LatLng
    }

    class InfoWindow {
      constructor(options: InfoWindowOptions)
      open(map: Map, marker: Marker): void
      close(): void
      isOpen(): boolean
    }

    namespace Event {
      function addListener(
        target: Map | Marker,
        eventName: string,
        listener: (...args: unknown[]) => void
      ): void
      function removeListener(listener: unknown): void
    }

    interface MapOptions {
      center: LatLng
      zoom?: number
      minZoom?: number
      maxZoom?: number
      scaleControl?: boolean
      mapDataControl?: boolean
      zoomControl?: boolean
      logoControl?: boolean
    }

    interface MarkerOptions {
      position: LatLng
      map?: Map
      title?: string
      icon?: {
        content?: string
        size?: { width: number; height: number }
        anchor?: { x: number; y: number }
      }
    }

    interface InfoWindowOptions {
      content: string
      maxWidth?: number
      backgroundColor?: string
      borderColor?: string
      borderWidth?: number
      anchorSize?: { width: number; height: number }
      pixelOffset?: { x: number; y: number }
    }
  }
}

interface Window {
  naver?: typeof naver
}
