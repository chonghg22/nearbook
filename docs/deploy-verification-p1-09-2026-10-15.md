# P1-09 모바일·접근성 검증 — 2026-10-15

## 상태

운영 웹 반영 완료. [PR #16](https://github.com/chonghg22/nearbook/pull/16). 최종 CI·Ready 프리뷰 및 사용자의 휴대폰 정상 확인 후 2026-10-15 10:07 KST 병합·운영 배포했다.

- base/main `5440144d6896bcaf4296ffe77c136df330ae4468`
- branch `fix/p1-09-mobile-accessibility-20261015`
- worktree `/Users/jack/local/nearbook-p1-09`
- 최종 head `2edfd0534f7a8b848fdc2313171395ebe9a77364` (최초 `5b9acac` 이후 가로/큰 화면에서도 위치 Dialog가 visual viewport 중심을 따르게 보완)
- merge/main/web source `a516a5eb0c2e29eed02bfcaf2ab400b27b0c0673`
- 기존 원본 worktree의 누적 소스 변경은 가져오거나 reset하지 않음
- 사용자 ‘검증 후 운영 웹 반영’ 및 이번 프리뷰 접근 승인 수신

## 변경/제외

웹만: 자동완성 키보드·ARIA·IME/옛 debounce 선택 배제, 실제 Radix 검색 Dialog Esc/포커스, 검색/위치 모달 VisualViewport/safe-area, 작은 입력·44px 타깃·긴 텍스트/페이지 번호 wrap, 지도/목록 선택 상태 및 좁은 분할 대응, 성공 조회 후 일반 페이지 흐름의 설치 제안.

설치 자격은 검색 결과가 표시되거나 보유 조회 checkedCount>0일 때 세션 boolean을 기록한다. 기존 방문 횟수와 단순 책 경로 진입만으로 제안하지 않는다. 신호 payload에 검색어·ISBN·좌표·계정 정보를 넣지 않는다. 설치는 실제 사용자 클릭만 실행하고 조기 이벤트/중복/실패/억제/standalone/저장소 거부를 처리한다.

API·공용 타입·DB·의존성/lockfile·서비스워커·지도 URL·찜/알림 설정/발송·GPS/카메라 권한·강제 갱신·P1-10 제외.

## 로컬 검증

- frozen install, lint, type-check, build, test 성공
- 693개 = Node237 + Vitest309(28파일) + API Jest147
- 신규 실제 DOM17 + 설치13, 기존 검색/보유에서 실제 자격 트리거/오류/빈 응답 회귀 포함
- 첫 targeted test는 신규 worktree shared-types dist 미빌드 import 실패. 선행 shared-types build 후 회귀 통과했으며 배포 앱 오류가 아니다.
- synthetic VisualViewport/클래스/DOM 및 SDK mock 검증을 실제 화면/OS 키보드 증거로 주장하지 않음
- 최종 로컬 재검증 및 GitHub [CI #32](https://github.com/chonghg22/nearbook/actions/runs/38661651773)/job `116184067349`의 frozen install/lint/type-check/build/test 모두 success, 693개 로그 확인.
- 최신 Vercel `35dzuTJFFBmv4dbNqhDCVu5gcDPS` Ready/commit check success, 빌드1m5s, 고정 프리뷰 alias 연결 확인. immutable https://nearbook-mr0xiohxt-chonghg22s-projects.vercel.app
- 배포 직전 PR #16 head `2edfd05`/base `5440144`, mergeable true, open/unmerged 및 CI/check 재확인 후 expected_head_sha로 merge했다.
- 첫 head의 Vercel `EuyUaVzd1mpWZ8EU3WP9u3yKzY8q` Ready/1m6s 확인. 이것을 최종 head의 검증으로 사용하지 않는다.
- 고정 프리뷰: https://nearbook-web-git-fix-p1-09-mobile-ac-c32e5d-chonghg22s-projects.vercel.app (최신 Ready 연결 확인)

로컬 로그: `/private/tmp/nearbook-p109-{install,lint-final,typecheck-final,build,test}.log`.

## 브라우저/기기

사용자가 프리뷰 접근과 현재 Chrome id2/iriscorp.co.kr의 새 탭 사용을 명시적으로 승인했다(“응 열어도 돼”). 이 승인에 따라 프로필을 선택하고 검증 세션 이름을 지정했다. 기존 업무 탭은 열거나 조작하지 않았다.

viewport capability 지침을 읽고 360×800 임시 크기를 적용한 다음 고정 프리뷰 새 탭 열기를 시도했으나, 브라우저 보안 정책이 해당 URL에 대해 permission denied로 차단했다. 탭 화면/접근성/픽셀·키보드 검증은 수행하지 못했다. viewport.reset()으로 임시 크기를 원복했다. 다른 alias/immutable URL/프로필/native app/CLI Playwright/원시 브라우저 명령으로 우회하지 않았다.

사용자에게 휴대폰 검색·지역 선택에서 키보드가 버튼을 가리지 않는지 직접 확인을 요청했고, “응 그런거 없어 잘 된다”라는 정상 확인을 받았다. 이것을 휴대폰 프리뷰 정상 확인으로 기록하고 기존 ‘검증 후 운영 웹 반영’ 승인에 따라 웹만 반영했다. 대화상의 접근 승인만으로 도구 보안 차단이 해제됐다고 주장하지 않는다.

검증 근거는 사용자 직접 확인 + 실제 DOM/회귀 자동 테스트 + 운영 공개 HTTP로 구분한다. 에이전트의 live 화면/스크린샷, 정확한 360/390/430px별 픽셀 결과, 실제 OS/보조기기 전종·회전별 측정은 확보하지 못했다. 이를 별도 통과했다고 주장하지 않으며 필요하면 후속 기기 회귀에 남긴다. 사용자 확인 이후에도 차단된 브라우저를 재시도하거나 다른 도구로 우회하지 않았다.

## 배포

- merge 완료: `a516a5e`, 2026-10-15 10:07:41 KST 확인. origin/main 같은 SHA 확인.
- Vercel production `dpl_7yiBYvog9cPvZXdNRqszao9P1gPk` **Ready**, commit check success, 빌드 **1m4s**. immutable https://nearbook-cwe1nqmpx-chonghg22s-projects.vercel.app, `www.near-book.com` 및 `near-book.com` alias 확인.
- 이 main SHA의 Actions 조회는 merge 직후 및 Ready 후 모두 total_count0. API CD path 대상/apps/api/packages/CD 파일 변경 없음. API는 P1-07 `4fa9883` 배포를 유지, 컨테이너 교체/DB/강제 갱신 없음.

## 운영 공개 GET 검증

`/private/tmp/nearbook-p109-verify.mjs`로 cookies/계정 없이 공개 운영 GET만 실행했다. 프리뷰 접근 차단을 우회한 것이 아니며 프리뷰 HTML/CSS를 curl/다른 도구로 가져오지 않았다. 결과:

| 운영 페이지 | HTTP | 전체 body 읽기 |
| --- | --- | --- |
| 홈 `/` | 200 | 912ms |
| `/search?q=한강` | 200 | 523ms |
| `/libraries` | 200 | 546ms |
| `/book/9788936434120` | 200 | 2605ms |

- 고유 자산25개 GET/MIME 정상. 홈 combobox SSR/aria-autocomplete, 책의 기존 찜 anchor/반경 SSR 유지. CSS focus-visible/긴 텍스트 wrap/visual viewport 변수, JS 자동완성 방향키·aria-activedescendant/지도·목록 aria-pressed/성공 조회 자격/session flag/inline 설치·실패 안내 확인. JS escape는 단순 문자열 decode로만 비교하며 eval이나 실제 앱 상태 변경은 하지 않았다.
- `/sw.js` HTTP200 및 기존 worker source byte-identical. 개인정보 캐시 정책/서비스워커 수정 없음.
- `/api/search?q=한강&pageSize=10&page=1`: HTTP200, 182ms, 엄격 parser 통과/10개 결과/현재 local-index total105, pending/failure 아님. 종전 total값을 고정 불변 데이터로 가정하지 않는다.
- 보유 API ISBN `9788936434120`/서울 기준5km: HTTP200, **9759ms**, parser 및 최대 후보30/조회10 검증. 후보30/조회10/소장8/가능7/대출중1/미소장2/미확인0/미조회20/limited true. 후보/조회 일부 결과이지 전 도서관 전체 조사라고 주장하지 않는다.
- direct `/health` HTTP200/status ok 893ms, same-origin `/api/health` HTTP200/status ok 293ms.
- 보유 조회9.8초는 웹 deadline15초 이내였지만 느린 응답이다. 원인은 이번에 규명하지 않았고 API 배포가 없으므로 이번 웹 작업으로 API 성능을 해결했다고 주장하지 않는다. 기존 성능 점검 항목(P1-13)에 기록한다.

실제 설치/로그인/위시리스트·알림 설정 변경/발송/예약/GPS·카메라 요청은 하지 않았다. P1-10은 착수하지 않았다.
