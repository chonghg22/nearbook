import type { Graph } from 'schema-dts'
import { buildBreadcrumbList } from '@/lib/seo/json-ld'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { toAbsoluteSiteUrl } from '@/lib/seo/site-url'

export const GUIDES_UPDATED_AT = '2026-11-02'

export const LIBRARY_GUIDES = [
  {
    slug: 'national-library-search',
    title: '국립중앙도서관 책 검색 방법과 가까운 도서관 소장 확인',
    description: '국립중앙도서관에서 제목·저자·ISBN으로 책을 찾고, 판본을 확인한 뒤 가까운 공공도서관의 소장 여부를 확인하는 방법을 안내합니다.',
    intro: '책의 정확한 서지 정보를 찾고 싶다면 국립중앙도서관 소장자료 검색부터 시작해 보세요. 빌려 읽을 곳을 찾고 있다면, 확인한 제목이나 ISBN으로 가까운 공공도서관까지 이어서 찾아볼 수 있습니다.',
    officialUrl: 'https://www.nl.go.kr/NL/contents/N10100000000.do',
    officialLabel: '국립중앙도서관 소장자료 검색',
    sections: [
      { id: 'catalog', title: '1. 국립중앙도서관 소장자료에서 책 찾기', paragraphs: [
        '공식 소장자료 검색에서 책 제목을 입력합니다. 제목이 흔하거나 기억이 정확하지 않다면 저자 이름을 함께 확인하고, 고급검색에서 조건을 좁혀 보세요. ISBN을 알고 있다면 해당 번호로 검색하면 판본을 구분하는 데 도움이 됩니다.',
        '검색 결과에서는 제목뿐 아니라 저자, 발행처, 발행연도, ISBN을 비교합니다. 같은 제목이라도 개정판·번역판·전자자료가 함께 나올 수 있으므로 원하는 자료 유형과 권차까지 확인하세요.',
      ] },
      { id: 'edition', title: '2. 원하는 판본의 제목과 ISBN 기록하기', paragraphs: [
        '찾은 책의 상세 화면에서 제목과 ISBN을 기록해 두세요. ISBN은 책의 판본을 구별하는 식별자입니다. 특정 번역이나 개정판이 필요할 때는 제목만으로 결정하지 말고 저자·역자, 출판사, 발행연도도 함께 대조하는 편이 좋습니다.',
        '국립중앙도서관에서 검색된다는 사실이 우리 동네 도서관에도 책이 있다는 뜻은 아닙니다. 방문·열람이 목적이라면 해당 자료의 이용 조건과 국립중앙도서관의 최신 이용 안내를 공식 사이트에서 확인하세요.',
      ] },
      { id: 'nearby', title: '3. 가까운 공공도서관의 소장 여부 확인하기', paragraphs: [
        '아래 검색창에 제목이나 ISBN을 입력하고 검색 결과에서 같은 판본의 책을 선택하세요. 책 상세 화면에서 소장 도서관과 대출 가능성을 확인할 수 있습니다. 원하는 지역의 도서관은 지역별 도서관 목록에서도 찾아볼 수 있습니다.',
        '제목 검색 결과가 너무 많다면 ISBN으로 다시 찾아보세요. 반대로 ISBN으로 나오지 않으면 제목으로 검색해 다른 판본이 있는지 확인할 수 있습니다. 우리동네책의 검색 범위는 연결된 공공도서관 데이터이며 모든 기관·자료를 포괄하지는 않습니다.',
      ] },
      { id: 'visit', title: '4. 방문 전 도서관 공식 사이트에서 다시 확인하기', paragraphs: [
        '소장 여부와 지금 빌릴 수 있는지는 서로 다릅니다. 대출 중이거나 예약·서가 정리 등으로 이용이 달라질 수 있고, 우리동네책에 표시되는 정보에는 갱신 시차가 있을 수 있습니다.',
        '방문할 도서관의 공식 사이트에서 대출 상태, 휴관일, 회원가입 및 대출 자격을 확인하세요. 예약과 대출 신청도 해당 도서관의 절차를 따라 진행합니다.',
      ] },
    ],
    questions: [
      { question: '국립중앙도서관과 우리동네책은 같은 서비스인가요?', answer: '우리동네책은 독립적으로 운영하는 공공도서관 책 검색 서비스입니다. 국립중앙도서관의 공식 사이트나 공식 제휴 안내 페이지가 아닙니다.' },
      { question: 'ISBN이 없어도 검색할 수 있나요?', answer: '제목이나 저자로 검색할 수 있습니다. 원하는 판본이 정해져 있다면 결과에서 출판사와 발행연도를 함께 확인하세요.' },
    ],
    sources: [{ label: '국립중앙도서관 소장자료 검색', url: 'https://www.nl.go.kr/NL/contents/N10100000000.do' }],
  },
  {
    slug: 'national-digital-library',
    title: '국가전자도서관 이용 방법: 자료 검색과 원문 열람 안내',
    description: '국가전자도서관에서 자료를 검색하고 원문 이용 조건을 확인하는 방법을 정리했습니다. 모두이용·도서관방문이용의 차이와 종이책 소장 확인까지 안내합니다.',
    intro: '국가전자도서관은 참여 기관의 자료를 모아 찾을 수 있는 검색 서비스입니다. 검색된 자료에 원문이 있더라도 이용 장소와 조건은 서로 다릅니다. 검색에서 열람까지 확인할 지점을 순서대로 살펴보세요.',
    officialUrl: 'https://dlibrary.go.kr/',
    officialLabel: '국가전자도서관 자료 검색',
    sections: [
      { id: 'search', title: '1. 제목·저자·주제로 자료 검색하기', paragraphs: [
        '국가전자도서관 공식 사이트에서 검색어를 입력합니다. 검색 항목은 전체, 서명, 저자, 발행처, ISBN/ISSN 중에서 선택할 수 있습니다. 책 이름을 알고 있다면 서명, 저자를 알고 있다면 저자 항목으로 범위를 좁혀 보세요.',
        '상세검색과 결과 필터를 이용하면 발행연도, 자료유형, 소장도서관 등으로 찾는 범위를 줄일 수 있습니다. 검색 결과에서는 제목과 발행 정보를 먼저 대조해 목적에 맞는 자료인지 확인하세요.',
      ] },
      { id: 'full-text', title: '2. ‘원문있음’과 실제 열람 조건 구분하기', paragraphs: [
        '원문이 필요한 경우 검색창의 ‘원문있음’ 옵션을 활용할 수 있습니다. 다만 원문 표시가 있다는 이유만으로 모든 자료를 집에서 무료로 내려받을 수 있는 것은 아닙니다.',
        '공식 이용방법은 원문을 ‘모두이용’과 ‘도서관방문이용’ 등으로 구분합니다. 모두이용은 인터넷에서 무료로 열람할 수 있는 자료이고, 도서관방문이용은 제공 기관 또는 협약도서관 방문이 필요한 자료입니다. 개별 자료의 안내가 우선합니다.',
      ] },
      { id: 'provider', title: '3. 제공 기관에서 원문 이용 안내 확인하기', paragraphs: [
        '원하는 자료를 선택한 뒤 원문 또는 제공 기관으로 이어지는 링크를 확인합니다. 연결된 기관에서 열람 장소, 로그인 필요 여부, 인쇄·다운로드 가능 범위와 비용 안내를 확인하세요.',
        '원문이 열리지 않으면 해당 자료의 접근 조건과 제공 기관의 공지사항을 먼저 확인하세요. 기관의 서비스 상태에 따라 일부 자료 연결이 중단되거나 이용 방법이 바뀔 수 있습니다. 방문이 필요하다면 해당 도서관에 이용 가능 여부를 문의하는 것이 좋습니다.',
      ] },
      { id: 'print-book', title: '4. 종이책이 필요하다면 가까운 소장 도서관 찾기', paragraphs: [
        '화면으로 읽기 어렵거나 종이책으로 빌리고 싶다면 자료의 제목과 ISBN을 확인해 아래에서 검색해 보세요. 우리동네책은 연결된 공공도서관의 책 소장 여부와 대출 가능성을 확인하는 데 도움을 줍니다.',
        '논문·고문헌·특수자료 등은 우리동네책에서 검색되지 않을 수 있습니다. 이 경우 국가전자도서관의 제공 기관 안내를 이용하세요. 우리동네책은 국가전자도서관의 원문이나 전자책 대출을 제공하지 않습니다.',
      ] },
    ],
    questions: [
      { question: '국가전자도서관에 있으면 집에서도 모두 볼 수 있나요?', answer: '자료마다 다릅니다. 모두이용인지 도서관방문이용인지 확인하고, 연결된 제공 기관의 최신 열람 조건을 확인해야 합니다.' },
      { question: '우리동네책에서 국가전자도서관 원문을 열람할 수 있나요?', answer: '원문 열람은 국가전자도서관과 자료 제공 기관에서 진행합니다. 우리동네책에서는 종이책을 소장한 공공도서관을 찾아볼 수 있습니다.' },
    ],
    sources: [
      { label: '국가전자도서관 검색', url: 'https://dlibrary.go.kr/' },
      { label: '국가전자도서관 공식 이용방법', url: 'https://dlibrary.go.kr/intro/help.do' },
      { label: '국립중앙도서관의 국가전자도서관 소개', url: 'https://www.nl.go.kr/NL/contents/N10700000000.do' },
    ],
  },
] as const

export type LibraryGuide = typeof LIBRARY_GUIDES[number]
export const guidePath = (guide: LibraryGuide) => `/guides/${guide.slug}`
export const guideMetadata = (guide: LibraryGuide) => buildPageMetadata({
  path: guidePath(guide), title: guide.title, description: guide.description, openGraphType: 'article',
})

export function guideJsonLd(guide: LibraryGuide): Graph {
  const path = guidePath(guide)
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article', '@id': `${toAbsoluteSiteUrl(path)}#article`,
        headline: guide.title, description: guide.description, inLanguage: 'ko-KR',
        datePublished: GUIDES_UPDATED_AT, dateModified: GUIDES_UPDATED_AT,
        mainEntityOfPage: toAbsoluteSiteUrl(path),
        author: { '@type': 'Organization', name: '우리동네책', url: toAbsoluteSiteUrl('/') },
        citation: guide.sources.map((source) => source.url),
      },
      buildBreadcrumbList(path, [{ name: '홈', path: '/' }, { name: '도서관 이용 가이드', path: '/guides' }, { name: guide.title, path }]),
    ],
  }
}
