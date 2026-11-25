// Double Tiles — 렌더링, 입력 처리, aria-live 알림 (진입점)

import { SIZE, createGame, move, serialize, deserialize } from './game.js';
import { loadBest, saveBest, loadGame, saveGame, clearGame } from './storage.js';

const KEY_DIRECTIONS = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  a: 'left',
  d: 'right',
  w: 'up',
  s: 'down'
};

const SWIPE_MIN = 30;
const STATUS_DEBOUNCE = 400;
const LEAVE_DELAY = 150;

const els = {
  board: document.getElementById('board'),
  tiles: document.getElementById('tiles'),
  score: document.getElementById('score'),
  scoreAdd: document.getElementById('score-add'),
  best: document.getElementById('best'),
  target: document.getElementById('target'),
  stage: document.getElementById('stage'),
  targetBadge: document.getElementById('target-badge'),
  newGame: document.getElementById('new-game'),
  gameOver: document.getElementById('game-over'),
  goSummary: document.getElementById('go-summary'),
  goMax: document.getElementById('go-max'),
  restart: document.getElementById('restart'),
  srStatus: document.getElementById('sr-status'),
  srAlert: document.getElementById('sr-alert')
};

const tileEls = new Map();
const leaving = new Set();

let state = null;
let best = 0;
let statusTimer = 0;
let pendingStage = '';
let pendingScore = '';
let swipe = null;

const fmt = (n) => n.toLocaleString('ko-KR');

const levelOf = (value) => {
  const level = Math.round(Math.log2(value));
  return level >= 12 ? 'max' : String(level);
};

// ---------- 렌더링 ----------

function clearLeaving() {
  for (const el of leaving) el.remove();
  leaving.clear();
}

function createTileEl(tile) {
  const el = document.createElement('div');
  el.className = 'tile';
  const inner = document.createElement('div');
  inner.className = 'tile-inner';
  el.append(inner);
  els.tiles.append(el);
  tileEls.set(tile.id, el);
  return el;
}

function updateTileEl(el, tile, r, c) {
  const text = String(tile.value);
  el.dataset.level = levelOf(tile.value);
  el.dataset.digits = String(Math.min(text.length, 5));
  el.style.setProperty('--row', String(r));
  el.style.setProperty('--col', String(c));
  el.firstElementChild.textContent = text;
}

function render(current, result) {
  clearLeaving();

  const positions = new Map();
  current.grid.forEach((row, r) => {
    row.forEach((tile, c) => {
      if (tile) positions.set(tile.id, { tile, r, c });
    });
  });

  for (const el of tileEls.values()) el.classList.remove('is-new', 'is-merged');

  // 합쳐진 타일의 원래 두 타일은 합쳐질 자리로 옮긴 뒤 지운다.
  const mergedIds = new Set();
  if (result) {
    for (const m of result.merged) {
      mergedIds.add(m.id);
      const dest = positions.get(m.id);
      for (const fromId of m.from) {
        const el = tileEls.get(fromId);
        if (!el) continue;
        tileEls.delete(fromId);
        if (dest) {
          el.style.setProperty('--row', String(dest.r));
          el.style.setProperty('--col', String(dest.c));
        }
        el.classList.add('is-leaving');
        leaving.add(el);
      }
    }
    if (leaving.size > 0) {
      const batch = new Set(leaving);
      window.setTimeout(() => {
        for (const el of batch) {
          el.remove();
          leaving.delete(el);
        }
      }, LEAVE_DELAY);
    }
  }

  // 격자에 없는 타일 제거
  for (const [id, el] of tileEls) {
    if (!positions.has(id)) {
      el.remove();
      tileEls.delete(id);
    }
  }

  // 추가·갱신
  for (const { tile, r, c } of positions.values()) {
    let el = tileEls.get(tile.id);
    if (!el) {
      el = createTileEl(tile);
      if (result && mergedIds.has(tile.id)) el.classList.add('is-merged');
      else el.classList.add('is-new');
    }
    updateTileEl(el, tile, r, c);
  }

  renderScoreboard(current);
}

function renderScoreboard(current) {
  els.score.textContent = fmt(current.score);
  els.best.textContent = fmt(best);
  els.target.textContent = fmt(current.target);
  els.stage.textContent = `${current.stage}단계`;
}

function resetBoard() {
  clearLeaving();
  for (const el of tileEls.values()) el.remove();
  tileEls.clear();
}

function restartAnimation(el, className) {
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

function showGain(gained) {
  els.scoreAdd.textContent = `+${fmt(gained)}`;
  restartAnimation(els.scoreAdd, 'is-show');
}

// ---------- 알림 ----------

function queueStatus() {
  window.clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => {
    els.srStatus.textContent = [pendingStage, pendingScore].filter(Boolean).join(' ');
    pendingStage = '';
    pendingScore = '';
  }, STATUS_DEBOUNCE);
}

function cancelStatus() {
  window.clearTimeout(statusTimer);
  pendingStage = '';
  pendingScore = '';
}

function announceGameOver(current) {
  // 게임 오버를 만든 이동에서 단계를 달성했다면 그 알림은 버리지 않고 바로 내보낸다.
  const stageText = pendingStage;
  window.clearTimeout(statusTimer);
  if (stageText) els.srStatus.textContent = stageText;
  pendingStage = '';
  pendingScore = '';
  els.srAlert.textContent = `게임 오버. 최종 점수 ${fmt(current.score)}, ${current.stage}단계`;
}

// ---------- 게임 오버 ----------

function openGameOver(current) {
  els.goSummary.textContent = `점수 ${fmt(current.score)} · ${current.stage}단계`;
  els.goMax.textContent = `최고 타일 ${fmt(current.maxTile)}`;
  els.gameOver.hidden = false;
  els.restart.focus();
}

function closeGameOver() {
  els.gameOver.hidden = true;
}

// ---------- 상태 변경 ----------

function updateBest(current) {
  if (current.score > best) {
    best = current.score;
    saveBest(best);
  }
}

function startNewGame() {
  state = createGame();
  resetBoard();
  closeGameOver();
  cancelStatus();
  els.srAlert.textContent = '';
  saveGame(serialize(state));
  render(state, null);
  els.board.focus({ preventScroll: true });
}

function handleMove(direction) {
  if (!state || state.over) return;
  const result = move(state, direction);
  if (!result.moved) return;

  state = result.state;
  updateBest(state);
  render(state, result);

  if (result.gained > 0) {
    showGain(result.gained);
    pendingScore = `점수 ${fmt(state.score)}, ${fmt(result.gained)} 획득`;
  }
  if (result.stageUp > 0) {
    restartAnimation(els.targetBadge, 'is-glow');
    pendingStage = `${state.stage}단계 달성! 다음 목표 ${fmt(state.target)}`;
  }

  if (state.over) {
    clearGame();
    announceGameOver(state);
    openGameOver(state);
    return;
  }

  saveGame(serialize(state));
  if (pendingScore || pendingStage) queueStatus();
}

// ---------- 입력: 키보드 ----------

function onKeydown(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '';
  if (tag === 'input' || tag === 'textarea') return;

  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const direction = KEY_DIRECTIONS[key];
  if (!direction) return;

  e.preventDefault();
  if (!els.gameOver.hidden) return;
  handleMove(direction);
}

// ---------- 입력: 스와이프 ----------

function onPointerDown(e) {
  els.board.focus({ preventScroll: true });
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  swipe = { id: e.pointerId, x: e.clientX, y: e.clientY };
  try {
    els.board.setPointerCapture(e.pointerId);
  } catch (err) {
    // 포인터 캡처를 못 해도 스와이프는 동작한다.
  }
}

function onPointerUp(e) {
  if (!swipe || swipe.id !== e.pointerId) return;
  const dx = e.clientX - swipe.x;
  const dy = e.clientY - swipe.y;
  swipe = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return;

  let direction;
  if (Math.abs(dx) > Math.abs(dy)) direction = dx > 0 ? 'right' : 'left';
  else direction = dy > 0 ? 'down' : 'up';
  handleMove(direction);
}

function onPointerCancel() {
  swipe = null;
}

// ---------- 시작 ----------

function init() {
  best = loadBest();
  const restored = deserialize(loadGame());
  if (restored && restored.over === false && restored.size === SIZE) {
    state = restored;
  } else {
    state = createGame();
    saveGame(serialize(state));
  }
  updateBest(state);
  render(state, null);

  document.addEventListener('keydown', onKeydown);
  els.board.addEventListener('pointerdown', onPointerDown);
  els.board.addEventListener('pointerup', onPointerUp);
  els.board.addEventListener('pointercancel', onPointerCancel);
  els.newGame.addEventListener('click', startNewGame);
  els.restart.addEventListener('click', startNewGame);
}

init();
