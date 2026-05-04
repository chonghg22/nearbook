# Prompt 14b — Naver Web Dynamic Map (마커 지도)

## 작업
/libraries 리스트, 홈 "내 주변 도서관" 등 다중 마커가 필요한 페이지에 Naver Maps JavaScript v3 SDK를 적용한다.

## 사전 준비
1. NCP Console → Maps Application
2. "Web Dynamic Map" 권한 추가 활성화
3. 등록 URL: http://localhost:3000, https://우리동네책.kr (운영)
4. Client ID 확인 (Static과 동일 애플리케이션의 ID 재사용 가능)

## 환경변수
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=xxxxxxx

→ NEXT_PUBLIC_ 접두사로 클라이언트에 노출됨. Referer 검증으로 보안.

## 핵심 파일
- apps/web/lib/maps/naver-loader.ts — SDK singleton 로더
- apps/web/components/map/dynamic-map.tsx — 재사용 컴포넌트
- apps/web/types/navermaps.d.ts — 타입 선언

## 검증
- /libraries 진입 → 마커 표시, 클릭 시 /library/[id] 이동
- 홈 → 위치 권한 허용 → 주변 도서관 마커 8개
- 리스트 hover → 지도가 해당 마커로 이동
- SDK는 한 번만 로드 (DOM #naver-maps-sdk 단일)
- 401 에러 시 → NCP 등록 URL 확인
