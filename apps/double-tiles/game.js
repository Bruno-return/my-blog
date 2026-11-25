// Double Tiles — 순수 게임 로직 (DOM, window, localStorage 접근 없음)

export const SIZE = 4;

const FIRST_TARGET = 64;
const DIRECTIONS = ['left', 'right', 'up', 'down'];

const valueOf = (cell) => {
  if (typeof cell === 'number') return cell;
  return cell ? cell.value : 0;
};

const emptyGrid = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(null));

const copyGrid = (grid) => grid.map((row) => row.slice());

const isPowerOfTwo = (n) => Number.isInteger(n) && n >= 2 && (n & (n - 1)) === 0;

function gridMax(grid) {
  let max = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell && cell.value > max) max = cell.value;
    }
  }
  return max;
}

// 도달한 최고 타일보다 큰 첫 목표까지 단계를 올린다.
function advanceStage(stage, target, maxTile) {
  let nextStage = stage;
  let nextTarget = target;
  while (maxTile >= nextTarget) {
    nextStage += 1;
    nextTarget *= 2;
  }
  return { stage: nextStage, target: nextTarget, stageUp: nextStage - stage };
}

// 줄 하나를 선두(인덱스 0) 방향으로 처리한다.
// 칸은 Tile 객체, 숫자, null(또는 0)을 받을 수 있다.
// 합쳐진 칸은 숫자 입력이면 숫자, Tile 입력이면 { value, from: [idA, idB] } (id는 move가 붙임).
export function slideLine(line) {
  const items = line.filter((cell) => valueOf(cell) > 0);
  const out = [];
  const merges = [];
  let gained = 0;

  for (let i = 0; i < items.length; i += 1) {
    const a = items[i];
    const b = items[i + 1];
    if (b !== undefined && valueOf(a) === valueOf(b)) {
      const value = valueOf(a) * 2;
      const isNumber = typeof a === 'number';
      const from = isNumber ? null : [a.id, b.id];
      merges.push({ index: out.length, value, from });
      out.push(isNumber ? value : { value, from });
      gained += value;
      i += 1;
    } else {
      out.push(a);
    }
  }

  while (out.length < line.length) out.push(null);
  return { line: out, gained, merges };
}

// 방향별로 i번째 줄의 좌표를 선두부터 돌려준다.
function lineCoords(direction, index) {
  const coords = [];
  for (let k = 0; k < SIZE; k += 1) {
    if (direction === 'left') coords.push([index, k]);
    else if (direction === 'right') coords.push([index, SIZE - 1 - k]);
    else if (direction === 'up') coords.push([k, index]);
    else coords.push([SIZE - 1 - k, index]);
  }
  return coords;
}

export function addRandomTile(state, rng = Math.random) {
  const empties = [];
  state.grid.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (!cell) empties.push([r, c]);
    });
  });
  if (empties.length === 0) return state;

  const pick = Math.min(empties.length - 1, Math.floor(rng() * empties.length));
  const [r, c] = empties[pick];
  const value = rng() < 0.9 ? 2 : 4;
  const tile = { id: state.nextId, value };
  const grid = copyGrid(state.grid);
  grid[r][c] = tile;

  return {
    ...state,
    grid,
    maxTile: Math.max(state.maxTile, value),
    nextId: state.nextId + 1
  };
}

export function canMove(state) {
  const { grid } = state;
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      const cell = grid[r][c];
      if (!cell) return true;
      if (c + 1 < SIZE && grid[r][c + 1] && grid[r][c + 1].value === cell.value) return true;
      if (r + 1 < SIZE && grid[r + 1][c] && grid[r + 1][c].value === cell.value) return true;
    }
  }
  return false;
}

export function createGame(rng = Math.random) {
  let state = {
    size: SIZE,
    grid: emptyGrid(),
    score: 0,
    stage: 1,
    target: FIRST_TARGET,
    maxTile: 0,
    over: false,
    nextId: 1
  };
  state = addRandomTile(state, rng);
  state = addRandomTile(state, rng);
  return state;
}

export function move(state, direction, rng = Math.random) {
  const unchanged = { state, moved: false, gained: 0, merged: [], spawned: null, stageUp: 0 };
  if (state.over || !DIRECTIONS.includes(direction)) return unchanged;

  const grid = emptyGrid();
  const merged = [];
  let nextId = state.nextId;
  let gained = 0;
  let moved = false;

  for (let i = 0; i < SIZE; i += 1) {
    const coords = lineCoords(direction, i);
    const before = coords.map(([r, c]) => state.grid[r][c]);
    const result = slideLine(before);
    gained += result.gained;

    result.line.forEach((cell, k) => {
      const [r, c] = coords[k];
      let placed = cell;
      if (cell && cell.from) {
        placed = { id: nextId, value: cell.value };
        merged.push({ id: nextId, value: cell.value, from: cell.from });
        nextId += 1;
      }
      grid[r][c] = placed;
      if (placed !== before[k]) moved = true;
    });
  }

  if (!moved) return unchanged;

  const nextIdBeforeSpawn = nextId;
  let next = addRandomTile({ ...state, grid, score: state.score + gained, nextId }, rng);

  let spawned = null;
  if (next.nextId !== nextIdBeforeSpawn) {
    for (const row of next.grid) {
      for (const cell of row) {
        if (cell && cell.id === nextIdBeforeSpawn) spawned = cell;
      }
    }
  }

  const maxTile = Math.max(next.maxTile, gridMax(next.grid));
  const { stage, target, stageUp } = advanceStage(next.stage, next.target, maxTile);
  next = { ...next, maxTile, stage, target };
  next = { ...next, over: !canMove(next) };

  return { state: next, moved: true, gained, merged, spawned, stageUp };
}

export function serialize(state) {
  return {
    size: state.size,
    grid: state.grid.map((row) => row.map((cell) => (cell ? cell.value : 0))),
    score: state.score,
    stage: state.stage,
    target: state.target,
    maxTile: state.maxTile,
    over: state.over
  };
}

export function deserialize(obj) {
  if (!obj || typeof obj !== 'object') return null;
  if (obj.size !== SIZE) return null;
  if (!Array.isArray(obj.grid) || obj.grid.length !== SIZE) return null;
  if (!Number.isInteger(obj.score) || obj.score < 0) return null;

  let nextId = 1;
  const grid = [];
  for (const row of obj.grid) {
    if (!Array.isArray(row) || row.length !== SIZE) return null;
    const newRow = [];
    for (const v of row) {
      if (v === null || v === 0) {
        newRow.push(null);
      } else if (isPowerOfTwo(v)) {
        newRow.push({ id: nextId, value: v });
        nextId += 1;
      } else {
        return null;
      }
    }
    grid.push(newRow);
  }

  const maxTile = gridMax(grid);
  let stage = obj.stage;
  let target = obj.target;
  if (!Number.isInteger(stage) || stage < 1 || !isPowerOfTwo(target) || target < FIRST_TARGET) {
    stage = 1;
    target = FIRST_TARGET;
  }
  const advanced = advanceStage(stage, target, maxTile);

  const state = {
    size: SIZE,
    grid,
    score: obj.score,
    stage: advanced.stage,
    target: advanced.target,
    maxTile,
    over: false,
    nextId
  };
  return { ...state, over: obj.over === true || !canMove(state) };
}
