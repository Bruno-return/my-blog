# Pixel Editor (픽셀 에디터) — 기획서 (spec.md)

> 위치: `apps/pixel-editor/` · 순수 HTML/CSS/JavaScript(ES 모듈) · 빌드 도구/npm/외부 라이브러리 없음(CDN도 쓰지 않음)
> 로컬 실행: 저장소 루트에서 `node serve.mjs` → `http://localhost:8000/apps/pixel-editor/`

---

## 1. 개요와 기능 목록

### 1.1 개요
16×16 격자에 한 칸씩 색을 찍어 도트 그림을 그리고, 다 그리면 투명 배경 PNG로 저장하는 작은 에디터다. 블로그 메인의 iframe 카드(약 310×600px)에서도, 휴대폰에서도, 데스크톱에서도 바로 쓸 수 있게 만든다.

### 1.2 필수 기능
| # | 기능 | 요약 |
|---|---|---|
| F1 | 16×16 캔버스 | 클릭/탭으로 한 칸 칠하기, 누른 채 드래그로 연속 칠하기(마우스·터치·펜, Pointer Events) |
| F2 | 드래그 보간 | 포인터가 빠르게 움직여도 지나간 칸이 비지 않게 직선 보간(3.2절) |
| F3 | 색상 팔레트 | 기본 16색 + 사용자 지정 색(`<input type="color">`), 현재 색 표시 |
| F4 | 지우개 | 칸을 투명(`null`)으로 되돌림 |
| F5 | 전체 지우기 | 모든 칸을 투명으로. 되돌리기로 복구 가능하므로 확인 대화상자 없음 |
| F6 | PNG 저장 | 투명 배경 유지, 배율 1×/8×/16×/32× 선택(기본 16× = 256×256px), 스무딩 없음 |

### 1.3 선택 기능 — 이번 범위에 **넣는 것**
| # | 기능 | 넣는 이유 |
|---|---|---|
| O1 | 되돌리기/다시 실행 | 작은 화면에서 손가락 실수가 잦다. 획 단위, 최대 50단계 |
| O2 | 채우기(flood fill) | 배경·넓은 면을 칠할 때 필수에 가깝다. 4방향, 구현이 짧다 |
| O3 | 스포이트 | 그림에 쓴 색을 다시 고르기 쉽다. 구현이 짧다 |
| O4 | 격자선 표시 토글 | 기본 켜짐. 끄면 완성 모습을 미리 볼 수 있다 |
| O5 | 자동 저장(localStorage) | iframe 카드를 새로고침해도 그림이 남는다(9절) |
| O6 | 키보드 단축키 | 데스크톱 편의. 도구 전환·되돌리기만(5.3절). 키보드로 칸을 칠하는 기능은 범위 밖 |

### 1.4 범위 밖은 11절에 정리한다.

---

## 2. 화면 구성

### 2.1 공통 구성 요소
1. **상단 바**: 앱 이름 "Pixel Editor"(h1, 작게) + 현재 색 표시(색 견본 + 이름/HEX 텍스트).
2. **캔버스 영역**: 정사각형 `<canvas>` 하나. 투명 칸은 체커보드로 보인다.
3. **도구 줄**: 펜 · 지우개 · 채우기 · 스포이트 | 되돌리기 · 다시 실행 (아이콘 버튼 6개, 각 44×44px).
4. **팔레트**: 기본 16색 견본 + 사용자 지정 색 1칸 = 17칸. 견본은 44×44px 버튼.
5. **작업 줄**: 격자선 토글 · 전체 지우기 · 배율 선택(`<select>`) · PNG 저장 버튼.
6. **알림 영역**: 시각적으로 숨긴 `aria-live="polite"` 영역("전체 지웠습니다. 되돌리기로 복구할 수 있어요", "PNG 저장: pixel-art-…png").

### 2.2 모바일 (375px 폭) 와이어프레임
```
┌─────────────────────────────────────┐ 좌우 여백 16px
│ Pixel Editor          [■] 검정 #000 │ 상단 바 (높이 44)
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ │     16×16 캔버스 (정사각형)      │ │ 폭 = min(100%, 480px)
│ │     343px → 한 칸 약 21px        │ │ touch-action: none
│ │                                 │ │
│ └─────────────────────────────────┘ │
│ [펜][지우개][채우기][스포이트] [↶][↷] │ 도구 줄 (44px 버튼 6개)
│ ■ ■ ■ ■ ■ ■ ■                       │
│ ■ ■ ■ ■ ■ ■ ■                       │ 팔레트 (flex-wrap, 간격 4px)
│ ■ ■ [+사용자 색]                     │
│ [격자] [전체 지우기] [16× ▾] [PNG 저장]│ 작업 줄 (넘치면 두 줄로 줄바꿈)
└─────────────────────────────────────┘
```

### 2.3 iframe 카드 (약 310×600px) 와이어프레임
```
┌──────────────────────────────┐ 좌우 여백 11px(=(310-288)/2, 최소 8px)
│ [■] 검정 #000000             │ 상단 바: h1 숨김(높이 ≤ 640px), 32px
│ ┌──────────────────────────┐ │
│ │  캔버스 288×288           │ │ 한 칸 18px
│ └──────────────────────────┘ │
│ [펜][지][채][스]  [↶][↷]      │ 44px
│ ■■■■■■                       │ 팔레트 6칸/줄 × 3줄
│ ■■■■■■                       │ (44×6 + 4×5 = 284px)
│ ■■■■■[+]                     │
│ [격자][지우기][16×▾][저장]    │ 44px
└──────────────────────────────┘
```
- 높이 합계 예상: 32 + 288 + 44 + 140 + 44 + 간격 8×5 = 588px. 600px 안에 들어간다.
- 넘칠 경우 문서 세로 스크롤은 허용한다(캔버스 위에서만 스크롤이 막힌다). 가로 스크롤은 절대 없다.
- 캔버스 크기 규칙: `width: min(100%, 480px, calc(100dvh - 300px))`, `aspect-ratio: 1`, 최소 `224px`(한 칸 14px). 높이가 아주 낮으면 최소값이 우선하고 세로 스크롤로 해결한다.
- `@media (max-height: 640px)`: h1을 시각적으로 숨기고(스크린 리더용으로 남김) 상단 바 높이를 32px로 줄인다.

### 2.4 데스크톱 (≥ 768px) 와이어프레임
```
┌──────────────────────────────────────────────────────────┐
│ Pixel Editor                                [■] 빨강 #e53935 │
├──────────────────────────────────────────────────────────┤
│ ┌──────────────────────────┐   도구                         │
│ │                          │   [펜][지우개][채우기][스포이트]  │
│ │   캔버스 480×480          │   [↶ 되돌리기][↷ 다시 실행]       │
│ │   (한 칸 30px)            │   팔레트                        │
│ │                          │   ■■■■■■                        │
│ │                          │   ■■■■■■                        │
│ │                          │   ■■■■■[+]                      │
│ └──────────────────────────┘   내보내기                      │
│                                [격자] [전체 지우기]             │
│                                배율 [16× ▾]  [PNG 저장]         │
└──────────────────────────────────────────────────────────┘
```
- `@media (min-width: 768px)`: 2열 그리드(`grid-template-columns: auto 1fr`, 간격 24px). 오른쪽 패널은 최대 320px.
- 도구 버튼은 데스크톱에서 아이콘 + 텍스트 레이블을 함께 보인다. 모바일에서는 아이콘만 보이고 `aria-label`과 `title`로 이름을 준다.
- 전체 폭은 `max-width: 880px`, 가운데 정렬.

### 2.5 아이콘
- 인라인 SVG(`currentColor`, 20px)로 HTML에 직접 넣는다. 외부 아이콘 폰트·이미지 파일 없음.
- 사용자 지정 색 칸은 무지개 원 대신 "+" 아이콘 위에 선택된 색을 테두리로 보여 준다(4절).

---

## 3. 도구별 동작 정의

### 3.0 공통 입력 처리 (Pointer Events)
- 캔버스에 `pointerdown`/`pointermove`/`pointerup`/`pointercancel`을 단다. 마우스·터치·펜을 같은 코드로 처리한다.
- `pointerdown`:
  - 마우스는 왼쪽 버튼(`e.button === 0`)만 받는다. 오른쪽 클릭은 무시(`contextmenu`는 캔버스에서 `preventDefault`).
  - 이미 진행 중인 포인터가 있으면 두 번째 포인터(두 손가락 등)는 무시한다. 활성 포인터 ID 하나만 추적한다.
  - `canvas.setPointerCapture(e.pointerId)`로 캔버스 밖으로 나가도 이벤트를 계속 받는다.
  - `e.preventDefault()` 호출(텍스트 선택·터치 지연 방지).
- 좌표 → 칸 변환: `rect = canvas.getBoundingClientRect()`, `x = floor((clientX - rect.left) / rect.width * 16)`, y도 같게. **드래그 중에는 0~15로 잘라(clamp) 쓴다.** `pointerdown`이 캔버스 밖이면 무시한다.
- `pointermove`에서 `e.getCoalescedEvents?.()`가 있으면 그 이벤트들을 차례로 처리한다(없으면 현재 이벤트만). 그래도 빈 칸이 생길 수 있으므로 3.2의 보간을 항상 적용한다.
- `pointerup`/`pointercancel`/`lostpointercapture`: 획을 끝내고(3.7 기록 커밋) 활성 포인터를 비운다. `pointercancel`도 그때까지 칠한 것은 남긴다.
- 렌더링은 한 이벤트마다 바로 하지 않고 `requestAnimationFrame`으로 한 프레임에 한 번만 다시 그린다(dirty 플래그).

### 3.1 펜 (기본 도구)
- `pointerdown`한 칸을 현재 색으로 칠한다. 드래그하면 지나간 칸을 모두 현재 색으로 칠한다.
- 이미 같은 색이면 바꾸지 않는다(변경 없음 → 기록 안 남김).

### 3.2 드래그 보간 (펜·지우개 공통)
- 직전에 처리한 칸 `(x0, y0)`과 이번 칸 `(x1, y1)`이 다르면 **브레젠함(Bresenham) 직선 알고리즘**으로 두 칸 사이의 모든 칸을 구해 차례로 칠한다(양 끝 포함).
- 함수: `lineCells(x0, y0, x1, y1)` → `[[x, y], …]` (순수 함수, `pixels.js`).
- 칸 좌표가 같으면 아무것도 하지 않는다(같은 칸 반복 칠하기 방지).
- 예: `(0,0)`→`(5,2)`면 `(0,0) (1,0) (2,1) (3,1) (4,2) (5,2)`처럼 대각선에서도 끊기지 않는다(브레젠함의 8방향 연결). 칸이 모서리로만 이어지는 것은 허용한다.

### 3.3 지우개
- 펜과 같은 입력·보간 규칙으로 칸을 `null`(투명)로 만든다.
- 이미 투명이면 변경 없음.

### 3.4 채우기 (flood fill)
- `pointerdown`한 칸의 값(색 또는 `null`)과 **정확히 같은 값**이면서 상하좌우(4방향)로 이어진 영역을 현재 색으로 바꾼다.
- 대상 값이 현재 색과 같으면 아무것도 하지 않는다.
- 투명 영역도 채울 수 있다(값이 `null`인 연결 영역).
- 구현: 재귀 없이 배열 스택으로(최대 256칸이라 성능 문제 없음). 함수 `floodFill(pixels, x, y, color)` → 새 배열.
- 드래그해도 첫 칸에서 한 번만 실행한다. 한 번의 채우기가 기록 1단계.
- 지우개 + 채우기 조합(투명으로 채우기)은 범위 밖. 필요하면 전체 지우기를 쓴다.

### 3.5 스포이트
- `pointerdown`한 칸의 색을 현재 색으로 정하고, **도구를 펜으로 되돌린다**.
- 그 칸이 투명이면 도구를 **지우개**로 바꾼다(현재 색은 그대로).
- 고른 색이 기본 팔레트에 있으면 그 견본을 선택 상태로, 없으면 사용자 지정 색 칸에 그 값을 넣고 선택 상태로 한다.
- 그림을 바꾸지 않으므로 기록에 남지 않는다.

### 3.6 전체 지우기
- 버튼을 누르면 256칸 모두 `null`. 이미 모두 투명이면 아무것도 하지 않는다.
- 확인 대화상자(`confirm`)를 쓰지 않는다. iframe에서 `confirm`이 막히거나 어색할 수 있고, 되돌리기가 있기 때문이다. 대신 알림 영역에 "전체 지웠습니다. 되돌리기로 복구할 수 있어요."를 알린다.
- 기록 1단계로 남는다.

### 3.7 되돌리기 / 다시 실행
- 기록 단위는 "획"이다: `pointerdown` ~ `pointerup` 사이의 모든 변화가 1단계. 채우기 1번, 전체 지우기 1번도 각각 1단계.
- 방식: 획을 시작할 때 현재 픽셀 배열의 복사본을 들고 있다가, 획이 끝났을 때 실제로 바뀐 칸이 있으면 그 복사본을 undo 스택에 넣는다(256칸 배열 복사라 충분히 가볍다).
- undo 스택 최대 50개, 넘으면 가장 오래된 것을 버린다. 새 변경이 생기면 redo 스택은 비운다.
- 버튼은 스택이 비면 `disabled`.
- 기록(undo/redo 스택)은 저장하지 않는다. 새로고침하면 그림만 남고 기록은 비어 있다.
- 획을 그리는 도중에는 되돌리기를 받지 않는다(무시).

### 3.8 격자선 토글
- 기본 켜짐. 버튼 `aria-pressed`로 상태 표시. 끄면 칸 경계선을 그리지 않는다.
- 격자선은 화면 표시 전용이며 PNG에는 절대 들어가지 않는다.

---

## 4. 팔레트 구성

### 4.1 기본 16색 (데이터, `palette.js`)
| 순서 | 이름(aria-label) | HEX |
|---|---|---|
| 1 | 검정 | `#000000` |
| 2 | 진회색 | `#5f574f` |
| 3 | 연회색 | `#c2c3c7` |
| 4 | 흰색 | `#ffffff` |
| 5 | 빨강 | `#e53935` |
| 6 | 주황 | `#fb8c00` |
| 7 | 노랑 | `#fdd835` |
| 8 | 연두 | `#9ccc65` |
| 9 | 초록 | `#2e7d32` |
| 10 | 하늘 | `#4fc3f7` |
| 11 | 파랑 | `#1e88e5` |
| 12 | 남색 | `#283593` |
| 13 | 보라 | `#8e24aa` |
| 14 | 분홍 | `#f48fb1` |
| 15 | 갈색 | `#795548` |
| 16 | 살구 | `#ffccbc` |

- 시작 시 현재 색은 **검정**.
- HEX는 항상 소문자 `#rrggbb` 6자리로 다룬다(알파 없음).

### 4.2 견본 버튼
- 각 견본은 `<button type="button">`이며 `aria-label="빨강 #e53935"`, `aria-pressed="true|false"`. 보이는 크기 36×36px 색 사각형, 버튼(터치 대상) 44×44px.
- 선택된 견본: `--accent` 색 3px 바깥 테두리 + 안쪽 2px `--bg` 테두리(어떤 색 위에서도 보이게).
- 흰색처럼 배경과 비슷한 견본도 보이도록 모든 견본에 1px `--border` 테두리.
- 견본 묶음은 `role="group"` + `aria-label="팔레트"`.

### 4.3 사용자 지정 색
- 17번째 칸. `<label>`로 감싼 `<input type="color">`(시각적으로는 44×44 버튼처럼, 실제 input은 그 위에 투명하게 겹쳐 클릭을 받음).
- 레이블: `aria-label="사용자 지정 색 (현재 #xxxxxx)"`. 기본값 `#ff6f00`.
- `input` 이벤트: 값이 바뀌면 그 색을 현재 색으로 하고 사용자 지정 칸을 선택 상태로. 도구가 지우개/스포이트면 펜으로 바꾼다. 채우기는 그대로 둔다.
- 사용자 지정 칸 선택 상태는 래퍼 요소의 클래스(`is-selected`)와 텍스트(현재 색 표시)로 보여 준다(`aria-pressed`는 input에 쓸 수 없으므로).

### 4.4 현재 색 표시
- 상단 바에 20×20 색 견본 + 텍스트 "검정 #000000"(팔레트 이름이 없으면 "사용자 색 #xxxxxx").
- 지우개 도구일 때는 견본을 체커보드로, 텍스트를 "지우개(투명)"로 바꾼다.

---

## 5. 그 밖의 조작

### 5.1 도구 버튼
- 펜/지우개/채우기/스포이트는 하나만 선택되는 버튼 묶음(`role="group"`, `aria-label="도구"`), 각 버튼 `aria-pressed`.
- 팔레트 견본을 누르면 도구가 지우개/스포이트일 때 펜으로 바꾼다(색을 골랐으면 칠하려는 뜻). 채우기는 유지.

### 5.2 커서
- 캔버스 커서: 펜·지우개·채우기 `crosshair`, 스포이트 `copy`. 별도 커서 이미지 없음.

### 5.3 키보드 단축키 (데스크톱)
| 키 | 동작 |
|---|---|
| `B` | 펜 |
| `E` | 지우개 |
| `G` | 채우기 |
| `I` | 스포이트 |
| `Ctrl/⌘ + Z` | 되돌리기 |
| `Ctrl/⌘ + Shift + Z`, `Ctrl + Y` | 다시 실행 |
| `#` (`Shift+3`) | 격자선 토글 |
- `document`의 `keydown`에서 처리한다. 포커스가 `input`/`select`에 있을 때와 IME 조합 중(`e.isComposing`)에는 무시한다.
- 처리한 키만 `preventDefault()`. 그 밖의 키(Tab 등)는 건드리지 않는다.
- 단축키는 iframe 안에 포커스가 있을 때만 동작한다(로드 시 포커스를 가져오지 않으므로 자연스럽게 그렇다).

### 5.4 스크롤·확대 방지
- 캔버스: `touch-action: none;` → 캔버스 위 드래그로 페이지가 스크롤되거나 두 손가락 확대가 일어나지 않는다.
- 캔버스: `user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;` (길게 눌러 이미지 저장 메뉴가 뜨지 않게).
- 캔버스 밖(버튼, 빈 공간)은 일반 스크롤을 허용한다. `body`에 `touch-action`을 걸지 않는다.
- 버튼 더블탭 확대 방지: 버튼에 `touch-action: manipulation`.

### 5.5 포커스
- `autofocus`, 로드 시 `focus()` 호출을 **하지 않는다**(iframe이 부모 페이지 포커스를 빼앗지 않게).
- 캔버스는 `tabindex`를 주지 않는다(키보드로 칸을 칠하는 기능은 범위 밖). 모든 버튼·select·color input은 Tab으로 접근 가능.

---

## 6. 데이터 모델

### 6.1 픽셀 배열
- 길이 256의 1차원 배열 `pixels`. 인덱스 = `y * 16 + x` (x: 왼→오 0~15, y: 위→아래 0~15).
- 각 요소: `'#rrggbb'`(소문자 6자리 문자열) 또는 `null`(투명).
- 반투명은 없다. 칸은 완전 불투명 색 아니면 완전 투명.
- 상수: `SIZE = 16`, `CELL_COUNT = 256` (`pixels.js`에서 export).
- 상태 변경은 순수 함수로: `setPixel(pixels, x, y, color)`는 **변경이 있으면 새 배열, 없으면 같은 배열**을 돌려준다(변경 여부를 `!==` 비교로 판단). 드래그 성능이 문제되면 획 동안만 복사본 하나를 직접 고쳐도 된다(구현 재량, 겉 동작은 같아야 함).

### 6.2 앱 상태 (`ui.js` 모듈 안의 지역 객체, 전역 아님)
```js
{
  pixels: Array(256),     // 6.1
  color: '#000000',       // 현재 색
  customColor: '#ff6f00', // 사용자 지정 칸 값
  tool: 'pen',            // 'pen' | 'eraser' | 'fill' | 'picker'
  showGrid: true,
  scale: 16,              // 1 | 8 | 16 | 32
  undo: [],               // pixels 배열 스냅숏, 최대 50
  redo: [],
  stroke: null            // 진행 중 획: { pointerId, before, lastX, lastY }
}
```

---

## 7. PNG 내보내기

### 7.1 배율
- `<select>` 선택지: `1×(16px)`, `8×(128px)`, `16×(256px)`(기본), `32×(512px)`. 레이블 "배율".
- 기본 16×를 고른 이유: 256px는 SNS 프로필·이모지·블로그 본문에 쓰기 알맞고 파일도 작다.

### 7.2 방법
1. 화면에 붙이지 않은 새 `canvas`를 `16 * scale` 크기로 만든다.
2. `ctx.imageSmoothingEnabled = false;` (배경 지식: 아래처럼 칸마다 `fillRect`를 하면 스무딩과 무관하게 또렷하지만, 나중에 `drawImage` 방식으로 바꿔도 흐려지지 않도록 명시한다.)
3. 배경은 칠하지 않는다(투명 유지). `null` 칸은 건너뛰고, 색 칸만 `fillStyle = color; fillRect(x*scale, y*scale, scale, scale)`. 정수 좌표라 경계 번짐 없음.
4. 격자선·체커보드는 그리지 않는다.
5. `canvas.toBlob(cb, 'image/png')` → `URL.createObjectURL(blob)` → `<a download="파일명" href="blob:…">`를 만들어 `click()` → `setTimeout`으로 약 1초 뒤 `URL.revokeObjectURL` 하고 `a`를 제거.
6. 성공하면 알림 영역에 "PNG 저장: pixel-art-…png (256×256)"를 알린다.

### 7.3 파일 이름
- `pixel-art-YYYYMMDD-HHMMSS-{scale}x.png` (로컬 시각, 예: `pixel-art-20261125-143005-16x.png`).

### 7.4 iframe에서의 다운로드
- 같은 출처의 일반 iframe에서는 `<a download>` + blob URL이 동작한다.
- 블로그가 iframe에 `sandbox`를 건다면 **`allow-downloads`가 있어야** 다운로드된다(앱은 블로그 파일을 고치지 않으므로, Embed 단계에서 확인할 일로 보고한다).
- 대비책: `toBlob`이 `null`을 주거나 예외가 나면 알림 영역과 작업 줄 아래 작은 문구로 "저장할 수 없습니다. 새 탭에서 열어 다시 시도해 주세요."를 보이고, 같은 문구 옆에 `<a href="./" target="_blank" rel="noopener">새 탭에서 열기</a>` 링크를 보인다. 자동 저장(9절) 덕분에 새 탭에서도 같은 그림이 열린다(같은 출처일 때).
- 그림이 전부 투명이어도 저장은 허용한다(빈 투명 PNG).

---

## 8. 디자인

### 8.1 방향
- 도구 앱이므로 장식 최소, 그림이 주인공. 무채색 UI + 포인트 색 하나(`--accent`).
- 폰트: 시스템 폰트 스택(블로그와 같은 목록). 숫자·HEX는 `ui-monospace, SFMono-Regular, Consolas, monospace`.
- `word-break: keep-all; overflow-wrap: break-word;`.

### 8.2 CSS 변수 (UI 색은 모두 변수로만 사용, `style.css`의 `:root`)
| 변수 | 용도 | 라이트 | 다크 |
|---|---|---|---|
| `--bg` | 페이지 배경 | `#ffffff` | `#0f1115` |
| `--surface` | 패널·버튼 배경 | `#f3f4f6` | `#1b1f27` |
| `--surface-hover` | 버튼 hover | `#e5e7eb` | `#262b36` |
| `--text` | 본문 글자 | `#1f2328` | `#e6e6e6` |
| `--muted` | 보조 글자 | `#656d76` | `#9aa4b2` |
| `--border` | 테두리, 견본 외곽선 | `#d0d7de` | `#2a2f3a` |
| `--accent` | 선택 상태 테두리, 저장 버튼 | `#2563eb` | `#6ea8fe` |
| `--accent-text` | `--accent` 위 글자 | `#ffffff` | `#0f1115` |
| `--focus` | `:focus-visible` 외곽선 | `#2563eb` | `#6ea8fe` |
| `--danger` | 전체 지우기 글자/아이콘 | `#b91c1c` | `#f87171` |
| `--checker-a` | 투명 칸 체커 밝은 칸 | `#ffffff` | `#3a3f4b` |
| `--checker-b` | 투명 칸 체커 어두운 칸 | `#e3e5e8` | `#2c313b` |
| `--grid-line` | 캔버스 격자선 | `rgba(0, 0, 0, 0.18)` | `rgba(255, 255, 255, 0.16)` |
| `--canvas-frame` | 캔버스 바깥 테두리 | `#9ca3af` | `#4b5563` |

- 다크: `@media (prefers-color-scheme: dark) { :root { … } }`로 재정의. 앱 안 토글 버튼은 두지 않는다(블로그와 독립된 앱이므로 시스템 설정만 따름).
- `color-scheme: light dark;`를 `:root`에 둔다(`select`, color input 기본 모양도 테마에 맞게).
- 대비: `--text`/`--bg`, `--muted`/`--bg`, `--accent-text`/`--accent`, `--danger`/`--bg` 모두 4.5:1 이상(위 값 기준 충족).

### 8.3 캔버스 표시
- 화면용 `<canvas>`의 내부 해상도 = `round(CSS 크기 × devicePixelRatio)`. `ResizeObserver`로 크기가 바뀌면 내부 크기를 다시 맞추고 다시 그린다.
- 칸 경계는 `Math.round(i * size / 16)`로 계산해 칸 사이에 틈이나 겹침이 없게 한다.
- 그리기 순서:
  1. **투명 칸 체커보드**: 각 투명 칸을 2×2 체커로 그린다(칸 하나 = `--checker-a`/`--checker-b` 네 조각). 칸 단위 체커라 "이 칸이 비었다"가 분명히 보인다.
  2. 색 칸을 `fillRect`.
  3. 격자선(켜짐일 때): 1 기기 픽셀 두께 선, `--grid-line`. 4칸마다(가운데 8칸 포함) 조금 진한 선(같은 변수에 `globalAlpha` 2배)을 그려 위치를 잡기 쉽게 한다.
- CSS 변수 값은 JS에서 `getComputedStyle(document.documentElement).getPropertyValue('--checker-a')` 등으로 읽는다. `matchMedia('(prefers-color-scheme: dark)')`의 `change` 이벤트 때 다시 읽고 다시 그린다. (색 값을 JS에 하드코딩하지 않는다. 팔레트 데이터만 예외.)
- 캔버스 요소에는 `--canvas-frame` 1px 테두리와 `image-rendering: pixelated`(내부 해상도와 CSS 크기가 어긋날 때 대비).

### 8.4 버튼·상태
- 버튼: 최소 44×44px, 모서리 8px, 배경 `--surface`, 테두리 `--border`.
- `aria-pressed="true"`인 도구 버튼: 배경 `--accent`, 글자 `--accent-text`.
- `disabled`: `opacity: 0.4; cursor: not-allowed;`.
- PNG 저장 버튼: `--accent` 배경(주 동작 강조).
- 모든 상호작용 요소에 `:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }`. 기본 외곽선을 없애지 않는다.
- 애니메이션 없음(선택 상태 전환 `transition: background-color 0.1s` 정도만, `prefers-reduced-motion: reduce`면 끔).

---

## 9. 파일 구조와 책임

```
apps/pixel-editor/
├── index.html        # 마크업, <script type="module" src="./js/ui.js">
├── style.css         # 전체 스타일, CSS 변수(라이트/다크)
├── js/
│   ├── pixels.js     # 순수 로직(DOM 없음) — 테스트 대상
│   ├── palette.js    # 기본 색 데이터
│   ├── history.js    # undo/redo 스택(순수)
│   ├── exporter.js   # PNG 만들기·다운로드
│   ├── storage.js    # localStorage 읽기/쓰기/검증
│   └── ui.js         # 진입점: 렌더링, 입력, 상태 연결
├── spec.md           # 이 문서
└── tasks/            # 서브에이전트 지침(수정하지 않음)
```
- 모든 경로는 `./` 상대 경로. `apps/pixel-editor/` 밖의 파일을 참조하지 않는다.
- `index.html`: `<meta charset="utf-8">`, `<meta name="viewport" content="width=device-width, initial-scale=1">`, `<title>Pixel Editor</title>`, `<meta name="color-scheme" content="light dark">`. 시맨틱 요소(`<header>`, `<main>`, `<section aria-label="도구">` 등). 캔버스에 `aria-label="16×16 픽셀 캔버스"`와 `aria-describedby`로 짧은 사용법 문구("누르거나 드래그해서 칠하세요").

### 9.1 `js/pixels.js` (export)
| 이름 | 설명 |
|---|---|
| `SIZE`, `CELL_COUNT` | 16, 256 |
| `createPixels()` | 모두 `null`인 길이 256 배열 |
| `indexOf(x, y)` | `y * 16 + x` |
| `inBounds(x, y)` | 0~15 범위 여부 |
| `getPixel(pixels, x, y)` | 값 |
| `setPixel(pixels, x, y, color)` | 6.1 규칙(변경 없으면 같은 배열) |
| `lineCells(x0, y0, x1, y1)` | 브레젠함 칸 목록(양 끝 포함) |
| `floodFill(pixels, x, y, color)` | 4방향 채우기, 새 배열(변경 없으면 같은 배열) |
| `isEmpty(pixels)` | 모두 투명인지 |
| `isValidColor(value)` | `/^#[0-9a-f]{6}$/` 검사 |
| `normalizeColor(value)` | 대문자/3자리(`#abc`) → 소문자 6자리, 잘못되면 `null` |

### 9.2 `js/palette.js`
- `export const PALETTE = [{ name: '검정', hex: '#000000' }, …]` (4.1의 16개, 순서 유지).
- `export const DEFAULT_COLOR = '#000000';`, `export const DEFAULT_CUSTOM_COLOR = '#ff6f00';`
- `export function colorName(hex)` → 팔레트 이름 또는 `null`.

### 9.3 `js/history.js`
- `export const HISTORY_LIMIT = 50;`
- `export function createHistory()` → `{ undo: [], redo: [] }`
- `export function record(history, before)` → before를 undo에 넣고 redo를 비운 새 history(50 초과 시 가장 오래된 것 삭제)
- `export function undo(history, current)` → `{ history, pixels }` 또는 스택이 비면 `null`
- `export function redo(history, current)` → 같음
- `export function canUndo(history)`, `canRedo(history)`

### 9.4 `js/exporter.js`
- `export function renderToCanvas(pixels, scale)` → 오프스크린 `HTMLCanvasElement`(7.2의 1~4)
- `export function makeFileName(scale, date = new Date())` → 7.3 형식
- `export function downloadPng(pixels, scale)` → `Promise<string>`(파일 이름). 실패 시 reject(7.4 대비책은 ui.js가 처리)

### 9.5 `js/storage.js`
- `export function loadState()` → 검증된 저장 상태 또는 `null`
- `export function saveState(state)` → 실패해도 예외를 밖으로 던지지 않음
- `export const STORAGE_KEY = 'pixel-editor:v1';`

### 9.6 `js/ui.js` (진입점)
- 모듈 최상위에서 `init()` 한 번 호출. 모든 상태는 모듈 지역 변수(전역 객체에 붙이지 않음).
- 책임: DOM 요소 찾기, 팔레트 버튼 생성, 이벤트 연결(3·5절), 캔버스 그리기(8.3), 버튼 상태(`aria-pressed`, `disabled`) 갱신, 알림 영역 갱신, 자동 저장 예약(10절), 다운로드 실패 대비책(7.4).
- 내보낼 것 없음(진입점).

### 9.7 코딩 컨벤션
- `const`/`let`만, ES 모듈, 세미콜론, 2칸 들여쓰기, 작은따옴표, 전역 변수 없음.
- CSS 클래스명 소문자-하이픈(`tool-button`, `palette-swatch`, `is-selected`).
- `innerHTML`에 사용자 입력을 넣지 않는다(팔레트 생성은 `createElement`/`textContent`).

---

## 10. 상태 저장 (자동 저장)

- 키: **`pixel-editor:v1`**
- 값(JSON):
  ```json
  {
    "version": 1,
    "pixels": ["#000000", null, "...256개"],
    "color": "#e53935",
    "customColor": "#ff6f00",
    "tool": "pen",
    "showGrid": true,
    "scale": 16
  }
  ```
- 저장 시점: 획이 끝날 때, 채우기·전체 지우기·되돌리기·다시 실행 뒤, 색·도구·격자·배율이 바뀔 때. 300ms 디바운스로 묶어 한 번만 쓴다. `pagehide` 때 대기 중인 저장이 있으면 즉시 쓴다.
- 획 도중(`pointermove`)에는 저장하지 않는다.
- 불러오기 검증(하나라도 틀리면 그 항목만 기본값, `pixels`가 틀리면 그림 전체를 빈 캔버스로):
  - `version === 1`이 아니면 전체 무시.
  - `pixels`: 배열이고 길이 정확히 256, 각 요소가 `null` 또는 `isValidColor` 통과.
  - `color`, `customColor`: `isValidColor` 통과.
  - `tool`: `'pen' | 'eraser' | 'fill' | 'picker'` 중 하나. 단, `'picker'`로 저장됐으면 `'pen'`으로 시작.
  - `showGrid`: boolean.
  - `scale`: `1 | 8 | 16 | 32` 중 하나.
- `localStorage` 접근은 모두 `try/catch`. 막힌 환경(사생활 보호 모드, sandbox iframe)에서는 저장 없이 정상 동작하고 오류를 콘솔에 남기지 않는다(조용히 무시).
- 다른 탭의 변경(`storage` 이벤트)은 반영하지 않는다(범위 밖).
- undo/redo 기록은 저장하지 않는다.

---

## 11. 테스트 체크리스트 (Review 단계용)

### 11.1 로직 (`pixels.js`, `history.js`를 Node에서 `file:///`로 import하거나 브라우저 콘솔에서)
- [ ] `createPixels()` 길이 256, 모두 `null`.
- [ ] `setPixel` 같은 값이면 같은 배열 참조를 돌려준다, 다르면 새 배열이고 원본은 그대로.
- [ ] `lineCells(0,0,5,2)`가 양 끝 포함, 이웃 칸끼리 8방향으로 끊김 없이 이어진다. `lineCells(3,3,3,3)` → `[[3,3]]`. 역방향 `(5,2)→(0,0)`도 끊김 없음. 수평·수직·45° 대각선 확인.
- [ ] `floodFill`: 빈 캔버스에서 → 256칸 모두 칠함. 닫힌 사각형 테두리 안쪽만 채워지고 바깥은 안 바뀜. 대각선으로만 이어진 칸은 채우지 않음(4방향). 대상 값 = 새 색이면 같은 배열.
- [ ] `isValidColor`: `#abcdef` 통과, `#ABCDEF`·`#abc`·`red`·`null` 실패. `normalizeColor('#ABC')` → `#aabbcc`.
- [ ] history: 51번 기록하면 undo 50개. undo 후 새 기록하면 redo 비워짐. 빈 스택에서 undo → `null`.

### 11.2 그리기 / 도구 (내장 브라우저, 마우스 + 375px 모바일 에뮬레이션)
- [ ] 클릭 한 번 = 한 칸 칠해짐. 드래그로 연속 칠해짐.
- [ ] 아주 빠르게 대각선으로 드래그해도 선에 빈 칸이 없다.
- [ ] 캔버스 밖으로 드래그했다 돌아와도 획이 이어지고, 밖에서 놓으면 획이 끝난다.
- [ ] 오른쪽 클릭은 칠하지 않고 메뉴도 뜨지 않는다.
- [ ] 지우개로 칠한 칸이 체커보드(투명)로 돌아간다.
- [ ] 채우기: 투명 영역/색 영역 각각 동작, 경계를 넘지 않음.
- [ ] 스포이트: 색 칸 → 현재 색 바뀌고 펜으로 전환, 해당 견본 선택. 팔레트에 없는 색 → 사용자 지정 칸에 들어감. 투명 칸 → 지우개로 전환.
- [ ] 전체 지우기 → 모두 투명, 알림 문구, 되돌리기로 복구.
- [ ] 한 획 = 되돌리기 1번. 되돌리기/다시 실행 버튼 `disabled` 상태가 맞다. 변화 없는 클릭(같은 색 위)은 기록을 남기지 않는다.
- [ ] 격자선 토글 동작, `aria-pressed` 바뀜.
- [ ] 단축키 B/E/G/I, Ctrl+Z, Ctrl+Shift+Z/Ctrl+Y, `#` 동작. color input·select에 포커스가 있을 때는 무시.

### 11.3 터치 / 펜
- [ ] (모바일 에뮬레이션 또는 실제 기기) 캔버스 위 드래그 시 페이지가 스크롤·확대되지 않는다(`touch-action: none` 확인).
- [ ] 두 번째 손가락은 무시되고 첫 획이 망가지지 않는다.
- [ ] 캔버스 밖 영역에서는 세로 스크롤이 된다.
- [ ] 실제 터치/펜 기기 확인이 불가하면 "미검증"으로 명시.

### 11.4 팔레트 / 색
- [ ] 16개 견본 순서·색이 4.1 표와 같다. 각 견본 `aria-label`에 이름과 HEX.
- [ ] 선택 견본만 `aria-pressed="true"`.
- [ ] 사용자 지정 색 변경 → 현재 색 표시와 칠하는 색이 바뀐다.
- [ ] 현재 색 표시가 펜/지우개 상태에 맞게 바뀐다.

### 11.5 PNG 내보내기
- [ ] 배율별 결과 크기: 16, 128, 256, 512px.
- [ ] 결과 PNG의 투명 칸 알파가 0(체커보드·격자선 없음). 확인 방법: `renderToCanvas` 결과에 `getImageData`로 투명 칸 알파 0, 색 칸 RGB 정확, 칸 경계 픽셀이 섞인 색이 아님.
- [ ] 파일 이름 형식 `pixel-art-YYYYMMDD-HHMMSS-16x.png`.
- [ ] 블로그 메인에 넣은 같은 출처 iframe에서도 다운로드가 시작된다(또는 실패 시 대비책 문구와 "새 탭에서 열기" 링크가 보인다).

### 11.6 레이아웃 / 디자인
- [ ] 375px 폭: 가로 스크롤 없음(`document.documentElement.scrollWidth <= innerWidth`).
- [ ] 310×600 iframe: 캔버스·도구·팔레트·저장 버튼이 모두 보이거나 세로 스크롤만으로 닿는다. 가로 스크롤 없음.
- [ ] 768px 이상: 2열 배치.
- [ ] 라이트/다크 둘 다 버튼·견본·체커보드·격자선이 잘 보인다. 다크 전환 시 캔버스가 다시 그려진다.
- [ ] 버튼·견본 터치 대상 44×44px 이상.
- [ ] 고해상도(DPR 2)에서 칸 경계가 흐리지 않다.
- [ ] CSS에 변수 밖 하드코딩 색이 없다(팔레트 데이터 제외).

### 11.7 접근성
- [ ] 모든 버튼에 접근 가능한 이름(아이콘 버튼은 `aria-label`).
- [ ] Tab으로 모든 컨트롤 접근, `:focus-visible` 외곽선 보임.
- [ ] 알림 영역(`aria-live`)이 전체 지우기·저장 결과를 알린다.
- [ ] iframe 로드 시 부모 페이지 포커스를 빼앗지 않는다.

### 11.8 저장
- [ ] 그림을 그리고 새로고침하면 그림·색·도구·격자·배율이 복원된다.
- [ ] 저장값을 망가뜨리면(길이 255, 잘못된 색, `version: 2`) 오류 없이 기본 상태로 시작.
- [ ] `localStorage`가 예외를 던지는 환경에서도 그리기·저장(PNG)이 동작, 콘솔 오류 없음.

### 11.9 코드 품질 / 규칙
- [ ] 외부 라이브러리·CDN·빌드 도구 없음.
- [ ] `apps/pixel-editor/` 밖 참조·수정 없음, 경로 모두 `./`.
- [ ] `var` 없음, 세미콜론·작은따옴표·2칸 들여쓰기, 전역 변수 없음.
- [ ] 콘솔 오류·경고 없음.

---

## 12. 범위 밖 (이번에 하지 않음)
- 16×16 이외의 캔버스 크기, 캔버스 크기 변경.
- 레이어, 반투명(알파) 색, 블렌딩.
- 선·사각형·원 도형 도구, 선택/이동/복사, 좌우 대칭 그리기, 회전·뒤집기.
- 확대/축소·이동(pan). 캔버스는 화면에 맞춘 고정 크기.
- 키보드만으로 칸을 이동하며 칠하기.
- 투명으로 채우기(지우개 + 채우기).
- 여러 그림 저장·갤러리, 이름 붙이기, 다른 탭과 동기화.
- 이미지 불러오기(PNG 열기), SVG·GIF·애니메이션 내보내기, 클립보드 복사, 공유 API.
- 팔레트 편집·저장(사용자 지정 색은 1칸만).
- 앱 안 다크 모드 토글(시스템 설정만 따름).
- undo/redo 기록 저장.
- 블로그 파일(`index.html` 카드, iframe 속성 등) 수정 — Embed 단계에서 한다.
