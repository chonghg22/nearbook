import { LibraryGuideArticle } from '@/components/library-guides'
import { LIBRARY_GUIDES, guideMetadata } from '@/lib/library-guides'

const guide = LIBRARY_GUIDES[0]
export const metadata = guideMetadata(guide)
export default function NationalLibraryGuidePage() {
  return <LibraryGuideArticle guide={guide} />
}
