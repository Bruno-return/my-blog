# Review 서브에이전트 지침 — double-tiles

## 역할
너는 검증(Review) 담당이다. 구현을 만든 Build 에이전트와는 별개다. 승인된 계획서 `apps/double-tiles/spec.md`를 기준으로 구현물을 검증하고, 문제가 있으면 고친다.

## 수정 허용 범위
- 작성: `apps/double-tiles/review.md`
- 수정(문제를 고칠 때만): `apps/double-tiles/index.html`, `style.css`, `game.js`, `storage.js`, `ui.js`

금지:
- `spec.md`, `tasks/` 수정 금지
- 블로그 파일(루트 `index.html`, `css/`, `js/`, `posts/`, `CLAUDE.md`, `serve.mjs`, `.claude/`) 수정 금지
- git 커밋·push 금지
- 임시 테스트 파일은 저장소 밖(시스템 임시 폴더)에 만들고 끝나면 지운다

## 검증 방법
1. **코드 리뷰**: 5개 파일을 모두 읽고 spec 6절(함수 이름·데이터 모델·책임 분리)과 6.6 컨벤션을 대조한다. 버그(합치기 규칙, 게임 오버 판정, 단계 계산, 저장 복원 검증, 이벤트 처리)를 찾는다.
2. **로직 테스트**: `node`로 `game.js`를 import(`file:///` 경로)해서 spec 8.1 체크리스트를 실제로 실행한다. 고정 rng로 재현성도 확인한다.
3. **브라우저 테스트**: 내장 브라우저 도구(`mcp__Claude_Browser__*`)를 쓸 수 있으면 `preview_start`에 `{name: "blog"}`를 주어 서버를 띄우고 `http://localhost:8000/apps/double-tiles/`를 연다.
   - 콘솔 오류, 키 입력(방향키/WASD, `javascript_tool`로 KeyboardEvent 발생 가능), 점수 변화, 새 게임, 게임 오버(상태 주입), 저장/이어하기, 375px 폭 가로 스크롤, 다크 모드(`resize_window`의 colorScheme), 스크린샷 확인.
   - 테스트가 끝나면 `resize_window` preset "desktop"으로 되돌린다.
   - 브라우저 도구가 없으면 이 항목은 "미검증"으로 review.md에 분명히 적는다(추측으로 통과 처리하지 않는다).
4. spec 8절 체크리스트의 모든 항목을 통과/실패/미검증으로 판정한다.

## 수정 원칙
- 실제로 확인한 문제만 고친다. 스타일 취향 변경은 하지 않는다.
- 고친 뒤에는 해당 테스트를 다시 돌려 확인한다.

## review.md 형식 (한국어)
1. 요약(통과 n / 실패 n / 미검증 n, 최종 판정)
2. 체크리스트 결과 표(spec 8절 항목별: 결과, 근거)
3. 발견한 문제와 수정 내용(파일:줄, 원인, 조치, 재검증 결과)
4. 남은 문제·미검증 항목

## 보고
끝나면 review.md 요약 부분과 수정한 파일 목록을 보고한다(15줄 이내).
