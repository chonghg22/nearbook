# 06 — Home Page Specification

## 메인 검색바 (제거됨)

메인 검색은 전역 헤더(`apps/web/components/layout/header.tsx`)의 검색바를 사용한다.
Hero 영역은 카피와 인기검색어 chips만 표시 — 검색 input 중복 방지.

## UI 레이아웃

│   ● 전국 1,400+ 공공도서관 통합 검색          │
│   읽고 싶은 책, 우리 동네 도서관에 있나요?    │
│   책 제목만 검색하면 ...                      │
│   🔥 지금 많이 찾는 검색어                    │
│   [한강] [김호연] [무라카미 하루키] ...        │

## 컴포넌트 구조

- HeroSection
  - PopularQueriesChips (SearchBar 제거됨)
- LibrariesNearMe (Client, geolocation + NaverInteractiveMap 재사용)
- BookListSection (인기 도서)
- BookListSection (신간 도서)

## 변경 이력
- 2026-05-03: Hero 검색 input 제거(헤더와 중복). 인기검색어 chips만 유지. 
- 2026-05-03: LibrariesNearMe 섹션에 /libraries 기존 지도 컴포넌트(NaverInteractiveMap) 재사용 적용.
