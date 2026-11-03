# P2-03 운영 반영 검증 — 2026-10-20

[PR25](https://github.com/chonghg22/nearbook/pull/25) 병합·운영 반영 완료. 웹 main/source는 `56f523988823b3c2aeee959cf6e00bf7af965f06`, 구현 head는 `b62d0d793be0e51978084e49ac96efa4ef800dcc`다. Vercel production `dpl_GRQH9hjRDnKecKLcMDzMvbfYtzR2` / `nearbook-i4bwntfoo-chonghg22s-projects.vercel.app` READY. Vercel 목록의 source SHA와 www/apex inspect의 배포 ID를 각각 확인했다. API CD 변경 없이 API d619481을 유지하며 마지막 CD39221389800 성공 상태를 확인했다.

## 운영 결과

- `/regions`: 200, 시도17개 링크, self canonical·OG URL·index/follow.
- `/region/seoul?source=codex-p203-deploy-20261020`: 200, 서울352개 실제 도서관 anchor, query 없는 canonical. 화면 목록과 CollectionPage/ItemList URL·항목 수 일치.
- `/region/gangwon` 51개, `/region/sejong` 10개로 같은 계약 확인. 수치는 이 검증 시점의 등록 목록이다. 전체 지역별 URL을 모두 개별 조회한 것은 아니다.
- 정상 책9791161571195·도서관111314 상세 SSR200·self canonical·index/follow·각 entity 확인. 책의 실제 알라딘 표지가 OG에 유지되고 도서관은 공용 공유 카드·지역 탐색 링크를 제공한다.
- `/region/invented`: 404/noindex, 정상 지역 CollectionPage 미출력. `/search?q=SEO`: noindex/follow.
- `robots.txt`: 공개 검색엔진 허용·운영 sitemap 주소, 기존 AI 크롤러 그룹의 별도 차단 유지.
- `sitemap.xml`: 200, 총2,243 URL. /regions 및 실제 시도17개 포함, 검색 제외.
- 공유 PNG1200×630·55,005bytes, Content-Type image/png 및 검증 소스 asset과 바이트 일치.
- apex `https://near-book.com/region/seoul`은 기존307로 www 동일 경로에 이동한다. 초기 harness의 redirect:error 설정을 이 정상 도메인 이동과 구분하고 명시적으로 검증했다.

## 핵심 경로와 브라우저

direct/proxy 준비 상태·검색 제안·도서관 API GET6건200. DB/검색 준비·schedulerEnabled true·API revision d619481 일치. 모니터는 저장 메타데이터 읽기만 실행했고 새 지역/상세 HTML 검증과 구분했다.

실제 익명 Chromium1280/390px에서 지역 선택→서울 상세와352개 링크, 가로 넘침 없음·pageerror0을 확인하고 스크린샷을 육안 검토했다. 브라우저의 모든 POST(analytics 포함)와 외부 위젯/광고 요청을 차단했다. 개인 계정 로그인·쓰기, 이메일/푸시, 강제 데이터 갱신·예산 변경은 하지 않았다. 운영에 고의 장애를 주입하지 않았으며, 오류/부분 응답→회복은 배포 전 격리 fixture에서 검증했다.

## 추적과 한계

[최종 CI39375734121](https://github.com/chonghg22/nearbook/actions/runs/39375734121) 성공: 웹402·API243·Node237·격리 PostgreSQL SQL6개. 기존 API 실제 PG15개는 생략했다. 이는 새 DB 스키마/데이터 변경이 아니다.

KAN-122 완료, Confluence458753 v8 게시·재조회. 로드맵23개 기준 운영 완료20·사용자 보류1·검토1(PR22)·미착수1(P2-04). P1-11 보류 및 PR22 OPEN/미병합 유지.

검색엔진 실제 색인·순위나 외부 공유 서비스 캐시 갱신은 이번 smoke로 보장하지 않는다. 시군구 전용 URL은 생성하지 않았다. P2-02에서 남은 events 행 재조회/운영 DB TimeZone 확인도 별개다.

근거: /private/tmp/nearbook-p203-prod-seo-smoke.json, prod-monitor.log, prod-browser.json 및 prod-1280.png/prod-390.png, 배포/alias inspect JSON. 로그·쿠키·자격증명 원문은 외부 문서에 게시하지 않았다.
