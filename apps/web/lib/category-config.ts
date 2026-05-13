/**
 * 카테고리 slug ↔ KDC 코드 매핑 및 SEO 메타데이터.
 * 정보나루 loanItemSrch API의 kdc 파라미터에 1:1 매핑되는 카테고리만 포함.
 */

export type CategoryConfig = {
  slug: string
  kdcCode: string
  label: string
  seoTitle: string
  seoDescription: string
  introduction: string
}

export const CATEGORIES: CategoryConfig[] = [
  {
    slug: 'novel',
    kdcCode: '81',
    label: '소설',
    seoTitle: '소설 인기 대출도서',
    seoDescription: '도서관 대출 데이터 기반 소설 분야 인기 도서를 확인하세요. 한국소설, 추리소설, 로맨스 등 다양한 장르의 인기작을 만나보세요.',
    introduction: '전국 공공도서관에서 가장 많이 대출된 소설을 모았습니다. 판매 순위와는 다른, 실제 독자들이 빌려 읽은 작품 중심의 추천 리스트입니다. 한국소설부터 추리·스릴러, 로맨스까지 다양한 장르를 아우릅니다.',
  },
  {
    slug: 'poetry-essay',
    kdcCode: '82',
    label: '시·에세이',
    seoTitle: '시·에세이 인기 대출도서',
    seoDescription: '도서관에서 가장 많이 빌려간 시집과 에세이를 확인하세요. 일상의 위로가 되는 에세이와 감성을 채워줄 시집을 추천합니다.',
    introduction: '시와 에세이는 바쁜 일상 속 짧은 호흡으로 읽기 좋은 장르입니다. 전국 도서관 대출 데이터를 기반으로, 독자들이 가장 많이 찾은 시집과 에세이를 소개합니다.',
  },
  {
    slug: 'economics-business',
    kdcCode: '32',
    label: '경제·경영',
    seoTitle: '경제·경영 인기 대출도서',
    seoDescription: '도서관 대출 기준 경제·경영 분야 인기 도서입니다. 재테크, 투자, 경영 전략 등 실용적인 경제 서적을 확인하세요.',
    introduction: '경제·경영 분야에서 도서관 이용자들이 가장 많이 빌려간 책들입니다. 서점 베스트셀러와는 다른 시각으로, 실제 독자들이 꾸준히 찾는 경제·경영서를 만나보세요.',
  },
  {
    slug: 'psychology',
    kdcCode: '18',
    label: '심리학',
    seoTitle: '심리학 인기 대출도서',
    seoDescription: '도서관에서 가장 인기 있는 심리학 도서를 확인하세요. 자기이해, 인간관계, 심리 치유 등 마음을 탐구하는 책을 추천합니다.',
    introduction: '심리학은 자기 자신과 타인을 이해하는 데 도움을 주는 분야입니다. 전국 도서관 대출 데이터를 기반으로, 대중 심리학부터 전문 심리서까지 인기 도서를 소개합니다.',
  },
  {
    slug: 'education',
    kdcCode: '37',
    label: '교육',
    seoTitle: '교육 인기 대출도서',
    seoDescription: '도서관 대출 기준 교육 분야 인기 도서입니다. 자녀교육, 학습법, 교육 철학 등 교육에 관한 다양한 책을 확인하세요.',
    introduction: '교육에 관심 있는 학부모와 교육자들이 도서관에서 가장 많이 빌려간 책들입니다. 자녀교육, 입시, 학습법, 교육 트렌드까지 폭넓게 다룹니다.',
  },
  {
    slug: 'religion',
    kdcCode: '2',
    label: '종교',
    seoTitle: '종교 인기 대출도서',
    seoDescription: '도서관 대출 기준 종교 분야 인기 도서입니다. 기독교, 불교, 명상, 영성 등 종교와 신앙에 관한 책을 확인하세요.',
    introduction: '종교와 영성에 관한 도서관 인기 대출도서입니다. 기독교, 불교, 이슬람 등 다양한 종교의 경전, 명상, 신앙 에세이를 아우릅니다.',
  },
  {
    slug: 'science',
    kdcCode: '4',
    label: '자연과학',
    seoTitle: '자연과학 인기 대출도서',
    seoDescription: '도서관에서 가장 많이 빌려간 과학 도서를 확인하세요. 물리학, 생물학, 천문학 등 과학 교양서를 추천합니다.',
    introduction: '과학의 세계를 쉽고 재미있게 풀어낸 교양 과학서부터 전문 과학 도서까지, 전국 도서관에서 가장 많이 대출된 자연과학 분야 도서를 모았습니다.',
  },
  {
    slug: 'medicine-health',
    kdcCode: '51',
    label: '의학·건강',
    seoTitle: '의학·건강 인기 대출도서',
    seoDescription: '도서관 대출 기준 의학·건강 분야 인기 도서입니다. 건강 관리, 질병 예방, 운동, 식이요법 등 건강 서적을 확인하세요.',
    introduction: '건강에 대한 관심이 높아지면서 의학·건강 분야 도서관 대출도 꾸준히 늘고 있습니다. 전문 의학서부터 생활 건강 가이드까지 인기 도서를 소개합니다.',
  },
  {
    slug: 'cooking-living',
    kdcCode: '59',
    label: '요리·생활',
    seoTitle: '요리·생활 인기 대출도서',
    seoDescription: '도서관에서 가장 인기 있는 요리책과 생활 도서를 확인하세요. 레시피, 살림, 인테리어 등 일상을 풍요롭게 하는 책을 추천합니다.',
    introduction: '요리와 생활에 관한 도서관 인기 대출도서입니다. 다양한 레시피북, 살림 노하우, 인테리어 가이드 등 일상생활에 바로 활용할 수 있는 실용서를 모았습니다.',
  },
  {
    slug: 'art-design',
    kdcCode: '60',
    label: '미술·디자인',
    seoTitle: '미술·디자인 인기 대출도서',
    seoDescription: '도서관 대출 기준 미술·디자인 분야 인기 도서입니다. 현대미술, 그래픽 디자인, 건축 등 예술 서적을 확인하세요.',
    introduction: '미술과 디자인에 관심 있는 독자들이 도서관에서 가장 많이 빌려간 책들입니다. 미술사, 현대미술, 그래픽 디자인, 사진, 건축까지 폭넓게 다룹니다.',
  },
  {
    slug: 'music-performance',
    kdcCode: '67',
    label: '음악·공연',
    seoTitle: '음악·공연 인기 대출도서',
    seoDescription: '도서관에서 가장 많이 빌려간 음악·공연 도서를 확인하세요. 음악 이론, 악기 교본, 공연 예술에 관한 책을 추천합니다.',
    introduction: '음악과 공연 예술에 관한 도서관 인기 대출도서입니다. 클래식, 대중음악, 악기 연주법, 공연 기획 등 다양한 음악·공연 서적을 소개합니다.',
  },
  {
    slug: 'sports-leisure',
    kdcCode: '69',
    label: '스포츠·취미',
    seoTitle: '스포츠·취미 인기 대출도서',
    seoDescription: '도서관 대출 기준 스포츠·취미 분야 인기 도서입니다. 운동, 등산, 캠핑, 수공예 등 취미 생활에 관한 책을 확인하세요.',
    introduction: '운동과 취미에 관한 도서관 인기 대출도서입니다. 헬스, 요가, 등산, 캠핑, 수공예 등 여가를 즐기는 데 도움이 되는 실용서를 모았습니다.',
  },
  {
    slug: 'language',
    kdcCode: '7',
    label: '언어·외국어',
    seoTitle: '언어·외국어 인기 대출도서',
    seoDescription: '도서관에서 가장 많이 빌려간 언어·외국어 학습 도서를 확인하세요. 영어, 일본어, 중국어 등 어학 도서를 추천합니다.',
    introduction: '외국어 학습에 관한 도서관 인기 대출도서입니다. 영어, 일본어, 중국어 등 다양한 언어의 학습서, 회화, 문법, 시험 대비서를 소개합니다.',
  },
  {
    slug: 'history',
    kdcCode: '9',
    label: '역사',
    seoTitle: '역사 인기 대출도서',
    seoDescription: '도서관 대출 기준 역사 분야 인기 도서입니다. 한국사, 세계사, 역사 에세이 등 역사에 관한 책을 확인하세요.',
    introduction: '역사를 통해 현재를 이해하고 미래를 준비하는 독자들이 가장 많이 빌려간 역사 도서입니다. 한국사, 세계사, 역사 에세이, 여행기까지 폭넓게 다룹니다.',
  },
  {
    slug: 'computer-it',
    kdcCode: '00',
    label: '컴퓨터·IT',
    seoTitle: '컴퓨터·IT 인기 대출도서',
    seoDescription: '도서관에서 가장 많이 빌려간 컴퓨터·IT 도서를 확인하세요. 프로그래밍, AI, 데이터 분석 등 IT 도서를 추천합니다.',
    introduction: '프로그래밍, 인공지능, 데이터 분석 등 IT 분야 도서관 인기 대출도서입니다. 빠르게 변하는 기술 트렌드를 반영한 최신 IT 서적을 소개합니다.',
  },
]

export const CATEGORY_BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]))
export const CATEGORY_BY_KDC = new Map(CATEGORIES.map((c) => [c.kdcCode, c]))
export const ALL_SLUGS = CATEGORIES.map((c) => c.slug)
