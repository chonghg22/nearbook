// 지역 slug → { label, lat, lng }
// lat/lng는 해당 행정구역의 중심 좌표 (지오코딩 API 없이 매핑 테이블로 대체)

export interface RegionCoord {
  label: string
  lat: number
  lng: number
}

export const REGION_COORDS: Record<string, RegionCoord> = {
  // 특별시/광역시
  'seoul': { label: '서울 전체', lat: 37.5665, lng: 126.9780 },
  'busan': { label: '부산 전체', lat: 35.1796, lng: 129.0756 },
  'daegu': { label: '대구 전체', lat: 35.8714, lng: 128.6014 },
  'incheon': { label: '인천 전체', lat: 37.4563, lng: 126.7052 },
  'gwangju': { label: '광주 전체', lat: 35.1595, lng: 126.8526 },
  'daejeon': { label: '대전 전체', lat: 36.3504, lng: 127.3845 },
  'ulsan': { label: '울산 전체', lat: 35.5384, lng: 129.3114 },
  'sejong': { label: '세종 전체', lat: 36.4800, lng: 127.2890 },
  // 경기도 주요 구/시
  'gyeonggi-suwon': { label: '수원시', lat: 37.2636, lng: 127.0286 },
  'gyeonggi-seongnam': { label: '성남시', lat: 37.4386, lng: 127.1378 },
  'gyeonggi-goyang': { label: '고양시', lat: 37.6584, lng: 126.8320 },
  'gyeonggi-yongin': { label: '용인시', lat: 37.2411, lng: 127.1775 },
  'gyeonggi-bucheon': { label: '부천시', lat: 37.5035, lng: 126.7660 },
  'gyeonggi-ansan': { label: '안산시', lat: 37.3236, lng: 126.8219 },
  'gyeonggi-anyang': { label: '안양시', lat: 37.3943, lng: 126.9568 },
  'gyeonggi-hanam': { label: '하남시', lat: 37.5392, lng: 127.2147 },
  // 서울 주요 구
  'seoul-gangnam': { label: '강남구', lat: 37.4979, lng: 127.0276 },
  'seoul-seocho': { label: '서초구', lat: 37.4837, lng: 127.0324 },
  'seoul-mapo': { label: '마포구', lat: 37.5663, lng: 126.9016 },
  'seoul-yongsan': { label: '용산구', lat: 37.5384, lng: 126.9654 },
  'seoul-jongno': { label: '종로구', lat: 37.5735, lng: 126.9790 },
  'seoul-jung': { label: '중구', lat: 37.5641, lng: 126.9979 },
  'seoul-songpa': { label: '송파구', lat: 37.5145, lng: 127.1059 },
  'seoul-nowon': { label: '노원구', lat: 37.6541, lng: 127.0568 },
  'seoul-dobong': { label: '도봉구', lat: 37.6688, lng: 127.0472 },
  'seoul-eunpyeong': { label: '은평구', lat: 37.6176, lng: 126.9227 },
  'seoul-seodaemun': { label: '서대문구', lat: 37.5791, lng: 126.9368 },
  'seoul-gangseo': { label: '강서구', lat: 37.5509, lng: 126.8495 },
  'seoul-guro': { label: '구로구', lat: 37.4954, lng: 126.8874 },
  'seoul-gwanak': { label: '관악구', lat: 37.4784, lng: 126.9516 },
  'seoul-dongjak': { label: '동작구', lat: 37.5124, lng: 126.9393 },
  'seoul-yeongdeungpo': { label: '영등포구', lat: 37.5264, lng: 126.8962 },
  'seoul-gwangjin': { label: '광진구', lat: 37.5384, lng: 127.0822 },
  'seoul-seongdong': { label: '성동구', lat: 37.5635, lng: 127.0369 },
  'seoul-dongdaemun': { label: '동대문구', lat: 37.5744, lng: 127.0396 },
  'seoul-jungnang': { label: '중랑구', lat: 37.6063, lng: 127.0927 },
  'seoul-seongbuk': { label: '성북구', lat: 37.5894, lng: 127.0167 },
  'seoul-gangbuk': { label: '강북구', lat: 37.6398, lng: 127.0257 },
  'seoul-gangdong': { label: '강동구', lat: 37.5301, lng: 127.1238 },
  // 도 단위
  'jeonbuk': { label: '전북 전체', lat: 35.7175, lng: 127.1530 },
  'jeonnam': { label: '전남 전체', lat: 34.8679, lng: 126.9910 },
  'gyeongbuk': { label: '경북 전체', lat: 36.4919, lng: 128.8889 },
  'gyeongnam': { label: '경남 전체', lat: 35.4606, lng: 128.2132 },
  'chungbuk': { label: '충북 전체', lat: 36.8000, lng: 127.7000 },
  'chungnam': { label: '충남 전체', lat: 36.5184, lng: 126.8000 },
  'gangwon': { label: '강원 전체', lat: 37.8228, lng: 128.1555 },
  'jeju': { label: '제주 전체', lat: 33.4996, lng: 126.5312 },
}

// 시/도 → 하위 slug 목록 (드롭다운 계층 구조)
export const REGION_TREE: { label: string; children: string[] }[] = [
  {
    label: '서울특별시',
    children: [
      'seoul',
      'seoul-gangnam', 'seoul-seocho', 'seoul-mapo', 'seoul-yongsan',
      'seoul-jongno', 'seoul-jung', 'seoul-songpa', 'seoul-nowon',
      'seoul-dobong', 'seoul-eunpyeong', 'seoul-seodaemun', 'seoul-gangseo',
      'seoul-guro', 'seoul-gwanak', 'seoul-dongjak', 'seoul-yeongdeungpo',
      'seoul-gwangjin', 'seoul-seongdong', 'seoul-dongdaemun', 'seoul-jungnang',
      'seoul-seongbuk', 'seoul-gangbuk', 'seoul-gangdong',
    ],
  },
  {
    label: '경기도',
    children: [
      'gyeonggi-suwon', 'gyeonggi-seongnam', 'gyeonggi-goyang',
      'gyeonggi-yongin', 'gyeonggi-bucheon', 'gyeonggi-ansan',
      'gyeonggi-anyang', 'gyeonggi-hanam',
    ],
  },
  { label: '부산광역시', children: ['busan'] },
  { label: '대구광역시', children: ['daegu'] },
  { label: '인천광역시', children: ['incheon'] },
  { label: '광주광역시', children: ['gwangju'] },
  { label: '대전광역시', children: ['daejeon'] },
  { label: '울산광역시', children: ['ulsan'] },
  { label: '세종특별자치시', children: ['sejong'] },
  { label: '강원도', children: ['gangwon'] },
  { label: '충청북도', children: ['chungbuk'] },
  { label: '충청남도', children: ['chungnam'] },
  { label: '전라북도', children: ['jeonbuk'] },
  { label: '전라남도', children: ['jeonnam'] },
  { label: '경상북도', children: ['gyeongbuk'] },
  { label: '경상남도', children: ['gyeongnam'] },
  { label: '제주특별자치도', children: ['jeju'] },
]
