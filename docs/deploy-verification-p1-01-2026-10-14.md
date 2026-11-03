# P1-01 운영 배포 검증 — 2026-10-14

## 배포와 승인

- 사용자 승인: 수정·전체 CI·프리뷰 후 운영 웹/API 반영. 컨테이너 교체 중 짧은 요청 실패 가능성 안내. 데이터 강제 갱신·다음 항목 착수 제외.
- [PR #8](https://github.com/chonghg22/nearbook/pull/8), 최종 head `aee21df9138cd6ae565f85c1a6bb5f14fd352bfd`, merge `02a5c67fbb52259364530eea810d7b11545923f5`.
- [CI #17](https://github.com/chonghg22/nearbook/actions/runs/38494199124): lint/type-check/build/test 성공. Node172·Web120·API54 = **346개**. 최초345개 성공 후 PWA5초 캐시 대체 충돌을 추가 보완하고 재검증했다.
- [Vercel 운영](https://vercel.com/chonghg22s-projects/nearbook-web/BCngzGjKrD7Y4hgf37AiYMs18akP) Production Ready, source02a5c67 및 www.near-book.com 연결.
- [API CD](https://github.com/chonghg22/nearbook/actions/runs/38494903623), job115628341128 성공. 빌드/pull digest 모두 `sha256:6b6bbfc92b4a7b53c689de19c484ac7ad24420e4d84c8bac9bf37e342c6e9e6b`.
- 신규 런타임 의존성/lock/DB마이그레이션·cron 실행·수집 강제 갱신 없음. 기존 dirty worktree 보존.

## 회귀·프리뷰

- 상태매핑: Y/Y available, Y/N borrowed(UI 대출불가), N/N 또는 N/생략 not_held, Y/생략 소장만 확인한 unknown. malformed·모순·timeout/429/한도/5xx는 unknown/오류이며 미소장으로 변환하지 않는다.
- 성공 cache5분/checkedAt유지·실패 후 복구·unknown 미캐시, 인덱스 우선순위/오류 fallback/부분결과 유지/최대10회·빈근처/독립metadata·제휴·입력검증 회귀.
- strict parser·집계 일치·4상태/미소장/후보없음/부분결과/미확인범위/시각·TTL·HTTP/네트워크/본문 timeout/요청취소 및 재시도, ReactSSR와 실제SW handler VM 테스트.
- 최종 [프리뷰](https://nearbook-1p44up5i0-chonghg22s-projects.vercel.app/) sourceaee21df Ready, 루트 책링크→상세 정상metadata·보유오류 분리. API 프리뷰 환경 없음: 새 API가 운영에 등록되기 전404는 오류로 표시됐으며 정상/부분 결과는 회귀로 검증 후 운영 UI에서 실제 확인했다.
- 앞선 프리뷰에서 재시도→로딩→오류, 수동지역 변경→로딩,390px body384/384, 운영canonical 유지. 프리뷰 열기/탭 확인 도구가 장시간 지연된 사실을 사용자에게 알렸다.

## 실제 운영 확인

| 대상 | 결과 |
| --- | --- |
| 책9788936434120 | 소년이 온다 metadata/이용분석 유지. API 교체 전 보유오류를 미소장으로 표시하지 않음 |
| 교체 후 재시도 | 서울후보30, 확인10, 소장10, 대출가능9. 미확인20 안내 및 대출불가1 도서관 카드 유지 |
| 카드 의미 | 소장 여부와 대출가능/불가, 정보나루 출처·확인 시각.0/1권 대출가능 표현 없음 |
| cache 재조회 | 새 모바일탭에서도 첫 조회10:21의 확인 시각 유지. 현재 요청 시각으로 갱신하지 않음 |
| 실제 TTL 경과 | 첫 조회5분 경과 후 전역/카드 이전 조회 경고·재확인 버튼 표시. 클릭→로딩→동일 집계/새10:26 확인시각/이전자료경고 해제 확인 |
| 지역 변경 | 서울→부산전체 시 이전 결과 로딩으로 숨김. 부산후보19/확인10/소장10/대출가능9, 미확인9. 이후 서울전체 복구 |
| 모바일390×844 | 실제viewport390, bodyclient/scroll384/384. 상태 카드/범위 안내 정상, 새 탭errorlog 없음. viewport복구 |
| SEO | canonical https://www.near-book.com/book/9788936434120 유지 |
| health | 초기2026-10-14T01:21:57.752Z status:ok/called11, 지역 검증 후01:26:13.461Z status:ok/called24 (limit30000) |

새 holdings API를 직접 브라우저 탭으로 여는 것은 ERR_BLOCKED_BY_CLIENT로 차단돼 우회하지 않았다. 실제 운영 UI의 strict response parser 성공·카드/집계와 CI 회귀로 계약을 검증했다. 실제 장애/한도 초과를 유발하지 않았으며 unknown/미소장은 회귀에서, TTL은 회귀 및 실제 화면에서 검증했다.

## 증거와 후속

- [수정 전 잘못된 권수 표시](../../.tools/nearbook-evidence/p1-01-before-holdings.jpg)
- [프리뷰 모바일 오류/재시도](../../.tools/nearbook-evidence/p1-01-preview-error-mobile.jpg)
- [운영 보유 상태](../../.tools/nearbook-evidence/p1-01-production-holdings.jpg)
- [운영 모바일](../../.tools/nearbook-evidence/p1-01-production-mobile.jpg)
- [부산 지역 전환](../../.tools/nearbook-evidence/p1-01-production-busan.jpg)
- [실제 TTL 경과 안내](../../.tools/nearbook-evidence/p1-01-production-stale.jpg)
- [재확인 후 새 확인 시각](../../.tools/nearbook-evidence/p1-01-production-refreshed.jpg)

P1-02 개인정보/PWA 캐시 정책은 별도 진행한다. CTA/공통client/알림·작업운영은 P1-05/03/11/12에 남긴다. 최종 문서는 로컬 및 PR 설명에 기록하며 문서만을 위한 추가 운영 배포는 하지 않는다.
