# P1-04 홈 검색·기준 위치 — 2026-10-14

## 상태와 범위

- **운영 웹 반영 완료**. CI #23/497개 및 프리뷰 이미지 확인 후 사용자 직접 운영 반영 승인. PR #11 병합, Vercel Ready/운영 alias와 HTTP/SSR 검증 완료. 프리뷰 지도 검증은 사용자 선택으로 생략. 아래 승인 대기 기록은 배포 전 이력.
- [PR #11](https://github.com/chonghg22/nearbook/pull/11), branch `fix/p1-04-home-location-20261014`, head `86b09fcee851d9440c2fe57e3f815b693e732b99`, base `de38fc807b8bc9ea8b203289e2ca099c11f8160b`.
- 별도 worktree `/Users/jack/local/nearbook-p1-04`; 원본 dirty worktree는 초기화/일괄 commit하지 않음.
- 사용자 “응 진행해”로 P1-04 개발/검토/테스트 진행 요청. 이 단계의 운영 배포 승인은 아직 받지 않음. API/DB/강제 갱신/지도 허용 URL·권한/P1-05 변경 없음. 웹 변경만이며 기존 API CD path filter에는 해당하지 않음.
- 구현 설계: `/Users/jack/local/nearbook-p1-04/docs/p1-04-home-location.md`.

## 구현과 로컬 검증

- 소개 아래 홈 검색·로그인/GPS 없이 검색·상시 ISBN 바코드 스캔·지역/도서관 변경 추가.
- 기본 서울/지역 중심/도서관 좌표/GPS/저장된 GPS 기준을 구분. 자동 GPS 요청 없음. GPS 거부·미지원·timeout의 수동 대체 UI, 저장 위치 JSON/좌표/id 검증 및 차단된 저장소 대응.
- 기존 Radix Dialog 사용: focus trap/Escape/호출 버튼 focus 복귀. 닫힌 modal은 검색하지 않으며 종료 후 늦은 GPS가 기준을 덮어쓰지 않음.
- 선택 기준 반경5km/최대12곳, 지도 pan과 기준 분리, 이전 지역/전국 인기 fallback/임의0.5km 제거, 실제 기준점 거리만 표시. 오류·정상 빈 목록·로딩 구분 및 수동 재시도.
- frozen install 성공, 린트 경고/오류 없음, type-check/build 성공. Node237+웹202+API58=**497개**. 신규50개: state/home parser23, GPS10, DOM interaction17. API suite는 변경 없음; 로컬 cache 재사용 근거와 CI 새 runner 검증을 구분.
- dev-only 테스트 dependency `@testing-library/react@16.3.0`, `jsdom@26.1.0` 추가. pnpm add가 갱신한 unrelated Turbo는 lock에서 기존2.9.12로 복구 후 frozen install 재검증. 실행 package 버전 업그레이드 없음.
- 서울·부산 public near GET payload와 실제 parser 대조: HTTP200, 서울12곳/서울도서관/0.03km, 부산12곳/부산광역시 연제도서관/1.12km. near endpoint의 실제 bare array와 library data envelope 지원. 운영 GPS/개인 정보·강제 갱신 없음.
- GPS/권한 테스트는 jsdom fake로만 수행했으며 실제 GPS·카메라 권한 및 실제 사용자 좌표를 요청하지 않음.

## CI / 배포 / 화면 gate

- CI #23 [run38523922450](https://github.com/chonghg22/nearbook/actions/runs/38523922450), job `115719712777`, completed/success. 새 runner 로그에서 frozen install/lint/type-check/build/test 전체 성공, Node237 + Vitest202 + Jest58 = **497개** 확인.
- Vercel preview deployment `dpl_EWjUTrbyjA8NagdixeubCYvjtitK`, GitHub check success 및 CLI Ready. source `86b09fc`, immutable https://nearbook-rgqgoxa5f-chonghg22s-projects.vercel.app, 고정 alias https://nearbook-web-git-fix-p1-04-home-loca-b7fccb-chonghg22s-projects.vercel.app . 배포 완료와 실제 화면 검증은 구분한다.
- 이전 P1-03 프리뷰 접근 차단/운영 Chrome id1 연결 해제 기록이 있음. 새 profile/프리뷰 domain/별도 브라우저로 차단을 우회하지 않음. 실제 P1-04 프리뷰 화면 검증은 수행했다고 주장하지 않으며 사용자 확인을 요청할 예정.
- 사용자 확인 항목: 홈 소개 아래 검색/ISBN 스캔/기준 지역·변경 버튼, GPS 없이 부산이나 강남구 선택 시 라벨/목록 변경, 검색 진입 정상. 실제 GPS·카메라를 허용할 필요 없음.
- 전체 CI·실제 프리뷰 확인·운영 배포 승인 전 merge하지 않음. 운영 기준선 P1-03 `de38fc8` 유지.

## 사용자 프리뷰 / 운영 승인

- 사용자 이미지 `/var/folders/qv/p6fv_5zn6ml9_blmf6ljj56h0000gn/T/clipboard-2026-10-14-154743-3BF0613D.png`에서 `기준 지역: 서울특별시`, 지역·도서관 변경, 기준 설명/반경5km·최대12곳 안내, 실제 도서관 목록/거리 표시 확인. 이미지는 홈의 스크롤된 구간이므로 소개 아래 검색·스캔 또는 실제 지역 변경 조작 증거라고 주장하지 않음.
- 지도 패널에는 네이버 지도 Open API 인증 실패 표시. 새 프리뷰 URL 미등록 가능성을 설명하고 URL 추가 승인을 요청했으나, 사용자가 “아니야 지도는 그냥 바로 운영에 올려도 되겠어”로 프리뷰 URL 추가 없이 직접 운영 반영을 명시 승인. 프리뷰 지도 검증 gate는 사용자 선택으로 생략하며 실제 지도 정상화 확인과 구분한다.
- 기존 지도 SDK 코드/운영 URL/API 권한·환경변수 변경 없음. 프리뷰 URL 추가 안 함. 새 운영 지도 실화면 검증은 아직 없음.

## 운영 반영

- head `86b09fcee851d9440c2fe57e3f815b693e732b99`, base `de38fc8`, CI #23 및 Vercel 성공을 재확인 후 expected-head lease로 PR #11 merge.
- merge/main `6ec2b818ffb36ba421fb51ab5c263bae0aaadc3d` (2026-10-14 15:51 KST).
- Vercel production `dpl_FVQd4aJWbH67fKcWHhnqJNvJxLCb`: CLI Ready 및 merge SHA Vercel check success. immutable https://nearbook-8xysmqz7f-chonghg22s-projects.vercel.app, `www.near-book.com`/`near-book.com` 운영 alias 연결 확인.
- merge SHA Actions 조회 total_count0 및 API/packages/CD workflow diff 없음. 웹 전용 변경으로 API 컨테이너 교체 없음.
- 배포 후 `https://www.near-book.com/` HTTP200. SSR HTML의 `홈 도서 검색` form/ISBN 바코드 스캔 `/scan` link/지역·도서관 변경/기준 지역 및 반경5km 안내 포함 확인. 연결 CSS HTTP200/`text/css; charset=utf-8`.
- 운영 같은-origin `/api/libraries/near` 일반 GET 서울·부산 각각12곳으로 parser 통과 (서울도서관 / 부산광역시 연제도서관). `/api/search?q=한강&pageSize=10&page=1` HTTP200/items10/total415/parser 통과. 직접 및 웹 proxy health HTTP200/status ok.
- 운영 `/sw.js` HTTP200 및 수정 없는 source와 바이트 동일. 기존 P1-02 개인 데이터 캐시 제외 정책 유지.
- merge 후 Actions 재조회 total_count0. API source는 P1-03 `de38fc8` 유지, 웹 source `6ec2b81`. API 교체/DB 변경/강제 갱신/지도 URL·권한 변경/실제 GPS·카메라 권한 요청 없음.
- 운영 live UI/지도 screenshot은 기존 브라우저 연결 해제로 확보하지 않음. 사용자 프리뷰 부분 이미지, jsdom 상호작용 테스트, 운영 SSR/HTTP/배포 source 증거를 구분한다. 운영 지도 렌더링 성공을 관측했다고 주장하지 않음.
- P1-05 착수 없음. 원본 worktree TODO/검증/배포 로그 갱신만 하고 unrelated dirty 변경은 보존.
