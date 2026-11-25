// undo/redo 스택 (순수)

export const HISTORY_LIMIT = 50;

export function createHistory() {
  return { undo: [], redo: [] };
}

export function record(history, before) {
  const undoStack = history.undo.concat([before]);
  while (undoStack.length > HISTORY_LIMIT) {
    undoStack.shift();
  }
  return { undo: undoStack, redo: [] };
}

export function undo(history, current) {
  if (history.undo.length === 0) {
    return null;
  }
  const undoStack = history.undo.slice(0, -1);
  const pixels = history.undo[history.undo.length - 1];
  const redoStack = history.redo.concat([current]);
  return { history: { undo: undoStack, redo: redoStack }, pixels };
}

export function redo(history, current) {
  if (history.redo.length === 0) {
    return null;
  }
  const redoStack = history.redo.slice(0, -1);
  const pixels = history.redo[history.redo.length - 1];
  const undoStack = history.undo.concat([current]);
  while (undoStack.length > HISTORY_LIMIT) {
    undoStack.shift();
  }
  return { history: { undo: undoStack, redo: redoStack }, pixels };
}

export function canUndo(history) {
  return history.undo.length > 0;
}

export function canRedo(history) {
  return history.redo.length > 0;
}
