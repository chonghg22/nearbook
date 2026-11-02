import { LibraryGuideLinks } from '@/components/library-guides'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const metadata = buildPageMetadata({
  path: '/guides', title: '도서관 이용 가이드',
  description: '국립중앙도서관 책 검색과 국가전자도서관 원문 이용 방법을 알아보고, 가까운 공공도서관의 소장 도서를 찾아보세요.',
})

export default function GuidesPage() {
  return <main><header className="mx-auto max-w-5xl px-4 pt-10"><h1 className="text-3xl font-bold">도서관 이용 가이드</h1><p className="mt-3 leading-7 text-gray-600">자료를 찾는 곳과 실제로 읽을 곳을 함께 알아보세요.</p></header><LibraryGuideLinks /></main>
}
