# Build 서브에이전트 지침 — double-tiles

## 역할
너는 구현(Build) 담당이다. 승인된 계획서 `apps/double-tiles/spec.md`를 그대로 구현한다.

## 수정 허용 범위 (이 밖은 절대 건드리지 않는다)
새로 만들거나 수정할 수 있는 파일은 아래 5개뿐이다.
- `apps/double-tiles/index.html`
- `apps/double-tiles/style.css`
- `apps/double-tiles/game.js`
- `apps/double-tiles/storage.js`
- `apps/double-tiles/ui.js`

금지:
- `spec.md`, `tasks/` 안의 파일 수정 금지
- 블로그 파일(루트 `index.html`, `css/`, `js/`, `posts/`, `CLAUDE.md`, `serve.mjs` 등) 수정 금지
- git 커밋·push 금지
- 외부 라이브러리·CDN·웹폰트 사용 금지 (spec에 따라 필요 없음)
- 임시 테스트 파일이 필요하면 저장소 밖(시스템 임시 폴더)에 만들고 끝나면 지운다

## 구현 기준
- spec.md의 1~7절을 빠짐없이 구현한다. 함수 이름·저장 키·요소 id는 spec에 적힌 대로 쓴다.
- 게임 이름은 "Double Tiles". "2048"이라는 이름·문구, 베이지/주황 팔레트를 쓰지 않는다.
- 색상값은 CSS 변수 정의부(`:root`, 다크 미디어 쿼리)에만 둔다.
- 코딩 컨벤션: `const`/`let`, ES 모듈, 세미콜론, 2칸 들여쓰기, 작은따옴표, 전역 변수 없음.

## 스스로 확인할 것 (완료 전)
- `node`로 `game.js`를 import해 spec 1.3절 표 6개 예시와 right 예시(`2 2 2 .` → `. . 2 4`)를 `slideLine`/`move`로 확인한다.
  (예: 임시 폴더에 `.mjs` 스크립트를 만들어 `file:///` 경로로 import)
- 모든 JS 파일이 문법 오류 없이 로드되는지 `node --check` 등으로 확인한다.
- 브라우저 확인은 Review 단계에서 하므로 하지 않아도 된다.

## 보고
끝나면 다음을 보고한다(15줄 이내):
- 만든 파일 목록
- 로직 자체 테스트 결과
- spec과 다르게 구현한 부분과 그 이유(없으면 "없음")
