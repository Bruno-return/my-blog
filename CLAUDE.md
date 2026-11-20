# CLAUDE.md

이 파일은 이 저장소에서 작업하는 Claude Code에게 프로젝트 맥락과 규칙을 알려줍니다.

## 프로젝트 개요

마크다운(`.md`) 파일로 작성한 글을 읽어서 블로그 웹사이트로 보여주는 정적 사이트입니다.
글은 `posts/` 폴더에 마크다운으로 쓰고, 브라우저에서 JavaScript가 이를 불러와 HTML로 변환해 렌더링합니다.

## 핵심 원칙

- **프레임워크·빌드 도구 금지**: 순수 HTML, CSS, JavaScript(ES2020+)만 사용합니다.
  - React, Vue, Svelte, Tailwind, Bootstrap, jQuery 등 사용 금지
  - npm, 번들러(Webpack/Vite 등), 트랜스파일러 사용 금지
  - 마크다운 파서도 직접 구현합니다(`js/markdown.js`). 외부 라이브러리를 추가해야 할 이유가 생기면 먼저 사용자에게 물어봅니다.
- **디자인은 깔끔하고 읽기 좋게**: 장식보다 가독성이 우선입니다.
- **다크 모드 지원**: 시스템 설정을 따르고, 사용자가 직접 전환할 수도 있어야 합니다.
- **모바일 우선 반응형**: 작은 화면부터 설계하고 큰 화면으로 확장합니다.

## 디렉터리 구조

```
my-blog/
├── index.html          # 단일 진입점 (글 목록 + 글 상세를 모두 이 페이지에서 렌더링)
├── css/
│   └── style.css       # 전체 스타일 (CSS 변수로 라이트/다크 테마 정의)
├── js/
│   ├── app.js          # 라우팅, 글 목록/상세 렌더링, 초기화
│   ├── markdown.js     # 마크다운 → HTML 변환기 (front matter 파싱 포함)
│   └── theme.js        # 다크 모드 토글 및 저장
├── posts/
│   ├── index.json      # 글 목록 매니페스트 (파일명 목록)
│   └── *.md            # 블로그 글
├── assets/             # 이미지 등 정적 파일
├── serve.mjs           # 로컬 개발용 정적 서버 (Node, 의존성 없음)
├── import-obsidian.mjs # Obsidian '40 블로그' 폴더의 글을 posts/로 가져오기
└── .claude/launch.json # 데스크톱 앱 미리보기 설정
```

## 글 작성 규칙

각 글은 `posts/` 아래의 마크다운 파일이며, 맨 위에 YAML 형식의 front matter를 둡니다.

```markdown
---
title: 글 제목
date: 2026-11-16
tags: [javascript, 일상]
description: 목록에 표시될 한 줄 요약
---

본문 내용...
```

- 파일명은 slug로 쓰입니다: `posts/hello-world.md` → `#/post/hello-world`
- 브라우저는 폴더 목록을 읽을 수 없으므로, **새 글을 추가하면 반드시 `posts/index.json`에도 파일명을 추가**합니다.
  ```json
  ["hello-world.md", "second-post.md"]
  ```
- 글 목록은 front matter의 `date` 기준 최신순으로 정렬합니다. 날짜가 같으면 `index.json`에서 뒤에 있는 글이 먼저 옵니다. 그러니 새 글은 배열 맨 뒤에 추가합니다.

## 마크다운 파서 (`js/markdown.js`)

지원해야 할 문법:

- 제목 `#` ~ `######`, 문단, 줄바꿈
- **굵게**, *기울임*, ~~취소선~~, `인라인 코드`
- 링크 `[텍스트](url)`, 이미지 `![alt](src)`
- 순서 있는/없는 목록 (중첩 포함)
- 인용문 `>`
- 코드 블록 ```` ``` ```` (언어 표기는 `class="language-xxx"`로 남김)
- 수평선 `---`
- 표 (GFM 스타일)

구현 규칙:

- **보안**: 본문 텍스트는 반드시 HTML 이스케이프한 뒤 변환합니다. 코드 블록 안의 내용은 마크다운 변환을 하지 않습니다. `javascript:` 링크는 막습니다.
- 블록 단위 파싱 → 인라인 파싱 순서로 처리합니다.
- 외부에서 쓸 함수는 `parseFrontMatter(text)`와 `markdownToHtml(text)`로 통일합니다.
- 제목(`h2`, `h3`)에는 slug 기반 `id`를 붙여 앵커 링크가 가능하게 합니다.

## 라우팅

- 서버 설정 없이 GitHub Pages 같은 정적 호스팅에서도 동작하도록 **해시 라우팅**을 사용합니다.
  - `#/` → 글 목록
  - `#/post/{slug}` → 글 상세
  - `#/tag/{tag}` → 태그별 목록
- `hashchange` 이벤트로 화면을 다시 그리고, 페이지 이동 시 스크롤을 맨 위로 올리고 `document.title`을 갱신합니다.
- 존재하지 않는 글은 친절한 404 메시지를 보여줍니다.

## 디자인 가이드

### 타이포그래피
- 본문 폭: `max-width: 70ch` 정도로 한 줄이 너무 길지 않게
- 본문 글자 크기 `1.0625rem`(17px) 전후, 줄간격 `1.75` (한글 가독성 고려)
- 폰트: 시스템 폰트 스택 우선
  ```css
  font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard",
               "Noto Sans KR", "Malgun Gothic", sans-serif;
  ```
- 코드: `ui-monospace, SFMono-Regular, Consolas, monospace`
- 한글 줄바꿈: `word-break: keep-all; overflow-wrap: break-word;`

### 색상과 테마
- 모든 색상은 `:root`의 CSS 변수로 정의하고, 컴포넌트에서는 변수만 사용합니다. 하드코딩된 색상값 금지.
  ```css
  :root {
    --bg: #ffffff; --text: #1f2328; --muted: #656d76;
    --border: #e5e7eb; --accent: #2563eb; --code-bg: #f6f8fa;
  }
  [data-theme="dark"] {
    --bg: #0f1115; --text: #e6e6e6; --muted: #9aa4b2;
    --border: #2a2f3a; --accent: #6ea8fe; --code-bg: #171a21;
  }
  ```
- 다크 모드 동작:
  1. `localStorage`에 저장된 사용자 선택이 있으면 그것을 사용
  2. 없으면 `prefers-color-scheme`를 따름
  3. 헤더의 토글 버튼으로 전환, `<html data-theme="...">`에 반영
- 첫 화면 깜빡임(FOUC)을 막기 위해 테마 결정 스크립트는 `<head>`에서 인라인으로 먼저 실행합니다.
- 텍스트/배경 대비는 WCAG AA(4.5:1) 이상을 유지합니다.

### 레이아웃과 반응형
- 모바일 우선: 기본 스타일은 모바일 기준, `@media (min-width: 768px)`에서 확장
- 좌우 여백 최소 `16px`, 가로 스크롤이 생기면 안 됩니다.
- 이미지: `max-width: 100%; height: auto;`
- 코드 블록·표: 넘칠 경우 해당 요소 안에서만 `overflow-x: auto`
- 터치 대상(버튼·링크)은 최소 `44×44px`
- `<meta name="viewport" content="width=device-width, initial-scale=1">` 필수

### 구성 요소
- **헤더**: 블로그 이름(홈 링크) + 다크 모드 토글
- **글 목록**: 제목, 날짜, 요약, 태그를 카드 또는 리스트로 표시
- **글 상세**: 제목, 날짜, 태그, 본문, 하단에 "목록으로" 링크
- **푸터**: 간단한 저작권 표시

## 코딩 컨벤션

- JavaScript: `const`/`let`만 사용, ES 모듈(`<script type="module">`) 사용, 세미콜론 사용
- 들여쓰기 2칸, 문자열은 작은따옴표
- 전역 변수 만들지 않기
- `fetch` 실패 시 사용자에게 보이는 에러 메시지를 표시
- 시맨틱 HTML 사용: `<header>`, `<main>`, `<article>`, `<nav>`, `<footer>`, `<time datetime="...">`
- 접근성: 이미지 `alt`, 토글 버튼 `aria-label`, 키보드 포커스 표시(`:focus-visible`) 유지
- CSS 클래스명은 소문자-하이픈 (`post-list`, `post-meta`)

## 로컬 실행

`fetch`와 ES 모듈을 쓰기 때문에 `index.html`을 더블클릭(`file://`)하면 동작하지 않습니다. 반드시 로컬 서버로 실행합니다.

```bash
node serve.mjs
```

그 다음 브라우저에서 `http://localhost:8000` 을 엽니다.

- `serve.mjs`는 의존성 없는 개발용 정적 서버입니다(Node만 필요, npm 설치 없음). 배포 대상이 아닙니다.
- 포트를 바꾸려면 `node serve.mjs 3000`
- Python이 있다면 `python -m http.server 8000`도 됩니다.
- Claude Code 데스크톱 앱에서는 `.claude/launch.json`의 `blog` 설정으로 미리보기를 엽니다.

## Obsidian에서 글 가져오기

글은 Obsidian 보관함(`C:\Users\master\OneDrive\문서\Obsidian Vault`)의 `40 블로그` 폴더에서도 씁니다.
사용자가 "블로그 글 올려줘", "Obsidian 글 가져와줘"라고 하면 아래 순서로 진행합니다.

```bash
node import-obsidian.mjs --dry-run
```

```bash
node import-obsidian.mjs
```

- 먼저 `--dry-run`으로 올라갈 글을 확인하고, 결과를 사용자에게 보여준 뒤 실제로 실행합니다.
- `draft`가 체크되지 않은(`true`가 아닌) 노트만 `posts/{slug}.md`로 옮기고, `index.json` 맨 뒤에 등록합니다. 그다음 원본 노트의 `draft`를 `true`로 바꿉니다.
- 노트 속성 → 블로그 front matter: 노트 제목 → `title`, `날짜` → `date`, `요약` → `description`, `블로그태그` → `tags`, `slug` → 파일 이름.
  - 보관함의 `tags`(상태/·분야/)는 블로그에 쓰지 않습니다.
- 가져온 글에는 `source: obsidian`이 붙습니다.
  - 같은 slug면 이 표시가 있는 글만 덮어써서 갱신합니다.
  - 직접 쓴 글과 slug가 겹치면 건너뜁니다.
- Obsidian 문법 변환:
  - `[[노트]]`: 블로그에 있는 글이면 링크로 바꾸고, 없으면 글자만 남깁니다.
  - `![[이미지]]`: `assets/`로 복사합니다.
  - `%%주석%%`, `<!-- -->`: 지웁니다.
  - 콜아웃: 굵은 제목이 있는 인용문으로 바꿉니다.
  - `==하이라이트==`: 굵게 바꿉니다.
- 원본 노트는 이 스크립트로만 바꿉니다. 그 밖의 보관함 파일은 수정하지 않습니다.

## 이미지 경로

- 글 안의 이미지는 `assets/`에 두고, 글 파일 기준 상대 경로 `../assets/파일.png`로 씁니다.
- 다른 글로 가는 링크는 `[제목](other-post.md)`처럼 쓰면 `#/post/other-post`로 바뀝니다.

## 변경 후 확인 사항

- 라이트/다크 모드 모두에서 글 목록과 글 상세 화면이 정상적으로 보이는지
- 모바일 폭(375px)에서 가로 스크롤이 생기지 않는지
- 새 글이 `posts/index.json`에 등록되어 목록에 나타나는지
- 브라우저 콘솔에 에러가 없는지
