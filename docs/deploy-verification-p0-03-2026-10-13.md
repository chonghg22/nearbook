# P0-03 운영 배포 검증 — 2026-10-13

상태: **완료 — 웹/API 운영 배포 성공 및 실서비스 회귀 검증 완료**.

## 배포 대상과 사전 검증

- PR: https://github.com/chonghg22/nearbook/pull/6
- 검증 구현 SHA: `49cecdec32f742657e2537f466cdcb1a14931b85`
- main 병합 SHA: `b240462b06ac4e3589d79f3b82f574487c27c399`
- 사전 CI: https://github.com/chonghg22/nearbook/actions/runs/38353116941 — 의존성 설치·lint·type-check·build·test 통과, **237개 테스트**.
- 인증 정상 프리뷰와 SDK 인증 실패 프리뷰, 390px 클라이언트 재진입·실제 지도 drag·가장자리 팝업/상세 이동 확인. 상세 증거는 [구현 기록](p0-03-map-libraries.md).
- 기존 변경/dirty worktree를 보존하고 이번 수정 파일만 GitHub tree/commit/ref를 통해 반영했다. 실제 env/토큰을 읽거나 출력하지 않았다.

## 배포 경로와 모니터링

- Web Vercel: https://vercel.com/chonghg22s-projects/nearbook-web/3i67f2GGLSS4CoipD6G7Pp6sYp4e
- API CD: https://github.com/chonghg22/nearbook/actions/runs/38353873411
- 배포 전 `https://www.near-book.com/api/health`의 status ok 확인(2026-10-13T05:55:27Z).
- 기존 CD는 컨테이너 교체 전 기존 컨테이너를 중단하며 readiness를 기다리지 않는다. CD 완료와 실제 health 정상은 별도로 검증한다.

## 최종 운영 결과

- Vercel Production Ready, source `b240462`, `www.near-book.com` 도메인 연결 확인.
- Oracle API CD 성공(2026-10-13T05:58:19Z), 빌드/원격 pull digest 일치 확인:
  - 이미지 `ghcr.io/chonghg22/nearbook-api:sha-b240462`
  - digest `sha256:207191636d713fd0ed581551cfb3a828ae22d563b792f3753b682afa1e2801f4`
- 실제 운영 `/libraries`:
  - 부산·해운대구 주소 포함 목록6개 및 마커6개. 강원 목록51개/마커51개.
  - 성북길빛도서관111492 가장자리 InfoWindow 자동 이동·재조회 후 상세 링크 유지.
  - 390×844에서126024 상세 → 지도 클라이언트 재진입: 실제384px 지도/내부폭,44마커, 수평overflow없음, 콘솔error/warn없음. viewport 복원.
- API 교체 중 일시 목록 요청 실패가 발생했으며 오류 안내/재시도가 정상 표시됐다. 교체 후 `다시 시도`로 목록100개와 마커100개가 복구됐다. 상세 인기도서도 한 번 보조 오류 안내 후 재조회에서20개 복구했다. 지속 장애는 관찰하지 않았다.
- API health 정상은 교체 후05:58:41Z와 최종 **06:08:10.706Z**에 확인했다. 후속 무중단 교체/readiness/자동 복구는 기존 P1-14 항목에 남긴다.
- 제한: 실제 모바일 기기와 통제된 React HTTP 장애 주입은 미수행. 이번 브라우저 확인은 실제 viewport와 자연 발생한 API 교체 장애를 사용했다. 일반 터미널 curl은 DNS 제한으로 실패해 브라우저/연결된 GitHub 검증을 사용했다.
- 운영 결과는 PR 본문에도 남겼으며, 최종 문서/TODO는 로컬에 저장했다. 추가 문서만으로 운영 배포를 다시 발생시키지 않았다.

## 화면 증거

- [최종 해운대구 운영 지도/주소](../../.tools/nearbook-evidence/p0-03-production-final-map.jpg)
- [운영 가장자리 팝업](../../.tools/nearbook-evidence/p0-03-production-edge-popup.jpg)
- [운영 모바일 캐시 SDK 재진입](../../.tools/nearbook-evidence/p0-03-production-mobile-cached-sdk.jpg)
- [API 교체 중 오류/재시도 안내](../../.tools/nearbook-evidence/p0-03-production-api-replacement-retry.jpg)

## 복구 기준선

- 이전 웹 main: `600a7bb098a000f61ef127f34a7904561213258d`
- 이전 API 이미지: `ghcr.io/chonghg22/nearbook-api:sha-df26a7d`
- 이전 API digest: `sha256:cdfb8fcce74705a2a6beb9c92112100d75f62610c642213b7ae9090136a46f4c`
- 운영 장애가 지속되면 검증된 이전 버전으로 복구가 필요하다. 이번 기록은 복구 실행을 의미하지 않는다.
