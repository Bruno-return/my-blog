---
title: CSS 박스 모델, 모든 요소는 상자예요
date: 2026-11-20
tags: [학습노트, css]
description: content, padding, border, margin 네 겹과 box-sizing: border-box가 왜 필요한지 이 블로그의 CSS로 정리했어요.
---

지난번에는 시맨틱 태그로 HTML 뼈대를 세웠어요. 이제 옷을 입힐 차례인데, CSS를 배우다 보면 제일 먼저 만나는 개념이 **박스 모델**이에요. 이 블로그의 `css/style.css`를 다시 읽어 보니 `padding`, `margin`, `border`가 거의 모든 규칙에 들어 있었어요.

한 줄로 줄이면 이래요.

> **화면의 모든 요소는 content → padding → border → margin 네 겹으로 된 상자**예요.

## 상자의 네 겹

요소 하나를 양파처럼 생각하면 쉬워요. 안쪽부터 바깥쪽으로 이렇게 감싸요.

```text
┌──────────── margin (바깥 여백) ────────────┐
│ ┌────────── border (테두리) ────────────┐ │
│ │ ┌──────── padding (안쪽 여백) ──────┐ │ │
│ │ │          content (내용)           │ │ │
│ │ └───────────────────────────────────┘ │ │
│ └───────────────────────────────────────┘ │
└───────────────────────────────────────────┘
```

이 블로그의 알림 상자(`.notice`)가 네 겹을 잘 보여 줘요.

```css
.notice {
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: 12px;
}
```

글자와 테두리 사이에 `20px`의 숨 쉴 공간(padding)이 있고, 그 바깥을 `1px` 선(border)이 감싸요.

배운 점:

- **padding은 상자 안쪽**이라 배경색이 칠해지고, **margin은 상자 바깥**이라 배경색이 칠해지지 않아요.
- `padding: 0 16px`처럼 값을 두 개 쓰면 "위아래, 좌우" 순서예요. 네 개면 시계 방향(위, 오른쪽, 아래, 왼쪽)이에요.

## box-sizing: border-box

`style.css` 맨 위쪽에는 이런 규칙이 있어요.

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}
```

처음엔 왜 있는지 몰랐는데, 없으면 계산이 꽤 귀찮아져요. 기본값인 `content-box`에서는 `width`가 **내용 부분만**의 너비라서, padding과 border가 그 위에 더해지거든요.

| box-sizing | `width: 200px; padding: 20px; border: 1px` | 실제 너비 |
|:-----------|:------------------------------------------|:----------|
| `content-box` (기본값) | 200 + 20×2 + 1×2 | **242px** |
| `border-box` | padding과 border가 200 안에 포함 | **200px** |

테마 버튼(`.theme-toggle`)은 `width: 44px; height: 44px`로 정해 두었는데, `border-box` 덕분에 padding을 바꿔도 **터치 대상 44×44px**이 그대로 유지돼요.

배운 점:

- `border-box`를 전체에 한 번 걸어 두면 "내가 쓴 width = 화면에 보이는 너비"가 돼서 생각하기 편해요.
- 모바일에서 가로 스크롤이 생기는 흔한 원인이 `width: 100%`에 padding이 더해지는 경우인데, 이것도 막아 줘요.

## margin으로 가운데 정렬하기

본문을 화면 가운데에 두는 `.container`는 박스 모델을 그대로 활용해요.

```css
.container {
  width: 100%;
  max-width: calc(var(--content-width) + var(--gutter) * 2);
  margin: 0 auto;
  padding: 0 var(--gutter);
}
```

- `max-width`로 상자가 너무 넓어지지 않게 막고,
- `margin: 0 auto`로 남는 좌우 공간을 똑같이 나눠 가운데에 두고,
- `padding: 0 var(--gutter)`로 좁은 화면에서도 글자가 화면 끝에 붙지 않게 `16px` 여백을 줘요.

`max-width`에 `--gutter * 2`를 더한 이유도 `border-box`예요. padding이 너비 안에 포함되니까, 그만큼 더해 줘야 글자가 들어갈 자리가 딱 `70ch`가 돼요.

배운 점:

- 위아래로 붙은 두 요소의 margin은 더해지지 않고 **큰 쪽 하나만 남아요**. 이걸 margin 상쇄(collapsing)라고 해요.
- 반대로 padding은 절대 상쇄되지 않아요.

## 마무리

박스 모델을 알고 나니 "왜 여기가 생각보다 넓지?" 하던 순간들이 대부분 padding과 border 계산 문제였다는 걸 알게 됐어요. 브라우저 개발자 도구의 요소 검사에서 상자 그림을 보면 네 겹이 색깔별로 나와서 확인하기도 쉬워요.

다음에는 이 상자들을 나란히 놓는 방법, **Flexbox**를 정리해 보려고 해요.
