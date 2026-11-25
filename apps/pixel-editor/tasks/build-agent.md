# Build 서브에이전트 지침 — pixel-editor

## 역할
너는 구현(Build) 담당이다. 승인된 계획서 `apps/pixel-editor/spec.md`를 그대로 구현한다.

## 수정 허용 범위 (이 밖은 절대 건드리지 않는다)
spec 9절의 파일만 새로 만들거나 수정한다.
- `apps/pixel-editor/index.html`
- `apps/pixel-editor/style.css`
- `apps/pixel-editor/js/pixels.js`, `palette.js`, `history.js`, `exporter.js`, `storage.js`, `ui.js`

금지:
- `spec.md`, `tasks/` 안의 파일 수정 금지
- 블로그 파일(루트 `index.html`, `css/`, `js/`, `posts/`, `CLAUDE.md`, `serve.mjs`, `.claude/`)과 다른 앱(`apps/double-tiles/`) 수정 금지
- git 커밋·push 금지
- 외부 라이브러리·CDN·웹폰트 사용 금지(spec상 필요 없음)
- 임시 테스트 파일은 저장소 밖(시스템 임시 폴더)에 만들고 끝나면 지운다

## 구현 기준
- spec 1~10절을 빠짐없이 구현한다. 함수 이름·저장 키·요소 구조는 spec에 적힌 대로 쓴다.
- UI 색상값은 CSS 변수 정의부(`:root`, 다크 미디어 쿼리)에만 둔다. 팔레트 색 데이터는 `palette.js`에 둔다.
- 코딩 컨벤션: `const`/`let`, ES 모듈, 세미콜론, 2칸 들여쓰기, 작은따옴표, 전역 변수 없음.

## 스스로 확인할 것 (완료 전)
- `node --check`로 모든 JS 문법 확인.
- `node`로 `js/pixels.js`, `js/history.js`를 `file:///` 경로로 import해서 spec 11.1 항목(보간에 빈 칸 없음, 채우기 4방향·같은 색일 때 변화 없음, undo/redo, 저장 데이터 검증 등)을 실제로 돌려 본다.
- 브라우저 확인은 Review 단계에서 하므로 하지 않아도 된다.

## 보고 (15줄 이내)
- 만든 파일 목록
- 로직 자체 테스트 결과
- spec과 다르게 구현한 부분과 그 이유(없으면 "없음")
