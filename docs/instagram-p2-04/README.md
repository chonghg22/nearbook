# Instagram 제작물과 실행 상태

계정: @jack.made.tools / 예산0원 / KAN-123 진행 중. 사용자 게시 승인과 계정 지정은 받았다. 현재 Instagram 사이트 접근이 브라우저 보안 승인에서 거절되어 **미게시**이며, 프로필 링크도 바꾸지 않았다. 실험14일 창은 실제 첫 게시 시각부터 시작한다.

- `captions.md`: 릴스·피드·스토리·프로필 링크 문안
- `reporting.md`, `readiness.sql`: 미측정과 관측값을 구분하는 절차/읽기 전용 사전 점검
- `results.csv`: 실제 게시 URL/시각·플랫폼 지표·웹 캠페인 지표 기록 템플릿
- `assets/region-public-20261020.png`: 이번 제작에 사용한 실제 공개 웹 화면. 개인정보/로그인 데이터 없음.

최종 업로드 파일은 작업 공간의 `nearbook-instagram-p2-04-20261020/` 폴더에 별도 출력했다. MP4와 생성 PNG는 제품 저장소/런타임에 포함하지 않는다. 폴더의 ZIP에는5장 피드·20초 릴스·표지·각 캡션·프로필 링크 사용 안내가 들어 있다.

## 재생성 (macOS 제작 도구)

AppleSDGothicNeo가 있는 macOS, Python3.10+에서 선택 제작 도구 Pillow/imageio-ffmpeg를 격리 환경에 설치하고 실행한다. 제품 의존성/lockfile은 변경하지 않는다.

```sh
python3 -m venv /tmp/nearbook-media
/tmp/nearbook-media/bin/pip install pillow imageio-ffmpeg
/tmp/nearbook-media/bin/python scripts/marketing/render-instagram.py \
  --screenshot docs/instagram-p2-04/assets/region-public-20261020.png \
  --output /tmp/nearbook-instagram-media
```

생성기는 피드 PNG5장, 릴스/표지/미리보기·기본 manifest를 만든다. ZIP과 캡션 파일은 문안에서 패키징한 납품물이다. 제작 검증 환경은 Pillow13.0.0·imageio-ffmpeg0.6.0(내장ffmpeg7.1)였다. 유료 음원·음성·스톡 사진을 쓰지 않았으며 자막·도형은 코드로 그렸다. 영상 속 화면은 스크린샷이며 실제 검색 조작 녹화로 표현하지 않는다.

## 이번 검증

- 피드5장1080×1350 PNG 유효성, MP41080×1920·30fps·20초·H.264/yuv420p/AAC 확인.
- 전체 영상 디코딩 성공, 주요 시점 프레임·피드·실제 화면 합성 육안 확인.
- results.csv 23개 컬럼 일치. 미게시·미측정은 빈칸으로 유지.
- 프로필/스토리 추적 URL을 읽기 전용 GET으로 확인. 브라우저 JavaScript를 실행하지 않아 실험 source로 가짜 방문을 만들지 않았다.
- 실제 Instagram 업로드 허용/잘림·사용자 프로필 링크·계정 지표는 사이트 접근이 거절되어 미검증이다.
- 운영 events 재조회와 UTC 저장 전제는 DBeaver 앱 사용 미승인으로 미검증이다. SQL을 실제 실행했다고 기록하지 않는다.

실제 게시·계측 검증·관측과 피드백을 바탕으로 개선을 결정하기 전까지 P2-04를 완료 처리하지 않는다. P1-11 알림 개선 보류, PR22 검토 상태는 유지한다.
