# P1-06 검색 유형·관련도·ISBN·판본 표기

## 수정

- 기존 ‘도서명’ 모드가 제목/저자/출판사를 모두 검색하던 불일치를 제거한다. 기본은 `all`/‘통합’, 명시적인 `title`/`author`/`publisher`는 해당 인덱스 필드만 조회한다.
- 웹의 통합 요청은 `searchType`을 생략한다. 기존 운영 API의 기본 검색과 호환되며, 새 API는 생략한 요청을 통합으로 처리한다. API와 웹 자동 배포 순서가 달라도 통합 검색이 unknown enum400으로 실패하지 않는다.
- 관련도순은 NFKC/대소문자/공백/문장부호 정규화 후 정확한 제목 → 전체 구문 → 부분 토큰 매칭 순이다. Orama의 custom sorter가 전체 일치 후보에 적용된 뒤 offset/limit으로 페이지를 자른다. 동점은 기존 BM25 및 ISBN으로 결정한다. 인기순/최신순은 기존 명시 정렬을 유지한다.
- 일반 제목 검색에서 제목에 표시된 큰글자/필사 결과의 우선도를 같은 일치 등급 내에서 낮춘다. 해당 판본을 명시한 검색어는 페널티를 적용하지 않는다. ISBN별 결과를 합치지 않는다. 표기가 없는 책을 ‘일반판’이라고 단정하지 않는다.
- 체크 숫자까지 검증한 ISBN-10/13만 자동 감지한다. 유효한10자리 ISBN은978 ISBN-13으로 변환한다. ISBN-10 X/하이픈·공백·전각 입력 지원. 숫자가 있는 일반 제목은 임의로 ISBN 취급하지 않는다. ISBN 필드에서 잘못된 입력은 웹 안내/API400이며 0건·503으로 오인시키지 않는다.
- ISBN 후보가 없으면 정보나루의 기존 정확 서지 조회를 사용한다. 제목/키워드 보충 검색이나 원격 총건수를 ISBN 결과에 섞지 않는다.
- 저자 검색의 알려진 역할 표기만 정리한다. 검색 결과는 역할 표기를 정리해 표시하고 원문은 title 속성에 보존한다.
- 알라딘 보충은 공식 가이드에 있는 Title/Author/Publisher를 사용한다. 통합에서 Title 보충은 유효한 부분집합이며, 정보나루 keyword 보충은 기존 통합 필드를 사용한다. ISBN은 알라딘 제목 검색을 실행하지 않는다. 동기 보충 throttle key를 유형별로 분리한다.
- 기존 Orama 스키마/DB 스키마/저장 인덱스 구조를 변경하지 않는다. 정상 시작 시 기존 로딩 경로를 유지하고 강제 refresh/rebuild/cron 실행은 하지 않는다.
- 공통 순수 함수는 shared-types에 두어 웹/API 정규화가 일치하도록 한다. API Jest는 TypeScript 파일만 ts-jest로 처리하여 컴파일된 공통JS를 다시 ts-jest로 처리하는 경고를 피한다.

## 검증

- 실제 Orama3.1.18/기존 tokenizer와 격리된 fixture index로 대표40개(제목30/저자5/출판사3/ISBN2) 기대 첫 결과/필드 제외를 검증한다. 이 fixture는 운영 도서 전체의 품질 평가가 아니며 테스트 데이터/ISBN을 운영 DB에 쓰지 않는다.
- 정확/전체구문/부분 결과의 페이지 전역 순위, 인기·최신 정렬, 큰글자 명시 검색, 체크 숫자·X·저자 역할·판본 표기 테스트.
- SearchService 실제 경로의 유형/정규화/ISBN 정확 조회/관련없는 서지 거부/동기 보충 유형 분리/자동완성/API400 테스트.
- SearchPageInner의 실제 same-origin fetch 경로/유형/자동ISBN/잘못된 ISBN 무요청/판본·ISBN 링크/필터 페이지 초기화/503 오류를 DOM 테스트.
- 전체 frozen install/lint/type-check/build/test 및 CI/프리뷰 UI/배포 후 운영 검색 확인.

## 근거와 배포 제약

- [Orama sorter 문서](https://docs.orama.com/docs/orama-js/search/sorting), 설치된3.1.18의 `search-fulltext.js`에서 comparator가 pagination 전에 실행되는 것을 확인했다.
- [정보나루 공개 API](https://dlib.data4library.kr/apiUtilization) 및 기존 `getBookByIsbn`의 `isbn13` 서지 조회를 재사용한다.
- [알라딘 공식 가이드](https://www.aladin.co.kr/ttb/apiguide.aspx)를 직접 GET200하여 Title/Author/Publisher 지원을 확인했다. 외부 요청에 키가 필요하므로 테스트는 fake key/모킹이며 실제 외부 API를 대량 호출하지 않는다.
- 프리뷰 웹은 기존 운영 API를 사용한다. 새 검색 순위/엄격한 유형은 테스트 환경에서 검증하고, 사용자 프리뷰 UI 확인 후 승인된 API 배포와 운영 검색으로 재확인해야 한다. 프리뷰 UI만으로 새 API가 배포됐다고 주장하지 않는다.
- 사용자 ‘검증 후 운영 웹/API 반영’ 승인 수신. API 컨테이너 교체 중 짧은 요청 실패 가능성을 사전 안내했다. DB·강제 데이터 갱신·지도 URL/권한 변경 및 P1-07 착수는 포함하지 않는다.
