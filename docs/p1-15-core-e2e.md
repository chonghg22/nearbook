# P1-15 / KAN-120 — 핵심 브라우저 회귀

2026-10-19, P1-14 운영 main `d619481` 기반 `test/p1-15-core-e2e-20261019`에서 진행. 실제 사용자 계정/발송/외부 provider 없이 앱을 브라우저로 검증한다. P1-11 알림 개선은 보류를 유지한다.

[PR22](https://github.com/chonghg22/nearbook/pull/22). 원격 CI의 실행 결과와 현재 head는 [PR 검사](https://github.com/chonghg22/nearbook/pull/22/checks)에서 확인한다. P1-14 운영 반영 이후 작성한 테스트·문서·CI 변경이며 이 PR은 아직 병합하지 않았다.

## 실행 구조

- Playwright1.58.2 고정, Chromium desktop/mobile 기기 에뮬레이션. 실제 Next production build/start는 `127.0.0.1:3100`, SSR·브라우저 API와 Supabase 모의 서버는 `127.0.0.1:4101`에서 실행한다. 일반 API 장애 주입은 worker를 차단해 route 가로채기를 보장하고, 별도 privacy 그룹은 실제 worker를 허용한다.
- 재사용 서버를 허용하지 않고 각 실행이 자체 fixture를 띄운다. 가짜 세션·가짜 JWT·가짜 anon key만 사용한다. 앱 `.env`를 복사하지 않는다. 주소/환경은 config에서 loopback으로 명시한다.
- 브라우저는 loopback 두 포트 외 요청을 차단한다. SSR도 명시한 local upstream만 쓴다. 정식 OAuth/Kakao/DB/도서관·메일·푸시 서비스를 호출하지 않는다. 순차 실행·매 테스트 fixture 초기화로 개인 목록/실패 상태가 다음 테스트에 섞이지 않는다.
- `pnpm --filter @nearbook/web test:e2e`. 최초 `pnpm --filter @nearbook/web exec playwright install chromium`. CI는 기존 build/test 뒤 Chromium 의존성 설치·E2E를 실행한다. 실패 시 trace/screenshot/report를 7일 artifact로 보존한다.
- 외부 자료는 [Playwright 네트워크 문서](https://playwright.dev/docs/network)와 [BrowserContext](https://playwright.dev/docs/api/class-browsercontext)의 격리/route API를 확인했다. SSR 요청은 브라우저 route만으로 가로챌 수 없으므로 별도 로컬 upstream을 사용한다.

## 시나리오

각 desktop/mobile에서 14개, 합계28개를 구성했다.

| 범위 | 검증하는 실제 앱 동작 |
| --- | --- |
| 검색→책→도서관 | 검색 제출·결과 선택·h1/ISBN·대출가능 집계·공식 URL·상세 운영시간 |
| 외부429/503 | 오류를 미소장으로 오인하지 않고 기본 metadata 유지·재시도 복구 |
| 검색503 | 오류와 정상0건 구분·재시도 정상1건 |
| 보유 deadline | 17초 지연 응답에서 15초 앱 deadline·오류 안내·다음 조회 복구 |
| GPS 거부 | 거부 오류→수동 부산 선택·기준 변경·dialog 닫힘/포커스 복귀 |
| 비로그인/로그인 실패 | 찜→로그인 next 유지, OAuth 시작 실패 안내·버튼 복구 |
| 인증 세션/찜 | 모의 로그인 세션의 저장 실패→상태 재확인→중복 클릭1회 저장 |
| 계정 전환/오프라인 | A의 개인 목록→실제 worker 활성화·개인 경로 미캐시→B의 빈 목록→오프라인 재로드에서 A 정보 없음 |
| 카메라 거부 | 스캔 불가→일반 검색 이동 |
| ISBN 스캔 성공 | 모의 native detector가 ISBN을 읽으면 정확한 책/scan source로 이동 |
| 모바일 폭3종 | 360/390/430px에서 가로 넘침 없음·dialog 범위·Escape 닫기 |

로컬 production build/start에서 **28개 모두 통과**(desktop14+mobile14, 최종56초). frozen install/lint/type-check 및 기존 API243 성공/실PG15 skip·웹365·Node237 회귀도 통과했다. 처음 dev 서버의 도구 overlay가 모바일 버튼을 가로채던 검증 간섭을 확인해 production bundle로 바꿨다. 기존 API/SEO/개인정보 단위·계약 테스트는 유지한다.

검증 로그: `/private/tmp/nearbook-p115-e2e-production-final.log`, `nearbook-p115-regression.log`, `nearbook-p115-node-contracts.log`, `nearbook-p115-lint-final.log`, `nearbook-p115-types-final.log`. 운영 API/DB에 테스트 데이터를 쓰지 않았다.

## 자동 검증과 구분할 기기 확인

이 테스트는 실제 Chromium+앱 코드와 모의 backend/auth/provider를 연결한 검증이다. 실제 Kakao 인증 완료·운영 계정 저장·Supabase 보안/DB 경합·실제 바코드 카메라 인식률·iOS Safari/WebKit·물리 키보드/회전은 통과로 주장하지 않는다.

실기기 확인 시 검색→책→도서관 공식 URL, GPS 거부/수동 선택, 키보드 열린 모달, 카메라 권한 거부/실물ISBN, 로그인 후 기본 도서관/찜/로그아웃·다른 계정·오프라인을 확인하고 OS/브라우저/화면폭/관찰 결과를 남긴다. 실제 계정 변경/동의·발송은 별도 사용자 범위 안에서만 수행한다. 기존 보류 알림을 활성화하거나 테스트 발송하지 않는다.
