// 픽셀 배열 순수 로직 (DOM 없음)

export const SIZE = 16;
export const CELL_COUNT = SIZE * SIZE;

export function createPixels() {
  return new Array(CELL_COUNT).fill(null);
}

export function indexOf(x, y) {
  return y * SIZE + x;
}

export function inBounds(x, y) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < SIZE && y >= 0 && y < SIZE;
}

export function getPixel(pixels, x, y) {
  if (!inBounds(x, y)) {
    return null;
  }
  return pixels[indexOf(x, y)];
}

export function setPixel(pixels, x, y, color) {
  if (!inBounds(x, y)) {
    return pixels;
  }
  const i = indexOf(x, y);
  if (pixels[i] === color) {
    return pixels;
  }
  const next = pixels.slice();
  next[i] = color;
  return next;
}

export function lineCells(x0, y0, x1, y1) {
  const cells = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    cells.push([x, y]);
    if (x === x1 && y === y1) {
      break;
    }
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  return cells;
}

export function floodFill(pixels, x, y, color) {
  if (!inBounds(x, y)) {
    return pixels;
  }
  const target = pixels[indexOf(x, y)];
  if (target === color) {
    return pixels;
  }
  const next = pixels.slice();
  const stack = [[x, y]];
  while (stack.length > 0) {
    const [cx, cy] = stack.pop();
    if (!inBounds(cx, cy)) {
      continue;
    }
    const i = indexOf(cx, cy);
    if (next[i] !== target) {
      continue;
    }
    next[i] = color;
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  return next;
}

export function isEmpty(pixels) {
  return pixels.every((p) => p === null);
}

export function isValidColor(value) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/.test(value);
}

export function normalizeColor(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const v = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) {
    return v;
  }
  if (/^#[0-9a-f]{3}$/.test(v)) {
    return '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
  }
  return null;
}
