// 진입점: 렌더링, 입력, 상태 연결

import {
  SIZE,
  createPixels,
  getPixel,
  setPixel,
  lineCells,
  floodFill,
  isEmpty,
  normalizeColor
} from './pixels.js';
import { PALETTE, DEFAULT_COLOR, DEFAULT_CUSTOM_COLOR, colorName } from './palette.js';
import { record, undo as undoHistory, redo as redoHistory, canUndo, canRedo } from './history.js';
import { downloadPng } from './exporter.js';
import { loadState, saveState } from './storage.js';

const TOOLS = ['pen', 'eraser', 'fill', 'picker'];
const SAVE_DELAY = 300;

const state = {
  pixels: createPixels(),
  color: DEFAULT_COLOR,
  customColor: DEFAULT_CUSTOM_COLOR,
  tool: 'pen',
  showGrid: true,
  scale: 16,
  undo: [],
  redo: [],
  stroke: null
};

const els = {};
const theme = {};
let dirty = false;
let frameRequested = false;
let saveTimer = null;
let announceTimer = null;

function init() {
  els.canvas = document.getElementById('pixel-canvas');
  els.ctx = els.canvas.getContext('2d');
  els.palette = document.getElementById('palette');
  els.customWrap = document.getElementById('custom-color-wrap');
  els.customInput = document.getElementById('custom-color');
  els.currentSwatch = document.getElementById('current-swatch');
  els.currentText = document.getElementById('current-text');
  els.toolButtons = Array.from(document.querySelectorAll('[data-tool]'));
  els.undoButton = document.getElementById('undo-button');
  els.redoButton = document.getElementById('redo-button');
  els.gridButton = document.getElementById('grid-button');
  els.clearButton = document.getElementById('clear-button');
  els.scaleSelect = document.getElementById('scale-select');
  els.saveButton = document.getElementById('save-button');
  els.saveError = document.getElementById('save-error');
  els.announcer = document.getElementById('announcer');

  applySavedState(loadState());
  buildPalette();
  bindEvents();
  readTheme();
  resizeCanvas();
  updateUi();
  requestRender();
}

function applySavedState(saved) {
  if (!saved) {
    return;
  }
  if (saved.pixels) {
    state.pixels = saved.pixels;
  }
  if (saved.color) {
    state.color = saved.color;
  }
  if (saved.customColor) {
    state.customColor = saved.customColor;
  }
  if (saved.tool) {
    state.tool = saved.tool;
  }
  if (typeof saved.showGrid === 'boolean') {
    state.showGrid = saved.showGrid;
  }
  if (saved.scale) {
    state.scale = saved.scale;
  }
}

/* ---------- 팔레트 ---------- */

function buildPalette() {
  const fragment = document.createDocumentFragment();
  PALETTE.forEach((entry) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'palette-swatch';
    button.dataset.hex = entry.hex;
    button.setAttribute('aria-label', `${entry.name} ${entry.hex}`);
    button.title = `${entry.name} ${entry.hex}`;
    button.setAttribute('aria-pressed', 'false');
    const chip = document.createElement('span');
    chip.className = 'swatch-chip';
    chip.setAttribute('aria-hidden', 'true');
    chip.style.setProperty('--swatch', entry.hex);
    button.appendChild(chip);
    button.addEventListener('click', () => selectPaletteColor(entry.hex));
    fragment.appendChild(button);
  });
  els.palette.insertBefore(fragment, els.customWrap);
  els.swatches = Array.from(els.palette.querySelectorAll('.palette-swatch'));
}

function selectPaletteColor(hex) {
  state.color = hex;
  if (state.tool === 'eraser' || state.tool === 'picker') {
    state.tool = 'pen';
  }
  updateUi();
  scheduleSave();
}

function onCustomInput() {
  const value = normalizeColor(els.customInput.value);
  if (!value) {
    return;
  }
  state.customColor = value;
  state.color = value;
  if (state.tool === 'eraser' || state.tool === 'picker') {
    state.tool = 'pen';
  }
  updateUi();
  scheduleSave();
}

/* ---------- 도구 ---------- */

function setTool(tool) {
  if (!TOOLS.includes(tool) || state.tool === tool) {
    return;
  }
  state.tool = tool;
  updateUi();
  scheduleSave();
}

function pickColor(x, y) {
  const value = getPixel(state.pixels, x, y);
  if (value === null) {
    state.tool = 'eraser';
  } else {
    state.color = value;
    state.tool = 'pen';
    if (!colorName(value)) {
      state.customColor = value;
    }
  }
  updateUi();
  scheduleSave();
}

function paintCell(x, y, tool) {
  const color = tool === 'eraser' ? null : state.color;
  const next = setPixel(state.pixels, x, y, color);
  if (next !== state.pixels) {
    state.pixels = next;
    requestRender();
  }
}

function paintLine(x0, y0, x1, y1, tool) {
  lineCells(x0, y0, x1, y1).forEach(([x, y]) => paintCell(x, y, tool));
}

/* ---------- 기록 ---------- */

function getHistory() {
  return { undo: state.undo, redo: state.redo };
}

function setHistory(history) {
  state.undo = history.undo;
  state.redo = history.redo;
}

function commitChange(before) {
  if (before === state.pixels) {
    return false;
  }
  setHistory(record(getHistory(), before));
  return true;
}

function doUndo() {
  if (state.stroke) {
    return;
  }
  const result = undoHistory(getHistory(), state.pixels);
  if (!result) {
    return;
  }
  setHistory(result.history);
  state.pixels = result.pixels;
  afterPixelsChanged();
}

function doRedo() {
  if (state.stroke) {
    return;
  }
  const result = redoHistory(getHistory(), state.pixels);
  if (!result) {
    return;
  }
  setHistory(result.history);
  state.pixels = result.pixels;
  afterPixelsChanged();
}

function afterPixelsChanged() {
  requestRender();
  updateUi();
  scheduleSave();
}

function clearAll() {
  if (state.stroke || isEmpty(state.pixels)) {
    return;
  }
  const before = state.pixels;
  state.pixels = createPixels();
  commitChange(before);
  afterPixelsChanged();
  announce('전체 지웠습니다. 되돌리기로 복구할 수 있어요.');
}

function toggleGrid() {
  state.showGrid = !state.showGrid;
  requestRender();
  updateUi();
  scheduleSave();
}

/* ---------- 포인터 입력 ---------- */

function cellFromEvent(e, clamp) {
  const rect = els.canvas.getBoundingClientRect();
  const left = rect.left + els.canvas.clientLeft;
  const top = rect.top + els.canvas.clientTop;
  const width = els.canvas.clientWidth || rect.width;
  const height = els.canvas.clientHeight || rect.height;
  let x = Math.floor((e.clientX - left) / width * SIZE);
  let y = Math.floor((e.clientY - top) / height * SIZE);
  if (clamp) {
    x = Math.min(SIZE - 1, Math.max(0, x));
    y = Math.min(SIZE - 1, Math.max(0, y));
  } else if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) {
    return null;
  }
  return { x, y };
}

function onPointerDown(e) {
  if (state.stroke) {
    return;
  }
  if (e.pointerType === 'mouse' && e.button !== 0) {
    return;
  }
  const cell = cellFromEvent(e, false);
  if (!cell) {
    return;
  }
  e.preventDefault();
  try {
    els.canvas.setPointerCapture(e.pointerId);
  } catch (err) {
    // 캡처를 못 해도 그리기는 계속한다.
  }
  const tool = state.tool;
  state.stroke = {
    pointerId: e.pointerId,
    before: state.pixels,
    lastX: cell.x,
    lastY: cell.y,
    tool
  };
  if (tool === 'pen' || tool === 'eraser') {
    paintCell(cell.x, cell.y, tool);
  } else if (tool === 'fill') {
    const next = floodFill(state.pixels, cell.x, cell.y, state.color);
    if (next !== state.pixels) {
      state.pixels = next;
      requestRender();
    }
  } else if (tool === 'picker') {
    pickColor(cell.x, cell.y);
  }
  updateUi();
}

function onPointerMove(e) {
  const stroke = state.stroke;
  if (!stroke || e.pointerId !== stroke.pointerId) {
    return;
  }
  if (stroke.tool !== 'pen' && stroke.tool !== 'eraser') {
    return;
  }
  const events = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
  const list = events.length > 0 ? events : [e];
  list.forEach((ev) => {
    const cell = cellFromEvent(ev, true);
    if (cell.x === stroke.lastX && cell.y === stroke.lastY) {
      return;
    }
    paintLine(stroke.lastX, stroke.lastY, cell.x, cell.y, stroke.tool);
    stroke.lastX = cell.x;
    stroke.lastY = cell.y;
  });
}

function endStroke(e) {
  const stroke = state.stroke;
  if (!stroke || e.pointerId !== stroke.pointerId) {
    return;
  }
  state.stroke = null;
  try {
    if (els.canvas.hasPointerCapture(e.pointerId)) {
      els.canvas.releasePointerCapture(e.pointerId);
    }
  } catch (err) {
    // 무시
  }
  if (commitChange(stroke.before)) {
    scheduleSave();
  }
  updateUi();
}

/* ---------- 키보드 ---------- */

function onKeyDown(e) {
  if (e.isComposing || e.keyCode === 229) {
    return;
  }
  const target = e.target;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
    return;
  }
  const key = e.key;
  const lower = typeof key === 'string' ? key.toLowerCase() : '';
  const mod = e.ctrlKey || e.metaKey;

  if (mod && !e.altKey) {
    if (lower === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        doRedo();
      } else {
        doUndo();
      }
      return;
    }
    if (lower === 'y' && e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      doRedo();
    }
    return;
  }
  if (e.altKey || mod) {
    return;
  }
  if (key === '#') {
    e.preventDefault();
    toggleGrid();
    return;
  }
  const toolKeys = { b: 'pen', e: 'eraser', g: 'fill', i: 'picker' };
  if (!e.shiftKey && toolKeys[lower]) {
    e.preventDefault();
    setTool(toolKeys[lower]);
  }
}

/* ---------- 내보내기 ---------- */

function onSave() {
  const scale = state.scale;
  const px = SIZE * scale;
  downloadPng(state.pixels, scale)
    .then((fileName) => {
      els.saveError.hidden = true;
      announce(`PNG 저장: ${fileName} (${px}×${px})`);
    })
    .catch(() => {
      els.saveError.hidden = false;
      announce('저장할 수 없습니다. 새 탭에서 열어 다시 시도해 주세요.');
    });
}

function onScaleChange() {
  const value = Number(els.scaleSelect.value);
  if ([1, 8, 16, 32].includes(value)) {
    state.scale = value;
    scheduleSave();
  }
}

/* ---------- 알림 ---------- */

function announce(message) {
  els.announcer.textContent = '';
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => {
    els.announcer.textContent = message;
  }, 50);
}

/* ---------- 자동 저장 ---------- */

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, SAVE_DELAY);
}

function flushSave() {
  clearTimeout(saveTimer);
  saveTimer = null;
  saveState(state);
}

function onPageHide() {
  if (saveTimer !== null) {
    flushSave();
  }
}

/* ---------- UI 상태 갱신 ---------- */

function updateUi() {
  els.toolButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.tool === state.tool));
  });
  els.canvas.classList.toggle('is-picker', state.tool === 'picker');

  els.undoButton.disabled = !canUndo(getHistory());
  els.redoButton.disabled = !canRedo(getHistory());

  els.gridButton.setAttribute('aria-pressed', String(state.showGrid));
  els.scaleSelect.value = String(state.scale);

  const name = colorName(state.color);
  const customSelected = !name;
  els.swatches.forEach((button) => {
    button.setAttribute('aria-pressed', String(!customSelected && button.dataset.hex === state.color));
  });
  if (els.customInput.value !== state.customColor) {
    els.customInput.value = state.customColor;
  }
  els.customWrap.classList.toggle('is-selected', customSelected);
  els.customWrap.style.setProperty('--swatch', state.customColor);
  els.customInput.setAttribute('aria-label', `사용자 지정 색 (현재 ${state.customColor})`);

  if (state.tool === 'eraser') {
    els.currentSwatch.classList.add('is-transparent');
    els.currentSwatch.style.removeProperty('--swatch');
    els.currentText.textContent = '지우개(투명)';
  } else {
    els.currentSwatch.classList.remove('is-transparent');
    els.currentSwatch.style.setProperty('--swatch', state.color);
    els.currentText.textContent = `${name || '사용자 색'} ${state.color}`;
  }
}

/* ---------- 캔버스 그리기 ---------- */

function readTheme() {
  const styles = getComputedStyle(document.documentElement);
  theme.checkerA = styles.getPropertyValue('--checker-a').trim();
  theme.checkerB = styles.getPropertyValue('--checker-b').trim();
  theme.gridLine = styles.getPropertyValue('--grid-line').trim();
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const cssSize = els.canvas.clientWidth;
  if (!cssSize) {
    return;
  }
  const size = Math.max(SIZE, Math.round(cssSize * dpr));
  if (els.canvas.width !== size || els.canvas.height !== size) {
    els.canvas.width = size;
    els.canvas.height = size;
  }
  requestRender();
}

function requestRender() {
  dirty = true;
  if (frameRequested) {
    return;
  }
  frameRequested = true;
  requestAnimationFrame(() => {
    frameRequested = false;
    if (dirty) {
      dirty = false;
      render();
    }
  });
}

function render() {
  const ctx = els.ctx;
  const size = els.canvas.width;
  const edges = [];
  for (let i = 0; i <= SIZE; i += 1) {
    edges.push(Math.round(i * size / SIZE));
  }
  ctx.clearRect(0, 0, size, size);

  for (let y = 0; y < SIZE; y += 1) {
    const y0 = edges[y];
    const y1 = edges[y + 1];
    const ym = Math.round((y0 + y1) / 2);
    for (let x = 0; x < SIZE; x += 1) {
      const x0 = edges[x];
      const x1 = edges[x + 1];
      const value = state.pixels[y * SIZE + x];
      if (value === null) {
        const xm = Math.round((x0 + x1) / 2);
        ctx.fillStyle = theme.checkerA;
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        ctx.fillStyle = theme.checkerB;
        ctx.fillRect(xm, y0, x1 - xm, ym - y0);
        ctx.fillRect(x0, ym, xm - x0, y1 - ym);
      } else {
        ctx.fillStyle = value;
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      }
    }
  }

  if (state.showGrid) {
    ctx.fillStyle = theme.gridLine;
    for (let i = 1; i < SIZE; i += 1) {
      const p = Math.min(size - 1, edges[i]);
      const passes = i % 4 === 0 ? 2 : 1;
      for (let n = 0; n < passes; n += 1) {
        ctx.fillRect(p, 0, 1, size);
        ctx.fillRect(0, p, size, 1);
      }
    }
  }
}

/* ---------- 이벤트 연결 ---------- */

function bindEvents() {
  const canvas = els.canvas;
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);
  canvas.addEventListener('lostpointercapture', endStroke);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  els.toolButtons.forEach((button) => {
    button.addEventListener('click', () => setTool(button.dataset.tool));
  });
  els.undoButton.addEventListener('click', doUndo);
  els.redoButton.addEventListener('click', doRedo);
  els.gridButton.addEventListener('click', toggleGrid);
  els.clearButton.addEventListener('click', clearAll);
  els.scaleSelect.addEventListener('change', onScaleChange);
  els.saveButton.addEventListener('click', onSave);
  els.customInput.addEventListener('input', onCustomInput);

  document.addEventListener('keydown', onKeyDown);
  window.addEventListener('pagehide', onPageHide);

  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(() => resizeCanvas());
    observer.observe(canvas);
  } else {
    window.addEventListener('resize', resizeCanvas);
  }

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const onSchemeChange = () => {
    readTheme();
    requestRender();
  };
  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', onSchemeChange);
  } else if (typeof media.addListener === 'function') {
    media.addListener(onSchemeChange);
  }
}

init();
