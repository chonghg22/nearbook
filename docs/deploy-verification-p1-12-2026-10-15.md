# P1-12 외부 API 예산·작업·갱신 상태 — 2026-10-15

## 상태와 승인

**구현·최종 검증 및 운영 API 반영/읽기 전용 점검 완료.** [PR #19](https://github.com/chonghg22/nearbook/pull/19), main/source `f7f344d`. 아래 미반영/예정 문구는 단계별 이력이다. 현재 오늘 장부644건으로 추가 정보나루 호출은 정책상 차단되며, 이 상태를 정상 보유 양성 결과로 표현하지 않는다.

- 사용자 P1-11 이메일·푸시·알림 발송 개선 보류 지시. 기존 발송 설정/동의/주기/실제 발송은 이번에 변경하거나 실행하지 않는다.
- 사용자 정보나루 계정 한도 **1일500건** 확인 및 ‘검증 후 운영 API 반영’ 승인. 컨테이너 교체 중 짧은 실패 가능성을 사전 설명했다.
- 기반 main `d03897b11121f299c615fa2e2516b3cdb94cf306`, 별도 worktree `/Users/jack/local/nearbook-p1-12`, branch `fix/p1-12-quota-jobs-20261015`. 원본 dirty 파일 보존.
- 최종 head `23ee538332af2ada144dff8d4140b5df366e7c5a`, 최초 미업로드 commit에 있던 workflow 수정은 제거하여 실제 PR에는 workflow 파일 변경이 없다. 거부된 첫 push/PR생성은 운영 변경을 일으키지 않았다.
- DB schema/요금/지도·웹UI·worker·lockfile/env실값 변경/새 pending 활성화/알림 개선/강제 갱신/다음 P1-13 제외.

## 구현

- 실제 Client에 QuotaModule/acquire 연결. 기존 DB api_usage에 HTTP 전 durable 예약1행, 전용 transaction advisory lock 후 READ COMMITTED count/조건부 insert. HTTP는 transaction 밖. KST 일자·재시작·경합에 예산 유지, 성공/실패/timeout/미완료 모두 소비. 결과는 같은 row 비동기 update이며 로깅 지연이 HTTP 결과를 막지 않는다. 예약 실패는 fail closed.
- 확인된500 hardcap/낮은 설정 허용/기존 큰 값 clamp,400warn/475LOW차단/500전체차단. 기존 미등록 quota sender는 활성화하지 않고 새 quota observer는 로그만 남긴다. 기존 알림cron400/500 문구/채널 정책 정리는 P1-11 보류 범위다.
- 같은 요청 single-flight(최대500 in-flight key), 자동 재시도/장기 캐시 없음. provider app error 중복 log 방지/새 로그·상태에 키·URL·payload 미노출. proxy authKey/format override 차단. 한도/집계 차단 뒤 background 순회 중단.
- `/naru/status`는 DB 집계/no-store/실패503. 새 `/operations/status`는 aggregate read-only quota/actual named registry/현 프로세스 작업 이력과 저장 snapshot의 최신 period/row count/min-max 시각을 구분. 직접 quota 차단 HTTP429.
- health는 DB query 없이 마지막 quota 관측/시각·stale 또는 null/unknown. readiness 전체 개선은 P1-14 별도. 기존5개 갱신 스케줄/저장자료 보존, 성공/partial/empty/failed/blocked 구분·same-process overlap 방지. pending cron/service는 원래 미등록이고 이번에도 켜지 않는다.

## 검증과 제한

- frozen install 성공, 의존성/lockfile 변경 없음. 로컬 Node237+Vitest365+API Jest224 = **826개**, PostgreSQL9개 포함/no skips인 실행 확인. 실제 route HTTP 강화 뒤 최종 전체 재실행 및 GitHub CI 확인 예정.
- 최종 local lint/type-check/build/test 성공(실제 HTTP route200/no-store·quota429 보완 후): `/private/tmp/nearbook-p112-{lint,types,build,tests}-final3.log`, frozen install `/private/tmp/nearbook-p112-install.log`. 로컬826개/no skips. CI에서는 격리DB가 없어9개 skip을 별도로 기록한다.
- 격리 Docker PostgreSQL17 `nearbook_quota_test`에서 SQL/두 서비스·20개 경합/5회 예산/475·500 경계/새 인스턴스/실패·미완료/KST 경계/실제 스냅샷 query 검증. 운영 DB/키·외부 API·메일/푸시를 사용하지 않는다.
- 실제 module graph 부팅·named job6개·pending provider 부재·새 status route HTTP200/no-store와 proxy quota429를 모의 transport/DB로 확인. 진짜 공급자/실갱신/실발송을 실행한 E2E와 구분한다.
- Turbo test env 선언 추가. 첫 Turbo 실행의 env 누락으로8개 skip된 것을 발견/수정했고 로컬 최종9개 포함/no skips 실행으로 대체했다. GitHub OAuth에 workflow scope가 없어 CI service 추가를 포함한 첫 push는 거부됐고 PR 생성도 head 부재422로 실패했다. 새 권한/다른 도구를 통한 workflow 쓰기 우회 없이 workflow 변경을 제거하고 기존 CI를 유지한다. 로컬 PostgreSQL9개 통과와 CI9개 skip을 구분한다(기대 CI817=Node237+Vitest365+API Jest215). CI 서비스 연동은 추후 workflow 권한 확보 시 별도 범위다. 초기 lint require/import와 CommonJS import 순서 실패는 수정 후 전체 재검증하며 실패본 배포 없음.
- local quota는 공급자 사이트 실제 잔여가 아니라 이 Client의 예약 장부. 외부 동일키 호출은 포괄하지 않으며 기존 중복 로그도 삭제하지 않고 보수적으로 센다. 이미500 이상이면 당일 새 요청은 막고 캐시/로컬 검색은 유지한다.
- runtime job 이력은 재시작 후null, 저장 row fetchedAt는 전체 갱신 완전 성공의 증거가 아니다. 분산 job lock·영구 job 이력은 구현했다고 주장하지 않는다. API 프리뷰 서버가 없어 새 경로는 격리 HTTP/SQL 후 승인된 운영 GET으로 검증한다. 브라우저 제한 우회 없음.

## 배포 gate

최종 exact head/base·CI·배포 check 후 merge, API CD revision/build-pull digest 및 운영 `/operations/status`, `/naru/status`, health·기존 공개 검색/보유계약·개인 익명401을 검증한다. 한도 소진·공급자 오류·실제 갱신/발송을 강제로 유발하지 않는다. 결과/잔여 위험을 기록한 뒤 완료 처리한다.

## 최종 gate 및 배포 시작

- [CI #35](https://github.com/chonghg22/nearbook/actions/runs/38688885003)/job116269963620 success. frozen install/lint/type-check/build, Node237+Vitest365+API Jest215=**817개** 통과. PostgreSQL9개는 CI에서skip(로컬 격리DB 통과9개와 구분). CI에서도826개 실행됐다고 주장하지 않는다.
- Vercel preview `dpl_92RABYjX7eP4bVBwpQs2p5vSWWX8` Ready/check success/build1m11s. 고정 `https://nearbook-web-git-fix-p1-12-quota-job-55870c-chonghg22s-projects.vercel.app`, immutable `https://nearbook-kir8d2wa4-chonghg22s-projects.vercel.app`. 배포 메타데이터이며 새 운영 API 양성 검증/브라우저 렌더링 증거가 아니다.
- exact head `23ee538332af2ada144dff8d4140b5df366e7c5a`/base `d03897b11121f299c615fa2e2516b3cdb94cf306`, CI/check/PR open·mergeable 재검증 후 expected_head_sha로 병합했다.
- main/source `f7f344d1a0737c59e209d0bc1af153a9162d11be`, 2026-10-15 14:52 KST. 사용자 ‘검증 후 운영 API 반영’ 승인 범위. 운영 배포와 읽기 전용 점검 진행 중이며 실제 갱신/발송·개인 설정 변경은 하지 않는다.
- [API CD #72](https://github.com/chonghg22/nearbook/actions/runs/38689130433)/job116270729986. Vercel 자동 production `dpl_2qTLqoZiHHsvsAwYeBznjAQXEZxY`(웹 소스 변경 없음)도 함께 상태를 확인한다.
- 로컬 PostgreSQL 테스트 전용 container `05410beda92b911f754f6eee2ebcd26132424f5ef2e30600b7379c56df358425`는 테스트 후 stop/--rm으로 제거했고 같은 이름의 컨테이너가 남지 않음을 확인했다. 임시 테스트 DB 데이터만 제거했으며 운영/사용자 데이터는 손대지 않았고 로그는 보존한다.
- 500건 한도는 사용자 확인이다. 로컬 KST 일자 정책은 기존 코드 의도를 유지했으며 공급자 사이트의 실제 reset 시각을 별도로 확인한 증거는 없다. 로컬 예약 장부를 공급자 실시간 잔여/모든 동일키 사용 경로의 보장으로 표현하지 않는다.

## 최종 운영 결과 (2026-10-15 14:57 KST)

- API [CD #72](https://github.com/chonghg22/nearbook/actions/runs/38689130433)/job116270729986 success, source/revision `f7f344d1a0737c59e209d0bc1af153a9162d11be`. build containerimage.digest와 Oracle pull Digest 모두 `sha256:db75af203b25c4fd22b07fa6bd2a3718a358348ad3e047d89e981adac957391b` 일치.
- Vercel 자동 production `dpl_2qTLqoZiHHsvsAwYeBznjAQXEZxY` Ready/check success, build1m12s, `www.near-book.com`/`near-book.com` alias 연결. immutable `https://nearbook-isk44otwg-chonghg22s-projects.vercel.app`. 웹 소스/UI 변경 없음.
- 교체 중 direct health GET은502/1140ms였고, 배포 작업 완료 뒤 최종 direct/proxy health200/ok/892·148ms로 회복. CD 성공만으로 무중단을 주장하지 않고 P1-14에 남긴다.
- `/private/tmp/nearbook-p112-verify.mjs` 종료0, `/private/tmp/nearbook-p112-prod.log`. direct/proxy `/operations/status` 모두200/no-store,1198/562ms. `/naru/status` 모두200/no-store,328/174ms. 기존 실서버 configuredLimit **30000**이었으나 새 effective/accountLimit500으로 clamp 확인. 오늘 장부 **644=성공542+실패102+미완료0**, remaining0/modeblocked. 이 값은 공급자의 실제 호출 승인/잔여가 아니라 기존 로그 포함 장부다.
- resetAt `2026-10-15T15:00:00.000Z` = **2026-10-16 00:00 KST**. 해당 로컬 일자 전환 전 새 provider dispatch를 차단한다. 사용자에게 기존30000/644건·현재 보유 확인 제한·KST 로컬 예산 전환을 알렸다. env실값/과거 장부를 수정하거나 한도를 임의로 증액하지 않았다.
- named 큐레이션5개/observer 등록true. 모든 lastRun:null은 새 프로세스에서 아직 스케줄 실행이 관측되지 않았다는 뜻이다. pending 등록/활성false, notificationDelivery deferred-unchanged. 실제 갱신/발송을 실행하지 않았다.
- 기존 snapshot 조회: category2026-10/840행, trend2026-10-14/5행, loan2026-05-07/20행, monthly keywords2026-04/10행, new-arrivals2026-10/112행. 오래된 loan/keyword 자료가 감지됐으나 공급자 원인을 확정하거나 강제 갱신하지 않았다. 저장 row시각과 전체 갱신 성공은 구분, 다음 자연 스케줄/별도 분석 대상으로 남긴다.
- 홈313ms/검색페이지553ms/책990ms 모두200. 공개 검색 strict parser/10건·total105·158ms. private 목록·카드·새 개인 보유 경로 익명401. 보유 GET200/1826ms/후보30·조회시도10·unknown10/checked0/unchecked20, 계약은 유효하지만 보유 양성 확인이 아니다.
- 보충 read-only 확인 `/private/tmp/nearbook-p112-blocked-proof.log`: **raw API reason quota10개**, 요청 전/후 장부644→644(차단 요청을 외부 호출로 잘못 소비하지 않음), modeblocked. 기존 웹 parser가 reason 필드를 제거하므로 최초 검사 reasons:{}를 이유 없음으로 해석하지 않았다. parser/UI 변경은 이번에 하지 않았다.
- 실제 계정 로그인/찜·도서관/알림 설정 변경, DBschema·강제 수집·수동 cron·메일/푸시/Discord 발송 없음. 노출되는 status는 aggregate만이며 실제 secret/쿼리 payload·개인 목록 없음. 보류된 P1-11과 다음 P1-13을 착수하지 않았다.
- 최종 증거: 로컬826개/no skips(실PG9개), CI817개/PG9skip, 실제 module HTTP/모의 quota429, 운영 DB/status·검색·quota 차단·health GET을 구분한다. 운영 한도를 강제로 채우거나 provider/DB 장애를 주입하지 않았다.
