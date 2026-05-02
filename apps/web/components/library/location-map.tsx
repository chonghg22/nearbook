import Image from 'next/image'
import { getStaticMapUrl } from '@/lib/maps'
import { DirectionsButton } from '@/components/maps/directions-button'

interface Props {
  library: {
    lat: number
    lng: number
    name: string
    address: string
  }
}

export function LocationMap({ library }: Props) {
  const { lat, lng, name, address } = library
  const mapUrl = getStaticMapUrl(lat, lng, { w: 600, h: 400 })

  return (
    <section className="my-8">
      <h2 className="text-xl font-bold mb-4">🗺 위치</h2>
      <div className="rounded-lg overflow-hidden border">
        <Image
          src={mapUrl}
          alt={`${name} 위치 지도`}
          width={600}
          height={400}
          className="w-full"
          unoptimized
        />
      </div>
      <p className="mt-2 text-sm text-gray-600">{address}</p>
      <div className="mt-4">
        <DirectionsButton lat={lat} lng={lng} name={name} />
      </div>
    </section>
  )
}
