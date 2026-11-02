import { LibraryGuideArticle } from '@/components/library-guides'
import { LIBRARY_GUIDES, guideMetadata } from '@/lib/library-guides'

const guide = LIBRARY_GUIDES[1]
export const metadata = guideMetadata(guide)
export default function NationalDigitalLibraryGuidePage() {
  return <LibraryGuideArticle guide={guide} />
}
