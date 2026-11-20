---
title: 시맨틱 태그, 뜻이 있는 HTML
date: 2026-11-19
tags: [학습노트, html, 접근성]
description: div 대신 header, main, article, nav, time 같은 시맨틱 태그를 쓰면 무엇이 좋은지 이 블로그 코드로 정리했어요.
---

지난번 글에서 "HTML은 뼈대"라고 정리했어요. 그런데 뼈대를 세울 때도 아무 재료나 쓰면 안 되더라고요. 이 블로그 코드를 다시 읽어 보니 `<div>` 대신 `<header>`, `<main>`, `<article>` 같은 태그가 곳곳에 있었어요. 이런 걸 **시맨틱 태그**라고 해요.

한 줄로 줄이면 이래요.

> **시맨틱 태그는 "어떻게 보이나"가 아니라 "이게 무엇인가"를 알려 주는 태그**예요.

## div와 시맨틱 태그의 차이

`<div>`와 `<header>`는 화면에서 똑같이 보여요. 둘 다 그냥 상자예요. 차이는 **브라우저와 다른 프로그램이 받아들이는 뜻**에 있어요.

```html
<!-- 뜻이 없는 상자 -->
<div class="header">...</div>

<!-- "이건 머리글이에요"라고 알려 주는 상자 -->
<header class="site-header">...</header>
```

사람은 클래스 이름 `header`를 보고 짐작할 수 있지만, 화면 낭독기나 검색 엔진은 클래스 이름을 믿지 않아요. 태그 이름을 보고 판단해요.

배운 점:

- 시맨틱 태그를 쓴다고 모양이 바뀌지는 않아요. 모양은 여전히 CSS가 맡아요.
- 딱 맞는 시맨틱 태그가 없을 때만 `<div>`나 `<span>`을 써요.

## 이 블로그의 페이지 뼈대

`index.html`의 `<body>`는 세 구역으로 나뉘어 있어요.

```html
<header class="site-header">
  <a class="site-title" href="#/">My Blog</a>
  <button class="theme-toggle" type="button" aria-label="다크 모드로 전환">...</button>
</header>

<main id="app" class="container" tabindex="-1">
  <p class="status">불러오는 중…</p>
</main>

<footer class="site-footer">...</footer>
```

화면 낭독기는 이 태그들을 **랜드마크**로 인식해요. 그래서 사용자가 단축키 하나로 "본문으로 바로 가기"를 할 수 있어요. 맨 위에 있는 `본문으로 건너뛰기` 링크가 `#app`, 즉 `<main>`을 가리키는 것도 같은 이유예요.

배운 점:

- `<main>`은 한 페이지에 **하나만** 써요.
- `<header>`와 `<footer>`는 페이지 전체뿐 아니라 글 하나 안에서도 쓸 수 있어요.

## 글 하나를 감싸는 article과 time

글 상세 화면은 `js/app.js`가 그려요. 여기서도 시맨틱 태그가 여러 개 나와요.

```javascript
app.innerHTML = `
  <article class="post">
    <header class="post-header">
      <h1 class="post-title">${escapeHtml(post.title)}</h1>
      ${metaHtml(post)}
    </header>
    <div class="post-content">${content}</div>
  </article>
  <nav class="post-nav" aria-label="이전 글과 다음 글">...</nav>`;
```

`<article>`은 **따로 떼어 내도 말이 되는 덩어리**에 써요. 블로그 글 한 편, 글 목록의 카드 하나가 딱 그래요. 글 안에 `<header>`가 또 있는 것도 눈여겨볼 점이에요.

날짜는 `<time>` 태그로 감싸요.

```javascript
`<time datetime="${escapeHtml(post.date)}">${escapeHtml(post.dateLabel)}</time>`
```

화면에는 사람이 읽기 좋은 날짜를 보여 주고, `datetime` 속성에는 `2026-11-19`처럼 기계가 읽기 좋은 형식을 넣어요.

배운 점:

- `<nav>`가 여러 개일 때는 `aria-label`로 이름을 붙여 구분해요.
- `<time datetime="...">` 하나로 사람과 기계 모두 날짜를 정확히 이해해요.

## 자주 쓰는 시맨틱 태그 정리

| 태그 | 뜻 | 이 블로그에서 |
|:-----|:---|:--------------|
| `<header>` | 머리글 | 사이트 제목·테마 버튼, 글 제목·날짜 |
| `<main>` | 페이지의 핵심 내용 | 글 목록이나 글 상세가 그려지는 곳 |
| `<article>` | 독립된 글 한 편 | 글 상세, 목록의 글 카드 |
| `<nav>` | 이동 링크 모음 | 이전 글 / 다음 글 |
| `<time>` | 날짜와 시간 | 글 작성일 |
| `<footer>` | 바닥글 | 저작권 표시 |

## 마무리

시맨틱 태그는 눈에 보이는 변화가 없어서 처음엔 대충 넘기기 쉬워요. 하지만 화면을 볼 수 없는 사람, 검색 엔진, 그리고 나중에 코드를 다시 읽을 나 자신에게 "여기가 무엇인지" 알려 주는 표지판이에요.

다음에는 이 뼈대에 옷을 입히는 첫 단계인 **CSS 박스 모델**을 정리해 보려고 해요.
