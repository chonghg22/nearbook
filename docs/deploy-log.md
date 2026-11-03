# 배포 작업 로그

## 인프라 구성

| 서비스 | 플랫폼 | 배포 방식 |
|--------|--------|-----------|
| Web (Next.js) | Vercel | GitHub 연동 자동 배포 |
| API (NestJS) | Oracle Cloud VM | GitHub Actions → Docker → SSH |
| DB | Supabase | 관리형 |

---

## 2026-10-16: P1-13 캐시·검색 인덱스 운영 반영 완료

- 사용자 ‘반영해’ 승인 후 PR20 merge/main `fb956109c9e4d44f27380b46565fd0b5b3e1f80f`. API [CD #73](https://github.com/chonghg22/nearbook/actions/runs/38850514646) SUCCESS, build revision 확인/build-pull digest `sha256:c2d1a09b7e289e6e014e8c9003b854ea2f7c35af1a8b65bf7379c4b976d3579d` 일치.
- Vercel `dpl_4VFVyvy9cNQLwiUQA1dva8pXhRkM` production Ready/build1m2s/운영 두 도메인 연결(웹UI코드변경없음).
- 운영 direct/proxy 새 search status200/no-store·readytrue/13572건/22549ms부팅rebuild·named search jobs3등록·검색 ‘책’10건/total591/384·157ms 및 기존ISBN1건/468·154ms/parser통과·health200/ok312·154ms·주요4페이지200·개인3종401. 교체중502표본 후 복구, 무중단/readiness개선으로 보지 않는다.
- quota500/blocked/장부유지/로컬reset10/17 00KST. popularityPeriod:null(유효 전국집계 양성 미확인)·키워드2026-04 유지. 강제갱신/실계정/발송/DBschema/한도/지도설정 변경없음. 정기replay전체/운영dual-generation최대메모리와 실PG/합성 증거 구분. P1-14 미착수.
- 아래는 배포 승인 전 검증 이력. [최종검증](deploy-verification-p1-13-2026-10-16.md)
- 운영 후속:13:30KST 자연 정기reconcile success/2000건/cursor진행/전체순환0/revision1유지 확인. 뒤 검색10/591/356ms·health200/ok185ms·quota500/blocked 유지. 한 회차만 확인했으며 전체순환 완료를 주장하지 않는다.

### 배포 전 검증

- [PR #20](https://github.com/chonghg22/nearbook/pull/20), head `7849dcf25faa63a667f721c00309401bdea319ed`, main `f7f344d` 유지. 캐시 단일화·원자적 DB snapshot generation·순환 replay·인기 정렬 일관성·aggregate 상태 API 구현.
- 로컬853개(실PG15 포함), [CI #36](https://github.com/chonghg22/nearbook/actions/runs/38850204320) SUCCESS/실행838개+PG15skip 구분. Vercel preview `dpl_BXuSjhPx82rRf2uo3quiwjdY1jeK` Ready/check success, 웹UI불변/API프리뷰없음/화면검증아님.
- API 운영 배포 승인 전으로 merge/CD/강제갱신 미실행. 기존 stop/run 교체+DB 재색인 기동 대기 가능/readiness·롤백은P1-14. 알림·DBschema·한도·실제계정·지도설정 불변.
- [검증 기록](deploy-verification-p1-13-2026-10-16.md)

## 2026-10-15: P1-12 외부 API 예산·작업/갱신 상태 운영 반영

- 사용자 P1-11 이메일·푸시·알림 개선 보류 및 실제 정보나루500건/일 확인, 검증 후 운영API 승인. [PR #19](https://github.com/chonghg22/nearbook/pull/19) head `23ee538`/base `d03897b` 최종 gate 후 main `f7f344d` 배포.
- 로컬826개(실제 격리PG9 포함/no skips), CI #35 817개+PG9skip. workflow권한 부족으로 CI service 변경 push가 거부돼 workflow 변경은 제거하고 기존CI 유지/권한확대·우회 없음. skipped suite를 CI 통과로 세지 않는다.
- 기존 api_usage의 durable 예약/transaction advisory lock·재시작/일자/경합 제어·모든 시도 계산·single-flight·원행 update/중복로그방지·LOW475/HIGH500·안전한quota429/accounting503. 실제 Client에 연결하고 관측 cron은로그만, 기존발송은 활성/변경하지 않는다.
- API [CD #72](https://github.com/chonghg22/nearbook/actions/runs/38689130433) success/source revision·build-pull digest 일치. Vercel `2qTLqoZiHHsvsAwYeBznjAQXEZxY` Ready/build1m12s/두 운영도메인 연결(웹코드변경없음).
- 운영 direct/proxy `/operations/status`·`/naru/status`200/no-store,5개curation+observer 등록/pending비활성 확인. 기존설정30000이effective500으로clamp됐고 오늘장부644=성공542+실패102로remaining0/blocked. raw보유unknown10/reasonquota10·644→644 확인, 검색10건158ms·개인401·health200/ok892·148ms. 로컬예산reset10/16 00KST; 공급자실제잔여/모든동일키호출의 보장은 아님.
- 교체중health502→회복을P1-14에, 오래된loan2026-05-07/keyword2026-04 snapshot을후속점검에기록. 강제갱신·수동cron·실발송/개인설정·DBschema·요금·지도·worker 변경 없음. 임시PG테스트컨테이너만제거/로그보존.
- [검증·승인·한계·실측](deploy-verification-p1-12-2026-10-15.md). P1-11 보류, P1-13 미착수.

## 2026-10-15: P1-10 찜·기본 도서관 운영 웹/API 반영

- 사용자 직접 ‘운영 반영해’ 지시 후 [PR #17](https://github.com/chonghg22/nearbook/pull/17) head `6d1d31f`/CI #33 773개 통과를 재확인해 main `0c60b52` 배포. 프리뷰 화면 직접 확인 완료로 기록하지 않는다.
- 운영 자산 assertion에서 실제 로그인 page가 새 LoginInner를 사용하지 않는 누락을 발견했다. 사용자에게 안내하고 [PR #18](https://github.com/chonghg22/nearbook/pull/18)로 연결/중복 구현 제거, 실제 route DOM 회귀 강화·1개 추가, 최종 CI #34 **774개 테스트** 및 install/lint/type-check/build 통과 후 웹 main `d03897b` 반영.
- 최종 Vercel production `D83dxUMzj31AkXY8UJqbLuW1gu1A` Ready/check success/build1m8s, `www.near-book.com`/`near-book.com` alias 연결. API [CD #71](https://github.com/chonghg22/nearbook/actions/runs/38683602047) source `0c60b52` success/build-pull digest 일치. 보완은 웹만 변경해 API 재교체 없음.
- 찜·개인 목록의 상태/오류/중복/실패 복구·계정 경계, 도서관 검색/등록/기본 선택과 원자적 저장·기존 한도/idempotency, 찜한 한 권/본인 기본 한 곳의 명시 보유 API 및 안전한 로그인 복귀/실패 안내 적용.
- 운영 페이지5종·자산28개/MIME·새 로그인/찜/등록 안내 bundle·worker 동일·개인페이지 익명307·개인GET5종 direct/proxy401, 검색10건240ms·공개보유checked10/available9/borrowed1/1164ms·health292/157ms 확인.
- 교체 중 첫 개인GET502 및 초기 보유unknown10/15.7초·health8.3초·도서관SSR12.4초는 뒤 회복했으나 원인/무중단·전반 성능 해결로 주장하지 않고 P1-13/14에 남긴다. 실제 OAuth/개인계정쓰기·인증된 신규 API 양성 live/실DB 경합 검증은 수행하지 않았으며 자동 mock/DOM/운영HTTP 증거와 구분한다.
- DB스키마·요금/알림정책/발송·권한/지도URL·서비스워커 변경·강제갱신 없음. [상세 검증/승인/한계](deploy-verification-p1-10-2026-10-15.md). P1-11 미착수.

## 2026-10-15: P1-09 모바일·접근성 운영 웹 반영

- [PR #16](https://github.com/chonghg22/nearbook/pull/16), 최종 head `2edfd05`/CI #32 **693개 테스트** 및 frozen install/lint/type-check/build 성공. 사용자 휴대폰 정상 확인·운영 웹 승인 후 10:07 KST main `a516a5e` 반영.
- Vercel production `7yiBYvog9cPvZXdNRqszao9P1gPk` Ready/check success, 빌드1m4s, `www.near-book.com`/`near-book.com` alias 연결.
- 자동완성 키보드/ARIA/IME·모바일 검색/위치 Dialog focus/VisualViewport·긴 텍스트/페이지 번호/44px 대상·지도/목록 상태·성공 조회 후 inline 설치 제안 적용. 자동 설치/개인 설정 변경 없음.
- 운영 홈/검색/도서관/책 상세와 고유 자산25개 HTTP200/MIME·새 CSS/JS·SSR anchor/combobox·worker byte 일치, 검색10건/parser/보유 후보30·조회10/parser/health200·ok 확인.
- API CD0건: API 컨테이너 교체·DB·공용 타입·lockfile·지도 허용 URL·worker 변경 없음. API는 P1-07 `4fa9883` 유지.
- 보유 GET9759ms는 성공했지만 느린 응답이므로 P1-13 기록, 원인 규명/성능 해결 주장 없음. 브라우저 접근은 새 탭 승인에도 정책 차단되어 우회하지 않았으며 사용자 휴대폰 확인/자동 DOM/운영 HTTP를 구분, 에이전트 live 화면·정확한360/390/430px 전종 결과는 없음.
- [상세 검증/승인/한계](deploy-verification-p1-09-2026-10-15.md). P1-10 미착수.

## 2026-10-15: P1-08 보유·대출 상태의 다음 행동 운영 반영

- [PR #15](https://github.com/chonghg22/nearbook/pull/15), head `0e97ff5`/최종 CI #30 **663개 테스트** 및 install/lint/type-check/build 성공. 사용자 정상 확인·운영 웹 승인 후 main `5440144` 반영.
- Vercel production `DVCVpnCizhP58HCG75wKQ7nmdEpM` Ready/check success, 운영 두 도메인 alias 연결.
- 5/10/20km 명시 반경 선택, 대출 가능0/조회 실패의 지역·판본·기존 찜/알림 설정·공식 사이트 탐색 제공. 자동 확대·조회·저장·알림 활성화 없음.
- 운영 책 SSR/찜 target·반경/대안 JS·CSS·worker byte 일치 및 기존 holdings5/10/20km 각HTTP200/후보30·조회10/strict parser·health200 확인.
- 웹만 변경, main SHA API CD0건. API 컨테이너 교체·DB·강제 갱신·지도/PWA·실제 개인 설정·P1-09 작업 없음.
- 사용자 프리뷰/CI DOM과 운영 HTTP 증거를 구분하며 새 운영 화면 직접 브라우저 관측은 없음. [상세 검증/승인/한계](deploy-verification-p1-08-2026-10-15.md).

## 2026-10-15: P1-07 검색 로컬 우선·페이지 정합성 운영 반영

- [PR #14](https://github.com/chonghg22/nearbook/pull/14), head `d031eb8`/CI #29 **645개 테스트** 및 frozen install/lint/type-check/build 성공. 사용자 프리뷰 정상 동작 확인·운영 웹/API 승인 후 main `4fa9883` 반영.
- Vercel production `23CQG6b5EDUcrbyM3ejk1wnHw8fD` Ready/운영 도메인 연결, [API CD #70](https://github.com/chonghg22/nearbook/actions/runs/38658237708) success/build-pull digest 일치.
- 외부 보충은 제한·병합된 백그라운드 작업으로 분리하고 total은 같은 Orama 결과 기준으로 반환. cold pending/failure, 재확인 최대15회, LRU/TTL/revision 무효화 및 범위 밖 페이지 복귀 적용.
- 운영 제목 첫 GET847ms(이전18284ms 관측), 후속 page3 207ms. total134/마지막14페이지4건/다음페이지0건/1·2페이지 ISBN중복 없음. 저자·출판사·정확 ISBN/invalid400·새 플래그·엄격 파서·health·검색 자산·기존 worker 확인.
- CD 직후 첫 검색502→회복 및 후속 일부7~9.7초 지연을 관측했다. 마지막 health637/163ms 정상. 모든 요청 지연 해소나 무중단을 주장하지 않으며 반복 시 프로파일링이 필요하다.
- DB/강제 갱신·지도/PWA·P1-08 변경 없음. 실제 운영 화면 직접 브라우저 검증과 혼동하지 않고 사용자 프리뷰 확인·CI/DOM·공개 HTTP 증거를 구분한다.
- [상세 검증/승인/한계](deploy-verification-p1-07-2026-10-15.md).

## 2026-10-14: P1-06 검색 유형·관련도·ISBN·판본 표기 운영 반영

- [PR #13](https://github.com/chonghg22/nearbook/pull/13), 최종 head `db00074` / CI #28 **620개 테스트** 및 frozen install/lint/type-check/build 통과. 사용자 프리뷰 통합 복귀 확인·운영 웹/API 승인 후 main `0979c1b` 반영.
- Vercel production `AaGnE6ZU2uCbMANETCyGRkkrVE19` Ready/운영 두 도메인 alias, [API CD #69](https://github.com/chonghg22/nearbook/actions/runs/38531516408) success/build-pull digest 일치.
- 운영 검색 페이지/CSS/JS bundle200, ISBN10·하이픈13·all 자동감지 각각정확1건/invalid400, 제목 exact·전체구문→부분 순서 및 저자/출판사 결과 확인. health200/ok, 개인정보 캐시 제외 worker 유지.
- API 컨테이너 교체는 기존 CD 방식, DB/강제 갱신·지도 설정 변경 없음. live 운영 화면은 직접 관측하지 않았으며 사용자 프리뷰 확인과 HTTP 증거를 구분한다.
- 첫 제목 검색18.3초(웹15초 deadline 초과 가능)/출판사10.7초를 관측. 응답 지연·remoteTotal 혼합은 P1-07에 남기며 이번에 해결했다고 주장하지 않는다. P1-07 미착수.
- [상세 검증/승인/한계](deploy-verification-p1-06-2026-10-14.md).

## 2026-10-14: P1-05 도서관 공식 확인·길찾기 운영 반영

- [PR #12](https://github.com/chonghg22/nearbook/pull/12), 최종 head `d7cf86f` / CI #26 **536개 테스트** 및 lint/type-check/build 통과. 사용자 프리뷰 조회 오류에서 발견한 절대 API 직접 요청을 same-origin public client로 수정하고, 사용자 후속 정상 확인 및 운영 승인 후 main `56947d6` 반영.
- Vercel production `BycU91FSfqHVXZR3wWt4NWG3udui` Ready, `www.near-book.com`/`near-book.com` 연결. 운영 책 상세 SSR/CSS/JS bundle HTTP200, 공식 확인·카카오맵 목적지·same-origin 경로 포함 및 보유 API 두 ISBN 각10곳/파서/링크·health ok 확인.
- 웹만 배포: API CD/컨테이너 교체·DB·강제 갱신·지도 허용 URL/권한 변경 없음. 기존 개인정보 캐시 제외 worker source 유지. 새 운영 live UI는 별도 관측하지 않았으며 사용자 프리뷰 정상 확인과 HTTP 증거를 구분한다.
- [상세 검증/승인/한계](deploy-verification-p1-05-2026-10-14.md). P1-06 미착수.

## 2026-10-14: P1-04 홈 검색·기준 위치 선택 운영 반영

- [PR #11](https://github.com/chonghg22/nearbook/pull/11), CI #23/497개 및 lint/type-check/build 통과. 사용자 프리뷰 이미지 확인 후 지도 URL 추가 없이 직접 운영 배포 승인, main `6ec2b81` 반영.
- Vercel production `FVQd4aJWbH67fKcWHhnqJNvJxLCb` Ready, `www.near-book.com`/`near-book.com` 연결. 홈 검색 form/ISBN 스캔/기준 지역 변경 SSR 및 CSS HTTP200, 서울·부산 near 각12곳/검색10건/parser·health ok 확인.
- 웹만 배포: API CD/컨테이너 교체·DB·강제 갱신·지도 허용 URL/권한 변경 없음. 개인 캐시 제외 worker source 유지. 실제 지도 live 렌더링은 관측하지 않았으며 사용자 선택으로 프리뷰 지도 gate 생략.
- [상세 검증/승인/한계](deploy-verification-p1-04-2026-10-14.md).

## 2026-10-14: P1-03 API 요청·응답 계약 운영 반영

- 사용자 프리뷰 재검증(검색 정상, 운영시간·휴관일 이미지) 및 CI #22 **447개 테스트** 성공 후 [PR #10](https://github.com/chonghg22/nearbook/pull/10) 병합. 운영 main `de38fc8`.
- Vercel production `86rNh1g7uRdQRJX4mJnwv47vfefD` Ready, `www.near-book.com`/`near-book.com` alias 연결. [API CD #68](https://github.com/chonghg22/nearbook/actions/runs/38521551666) success, build/pull digest 일치 확인.
- 공개 요청은 같은-origin `/api` rewrite 사용, 공통 timeout/schema/오류·재시도 처리와 서울도서관 운영시간·휴관일 표시. 검색 장애는 정상 빈 결과 대신 sanitized503.
- API 교체 중 502 및 도서관 SSR500 관측 후 정상 복구 확인: 직접/proxy health ok, 검색10건/total415·자동완성8건·도서관 JSON/SSR HTTP200, CSS MIME 정상. 브라우저 연결 해제로 새 운영 screenshot은 없음.
- DB/강제 갱신/개인 설정/지도 권한 변경 없음. [검증·배포 상세](deploy-verification-p1-03-2026-10-14.md).

## 2026-10-13: API 주소/상세 오류 처리 운영 배포

### 후속: P0-03 지도·지역 목록 복구 운영 완료

- [PR #6](https://github.com/chonghg22/nearbook/pull/6) 검증 후 병합, 웹/API `b240462` 운영 반영. 전체 CI 의존성 설치·lint/type-check/build 및 **237개 테스트** 통과.
- 실제 인증된 프리뷰에서 발견한 가장자리 팝업 소멸과 모바일 캐시 SDK 좁은 폭 문제를 수정하고 운영에서도 재검증했다.
- 운영 해운대구 주소/목록/마커6개, 강원51개,390px 재진입44마커 및 오류없음 확인. API 교체 중 실패 UI→재시도 복구, 최종 health 정상.
- 사용자 승인으로 Naver 지도 검증 프리뷰2개를 허용 URL에 추가했다. 기존5개 URL과Dynamic/Static Map 유지, 최종7개. 의도치 않은 Reverse Geocoding 활성화는 승인 후 해제 상태로 복구·검증했다.
- [최종 배포 검증/화면/복구 기준선](deploy-verification-p0-03-2026-10-13.md). 이전 P0-01/02 결과는 아래에 보존한다.

- 사용자 승인 후 GitHub Actions에서 lockfile 기준 의존성 설치와 전체 lint/type-check/build/test를 실행했다. 로컬 DNS 제한 때문에 설치/검증은 CI에서 진행했다.
- 공유 패키지 빌드 전 type-check 실행 오류를 Turbo 의존 순서 보완으로 해결했다.
- 최종 테스트: Node 54개, 웹 Vitest 101개, API Jest 11개 통과.
- PR #4로 웹/API를 배포하고 PR #5로 상세 재시도를 보완했다. 최종 웹 `600a7bb`, API `df26a7d`; Vercel Ready와 Oracle CD 성공을 확인했다.
- 운영의 대표 책·서울도서관 상세/API 일치, 정상 canonical/index, 지도 프록시 100개, 실제 없는 도서관의 not-found/noindex를 확인했다.
- API 컨테이너 교체 중 502는 장애 UI로 표시됐고 이후 health가 정상화됐다. 무중단 교체/readiness는 후속 P1-14에 남는다.
- [검증·배포 링크·한계·화면 기록](deploy-verification-2026-10-13.md)

## 2026-10-12: Vercel 서버 API 요청의 국가 차단 해제

- Vercel의 `https://api.near-book.com` 요청에서 403이 발생하고, Cloudflare의 한국 외 국가 차단 규칙에 미국 `node` 요청이 차단되는 것을 확인했다.
- 사용자의 명시적 승인 후 규칙 `6cc08baadf60473cabf2cd940f156cbb`만 변경했다. API 호스트 전체를 이 국가 차단 규칙에서 제외했으며, 순서·Block action·Active 상태는 유지했다.
- 적용 식: `(ip.src.country ne "KR" and not cf.client.bot and http.host ne "api.near-book.com")`
- 해외에서도 API 접근이 가능해지는 영향은 승인 시 설명했다. 기존 API 인증·Nest throttling은 변경하지 않았다. DNS·TLS·Vercel 환경변수도 변경하지 않았다.
- 19:57:02 KST Vercel의 지도 프록시 `/api/libraries/in-bounds` HTTP 200과 실제 목록을 확인했다. `/libraries` 목록, 홈 인기대출·급상승 도서, 서울도서관 상세도 표시됐다.
- 특정 책 상세의 not-found와 `/popular`의 준비 중 화면은 남아 있으며 후속 진단이 필요하다. 로컬 주소 정책 수정은 아직 배포하지 않았다.
- rollback 식과 상세 검증/제약은 [P0-01 기록](p0-01-api-routing.md)에 보관했다.

## 2026-10-12: 운영 HTTPS 복구

- 장애: `https://www.near-book.com/` 접속 시 Cloudflare `526 Invalid SSL certificate` 발생.
- 실제 운영 Vercel 프로젝트는 `chonghg22s-projects/nearbook-web`. 로컬 CLI 연결도 이 프로젝트로 수정했다.
- Vercel Domains 화면에서 두 웹 도메인이 `Invalid Configuration`이며 Cloudflare 프록시를 끄도록 안내하는 것을 확인했다.
- 다음 두 레코드의 CNAME 대상은 유지하고 프록시만 `DNS only`로 변경했다.

| 이름 | 타입 | 대상 | 프록시 |
|------|------|------|--------|
| `near-book.com` | CNAME | `09b687c301b1526c.vercel-dns-017.com` | DNS only |
| `www.near-book.com` | CNAME | `09b687c301b1526c.vercel-dns-017.com` | DNS only |

- `api.near-book.com`의 Oracle Cloud A 레코드와 Cloudflare 프록시는 유지했다. SSL/TLS 모드도 변경하지 않았다.
- 변경 후 Vercel이 SSL 인증서를 발급했고, 두 웹 도메인 모두 `Valid Configuration`으로 전환됐다.
- 브라우저에서 인증서 경고 없이 HTTPS 홈페이지 접속을 확인했다. `https://near-book.com/`도 `https://www.near-book.com/`으로 이동한다.
- 이 확인은 HTTPS와 도메인 연결에 대한 것이며, 검색·도서관 데이터 등 API 기능 전체를 검증한 것은 아니다.
- 후속 조회: `vercel domains inspect www.near-book.com`, `cf dns records list --zone near-book.com`.

## 2026-05-07: Vercel 배포 설정

### 완료된 작업

1. **`output: 'standalone'` 제거** (`apps/web/next.config.ts`)
   - Docker용 설정이었음. Vercel은 자체 serverless 모드가 최적.

2. **Vercel 대시보드 설정 가이드 정리** (아래 참고)

### Vercel 대시보드에서 해야 할 설정

1. **New Project** → GitHub repo `nearbook` 연결
2. **Root Directory**: `apps/web`
3. **Framework Preset**: Next.js (자동 감지됨)
4. **Build Command**: `cd ../.. && pnpm turbo build --filter=@nearbook/web`
   - 또는 기본값 `next build`도 동작함 (turbo 캐시 활용하려면 위 명령 권장)
5. **Install Command**: (비워두기 — Vercel이 pnpm workspace 자동 감지)
6. **Output Directory**: (비워두기 — 기본값 `.next`)
7. **Node.js Version**: 20.x

### 환경변수 (Vercel Dashboard → Settings → Environment Variables)

```
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
NEXT_PUBLIC_API_BASE_URL=<oracle-cloud-api-url>  # API 서버 배포 후 설정
INTERNAL_API_URL=<oracle-cloud-api-url>          # rewrites 프록시용
```

> `INTERNAL_API_URL`은 서버사이드에서 API 서버로 프록시할 때 사용 (next.config.ts rewrites).
> Oracle Cloud API 배포 전까지는 임시값 또는 빈 값으로 둬도 됨.

### 배포 흐름

```
git push main → Vercel webhook 자동 감지 → 빌드 + 배포
PR 생성 → Preview URL 자동 생성
```

### 도메인 연결 (Cloudflare + Vercel) — 완료

- **도메인 DNS**: Cloudflare 관리
- **Vercel**: Settings → Domains에서 도메인 추가
- **Cloudflare DNS 레코드**:
  - `CNAME` `@` → `cname.vercel-dns.com` (DNS only)
  - `CNAME` `www` → `cname.vercel-dns.com` (DNS only)
- **주의**: Cloudflare 프록시(주황색 구름) 끄고 **DNS only(회색)** 사용
  - Vercel 자체 SSL과 충돌 방지
  - 프록시 사용 시 SSL/TLS → Full (strict) 필요

---

## 2026-05-07: Oracle Cloud API 배포 설정

### VM 사양

- **Shape**: VM.Standard.E2.1.Micro (Always Free)
- **OCPU**: 1 / **RAM**: 1GB + 4GB swap
- VM에서 Docker 빌드 금지 (메모리 부족) → GitHub Actions에서 빌드, VM은 pull만

### CD 워크플로 (`.github/workflows/cd.yml`) — 완료

- **트리거**: `main` push + `apps/api/**`, `packages/**` 변경 시
- **흐름**: GitHub Actions에서 Docker 빌드 → GHCR push → Oracle VM SSH 접속 → docker pull → 컨테이너 교체
- 컨테이너명: `nearbook-api`, 포트 3001

### GitHub Secrets 등록 필요

| Secret | 값 |
|--------|-----|
| `ORACLE_HOST` | VM 공인 IP |
| `ORACLE_USER` | SSH 유저명 (보통 `ubuntu` 또는 `opc`) |
| `ORACLE_SSH_KEY` | SSH private key |
| `GHCR_TOKEN` | GitHub PAT (packages:read 권한) |

### VM 사전 준비 작업

1. Docker 설치
2. `.env` 파일 생성: `/home/<user>/nearbook/.env`
   ```
   DATABASE_URL=<supabase-db-url>
   SUPABASE_URL=<supabase-url>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   PORT=3001
   JEONGBONARU_API_KEY=<api-key>
   JEONGBONARU_DAILY_LIMIT=500
   ```
3. VCN Security List에서 인바운드 포트 허용: 22, 80, 443, 3001
4. Nginx + SSL 설정 (Let's Encrypt)

---

## 2026-10-13: P0-04 탐색 상태 복구 운영 반영

- PR #7, 웹/API `1961f0784902f0c3a47094a2534c9b4e51be3dcb` 반영. 전체 CI273개 및 프리뷰 검증 후 승인된 운영 배포 진행.
- 신착 집계SQL alias 누락 수정으로500 복구. 인기·분야·신착의 오류/빈 결과/이전자료를 구분하고 재시도·실제 수집시각 표시.
- 운영 도서관12곳·선택변경/신착10권·인기20/분야40/소설40·canonical·390px·health 정상 확인. 자료 강제 갱신 없음.
- [운영 검증 상세](deploy-verification-p0-04-2026-10-13.md)

## 2026-10-14: P1-01 보유 상태 모델 운영 반영

- PR #8, 웹/API `02a5c67fbb52259364530eea810d7b11545923f5`. 전체 CI346개 및 프리뷰 검증 후 승인된 운영 배포.
- 보유/대출가능/미소장/확인불가 구분, 성공관측 cache와 확인시점·출처·범위, metadata/제휴와 독립된 holdings 조회. holdings 경로는 PWA 캐시대체 제외.
- 실제 서울/부산 결과·재시도 복구·cache시각유지·390px·canonical·health 검증. 검증 기준지역 서울/viewport복구. 다음 항목 착수 및 강제 수집 없음.
- [운영 검증](deploy-verification-p1-01-2026-10-14.md)

## 앞으로 해야 할 작업

### Vercel (추가)
- [x] Vercel 대시보드에서 실제 프로젝트 생성 및 GitHub repo 연결
- [x] 환경변수 입력
- [x] 커스텀 도메인 연결 (Cloudflare DNS 설정 완료)
- [ ] 첫 배포 확인 및 빌드 에러 수정 (있을 경우)

### Oracle Cloud (API 배포)
- [x] GitHub Actions CD 워크플로 완성 (SSH 배포 포함)
- [x] VM에 Docker 설치 (이미 설치됨)
- [x] VCN Security List 설정 (포트 22, 3001 인바운드 허용)
- [x] GitHub Secrets 등록 (`ORACLE_HOST`, `ORACLE_USER`, `ORACLE_SSH_KEY`, `GHCR_TOKEN`)
- [x] VM에 `.env` 파일 설정 (`/home/ubuntu/nearbook/apps/api/.env`)
- [x] 첫 배포 테스트 완료 — API 서버 정상 가동 (`http://140.245.78.138:3001`)
- [ ] Nginx reverse proxy + SSL (Let's Encrypt) 설정
- [ ] 배포 후 Vercel 환경변수에 `INTERNAL_API_URL` 업데이트

### 기타
- [ ] CI 워크플로(ci.yml)에서 web/api 각각 path filter 적용 고려
- [ ] 모니터링/로깅 설정


## 2026-10-19: P1-14 readiness·배포 판정·복구 운영 반영

사용자 운영 배포 지시 후 [PR21](https://github.com/chonghg22/nearbook/pull/21)/main `d619481` 반영. CI/CD 성공·이미지 digest 일치·이전 컨테이너 보존, direct/proxy 준비 상태·대표 책/도서관 SSR·공식 링크 검증. 교체 중502 후 회복으로 무중단은 아니다. Jira KAN-119 완료·다음 KAN-120/P1-15 PR22 진행 중. [최종 검증](deploy-verification-p1-14-2026-10-19.md).

## P2-01 — 2026-10-20

2026-10-20 운영 반영 완료: PR23 merge `c48a91bbbd9a89f0027e8d680866bd00070f1a31`, Vercel production `dpl_5BGpMzDyCbKkd6DrDvVtUgqGwv6a` READY/두 도메인 연결·source 일치. API d619481 유지/API CD 없음. 운영 GET8개200·개인 화면 로그인 이동·개인 API401 확인. KAN-116 완료, Confluence458753 v4 재조회. [배포 기록](docs/deploy-verification-p2-01-2026-10-20.md). PR22는 미병합 유지.

## P2-02 — 2026-10-20

2026-10-20 운영 완료: [PR24](https://github.com/chonghg22/nearbook/pull/24) merge `defc8a449964e3a32bb7b9161d41fd30f49e4a1c`, Vercel production `dpl_HFZk4cjVhrXNj1f7YAqtQZfZcdoQ` READY/두 도메인·source 일치. API d619481 유지. 운영 GET8개200·익명 개인 API401, 실제 익명 브라우저 v2 이벤트12건202/ok:true·보유/클릭 requestId 일치. unknown/확인0은 확인 불가로 구분. DB 행 재조회·운영 TimeZone 미확인/분석 SQL 미실행. [배포 검증](docs/deploy-verification-p2-02-2026-10-20.md). KAN-121 완료·Confluence458753 v6. PR22 미병합 유지.

## P2-03 검토 — 2026-10-20 (운영 미반영)

[PR25](https://github.com/chonghg22/nearbook/pull/25), head `b62d0d793be0e51978084e49ac96efa4ef800dcc`. CI39375734121·Vercel preview 성공, 실제 서울352개 링크·preview noindex/nofollow·JSON-LD 미출력·robots 전체 차단·빈 sitemap·PNG1200×630 확인. 웹402·API243·Node237·격리 PostgreSQL SQL6개 성공(기존 API PG15개 생략). 로컬 운영 번들 정상/없음/오류·지역 API 복구 및 Chromium1280/390px 검증. KAN-122 검토 중·Confluence458753 v7. main/web defc8a4/API d619481 유지. [기록](p2-03-seo-share.md).

## P2-03 운영 완료 — 2026-10-20

[PR25](https://github.com/chonghg22/nearbook/pull/25) merge/source56f523988823b3c2aeee959cf6e00bf7af965f06. Vercel production dpl_GRQH9hjRDnKecKLcMDzMvbfYtzR2 READY·두 운영 도메인 연결·source 일치. API d619481 유지/API CD 없음. 시도17개 목록·대표 지역 실제 링크/JSON-LD/canonical·sitemap2,243 URL(지역17개)·OG/PNG·오류 색인 차단·Chromium1280/390 검증 통과. KAN-122 완료·Confluence458753 v8. [검증](deploy-verification-p2-03-2026-10-20.md). PR22 미병합 유지.

## P2-04 제작 준비 — 2026-10-20 (운영 배포 없음)

@jack.made.tools의0원 Instagram 홍보 제작물·문안·측정 계획을 준비했다. [PR26](https://github.com/chonghg22/nearbook/pull/26), head34ac3ad10dd7d47cae8928bd413134bf51204cc4, CI39383183120/preview 성공. 피드5장·20초 릴스/표지·캡션 ZIP 납품. 사용자 게시 승인은 있으나 Instagram 접근 거절로 미게시, DBeaver 미승인으로 운영 events 행/시각 미확인. KAN-123 진행 중·Confluence458753 v9. 실험/게시와 제품 배포를 구분하며 웹56f5239/API d619481 유지. [상세](p2-04-instagram-experiment.md).


## 2026-10-20 — P1-15 회귀 완료

PR22/head c2212e7 최종 CI39386995419·E2E32 성공 후 main2735187 병합. Vercel production dpl_9xT2CKVM725Sgqtu87RXk7wGD5nK Ready·www/apex 연결·공개 페이지/준비 상태 정상, API d619481 유지. KAN-120 완료·Confluence v10 재조회, 완료21/보류1/진행1. 인스타 게시는 사용자 직접 진행. [완료 근거](p1-15-completion-2026-10-20.md).
