// localStorage 읽기/쓰기/검증

import { CELL_COUNT, isValidColor } from './pixels.js';

export const STORAGE_KEY = 'pixel-editor:v1';

const TOOLS = ['pen', 'eraser', 'fill', 'picker'];
const SCALES = [1, 8, 16, 32];

export function validateState(data) {
  if (!data || typeof data !== 'object' || data.version !== 1) {
    return null;
  }
  const result = {};
  const px = data.pixels;
  if (Array.isArray(px) && px.length === CELL_COUNT && px.every((p) => p === null || isValidColor(p))) {
    result.pixels = px.slice();
  }
  if (isValidColor(data.color)) {
    result.color = data.color;
  }
  if (isValidColor(data.customColor)) {
    result.customColor = data.customColor;
  }
  if (TOOLS.includes(data.tool)) {
    result.tool = data.tool === 'picker' ? 'pen' : data.tool;
  }
  if (typeof data.showGrid === 'boolean') {
    result.showGrid = data.showGrid;
  }
  if (SCALES.includes(data.scale)) {
    result.scale = data.scale;
  }
  return result;
}

export function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return validateState(JSON.parse(raw));
  } catch (err) {
    return null;
  }
}

export function saveState(state) {
  try {
    const data = {
      version: 1,
      pixels: state.pixels,
      color: state.color,
      customColor: state.customColor,
      tool: state.tool,
      showGrid: state.showGrid,
      scale: state.scale
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    // 저장이 막힌 환경에서는 조용히 무시한다.
  }
}
