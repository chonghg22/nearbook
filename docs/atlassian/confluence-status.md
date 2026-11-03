# Nearbook 고도화 현황 — 2026-10-12\~16

## P1-15 회귀 검증 완료 — 

최신 P2-01\~03을 통합한 [PR22](https://github.com/chonghg22/nearbook/pull/22)를 최종 head `c2212e7`의 [CI39386995419](https://github.com/chonghg22/nearbook/actions/runs/39386995419) 및 Vercel preview 성공 후 병합했다. merge `2735187`, KAN-120 완료다.

Chromium production-bundle E2E32개(데스크톱16·모바일16) 원격/로컬 통과. 검색·외부 장애·GPS·찜·계정 전환·실제 worker·오프라인·카메라·화면폭에 지역 탐색과 비공개 진입 후 공개 경로 계측을 추가했다. 실제 브라우저→Next proxy→로컬 수집기에서 source/세션, 검색/ISBN/rank, 보유 requestId와 공식 사이트 클릭 연결, 임의 URL 토큰·좌표 제외를 확인했다.

웹402/API243(실PG15skip)/Node237, 분석 SQL6개 격리 PostgreSQL, lint/type-check/build·배포 계약도 통과했다. 앱 동작/API/스키마 변경은 없다. 운영 DB 저장·실제 Kakao·물리 카메라·iOS Safari 성공으로 확대하지 않는다. P1-11 보류 유지.

Vercel production `dpl_9xT2CKVM725Sgqtu87RXk7wGD5nK` Ready, source `2735187`와 www 운영 도메인 연결을 확인했다. 운영 검색·지역 목록·서울 지역 HTTP200 및 웹 프록시 readiness 정상. API는 `d619481`이며 이번 변경으로 API CD는 발생하지 않았다. 새 계정/DB 쓰기·외부 provider 강제 조회·알림 발송은 없다.

Instagram 게시는 사용자가 직접 진행한다. @jack.made.tools용 패키지 납품 완료이며 게시 URL·시각은 아직 미전달이다. KAN-123은 진행 중, 실제 게시/수집 확인 이후 관측을 시작한다.

로드맵23개 기준 완료21(기능 운영20·회귀1)·사용자 보류1·진행1(P2-04)·검토0·미착수0. 아래 미병합/접근 거절/이전 집계는 당시 이력이다.

## P2-04 인스타그램 제작 준비 — 

사용자가 외부 홍보를 승인하고 계정 `@jack.made.tools`·인스타 글/릴스를 지정했다. 예산0원으로 피드5장·20초 자막 릴스·표지·캡션·추적 링크·관측 템플릿을 완성했다. [PR26](https://github.com/chonghg22/nearbook/pull/26)에 재생성 자료와 계획을 정리했다. 제품/lockfile 변경·새 운영 배포는 없다.

피드1080×1350·릴스1080×1920/30fps/H.264/AAC 무음, 전체 디코딩·주요 프레임/이미지 육안 확인·CSV23개 컬럼·추적 URL2개 GET200/canonical 검증. 실제 공개 지역 화면을 사용했다. 프로필 공통 source는 개별 피드/릴스 웹 전환으로 해석하지 않으며 플랫폼에서 실제 제공되는 게시물 지표와 구분한다.

게시 승인은 확보했으나 **미게시·실험 미시작**이다. 브라우저 보안 승인에서 instagram.com 접근이 거절됐고(도구 사유: 사이트 접근 승인 거절) 프로필 링크도 바꾸지 않았다. DBeaver 앱 사용 미승인으로 운영 events 행/시간 기준 확인도 남아 있다. 우회 접근·유료 집행·계정 설정/발송/DB 변경 없음. 저장 API202를 실제 수집 검증으로 대신하지 않는다. 실제 게시 URL·시각과 수집 확인 후14일 관측, 마지막 유입의 성숙한 재방문과 피드백 검토가 남아 있으므로 KAN-123은 진행 중이다.

로드맵23개 기준 운영 완료20·사용자 보류1·검토1(PR22)·진행1(P2-04)·미착수0. 운영 웹56f5239/API d619481, P1-11 보류와 PR22 미병합 유지. 아래 P2-04 미착수/승인 필요 문구는 이번 사용자 승인 전 이력이다.

## P2-03 운영 반영 — 

[PR25](https://github.com/chonghg22/nearbook/pull/25) 병합, 웹 main/source `56f523988823b3c2aeee959cf6e00bf7af965f06`. Vercel production `dpl_GRQH9hjRDnKecKLcMDzMvbfYtzR2` READY·두 운영 도메인 연결·source 일치. 웹 변경으로 API CD는 없으며 API d619481을 유지한다. KAN-122 완료.

운영 /regions의 시도17개 및 대표 서울352·강원51·세종10개 실제 도서관 링크·JSON-LD·canonical 일치를 확인했다. 정상 상세의 index/follow·책 실제 표지·도서관 공용 카드, 미존재 지역404/noindex·검색 noindex, 공개 robots와 별도 AI 크롤러 차단이 정상이다. sitemap2,243 URL 중 지역17개와 /regions 포함·검색 제외. 공유 PNG1200×630·55,005bytes는 검증 소스와 바이트 일치. apex는307로 www 동일 경로에 이동한다.

direct/proxy 준비 상태·검색 제안·도서관 API GET6건200 및 API revision·DB/검색 준비·scheduler 모드 일치. 책/도서관 SSR200. 실제 익명 Chromium1280/390px 지역 선택·서울352개 링크·가로 넘침 없음·pageerror0과 스크린샷을 확인했다. 브라우저 analytics POST와 외부 위젯/광고는 차단했고 실제 계정 쓰기·발송·강제 갱신은 하지 않았다. 검색엔진 실제 색인/순위·외부 공유 서비스 캐시 갱신은 별도 확인 사항이다.

로드맵23개 기준 운영 완료20·사용자 보류1·검토1(PR22)·미착수1(P2-04). P1-11 보류, PR22 미병합 유지. 아래 P2-03 미반영/검토 문구와 이전 집계는 배포 전 이력이다.

## P2-03 검토 — 

[PR25](https://github.com/chonghg22/nearbook/pull/25) 정상 콘텐츠 기반 지역 SEO·공유 개선을 구현했다. head `b62d0d793be0e51978084e49ac96efa4ef800dcc`, [CI 성공](https://github.com/chonghg22/nearbook/actions/runs/39375734121)·Vercel preview READY. KAN-122 검토 중이며 미병합·운영 미반영이다. 운영 웹 defc8a4/API d619481, PR22 검토 상태를 유지한다.

/regions와 /region/\[sido\]에 실제 등록 도서관을 SSR하고 전체 조회 성공·3곳 이상인 시도만 지역 URL/canonical/sitemap/JSON-LD에 포함한다. 오류/부분 목록으로 지역 수와 페이지를 만들지 않는다. 고정 시도 slug·명칭 alias를 사용하며 시군구 전용 URL은 생성하지 않았다. 실제 책 표지는 유지하고 표지가 없으면 공용1200×630 공유 카드를 사용한다. 상세 오류는 noindex·정상 entity 미출력이고 명시적 preview는 APP\_ENV=production보다 우선해 색인을 차단한다.

웹402·API243·Node237·격리 PostgreSQL SQL6개 성공. 기존 API 실제 PG15개 생략과 구분한다. 로컬 운영 번들의 정상 HTML4종·없음4종·상세 장애2종·지역 장애→복구 및 Chromium1280/390px 탐색·링크·넘침 없음·pageerror0·PNG 육안 검증. 일부 Next 스트리밍 오류/없는 책은 HTTP200일 수 있어 실제 HTML/noindex로도 판정했다. 운영 목록 GET16회에서1,588건/적합 시도17곳, 실제 preview 서울352개 링크·noindex/nofollow·JSON-LD 미출력·robots 전체 차단·빈 sitemap·PNG1200×630을 확인했다.

API/DB/예산·계정/요금·발송 변경 없음. 검색엔진 실제 색인/순위·외부 공유 서비스 캐시 갱신은 별도 검증이다. 로드맵23개 기준 운영 완료19·사용자 보류1·검토 중2(PR22/25)·미착수1(P2-04). P1-11 보류 유지. 아래 P2-03 미착수와 이전 집계는 착수 전 이력이다.

<https://github.com/chonghg22/nearbook/blob/b62d0d793be0e51978084e49ac96efa4ef800dcc/docs/p2-03-seo-share.md>

## P2-02 운영 반영 — 

[PR24](https://github.com/chonghg22/nearbook/pull/24) 병합, 웹 source `defc8a449964e3a32bb7b9161d41fd30f49e4a1c`. Vercel production `dpl_HFZk4cjVhrXNj1f7YAqtQZfZcdoQ` READY/운영 두 도메인 연결·source 일치. API CD 없이 API d619481 유지. 준비 상태·검색·도서관 direct/proxy와 책/도서관 SSR GET8개200, 익명 개인 API401 확인.

실제 익명 Chromium에서 source=codex-p202-deploy-20261020으로 검색 제출→결과 선택→책 상세→보유 응답/화면→공식 링크 클릭의 v2 이벤트12건 모두202/ok:true. requestId 일치·pageerror0. 보유 결과 unknown/checked0/held0/available0을 확인 불가로 분리했다. 외부 위젯/광고/이미지·공식 목적지 탭은 차단했으며 외부 도착·실제 대출 상태 검증은 아니다. 초기 hydration 대기 전 스모크에서 visit/page\_view2건도 생성됐다.

DB 직접 접속 설정이 없어 실제 events 행 재조회와 운영 DB TimeZone은 미확인이다. 저장 API의 성공 응답 확인과 구분한다. 수동 분석 SQL은 운영 실행하지 않았으며 사용 전 UTC 저장 전제 확인이 필요하다. 계정·발송 변경 없음. KAN-121 완료. 로드맵23개 기준 운영 완료19·사용자 보류1·검토 중1(PR22)·미착수2. 다음은 P2-03. 아래 PR24 미반영/운영 이벤트 미생성 문구는 배포 전 이력이다.

## P2-02 검토 — 

[PR24](https://github.com/chonghg22/nearbook/pull/24) 핵심 행동·실제 조회 결과·7일 재방문 계측을 구현하고 검증했다. head `1fbfaebc28ed0fce24bc8f944c2848ea5f3dc620`, [CI 성공](https://github.com/chonghg22/nearbook/actions/runs/39342645093) 및 Vercel preview 성공. KAN-121 검토 중이며 미병합·미배포다. 운영 웹 c48a91b/API d619481과 PR22 미병합 상태는 유지한다.

홈·헤더·모바일/검색 제출과 결과 순위·필터/정렬, 검색 ready/pending/실패, 보유 응답 완료/실패와 상태 화면 노출을 구분한다. 후보·확인·소장·대출 가능·확인 불가 수·시간·오래된 정보와 requestId 기반 공식 사이트/길찾기 클릭을 연결했다. 공개 세션 visit과 schemaVersion2를 도입하고 개인/인증/구독·digest 경로 및 임의 URL 매개변수를 새 방문 계측에서 제외한다.

SQL은 같은 query·ISBN과 행동 순서를 확인한다. 7일 내 다른 세션 재방문과 D7 \[7,8일) 구간을 성숙한 브라우저 코호트에서 나눠 집계한다. CI 웹388·API243·Node237 및 실제 격리 PostgreSQL의 SQL6개/fixture 통과. 기존 API PG15개 생략과 새 SQL 실행을 구분한다. API/DB 스키마·예산·계정/요금·발송·최근 본 책 기능 변경 없음. 운영 수집 효과를 검증한 것은 아니며 실제 DB 시간 저장 기준과 배포 후 v2 수집 확인은 반영 시점 검증 항목이다.

- <https://github.com/chonghg22/nearbook/blob/1fbfaebc28ed0fce24bc8f944c2848ea5f3dc620/docs/analytics-runbook.md>
- <https://github.com/chonghg22/nearbook/blob/1fbfaebc28ed0fce24bc8f944c2848ea5f3dc620/docs/p2-02-core-analytics.md>

로드맵23개 기준 운영 완료18·사용자 보류1·검토 중2·미착수2다. 다음 미착수는 P2-03 SEO·공유 개선. P1-11 알림 개선 보류 유지. 아래 진행 집계는 당시 이력이다.

## 운영 반영 — 

P2-01 [PR23](https://github.com/chonghg22/nearbook/pull/23)을 병합하고 운영 반영했다. 웹 source `c48a91bbbd9a89f0027e8d680866bd00070f1a31`, Vercel production `dpl_5BGpMzDyCbKkd6DrDvVtUgqGwv6a` READY 및 운영 두 도메인 연결을 확인했다. 웹 안내·문서 변경으로 API CD는 없으며 API source `d619481242a89a3e39e68dcf848561def267a218`을 유지한다.

준비 상태·검색·도서관 direct/proxy 및 대표 책·도서관 SSR 총8개 HTTP200, canonical/공식 링크 계약 통과. 익명 개인 화면307 로그인 이동·개인 API401을 확인했다. 실제 계정 쓰기나 로그인 후 개인 화면 육안 검증은 하지 않았다. 최근 본 책 저장은 실험안이며 활성화하지 않았다. KAN-116 완료, 로드맵23개 기준 운영 완료18·사용자 보류1·검토 중1·미착수3. P1-15 PR22는 계속 검토 중/미병합, 다음은 P2-02다. 아래 10월19일 검토/미반영 문구는 배포 전 이력이다.

## 최신 상태 — 

로드맵23개 기준 운영 완료17·사용자 보류1·검토 중2·미착수3이다. P1-14 운영 source는 `d619481242a89a3e39e68dcf848561def267a218`다. P1-15 PR22와 P2-01 PR23은 CI 성공 후 검토 중이며 병합·운영 반영하지 않았다. 아래 10월12\~16 작업 집계와 최초 후속 기록은 당시 이력이다.

P2-01은 찜·내 도서관의 동작하지 않는 Pro 버튼/무제한 홍보를 무료 책10권·도서관1곳 한도와 목록 교체 안내로 바꿨다. 최근 본 책 opt-in·최대10권/30일·삭제/계정 경계·자동 병합 제외를 실험안으로 제안했으며 기능을 활성화하지 않았다. 요금·결제·기존 한도·발송·계정 동작은 변경하지 않았다. 다음 미착수 순서는 P2-02 행동 이벤트·핵심 지표다.

- <https://github.com/chonghg22/nearbook/pull/23>
- <https://github.com/chonghg22/nearbook/actions/runs/39233248557>
- <https://github.com/chonghg22/nearbook/blob/8797df92fc3b379329fb1c7e8fc635345548e1ed/docs/p2-01-return-policy.md>

PR23 head `8797df92fc3b379329fb1c7e8fc635345548e1ed`. 로컬 웹365·lint/type-check·format 통과. CI build/test 성공: 웹365·API243·Node237, 기존 실제 PostgreSQL15개는 생략됐다. Vercel preview 성공. PR22의28개 브라우저 E2E는 별도 CI 근거이며 PR23에서 실행한 것으로 합산하지 않는다. P1-11 알림 개선 보류 유지.

작성: 2026-10-19. 사용자 요청 계정: chonghg22. 개인 Atlassian 사이트의 KAN 프로젝트와 Confluence 공간(65824)을 MCP로 확인했다.

## 요약

검색 → 책 선택 → 가까운 도서관 확인 → 공식 사이트 이동/찜 → 재방문 흐름을 복구·개선했다. 로컬 TODO 기준23항목 중16개는 검증 후 운영 반영,1개는 사용자 지시로 보류,6개는 미착수다. 실제 Jira 전체 통계/완료율은 아니다.

마지막 검증된 배포는 P1-13(main `fb956109c9e4d44f27380b46565fd0b5b3e1f80f`,2026-10-16). 아래 상태는 과거 작업 근거를 정리한 것이며 2026-10-19 실시간 서비스 상태 보고가 아니다.

## 운영 반영 항목

| 로컬 ID | 결과 | 근거 |
| --- | --- | --- |
| P0-01 | 서버/브라우저 API 주소 정책·운영 경로 일치 | [PR4](https://github.com/chonghg22/nearbook/pull/4) |
| P0-02 | 404와 장애 구분·상세 부가 조회 분리·새 문서 재시도 | [PR4](https://github.com/chonghg22/nearbook/pull/4), [PR5](https://github.com/chonghg22/nearbook/pull/5) |
| P0-03 | 지도 목록·지역 중심 프록시·실패 대체/재시도 | [PR6](https://github.com/chonghg22/nearbook/pull/6) |
| P0-04 | 인기·분야·신착 및 실제 기간/수집 시각 안내 | [PR7](https://github.com/chonghg22/nearbook/pull/7) |
| P1-01 | 대출가능/대출중/미소장/조회불명·성공 관측 캐시 | [PR8](https://github.com/chonghg22/nearbook/pull/8) |
| P1-02 | 개인 페이지/API·대출 상태의 PWA 캐시 제외 | [PR9](https://github.com/chonghg22/nearbook/pull/9) |
| P1-03 | 공통 API client·계약·오류/빈 결과·운영시간/휴관일 | [PR10](https://github.com/chonghg22/nearbook/pull/10) |
| P1-04 | 홈 검색·ISBN 스캔·기준 지역·GPS 수동 대체 | [PR11](https://github.com/chonghg22/nearbook/pull/11) |
| P1-05 | 도서관 공식 사이트·길찾기 CTA | [PR12](https://github.com/chonghg22/nearbook/pull/12) |
| P1-06 | 검색 유형·정확도·ISBN 정규화·판본 표기 | [PR13](https://github.com/chonghg22/nearbook/pull/13) |
| P1-07 | 로컬 우선·제한된 배경 보충·total/페이지 정합성 | [PR14](https://github.com/chonghg22/nearbook/pull/14) |
| P1-08 | 사용자 선택 반경 확대·다른 지역/판본/공식 확인 대안 | [PR15](https://github.com/chonghg22/nearbook/pull/15) |
| P1-09 | 모바일 viewport/focus·ARIA/IME/키보드·설치 안내 | [PR16](https://github.com/chonghg22/nearbook/pull/16) |
| P1-10 | 찜·기본 도서관·저장 실패/중복 복구·실제 로그인 route 연결 | [PR17](https://github.com/chonghg22/nearbook/pull/17), [PR18](https://github.com/chonghg22/nearbook/pull/18) |
| P1-12 | 검증된500건/일 예산·DB 예약·경합/재시작·운영 상태 조회 | [PR19](https://github.com/chonghg22/nearbook/pull/19) |
| P1-13 | 캐시 통합·완성 인덱스 교체·PK 순환 재처리·인기 기준 유지 | [PR20](https://github.com/chonghg22/nearbook/pull/20) |

## 검증·배포 근거

- P1-13 로컬853개 = Node237 + Vitest365 + API251. API에는 실제 격리 PostgreSQL15개가 포함되어 모두 실행됐다.
- [CI36](https://github.com/chonghg22/nearbook/actions/runs/38850204320): 실행838개 통과,PG15개/2 suites 생략. 이를 실제 DB 테스트15개를 CI에서 실행한 것으로 표현하지 않는다.
- [API CD73](https://github.com/chonghg22/nearbook/actions/runs/38850514646): 성공,소스 revision 및 이미지 build/pull digest 일치. Vercel 운영 빌드도 Ready/두 도메인 연결 확인.
- 2026-10-16 운영 관측:13572건/22.549초 부팅 재색인,검색/상태/주요 페이지HTTP 정상·개인API 비로그인401. 13:30KST 자연 정기동기화2000건 성공. 전체 순환 완료·운영 최대메모리 검증은 아니다.
- 자동 회귀/격리 DB/HTTP 검사/사용자 화면 확인/실제 계정 쓰기를 구분한다. 모든 모바일 크기·OS·실제 로그인 쓰기 E2E가 완료됐다는 뜻은 아니다.

## 보류·다음 순서

| 항목 | 상태 | 다음 행동/제약 |
| --- | --- | --- |
| P1-11 이메일·푸시·알림 | 사용자 보류 | 기존 설정/동의/주기 유지. 별도 지시 전 실제 발송·새 작업 활성화 금지 |
| P1-14 준비 상태·배포·롤백 | 운영 완료 (PR21) | readiness와 liveness 분리,준비 후 교체,commit/digest 고정,실패 판정과 복구 절차 검증 |
| P1-15 핵심 회귀·E2E | 완료 (PR22 병합·E2E32) | 검색→책→도서관,외부 장애/GPS/카메라 거부,계정/오프라인 경계 보강. 실제 알림 발송 제외 |
| P2-01 재방문·요금 정책 | 운영 반영 완료 (PR23) | 제품 결정부터. 실제 결제/요금/한도 자동 변경 금지 |
| P2-02 행동 이벤트·핵심 지표 | 운영 반영 완료 (PR24) | 제출/실제 조회 완료·실패·공식 이동·재방문을 구분 |
| P2-03 SEO·공유 | 운영 반영 완료 (PR25) | 정상 콘텐츠의 canonical/sitemap/JSON-LD/OG 검증 |
| P2-04 유입 실험 | 진행 중 (사용자 직접 게시 예정) | 인스타 제작물 납품 완료·사용자 직접 게시 예정. 게시 URL/시각·운영 수집 확인 이후 관측 |

## 알려진 위험과 확인이 필요한 사항

- stop/remove/run 방식 API 교체 중502 발생 후 복구. CD 성공만으로 무중단/readiness/롤백이 마련됐다고 보지 않는다(P1-14).
- 정보나루 확인 한도는500건/일이다. 10월15일 장부644건,16일500건 차단 관측은 당시 값이며 오늘 잔여량이 아니다. 한도 증액/외부 동일 키 사용량/공급자 실제 잔여량은 별개다.
- 10월16일 `popularityPeriod:null`로 유효한 최신 전국 rank의 운영 양성은 확인하지 못했다. 원인/테이블 부재로 단정하지 않는다.
- 당시 월간 키워드는2026-04 자료였다. 정기 스케줄을 확인했지만 과거 실패 원인·이후 성공을 추정하지 않는다. 강제갱신 없음.
- 간헐적7\~15초 지연의 근본 원인은 확정하지 않았다. 단순 합성2만권 시험을 운영 p95/p99·최대RSS 보장으로 쓰지 않는다.

## Jira 작업 연결

에픽: [KAN-13](https://chonghg22-1791900037339.atlassian.net/browse/KAN-13). 아래 상태는 로컬 작업의 완료/계획 구분이며 Jira 워크플로 반영 결과는 동기화 manifest에서 재조회해 확인한다. 보류 전용 상태가 없는 워크플로에서는 P1-11을 `아이디어`와 `deferred` 라벨로 유지하고 완료 처리하지 않는다. 미착수도 `아이디어`와 `planned` 라벨로 구분한다.

| 작업 | Jira | 작업 구분 |
| --- | --- | --- |
| P0-01 | [KAN-101](https://chonghg22-1791900037339.atlassian.net/browse/KAN-101) | 운영 반영 완료 |
| P0-02 | [KAN-102](https://chonghg22-1791900037339.atlassian.net/browse/KAN-102) | 운영 반영 완료 |
| P0-03 | [KAN-103](https://chonghg22-1791900037339.atlassian.net/browse/KAN-103) | 운영 반영 완료 |
| P0-04 | [KAN-104](https://chonghg22-1791900037339.atlassian.net/browse/KAN-104) | 운영 반영 완료 |
| P1-01 | [KAN-105](https://chonghg22-1791900037339.atlassian.net/browse/KAN-105) | 운영 반영 완료 |
| P1-02 | [KAN-106](https://chonghg22-1791900037339.atlassian.net/browse/KAN-106) | 운영 반영 완료 |
| P1-03 | [KAN-107](https://chonghg22-1791900037339.atlassian.net/browse/KAN-107) | 운영 반영 완료 |
| P1-04 | [KAN-108](https://chonghg22-1791900037339.atlassian.net/browse/KAN-108) | 운영 반영 완료 |
| P1-05 | [KAN-109](https://chonghg22-1791900037339.atlassian.net/browse/KAN-109) | 운영 반영 완료 |
| P1-06 | [KAN-110](https://chonghg22-1791900037339.atlassian.net/browse/KAN-110) | 운영 반영 완료 |
| P1-07 | [KAN-111](https://chonghg22-1791900037339.atlassian.net/browse/KAN-111) | 운영 반영 완료 |
| P1-08 | [KAN-112](https://chonghg22-1791900037339.atlassian.net/browse/KAN-112) | 운영 반영 완료 |
| P1-09 | [KAN-113](https://chonghg22-1791900037339.atlassian.net/browse/KAN-113) | 운영 반영 완료 |
| P1-10 | [KAN-114](https://chonghg22-1791900037339.atlassian.net/browse/KAN-114) | 운영 반영 완료 |
| P1-11 | [KAN-115](https://chonghg22-1791900037339.atlassian.net/browse/KAN-115) | 사용자 보류 |
| P2-01 | [KAN-116](https://chonghg22-1791900037339.atlassian.net/browse/KAN-116) | 운영 반영 완료 (PR23) |
| P1-12 | [KAN-117](https://chonghg22-1791900037339.atlassian.net/browse/KAN-117) | 운영 반영 완료 |
| P1-13 | [KAN-118](https://chonghg22-1791900037339.atlassian.net/browse/KAN-118) | 운영 반영 완료 |
| P1-14 | [KAN-119](https://chonghg22-1791900037339.atlassian.net/browse/KAN-119) | 운영 반영 완료 |
| P1-15 | [KAN-120](https://chonghg22-1791900037339.atlassian.net/browse/KAN-120) | 완료 (PR22 병합·E2E32) |
| P2-02 | [KAN-121](https://chonghg22-1791900037339.atlassian.net/browse/KAN-121) | 운영 반영 완료 (PR24) |
| P2-03 | [KAN-122](https://chonghg22-1791900037339.atlassian.net/browse/KAN-122) | 운영 반영 완료 (PR25) |
| P2-04 | [KAN-123](https://chonghg22-1791900037339.atlassian.net/browse/KAN-123) | 진행 중 (사용자 직접 게시 예정) |

## 기록 원칙

기존 Jira·Confluence를 먼저 읽고 중복 생성 없이 갱신한다. 기존 이슈의 더 최신 결정·담당자·분류·하위 작업은 보존한다. 과거 완료 내용을 등록하더라도 Jira audit/created/resolved 날짜를 조작하지 않는다.

기존 [Nearbook 문서 아카이브](https://chonghg22-1791900037339.atlassian.net/wiki/spaces/~5e9a693934f7b90c0fd20d8d/pages/229425/08.nearbook)는 원문 84개와 ZIP의 목록이며 현재 구현 상태를 보증하지 않는다. 기존 [KAN-13](https://chonghg22-1791900037339.atlassian.net/browse/KAN-13)과 KAN-56\~67은 관리자 기능 중심의 별도 백로그다. 공개 웹 개선이 완료됐다는 이유로 관리자 빌드·TOTP·관리자 배포까지 완료 처리하지 않는다. 이 보고서와 운영 문서는 아카이브 아래에 추가하고 기존 회의록 초안은 보존한다.

## 후속 진행 — 

[P1-14 / KAN-119](https://chonghg22-1791900037339.atlassian.net/browse/KAN-119) 준비 상태·배포 판정·복구 절차를 운영 반영하고 완료 처리했다. [PR21](https://github.com/chonghg22/nearbook/pull/21), main `d619481242a89a3e39e68dcf848561def267a218`, [CI 성공](https://github.com/chonghg22/nearbook/actions/runs/39221049794) 및 [CD 성공](https://github.com/chonghg22/nearbook/actions/runs/39221389800). direct/proxy readiness의 source SHA와 DB·검색 준비·scheduler mode가 일치하고 대표 책·도서관 SSR/공식 링크까지 최종 GET 8건 HTTP200을 확인했다.

실제 로컬 Docker 격리 리허설에서 이전 컨테이너 복구와 성공 후 보존을 확인했다. 운영에서 고의 장애를 주입한 것은 아니며 교체 중 502 후 회복했다. 후보 확인 후 다시 기동하므로 무중단은 아니다. 상세 절차와 한계는 [운영 문서](https://chonghg22-1791900037339.atlassian.net/wiki/spaces/~5e9a693934f7b90c0fd20d8d/pages/393218/Nearbook)의 후속 기록을 참고한다.

[P1-15 / KAN-120](https://chonghg22-1791900037339.atlassian.net/browse/KAN-120) 핵심 회귀·브라우저 E2E 테스트에 착수했다. 현재 로드맵23개 기준 완료17·사용자 보류1·진행 중1·미착수4다. 본문 위의 완료16/미착수6은 10월12\~16 작업의 이관 당시 기록이다. P1-11 알림 개선 보류 유지.
