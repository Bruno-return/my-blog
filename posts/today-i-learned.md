---
title: 오늘 배운 것
date: 2026-11-16
tags: [블로그, html, css, javascript]
description: 클로드 코드로 블로그를 만들면서 배운 HTML, CSS, JavaScript의 역할을 정리했어요.
---

오늘은 클로드 코드와 함께 이 블로그를 처음부터 만들었어요. 프레임워크 없이 HTML, CSS, JavaScript만 썼는데, 덕분에 세 가지가 각각 무슨 일을 하는지 또렷하게 보였어요.

한 줄로 줄이면 이래요.

> **HTML은 뼈대, CSS는 옷, JavaScript는 움직임**이에요.

## HTML — 뼈대

HTML은 페이지에 **무엇이 있는지**를 정해요. 제목, 문단, 링크, 버튼 같은 내용과 그 구조를 적는 언어예요.

이 블로그의 `index.html`은 아주 짧아요. 머리글, 본문 자리, 바닥글만 있어요.

```html
<header class="site-header">...</header>
<main id="app">불러오는 중…</main>
<footer class="site-footer">...</footer>
```

배운 점:

- `<div>`만 쓰지 않고 `<header>`, `<main>`, `<article>`, `<time>`처럼 **뜻이 있는 태그**를 쓰면, 화면 낭독기나 검색 엔진도 구조를 이해할 수 있어요.
- 휴대폰에서 제대로 보이려면 `<meta name="viewport">` 한 줄이 꼭 필요해요.

## CSS — 옷

CSS는 페이지가 **어떻게 보이는지**를 정해요. 색, 글꼴, 여백, 배치를 맡아요.

가장 인상 깊었던 건 **CSS 변수**예요. 색을 한곳에 모아 두고 테마에 따라 값만 바꾸면, 다크 모드가 거의 저절로 돼요.

```css
:root {
  --bg: #ffffff;
  --text: #1f2328;
}

[data-theme="dark"] {
  --bg: #0f1115;
  --text: #e4e6eb;
}

body {
  background: var(--bg);
  color: var(--text);
}
```

배운 점:

- 한글은 `word-break: keep-all`을 주면 단어 중간에서 줄이 바뀌지 않아 훨씬 읽기 편해요.
- 본문 폭을 `70ch` 정도로 제한하면 한 줄이 너무 길어지지 않아요.
- 작은 화면 기준으로 먼저 만들고 `@media (min-width: 768px)`로 큰 화면을 다듬는 게 **모바일 우선** 방식이에요.

## JavaScript — 움직임

JavaScript는 페이지가 **어떻게 반응하는지**를 정해요. 데이터를 불러오고, 화면을 바꾸고, 클릭에 응답해요.

이 블로그에서 JavaScript가 하는 일은 세 가지예요.

1. **글 불러오기**: `fetch`로 `posts/` 폴더의 마크다운 파일을 읽어요.
2. **마크다운 변환**: 직접 만든 변환기로 `**굵게**` 같은 문법을 HTML로 바꿔요.
3. **화면 전환**: 주소의 `#/post/...` 부분을 보고 목록이나 글 상세를 그려요.

다크 모드 버튼도 JavaScript예요. 버튼을 누르면 `<html>`의 `data-theme` 값만 바꾸고, 나머지는 CSS 변수가 알아서 처리해요.

```javascript
button.addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  localStorage.setItem('theme', next); // 다음에 와도 기억하기
});
```

배운 점:

- 본문 글자를 HTML로 바꿀 때는 먼저 **이스케이프**해야 해요. 안 그러면 글에 쓴 `<script>`가 실제로 실행될 수 있어요.
- `index.html`을 더블클릭해서 열면 `fetch`가 막혀요. 그래서 `node serve.mjs` 같은 **로컬 서버**가 필요해요.

## 세 가지가 함께 일하는 방식

| 역할 | 담당 | 이 블로그에서 |
|:-----|:-----|:--------------|
| 무엇이 있나 | HTML | 머리글, 본문 자리, 바닥글 |
| 어떻게 보이나 | CSS | 색, 글꼴, 다크 모드, 모바일 배치 |
| 어떻게 움직이나 | JavaScript | 글 불러오기, 마크다운 변환, 화면 전환 |

셋을 나눠 두니 고칠 곳을 찾기도 쉬웠어요. 제목 색을 바꿀 때는 CSS 한 줄만 고치면 됐거든요.

다음에는 이 블로그에 글 검색 기능을 넣어 보고 싶어요.
