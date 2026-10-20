import Link from 'next/link'
import { notFound } from 'next/navigation'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { REGION_DEFINITIONS, regionDescription } from '@/lib/seo/region-directory'
import { getRegionDirectory } from '@/lib/seo/region-directory-server'
import { buildLibraryListJsonLd } from '@/lib/seo/json-ld'
import { JsonLd } from '@/components/seo/json-ld'
import { RegionUnavailable } from './region-unavailable'

export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ sido: string }> }

export async function generateMetadata({ params }: Props) {
  const { sido } = await params
  const known = REGION_DEFINITIONS.some((region) => region.slug === sido)
  const region = known
    ? (await getRegionDirectory())?.find((entry) => entry.slug === sido)
    : undefined
  return buildPageMetadata({
    path: `/region/${sido}`,
    title: region ? `${region.name} 공공도서관` : '지역 도서관 목록',
    ...(region ? { description: regionDescription(region) } : {}),
    index: !!region,
  })
}

export default async function RegionPage({ params }: Props) {
  const { sido } = await params
  if (!REGION_DEFINITIONS.some((region) => region.slug === sido)) notFound()
  const directory = await getRegionDirectory()
  if (directory === null) return <RegionUnavailable />
  const region = directory.find((entry) => entry.slug === sido)
  // A valid administrative slug without enough actual content is not a landing page.
  if (!region) notFound()
  const path = `/region/${region.slug}`
  const description = regionDescription(region)
  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <JsonLd
        data={buildLibraryListJsonLd({
          path,
          name: `${region.name} 공공도서관`,
          description,
          libraries: region.libraries,
          breadcrumbs: [
            { name: '홈', path: '/' },
            { name: '지역별 공공도서관', path: '/regions' },
            { name: region.name, path },
          ],
        })}
      />
      <nav aria-label="위치" className="mb-4 text-sm">
        <Link href="/regions" className="text-primary-700 hover:underline">
          지역별 공공도서관
        </Link>
        <span className="mx-2">›</span>
        {region.name}
      </nav>
      <h1 className="text-3xl font-bold">{region.name} 공공도서관</h1>
      <p className="mt-3 text-muted-foreground">{description}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        우리동네책 등록 목록 기준이며 지역 내 모든 도서관을 뜻하지 않습니다. 방문 전 각 도서관의
        최신 운영 안내를 확인하세요.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {region.libraries.map((library) => (
          <li key={library.id}>
            <Link
              href={`/library/${library.id}`}
              className="block h-full rounded-xl border border-border p-5 hover:border-primary-300"
            >
              <h2 className="font-bold">{library.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {library.address || library.region}
              </p>
              <p className="mt-3 text-sm text-primary-700">이용 정보·인기·신착 도서 보기 →</p>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/libraries" className="mt-8 inline-block text-primary-700 underline">
        지도에서 도서관 찾기
      </Link>
    </section>
  )
}
