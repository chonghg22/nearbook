import type { Metadata } from 'next'
import { LibrariesMapView } from './_components/libraries-map-view'

export const metadata: Metadata = {
  title: '도서관 지도 | 우리동네책',
  description: '내 주변 도서관을 지도에서 찾아보세요',
}

export default function LibrariesPage() {
  return <LibrariesMapView />
}
