# P1-09 모바일·접근성

## 범위

운영 기반 `5440144`의 웹만 수정한다. API·공용 타입·DB·의존성·지도 허용 URL·서비스워커 및 찜/알림 설정은 변경하지 않는다. 로그인, 실제 GPS/카메라 권한, 설치·알림 수신을 자동 실행하지 않는다. P1-10은 포함하지 않는다.

## 확인된 코드 문제와 변경

- 홈/헤더 자동완성: 입력과 목록 연결, 선택 상태, 방향키/Enter/Esc 처리가 없었다. `useId`, combobox/listbox/option, controls/expanded/active-descendant로 연결하고 입력에 포커스를 유지한다. Tab·표준 텍스트 편집을 가로채지 않으며 한글 조합 중 선택/제출을 막는다. 바뀐 검색어의 이전 debounce 응답은 선택할 수 없다. 입력/선택/닫기/검색 오류의 기존 공개 탐색을 유지한다.
- 실제 모바일 검색 Dialog에서 Radix가 capture 단계에서 Escape를 관찰하므로, 펼친 자동완성은 첫 Escape로 닫고 다음 Escape로 Dialog를 닫도록 처리한다. 트리거 포커스 복귀와 위치 모달의 기존 포커스 트랩을 유지한다.
- 검색 입력의 flex 최소 폭, 작은 버튼 예외, 고정 한 줄 페이지 번호, 긴 연속 제목/검색어가 작은 화면에서 문제를 일으킬 수 있었다. `min-w-0`, 고정 터치 타깃, wrap/overflow-wrap 및 명시적 포커스 표시를 적용한다. 줄 수 제한은 유지하며 제목 전체는 상세에서 볼 수 있다.
- 검색/위치 모달은 CSS `dvh` fallback에 더해 VisualViewport resize/scroll에 반응한다. 검색 모달은 viewport top/height, 모바일 위치 sheet는 가상 키보드 위 bottom/height를 따른다. 목록은 스크롤 가능하고 안전 영역을 남긴다. 실제 iOS/Android 키보드 동작은 별도 기기 검증 대상이다.
- 지도/목록 버튼에 `aria-pressed`를 표시한다. 모바일에서 분할 최소 폭이 남지 않게 초기 CSS와 breakpoint 변경을 처리하되, 사용자가 고른 목록은 유지한다. 지역과 검색 요청은 기존 로직을 사용하며 지도 SDK 권한이나 허용 URL은 바꾸지 않는다.
- 설치 제안은 fixed/z70 overlay에서 본문 뒤·푸터 앞 일반 흐름의 aside로 바꾼다. 모바일 핵심 조작과 Dialog 위를 가리지 않는다. 기존 방문 횟수/단순 상세 경로 진입은 더 이상 자격 조건이 아니다. **검색 결과가 실제 표시되거나 보유 조회가 1곳 이상 정상 확인된 후** 세션 내 자격을 부여한다. 실패·pending·빈 검색·조회 0곳은 자격을 만들지 않는다. 예전 추적 키/분석은 삭제하거나 용도를 바꾸지 않는다.
- 설치 이벤트는 일찍 캡처해 유용한 행동 이후 사용할 수 있게 한다. Android 설치 기능이 없는 브라우저에는 버튼을 만들어내지 않는다. iOS 안내는 행동 후 30초 지연한다. scan/login/me/offline에서는 숨긴다. 설치는 명시적 클릭만 실행하며 중복 클릭, 실패 안내, 나중에/기존 억제값/standalone/저장소 거부를 처리한다. 자격 신호는 세션 boolean 하나이며 검색어·ISBN·좌표·계정 정보나 이벤트 payload가 없다.

키보드/ARIA 설계 기준: [W3C APG combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/). 이 변경으로 WCAG 전체 준수나 모든 보조기기 지원을 인증하는 것은 아니다.

## 자동 검증

- 실제 SearchBar + SWR + 공개 요청/parser의 방향키, 선택, Esc/Tab, IME, debounce 구 응답 배제, 클릭/지우기, 오류 후 직접 검색, 복수 목록 ID.
- 실제 모바일 Radix Dialog의 첫/둘째 Escape와 포커스 복귀. 실제 위치 Dialog의 수동 지역 변경/포커스 복귀/기존 trap 회귀. GPS·카메라 요청은 하지 않는다.
- VisualViewport synthetic resize/offset와 API 없는 fallback, 검색 input/페이지 번호의 layout 클래스, 지도/목록 선택 상태·지역 유지·breakpoint 변경.
- 실제 InstallPrompt의 조기 이벤트/행동 전후/iOS 타이머/standalone/억제/경로/중복 클릭/실패/저장소 거부/cleanup. 기존 검색·보유 테스트에서 실제 정상/오류/빈 응답 자격 확인.
- 전체 frozen install/lint/type-check/build/Node/Vitest/API Jest 및 GitHub CI.

DOM/jsdom은 레이아웃 엔진이 아니므로 360/390/430px 화면 잘림이나 실제 OS 키보드까지 통과했다고 기록하지 않는다. 지도 SDK는 DOM 검증에서 대체하며 실제 타일 검증과 구분한다.

## 프리뷰 화면·기기 체크리스트 (완료 전 확인)

1. 360/390/430px 홈: 헤더/검색/스캔/검색어 지우기 버튼이 잘리거나 겹치지 않는다. 추천 목록을 스크롤하고 방향키/Enter로 선택한다.
2. 모바일 검색 모달: 첫 Esc는 추천 목록, 둘째 Esc는 모달을 닫는다. 닫은 뒤 검색 열기 버튼으로 포커스가 돌아간다. Tab이 모달 밖으로 새지 않는다.
3. `/search?q=한강`: 필터/검색 버튼, 긴 제목과 ISBN, 여러 페이지에서 번호가 가로 화면을 넘지 않는다. 제목 일부만 보이는 경우 상세로 열어 전체를 확인한다.
4. `/libraries`: 시도/시군구 선택 후 목록/지도 전환 시 선택이 유지된다. preview URL 지도 인증 실패는 알려진 환경 제약이며 목록을 검증할 수 있다. 운영 지도는 기존 설정을 유지한다.
5. 책 상세: 긴 제목/저자/보유 목록과 반경/지역 버튼이 넘치지 않는다. 위치 모달의 수동 지역/도서관 입력·선택·Esc·포커스 복귀를 확인한다.
6. **실제 휴대폰 Safari/Chrome**: 검색·도서관 선택에서 키보드가 열린 상태로 입력/목록/닫기를 누를 수 있는지, safe-area와 회전/스크롤을 확인한다. desktop viewport override나 synthetic 테스트만으로 실제 기기를 대체했다고 주장하지 않는다.
7. 설치 가능 Android/Chrome 또는 iOS: 성공 조회 뒤 페이지 아래 제안은 핵심 버튼을 덮지 않는다. 나중에/실패/standalone은 자동 검증과 수동 확인을 구분한다. 검증 중 실제 설치나 사적 설정 변경은 하지 않는다.

## 배포 조건

사용자 ‘검증 후 운영 웹 반영’ 및 이번 프리뷰 접근 승인 수신. CI·Ready 프리뷰·화면 검증 통과 후 정확한 테스트 head를 main에 merge한다. 웹 Vercel Ready/운영 alias·자산·health를 확인하고 API CD가 발생하지 않았는지 기록한다. 실제 기기 또는 브라우저 접근이 남으면 완료로 표시하지 않고 확인을 요청한다.
