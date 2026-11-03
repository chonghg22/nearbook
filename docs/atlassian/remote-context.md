# Atlassian에서 확인한 Nearbook 맥락

조회: 2026-10-19, Atlassian MCP. 대상은 chonghg22 개인 사이트/KAN/개인 공간 65824다. 문서 읽기·기록 동기화이며 앱·서버·DB 설정 변경은 아니다.

## 기존 문서

- [08.nearbook — 문서 목록과 원문](https://chonghg22-1791900037339.atlassian.net/wiki/spaces/~5e9a693934f7b90c0fd20d8d/pages/229425), pageId `229425`, version 1, 원격 생성 2026-10-18. 원문 84개와 ZIP의 제목·목차 목록을 읽었다. ZIP 내부 전체 파일을 내려받거나 검증한 것은 아니다.
- [2026-10-18 회의록](https://chonghg22-1791900037339.atlassian.net/wiki/spaces/~5e9a693934f7b90c0fd20d8d/pages/131081), pageId `131081`, draft version 1 / draft snapshot `d1:2`. 템플릿 초안으로 확인했으며 수정·게시하지 않았다. 공유 토큰은 보관하지 않는다.
- 해당 공간 콘텐츠의 `metadata.hasSpaceInstructions=false` 확인. 별도 공간 작성 지침은 없었다.

## 가져와서 활용할 정보

아카이브에는 기존 관리자 워크스페이스 문서와 공개 웹 기획·운영 문서가 함께 있다. 다음 작업 시 필요한 원문만 확인하며 목차를 구현 증거로 사용하지 않는다.

| 작업 | 참고할 아카이브 원문 경로 | 적용 방식 |
| --- | --- | --- |
| P1-14 readiness·배포·복구 | `nearbook_docs/specs/02_architecture/04_deployment.md`, `specs/08_ops/01_monitoring.md`, `04_backup.md` | 과거 Hetzner 설계와 현행 Oracle Docker를 구분하고 현재 workflow/검증 기록 우선 |
| P1-15 E2E | `nearbook_docs/specs/04_pages`, `specs/05_api`, `specs/08_ops/02_security.md` | 오래된 라우트/스택을 현재 코드와 대조. 실제 계정 변경·발송은 별도 범위 |
| P2-02 계측 | `nearbook/docs/analytics-runbook.md`, `nearbook_docs/specs/01_business/03_success_metrics.md` | 제출과 실제 조회 완료를 구분하는 최신 요구사항과 대조 |
| P2-03 SEO | `nearbook/docs/plan/seo-growth.md`, `nearbook_docs/specs/06_seo` | 오류/noindex 정책을 유지하고 현재 정상 콘텐츠로 검증 |
| P2-04 유입 | `nearbook/docs/promotion-experiment-plan.md` | 참고 계획일 뿐 외부 게시·비용 집행 권한이 아님 |

위 경로의 **목록만 확인**했다. 원문에 적힌 설정을 자동 적용하거나 초기 스택/정책을 최신 결정으로 가져오지 않았다. 자격증명 가능성이 있는 ZIP·서버 접근 문서는 일괄 복사하지 않았다.

## 기존 Jira 백로그와 이번 작업의 경계

[KAN-13](https://chonghg22-1791900037339.atlassian.net/browse/KAN-13)과 다음 12개 이슈의 본문·상태를 조회했다. 조회 시 모두 `아이디어`였다. 공개 웹 고도화와 같지 않으므로 기존 상태·담당자는 보존한다.

| 이슈 | 기존 범위 | 이번 판단 |
| --- | --- | --- |
| [KAN-56](https://chonghg22-1791900037339.atlassian.net/browse/KAN-56) | 관리자 의존성/빌드 | 별도 확인 필요 |
| [KAN-57](https://chonghg22-1791900037339.atlassian.net/browse/KAN-57) | admin API 타입/쿼리/실행 | 공개 API 회귀 통과로 완료 판정하지 않음 |
| [KAN-58](https://chonghg22-1791900037339.atlassian.net/browse/KAN-58) | 관리자 목록 검색/필터/페이지네이션 | 미검증 |
| [KAN-59](https://chonghg22-1791900037339.atlassian.net/browse/KAN-59) | 공지 저장 UX | 미검증 |
| [KAN-60](https://chonghg22-1791900037339.atlassian.net/browse/KAN-60) | 피드백 이력/운영 메모 후보 | 정책 검토 후보 유지 |
| [KAN-61](https://chonghg22-1791900037339.atlassian.net/browse/KAN-61) | 알림 운영 액션 후보 | P1-11과 범위 차이 있음. 사용자 발송 개선 보류를 우회하지 않음 |
| [KAN-62](https://chonghg22-1791900037339.atlassian.net/browse/KAN-62) | Vercel 환경/도메인 전략 | 관리자 문맥과 공개 웹 연결 검증 구분 |
| [KAN-63](https://chonghg22-1791900037339.atlassian.net/browse/KAN-63) | 모바일 운영 화면 | 공개 웹 모바일 P1-09와 구분 |
| [KAN-64](https://chonghg22-1791900037339.atlassian.net/browse/KAN-64) | 분석 차트 후보 | P2-02 계측과 동일 구현으로 보지 않음 |
| [KAN-65](https://chonghg22-1791900037339.atlassian.net/browse/KAN-65) | 관리자 감사 테이블 후보 | DB 변경 미수행 |
| [KAN-66](https://chonghg22-1791900037339.atlassian.net/browse/KAN-66) | 관리자 계정 migration/로그인/TOTP E2E | 적용·초기 관리자·E2E 미검증. migration 자동 실행 금지 |
| [KAN-67](https://chonghg22-1791900037339.atlassian.net/browse/KAN-67) | 과거 배포 체크리스트 | 공개 웹/API 배포 근거와 readiness/rollback 미완료를 분리해 보완 |

## 다음 시작점

공개 서비스의 다음 순서는 P1-14 → P1-15다. P1-11은 사용자 보류다. 관리자 백로그는 별도 우선순위 결정 전 자동 착수하지 않는다. [동기화 manifest](sync-manifest.json)의 실제 Jira 매핑을 먼저 확인하여 같은 로컬 ID를 다시 생성하지 않는다.
