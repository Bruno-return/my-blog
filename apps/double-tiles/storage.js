// Double Tiles — localStorage 저장 (접근이 막히면 조용히 메모리로 동작)

const BEST_KEY = 'double-tiles:best';
const GAME_KEY = 'double-tiles:game';

const memory = new Map();

function readItem(key) {
  try {
    const value = window.localStorage.getItem(key);
    if (value !== null) return value;
  } catch (err) {
    // localStorage를 쓸 수 없는 환경: 메모리 값 사용
  }
  return memory.has(key) ? memory.get(key) : null;
}

function writeItem(key, value) {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch (err) {
    // 저장 실패는 무시 (메모리에는 남아 있음)
  }
}

function removeItem(key) {
  memory.delete(key);
  try {
    window.localStorage.removeItem(key);
  } catch (err) {
    // 무시
  }
}

export function loadBest() {
  const n = Number(readItem(BEST_KEY));
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export function saveBest(n) {
  writeItem(BEST_KEY, String(Math.max(0, Math.floor(Number(n) || 0))));
}

export function loadGame() {
  const raw = readItem(GAME_KEY);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

export function saveGame(obj) {
  try {
    writeItem(GAME_KEY, JSON.stringify(obj));
  } catch (err) {
    // 직렬화 실패는 무시
  }
}

export function clearGame() {
  removeItem(GAME_KEY);
}
