# P0-04 인기·분야·신착도서 상태 복구

작성일: 2026-10-13  
상태: 전체 CI 273개·프리뷰 검증 통과 후 운영 웹/API 반영 및 읽기 전용 운영 검증 완료.

## 범위와 역할

- `/popular`, `/category`, `/category/novel`, `/new-books`의 정상 데이터·진짜 빈 결과·장애·오래된 큐레이션을 구분한다.
- 최초 Claude Code에 읽기 전용 구현 패치를 요청했으나 장시간 지연돼 작은 요청으로 나누었다. 분할 요청은 `authentication_failed`로 실패했으며 로그인 상태 조회는 loggedIn:true였다. 원인을 인증 만료로 단정하거나 로그인 설정을 재설정하지 않았다. 사용자 이전 직접 구현 요청에 따라 Codex가 작은 단위로 직접 구현·테스트했다. 초기 읽기 전용 실행은 이후 종료했고 그 패치는 적용하지 않았다.
- 기존 SEO canonical/JSON-LD/내부 링크와 P0-01~03 구현을 보존한다. 임의 DB 갱신·마이그레이션·수집 cron 실행·외부 API 대량 호출은 범위에 포함하지 않는다.
- 이번 착수 시 main은 `b240462b06ac4e3589d79f3b82f574487c27c399`. 로컬은 이전 변경이 보존된 dirty worktree이며 전체 diff를 이번 변경으로 취급하지 않는다.

## 실제 운영 확인

| 화면/응답 | 관찰 결과 |
| --- | --- |
| `/popular` | 현재 20개 도서 카드 정상 표시. 이전 빈 화면은 이번 착수 때 재현되지 않음 |
| `/category`, `/category/novel` | 각 40개 도서 카드, 분야 링크 유지 |
| `/api/books/categories?limit=40` | 21개 코드 모두 40개, `periodKey: 2026-07` |
| `/new-books` | 준비된 큐레이션이 없다고 안내, 도서관 선택 불가 |
| `/api/libraries/featured-new-arrivals?limit=12` | `statusCode:500`, `Internal server error` — 정상 빈 결과가 아님 |
| `/api/libraries/126024/new-arrivals?limit=40` | 정상 `{ data: [] }` — 집계 장애와 별개 |

증거: [인기](../../.tools/nearbook-evidence/p0-04-before-popular.jpg), [분야](../../.tools/nearbook-evidence/p0-04-before-category.jpg), [소설](../../.tools/nearbook-evidence/p0-04-before-novel.jpg), [신착 화면](../../.tools/nearbook-evidence/p0-04-before-new-books.jpg), [집계 API 오류](../../.tools/nearbook-evidence/p0-04-before-featured-api-500.jpg).

## 소스에서 확인한 문제와 검증할 원인

1. `getFeaturedNewArrivalLibraries`의 서브쿼리에서 `sql max(period_key)`에 별칭을 지정하지 않은 채 외부 select/join/groupBy에서 참조한다. [Drizzle 공식 문서](https://orm.drizzle.team/docs/select)는 임의 SQL 필드를 다른 쿼리에서 참조하려면 alias가 필요하며, 누락 시 runtime error가 난다고 설명한다. 실제 버전0.33 query 생성 회귀로 재현/수정 검증한다. 원격 API 로그는 미확인이다.
2. 인기/분야/신착 SSR에서 non-OK 또는 일부 catch를 `[]`로 바꾸어 장애를 정상 빈 결과로 표시한다. 일부 요청에는 timeout/catch가 없고, 최대6시간/하루 fetch cache 또는 한 시간 페이지 재검증이 오류/빈 화면 복구를 늦출 수 있다.
3. UI는 `매일 갱신` 또는 `이번에 새로 들어온 책`으로 안내하지만 분야 API의 최신 저장 기간은7월이다. `periodKey`는 큐레이션 저장 기간이며 실제 대출 통계의 검색 기간이라고 단정하면 안 된다.
4. API 메모 캐시는 빈 분야 결과도6시간 보관한다. 새 데이터가 생겨도 오래 빈 결과가 남을 수 있으므로 빈 결과 캐시 정책을 보완한다.

## 구현 기준

- 신착 집계 alias 수정 및 실제 SQL builder 회귀 테스트(실제 DB/비밀값/네트워크 없이).
- bounded 요청·응답 스키마 검증으로 success/empty/error 분리. 오류에 재시도 제공, 도서관 선택 query 유지, 무조건적인 준비 중 문구 제거.
- 실패/빈 상태가 오래 SSR cache에 남지 않게 한다. 선택된 분야의 책이 정상인 경우 부가 counts 오류가 책을 숨기지 않게 한다.
- 기존 저장 기간/조회 시각을 optional 응답 필드로 전달하고 오래된 데이터/시점 불명은 사실대로 표시한다. 기존 소비자 응답 배열 계약은 유지한다.
- cron 성공 여부/활성 갱신 상태를 알 수 없으므로 `갱신 중`이라고 추정하지 않는다. 주기는 설정된 시도 주기와 실제 마지막 수집 성공을 구분한다.
- 정상/빈/503/429/timeout/body timeout/잘못된 JSON·스키마/오래된 날짜/부분 오류 회귀 및 전체 CI를 확인한다.
- 코드 검증과 읽기 전용 프리뷰 확인 전에는 TODO를 체크하지 않는다. 실제 수집 갱신·운영 반영이 필요하면 별도로 범위를 확인한다.

## 후속으로 남기는 것

- 인기·분야 최신 성공/실패 및 job 상태를 영속적으로 추적하는 운영 기반은 P1-12와 연결한다.
- KDC 라벨 정밀도와 실제 대출 검색 기준 기간은 별도의 데이터 의미 검토가 필요하다. 이번 수정에서 데이터를 임의로 다른 범주에 대체하지 않는다.

## 구현 적용 및 로컬 검증

- 신착 집계 SQL을 연결 없는 query builder로 분리하고 고유 집계 별칭 `latest_period_key`를 추가했다. 실제 Drizzle0.33 기반 Jest query 생성 회귀를 추가했다(전체 CI에서 실행 예정).
- 인기·분야·신착의 HTTP 오류/timeout/잘못된 응답은 error, 정상 빈 배열만 empty로 분리한다. 오류를 장기 SSR cache에 남기지 않고 전체 문서 재요청으로 다시 시도한다. 유효한 도서관 query를 보존한다.
- 기존 필드/배열 계약을 유지하면서 저장 기간·수집 시각을 optional 필드로 추가했다. 오래된 자료는 이전 자료로 안내하고, 확인되지 않은 수집 시점·활성 갱신을 임의로 확정하지 않는다. 기존 이미지 허용 호스트 밖 cover는 placeholder를 사용한다.
- 분야 집계 오류에서도 책/내부 링크를 유지한다. 빈 분야 목록과 전체0 집계는6시간 메모 cache에 넣지 않는다.
- Node 기존120+새23 = **143개 통과**. `explore-data.mjs` strict checkJs 및 diff-check 통과. 전체 JSX/앱 타입·Jest/Vitest·빌드는 CI에서 확인한다.
- 사용자 승인: 수정·전체 CI·프리뷰 검증 통과 후 운영 웹/API까지 반영한다. 실제 데이터 강제 수집/DB 갱신은 포함하지 않는다.

### PR/첫 CI 보완

- [PR #7](https://github.com/chonghg22/nearbook/pull/7), 최초 구현 `2c9c935`.
- [첫 CI](https://github.com/chonghg22/nearbook/actions/runs/38360148431)는 install/lint/type-check/build 통과 후 새 JSX 서버 렌더 테스트에서 실패했다. 빌드 로그에도 `.mjs`와 `.ts` 같은 이름으로 인한 잘못된 loader import 경고가 있었다. Ready 상태나 build 성공만으로 배포하지 않았다.
- 서버 loader를 `explore-server.ts`로 분리했다. Next의 jsx:preserve 설정은 유지하고 기존 TypeScript compiler로 테스트에서만 JSX를 낮춰 Vite import analysis 전에 처리한다. 새로운 dependency나 lock 변경은 없다.
- 보완 커밋 `19196d680a45dd67ad0440cfb1f8535c507f8fd2`의 프리뷰에서 인기20/분야40/소설40 카드, 이전 저장 자료 안내, 신착 API 오류와 재시도를 확인했다. 마지막 커밋 `f1b71dddac84b5d073580e6245ed9ad05a78a554`은 canonical 테스트의 설정 host 독립성만 보완하며 runtime 변경은 없다.

## 최종 CI·프리뷰 및 운영 반영 착수

- [CI #15](https://github.com/chonghg22/nearbook/actions/runs/38364026580): lint/type-check/build 및 Node143·Web114·API16 = **273개 통과**. 실제 Drizzle0.33에서 기존 alias 오류 재현과 수정 SQL 생성 검증 통과.
- 최종 [프리뷰](https://nearbook-r35d0k6pe-chonghg22s-projects.vercel.app/) Ready/source f1b71dd 확인. 실제 API 프리뷰 환경은 없어 신착 정상 응답은 SQL/SSR 회귀로 검증하고 운영 배포 후 추가 확인한다.
- 분야 2026-07 저장 기간·오래된 자료 경고, 신착 기존 API500의 오류/전체 문서 재시도, canonical 유지 확인. 390×844에서 body client/scroll 384/384, 재시도 버튼 표시.
- 사용자 운영 반영 승인 후 PR #7 병합: `1961f0784902f0c3a47094a2534c9b4e51be3dcb`. [API CD](https://github.com/chonghg22/nearbook/actions/runs/38366149303) 및 Vercel 운영 배포 확인 중. 실제 데이터 강제 갱신/마이그레이션은 하지 않는다.

## 운영 검증 완료

- 웹/API 모두 `1961f07` 배포 완료. API 빌드·서버 pull digest 일치 및 CD 성공 확인.
- 신착 featured 집계500 → 도서관12곳 정상. 오류 화면의 재시도로 실제 도서관/책 목록 복구 확인. 기본 대치10권에서 즐거운도서관 선택 시 query·제목·책10권·수집 시점이 변경된다.
- 인기20/분야40/소설40, canonical 및 실제 저장기간/수집 시각 유지. 인기2026-05-07, 분야2026-07, 선택한 즐거운도서관2026-07 자료로 이전 자료 경고가 표시된다. 자료를 강제 갱신하지 않았다.
- 운영390×844에서 신착 선택·2열 카드, client/scroll384/384. 새 운영 검증 탭의 error log 없음. 최종 `/api/health` status:ok.
- 상세 증거와 남은 데이터 최신화 과제는 [운영 검증 기록](deploy-verification-p0-04-2026-10-13.md)에 기록했다. TODO P0-04 완료 처리. P1-12의 job 상태/수집 운영 개선은 별도로 남긴다.
