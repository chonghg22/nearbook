# P2-04 Instagram 실험 준비 — 2026-10-20

최신: 사용자가 Instagram 게시는 직접 진행한다고 확정했다. 납품 패키지로 수동 게시하며, 게시 URL·시각은 아직 미전달이다. 자동 게시나 프로필 수정은 진행하지 않는다. 아래 접근 거절 기록은 이전 자동 게시 시도의 이력이다.

계정 @jack.made.tools, 예산0원. 사용자 게시 승인 확보. [PR26](https://github.com/chonghg22/nearbook/pull/26) head34ac3ad10dd7d47cae8928bd413134bf51204cc4, [CI39383183120](https://github.com/chonghg22/nearbook/actions/runs/39383183120)·preview 성공. 제품 코드/lockfile 변경·운영 배포 없음.

피드5장1080×1350, 릴스20초1080×1920/30fps/H.264/AAC 무음, 표지·캡션·프로필/스토리 링크·CSV 제작 완료. 전체 영상 디코딩·주요 시점 프레임/이미지 육안 확인, PNG5장 유효성, CSV23개 컬럼, source URL2개 GET200/canonical 검증. 실제 공개 지역 화면을 사용했다. 생성기는 독립 worktree nearbook-p2-04 및 PR26의 scripts/marketing/render-instagram.py에 있다.

납품 폴더: /Users/jack/local/nearbook-instagram-p2-04-20261020
- nearbook-instagram-upload-kit.zip (2,018,544bytes)
- nearbook-reel-20s.mp4 / reel-cover.png
- feed-01.png~feed-05.png / feed-caption.txt / reel-caption.txt / README.txt

상태는 미게시·실험 미시작이다. 브라우저 보안 승인에서 instagram.com 접근이 거절됐다(도구 사유: 사용자가 사이트 접근 승인을 거절함). 다른 브라우저/API 등으로 우회하지 않았고 프로필 링크도 변경하지 않았다. DBeaver 앱 접근은 사용 미승인으로 거절되어 실제 events 저장 행/DB 시간 기준도 미확인이다. readiness.sql은 운영 실행하지 않았다. 승인 여부와 도구 접근 제한을 구분한다.

프로필 링크: https://www.near-book.com/?source=instagram-bio-p204-20261020
스토리 링크: https://www.near-book.com/?source=instagram-story-p204-20261020

웹 전환은 공통 프로필 유입 단위, 게시물별 반응은 실제 제공되는 Instagram 지표로 구분한다. 실제 게시 permalink/UTC 시각·운영 저장 확인 이후14일 관측, 마지막 유입의 성숙한7일/D7 재방문·피드백 판단이 남았다. KAN-123 진행 중, Confluence458753 v9 게시/재조회. 완료20·보류1·검토1(PR22)·진행1·미착수0. 웹56f5239/API d619481, P1-11 보류 유지.
