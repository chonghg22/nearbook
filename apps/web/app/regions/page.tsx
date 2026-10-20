import Link from 'next/link'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { getRegionDirectory } from '@/lib/seo/region-directory-server'
import { RegionUnavailable } from '../region/[sido]/region-unavailable'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const directory = await getRegionDirectory()
  return buildPageMetadata({
    path: '/regions',
    title: '지역별 공공도서관',
    description:
      '시도별 공공도서관 목록에서 주소와 이용 정보, 도서관별 인기·신착 도서를 찾아보세요.',
    index: !!directory?.length,
  })
}

export default async function RegionsPage() {
  const directory = await getRegionDirectory()
  if (!directory?.length) return <RegionUnavailable />
  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <nav aria-label="위치" className="mb-4 text-sm">
        <Link href="/libraries" className="text-primary-700 hover:underline">
          우리 동네 도서관
        </Link>
      </nav>
      <h1 className="text-3xl font-bold">지역별 공공도서관</h1>
      <p className="mt-3 text-muted-foreground">
        지역을 선택해 도서관 주소와 이용 정보, 인기·신착 도서를 확인하세요. 우리동네책에 등록된
        도서관을 기준으로 안내합니다.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {directory.map((region) => (
          <li key={region.slug}>
            <Link
              href={`/region/${region.slug}`}
              className="block rounded-xl border border-border p-5 hover:border-primary-300"
            >
              <h2 className="font-bold">{region.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                공공도서관 {region.libraries.length}곳
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
