# P1-03 API 공통 요청/응답 계약 — 2026-10-14

## 상태

- **운영 웹/API 반영 완료**. 사용자 프리뷰 재확인 및 CI #22/447개 성공 후 PR #10 병합, Vercel Ready/API CD 성공과 운영 응답 정상화 확인. 아래 보류 기록은 배포 전 이력.
- PR #10: https://github.com/chonghg22/nearbook/pull/10
- base `a921b115098f14694d9e4b36aabf25082436d924`
- 최종 검증 head `98f87a698a64fb5f3bda5f59a4491e599cb82679` (초기 head `1d6b69b`)
- 별도 worktree `/Users/jack/local/nearbook-p1-03`; branch `fix/p1-03-api-contract-20261014`.
- 구현/범위: `/Users/jack/local/nearbook-p1-03/docs/p1-03-api-contract.md`

## 승인

수정·전체 CI·프리뷰 검증 후 운영 웹/API 반영을 사용자 승인받음. API container 교체 중 짧은 요청 실패 가능성을 고지함. DB 변경/강제 갱신/P1-04는 제외.

## 검증

- frozen install, lint/type-check/build 성공.
- Node237 + 웹150 + API58 = **445개**. 기존 P0/P1-01/P1-02 회귀 테스트 포함.
- 공통 transport의 HTTP/JSON/schema/timeout/body deadline/caller취소/auth 지연/size/204/error정보 미노출 검증.
- 공개 검색에서 getSession/getUser/Authorization 미사용; 인증은 Header 병합, 비로그인 로컬401, deadline 후 늦은 API 요청 차단.
- 실제 기존 운영 API payload와 새 parser 대조: 서울도서관(id111314) 운영시간/휴관일 text/closed; '한강' 일반 검색 items10/total415/page1/pageSize10.
- 검색 index/DB 실패 sanitized503, 정상 빈 결과 유지, 실패 미캐시/후속 복구. 장애를 강제로 운영에 발생시키지 않음.
- 실제 계정 로그인/위시리스트/도서관 카드/알림 설정 변경은 하지 않음.
- 이 단계에서 구현/CI 증거와 실제 preview/production UI 증거를 구분하며, 후자는 확인 후 아래 추가함.

## CI / 프리뷰 gate

- 초기 head `1d6b69b`: CI #20 https://github.com/chonghg22/nearbook/actions/runs/38501127355 , job `115648079576` 전체 success, 445개 확인.
- 초기 Vercel preview `dpl_6Esb7vcqRtDCew4ezhnUfck6HLQ6` Ready/check success, source `1d6b69b`, https://nearbook-d9w5wvemy-chonghg22s-projects.vercel.app
- 최종 검토에서 multipart 자동 Content-Type 보존 테스트 추가. 후속 head `02ace09e3511fd378d5b23938acee45876546869`, 로컬 웹151개 통과, 최종 합계446개. 후속 전체 CI/preview 배포 확인 중.
- 고정 preview: https://nearbook-web-git-fix-p1-03-api-contr-ad0aaf-chonghg22s-projects.vercel.app
- 실제 preview 브라우저 접근이 사용자 권한 거부로 차단됨. 다른 브라우저·CLI·새 도메인으로 화면 접근을 우회하지 않음.
- 사용자 직접 확인/스크린샷 요청: `/library/111314`의 운영시간·휴관일, `/search?q=한강`의 정상 검색 결과. 또는 저장된 사이트 차단 해제 알림 요청.
- P1-03 실제 프리뷰 UI를 확인하지 않았으므로 merge/운영 웹/API 배포하지 않음. 현재 운영은 완료된 P1-02 `a921b11` 유지.
- 사용자가 “직접 확인 후 스크린샷 전달”을 선택함. 이는 확인 경로 선택이며 화면 검증 완료 답변은 아니므로 실제 스크린샷을 기다림.
- 최종 CI #21 `38501334383` status completed/conclusion success: https://github.com/chonghg22/nearbook/actions/runs/38501334383
- 최종 job `115648752618` 로그 확인: Node237 + Vitest151 + API58 = **446개**, lint/type-check/build/test 모두 성공.
- 최종 Vercel check success: `dpl_4GAyeLfZozDPQYemKnPH54vYFC3b`, source `02ace09`, immutable https://nearbook-7cmmv97b7-chonghg22s-projects.vercel.app . 브랜치 고정 프리뷰에서 사용자 직접 검증 대기.

## 사용자 스크린샷 후 공개 요청 보완

- 12:29/12:30 사용자 제공 이미지에서 서울도서관 운영시간·휴관일/CSS 정상 확인. 검색은 실패 안내·다시 시도 버튼, 지도는 SDK 실패 안내. 정상 검증 통과로 처리하지 않고 merge/운영 보류.
- 일반 운영 API `/search?q=한강&pageSize=10&page=1`를 기존 웹 `/api` rewrite와 직접 API에서 확인: HTTP200/items10/total415, 새 parser 모두 통과. 강제 갱신/장애 유발 없음.
- 직접 API에 고정 프리뷰 Origin을 보내면 `Access-Control-Allow-Origin` 헤더 없음. 실제 브라우저 Network 기록은 없어 프리뷰의 정확한 실패 종류/요청 URL은 단정하지 않음. 공개 client가 절대 API 환경변수를 사용하여 proxy를 우회할 수 있는 CORS 의존을 제거.
- `publicApiJson`은 기존 Next `/api` rewrite로 요청하며 같은-origin credential/no-store/timeout/schema 검증 유지. API의 CORS 권한·운영 환경변수·네이버 지도 허용 URL은 변경하지 않음.
- 후속 head `98f87a698a64fb5f3bda5f59a4491e599cb82679`, 로컬 Node237+웹152+API58 =447개, lint/type-check/build 통과. 전체 CI/후속 프리뷰 배포 대기.
- 지도는 현재 프리뷰 주소가 새 허용 도메인인지 별도 확인 필요. 스크린샷의 일반 SDK 실패 안내만으로 인증/네트워크/timeout을 확정하지 않음. 기존 P0-03에서 승인된 두 프리뷰 URL과 다른 P1-03 주소이며 새로운 허용 URL 추가는 승인 없이 하지 않음.
- CLI `env run`을 읽기 전용 설정 분류에 사용하려 했으나 CLI가 `-e`를 deployment 옵션으로 잘못 처리하여 실패. 변수 값 출력/환경변수 저장·변경 없음, 유효한 배포도 생성되지 않음. 이후 이 방법 사용하지 않음.
- 후속 CI #22 https://github.com/chonghg22/nearbook/actions/runs/38506894622 : completed/success, job `115666353804`. Vercel check success 및 CLI Ready: `dpl_BD7xZ1z4jXwA2z5vghXhLSEi7gRW`, immutable https://nearbook-5wyokfb3l-chonghg22s-projects.vercel.app, 기존 고정 alias 연결. 사용자 검색 화면 재검증 대기, 운영 미반영.

## 운영 반영

- 사용자가 “이어서 진행해 잘 나오고 있어”로 수정 프리뷰 검색 정상 표시를 확인하고 진행 요청. 운영시간·휴관일은 앞서 제공한 이미지로 확인. 프리뷰 지도 오류는 새 주소의 SDK 권한 가능성으로 별도 기록하며 지도 허용 URL/API 권한은 변경하지 않음.
- PR #10 head `98f87a698a64fb5f3bda5f59a4491e599cb82679` 및 base `a921b11` 확인, CI #22 success와 Vercel check success 재확인 후 expected-head lease로 merge.
- merge/main `de38fc807b8bc9ea8b203289e2ca099c11f8160b` (2026-10-14 15:19 KST).
- API CD #68 `38521551666`, job `115712169498`, https://github.com/chonghg22/nearbook/actions/runs/38521551666 : completed/success, main source `de38fc8`. Oracle 교체 단계도 success.
- 운영 Vercel `dpl_86rNh1g7uRdQRJX4mJnwv47vfefD`: Ready/check success, https://nearbook-o3uoqf04i-chonghg22s-projects.vercel.app . CLI inspect에서 `www.near-book.com`·`near-book.com` 운영 alias 연결 확인.
- 배포 전 health 직접 API 및 웹 `/api` 모두 HTTP200/status ok. 배포 후 결과와 구분함.
- API build/push image label revision `de38fc807b8bc9ea8b203289e2ca099c11f8160b`, tag `sha-de38fc8`. build manifest digest와 Oracle pull digest 동일: `sha256:9882d23764e78a3758c4e62a17e4fdce35f6b6a180a7134f2f56dc2f068c63ee`. CD는 latest를 사용하므로 build/pull 일치 근거까지 확인했다. readiness 검사 없는 기존 workflow는 변경하지 않음.
- 교체 구간 직접 API/웹 proxy 502(non-JSON), 도서관 SSR500 관측. workflow 종료 후 재검증에서 모두 정상화:
  - `/api/health` HTTP200/status ok, 직접 `https://api.near-book.com/health`도 HTTP200/status ok (15:24 KST).
  - `/api/libraries/111314` HTTP200/서울도서관, runtime parser 통과, 운영시간 `화~금 09:00~21:00 / 토,일 09:00~18:00`, 휴관일 `매주 월요일 / 공휴일`.
  - `/api/search?q=한강&pageSize=10&page=1` HTTP200/items10/total415, parser 통과.
  - `/api/search/suggest?q=한강` HTTP200/items8, parser 통과.
  - `/library/111314` SSR HTTP200, 운영시간·휴관일 HTML 포함; `/search?q=한강` HTTP200. `/search`·`/offline` 연결 CSS HTTP200/`text/css; charset=utf-8` 확인. `/offline` 기존 개인정보 비표시 안내 유지.
- 운영 브라우저 검증 시 기존 Chrome binding id1이 연결 해제됨. inventory에 다른 profile/id2만 있어 임의 전환·네이티브/별도 브라우저 우회하지 않음. 운영 live UI/지도 screenshot은 확보하지 않았으며 사용자 프리뷰 확인과 배포/HTTP/SSR 증거를 구분한다. 지도 SDK는 이번 PR에서 수정하지 않음.
- DB migration/강제 데이터 갱신/실제 개인 설정 변경 없음. P1-04 착수하지 않음.
