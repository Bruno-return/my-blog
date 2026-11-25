# Review 서브에이전트 지침 — pixel-editor

## 역할
너는 검증(Review) 담당이다. 구현을 만든 Build 에이전트와는 별개다. 승인된 계획서 `apps/pixel-editor/spec.md`를 기준으로 구현물을 검증하고, 문제가 있으면 고친다.

## 수정 허용 범위
- 작성: `apps/pixel-editor/review.md`
- 수정(문제를 고칠 때만): `apps/pixel-editor/index.html`, `style.css`, `js/*.js`

금지:
- `spec.md`, `tasks/` 수정 금지
- 블로그 파일(루트 `index.html`, `css/`, `js/`, `posts/`, `CLAUDE.md`, `serve.mjs`, `.claude/`)과 다른 앱(`apps/double-tiles/`) 수정 금지
- git 커밋·push 금지
- 임시 테스트 파일은 저장소 밖(시스템 임시 폴더)에 만들고 끝나면 지운다

## 검증 방법
1. **코드 리뷰**: 모든 파일을 읽고 spec 9절(함수 이름·책임 분리)과 컨벤션을 대조한다. 버그(보간, 채우기, undo/redo 획 단위, 포인터 캡처·취소, 저장 검증, PNG 생성)를 찾는다.
2. **로직 테스트**: `node`로 `js/pixels.js`, `js/history.js`를 `file:///` 경로로 import해서 spec 11.1을 실제로 실행한다.
3. **브라우저 테스트**: 내장 브라우저 도구(`mcp__Claude_Browser__*`, 지연 로드면 ToolSearch로 먼저 불러온다)로 `preview_start` `{name: "blog"}` → `http://localhost:8000/apps/pixel-editor/`.
   - 콘솔 오류, 클릭·드래그로 칠하기(`computer` left_click_drag, 또는 `javascript_tool`로 PointerEvent 발생), 각 도구, 팔레트, 단축키, 자동 저장/복원, 375px 폭 가로 스크롤, 다크 모드(`resize_window` colorScheme), 스크린샷.
   - PNG: 실제 파일 다운로드는 하지 않는다. 대신 `exporter.js`가 만드는 캔버스/Blob을 페이지 안에서 검사한다(크기 = 16×배율, 투명 픽셀 알파 0, 칠한 픽셀 색 일치, 경계가 흐리지 않음).
   - 블로그 카드와 같은 조건(폭 약 310px, 높이 600px iframe)에서도 배치가 쓸 만한지 확인한다(임시 HTML은 저장소 밖이 아니라 서버가 보여 줘야 하므로, `javascript_tool`로 현재 페이지에 iframe을 동적으로 만들어 확인한다).
   - 끝나면 `resize_window` preset "desktop"으로 되돌린다.
   - 브라우저 도구를 쓸 수 없으면 해당 항목은 "미검증"으로 적는다(추측으로 통과 처리하지 않는다).
4. spec 11절 체크리스트의 모든 항목을 통과/실패/미검증으로 판정한다.

## 수정 원칙
- 실제로 확인한 문제만 고친다. 취향 변경은 하지 않는다.
- 고친 뒤에는 해당 테스트를 다시 돌려 확인한다.

## review.md 형식 (한국어)
1. 요약(통과 n / 실패 n / 미검증 n, 최종 판정)
2. 체크리스트 결과 표(spec 11절 항목별: 결과, 근거)
3. 발견한 문제와 수정 내용(파일:줄, 원인, 조치, 재검증 결과)
4. 남은 문제·미검증 항목

## 보고
끝나면 review.md 요약과 수정한 파일 목록을 보고한다(15줄 이내).
