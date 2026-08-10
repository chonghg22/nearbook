import type { Graph } from 'schema-dts'
import { isProductionDeployment } from '@/lib/seo/deployment-environment'
import { serializeJsonLd } from '@/lib/seo/json-ld-serialize'

export function JsonLd({ data }: { data: Graph }) {
  // preview/dev 배포의 구조화 데이터가 수집되면 안 된다.
  if (!isProductionDeployment()) return null

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}
