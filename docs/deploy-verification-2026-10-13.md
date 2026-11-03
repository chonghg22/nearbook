# 2026-10-13 — P0-01/P0-02 운영 배포 검증

상태: 웹/API 배포 완료, 대표 경로와 상세 오류 처리 검증 완료  
기록 시간대: Asia/Seoul

## 의존성 설치와 CI

- 로컬 `npm install ... pnpm@9.0.0`은 `registry.npmjs.org` DNS 오류로 실패했다. `git fetch`도 GitHub DNS 오류로 실패했다. 로컬 설치 성공으로 보고하지 않는다.
- 연결된 GitHub API로 별도 작업 브랜치/PR을 만들고 GitHub Actions에서 pnpm 9·Node 20·`pnpm install --frozen-lockfile`로 **전체 1,045개 패키지 설치에 성공**했다. 환경변수 비밀값은 전송하지 않았다.
- 첫 CI는 공유 타입 패키지 dist가 없는 상태에서 웹 type-check를 실행해 실패했다. Turbo `type-check.dependsOn = ["^build"]`로 의존 빌드 순서를 수정했고 이후 전체 검증을 통과했다.
- 최종 lint/type-check/build/test는 모두 성공했다. 지도 컴포넌트의 기존 hook dependency 경고는 남아 있으며 이번 배포를 막는 오류는 아니다.

| 검증 | 결과 |
| --- | --- |
| Node 주소/상세 요청 회귀 | 54개 통과 (35 + 19) |
| 웹 Vitest | 11개 파일, 101개 테스트 통과 |
| API Jest | 2개 suite, 11개 테스트 통과 |
| 전체 lint/type-check/웹·API build | 성공 |
| Vercel preview 및 최종 production build | Ready |
| API Docker build/push/Oracle 배포 | 성공 |

Node 테스트에는 순수 요청 동작과 소스 연결 확인이 포함된다. 위 숫자가 모든 실제 사용자 흐름의 E2E 완료를 의미하지는 않는다.

## 배포 이력

- [PR #4 — API 주소/상세 오류 복구](https://github.com/chonghg22/nearbook/pull/4)
  - [통과 CI](https://github.com/chonghg22/nearbook/actions/runs/38322048805)
  - merge/API 커밋: `df26a7d2d790cc04a5a40431cfe96415461e9fd6`
  - [API CD 성공](https://github.com/chonghg22/nearbook/actions/runs/38322230559)
  - 이미지: `ghcr.io/chonghg22/nearbook-api:sha-df26a7d`
  - digest: `sha256:cdfb8fcce74705a2a6beb9c92112100d75f62610c642213b7ae9090136a46f4c`
- [PR #5 — 상세 재시도 보완](https://github.com/chonghg22/nearbook/pull/5)
  - [통과 CI](https://github.com/chonghg22/nearbook/actions/runs/38322779547)
  - 최종 웹 커밋: `600a7bb098a000f61ef127f34a7904561213258d`
  - [최종 Vercel production Ready](https://vercel.com/chonghg22s-projects/nearbook-web/ERNjVxDYU1XAdw4yTMyXGaMvTh7W)
  - Ready: 08:36:43. 웹 변경만 포함하여 API 컨테이너를 다시 교체하지 않았다.

운영 DNS/TLS/Cloudflare 규칙·Vercel 비밀 환경변수·DB schema는 이번 배포에서 바꾸지 않았다. 기존 CD의 컨테이너 교체/이미지 정리 절차가 실행됐으며 업무 데이터 삭제는 하지 않았다.

## 운영에서 확인한 동작

1. `https://www.near-book.com/book/9791161571195`
   - 불편한 편의점 기본 정보·표지·저자·ISBN 표시. 공개 `/api/books/9791161571195`와 일치.
   - 분석/관련 책과 서대문구립이진아기념도서관 보유 카드 표시. UI 상태를 확인한 것이며 실제 소장 권수/예약 가능성을 독립 검증한 것은 아니다.
   - canonical은 상세 URL, robots는 `index, follow`.
2. `https://www.near-book.com/library/111314`
   - 서울도서관 이름·주소·전화·공식 링크·같은 지역 링크·위치 표시. 공개 API와 일치.
   - 인기 조회 실패 때는 장애 문구, 정상 빈 신착 결과는 빈 문구로 구분하며 기본 상세가 유지됨.
   - 정상 canonical과 `index, follow` 유지.
3. 지도 in-bounds 프록시
   - 서울 bounding box에서 100개 목록 반환. 가온도서관 및 서울도서관 포함.
4. 실제 없음과 장애
   - `/library/2147483647`: not-found 및 noindex 유지.
   - API 교체 중 08:30:59의 실제 502: 책은 ISBN 오류/없는 책으로 표시하지 않고 장애 안내를 표시.
   - 초기 재시도 조합이 오류 화면에 남아 후속 수정. 최종 `/library/not-a-number`의 non-404 장애 화면에서 재시도 버튼을 눌러 새 문서 navigation 완료를 확인. 계속 invalid ID이므로 정상 상세로 바뀌지는 않는다.
   - 서버 복구 이후 대표 책은 새 요청으로 정상 표시됨.
5. API health
   - 직접 API 호스트의 브라우저 navigation이 차단돼 동일 출처 `/api/health` 프록시로 확인.
   - 컨테이너 교체 전 로컬 호출 카운터는 30,000/30,000이었다. 새 컨테이너 준비 후 08:31:59 `status: ok`, 08:37:34 `called: 7`, `remaining: 29993`.
   - 이 값은 컨테이너 내부 카운터다. 재시작이 정보나루 제공자의 실제 일일 한도를 초기화했다는 뜻은 아니다. 한도/카운터 영속화는 P1-12에서 정리한다.

## 운영상 주의와 남은 범위

- 기존 CD는 새 컨테이너의 준비 완료를 기다리지 않고 성공을 반환했다. 교체 중 잠시 502가 관찰됐고 이후 health가 정상화됐다. readiness·무중단 교체·자동 롤백은 P1-14의 후속 항목이다.
- 인기/신착/분야별 빈 데이터의 원인 전체를 해결한 배포는 아니다. P0-04에서 조사한다.
- 보유 API가 개별 조회 실패를 빈 결과로 숨기는 문제, Y/N을 권수처럼 표현하는 UI는 P1-01에 남는다.
- 운영시간 `{text, closed}` 타입/표시 문제, PWA 개인 캐시, 지역 전환/로그인 저장/오프라인 E2E는 해당 TODO에서 처리한다.
- 캐시 purge, 장애 강제 주입, 로그인/위시리스트/즐겨찾기 데이터 변경은 하지 않았다.
- 로컬 Git HEAD는 기존 `76d6265`에 남으며 사용자 작업 파일은 유지했다. 원격 main은 위 최종 웹 커밋으로 이동했다. DNS 연결이 가능한 환경에서 `git fetch origin` 후 현재 작업 파일을 보존하여 동기화해야 하며, 강제 reset/checkout은 하지 않았다.
- 이 최종 검증 문서와 TODO 완료 표시는 로컬 후속 기록이다. PR의 원격 문서는 배포 직전 기록이며 별도 문서 커밋은 하지 않았다.

## 화면 증거

- [운영 책 상세](../../.tools/nearbook-evidence/p0-02-production-book-20261013.jpg)
- [Vercel 최종 Ready](../../.tools/nearbook-evidence/p0-02-vercel-ready-20261013.jpg)
- [non-404 장애 재시도 검증](../../.tools/nearbook-evidence/p0-02-retry-verified-20261013.jpg)
