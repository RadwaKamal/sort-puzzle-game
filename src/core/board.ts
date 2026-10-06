// Pure game rules: no Phaser, no rendering. A board is an array of flasks;
// each flask is a stack of colors with index 0 at the bottom and the last
// index as the top (the layer the player sees and pours from).

export const LAYERS_PER_FLASK = 4;

export type Color = number;
export type Flask = Color[];
export type Board = Flask[];

export function createEmptyFlask(): Flask {
  return [];
}

export function isFlaskEmpty(flask: Flask): boolean {
  return flask.length === 0;
}

export function isFlaskFull(flask: Flask, capacity = LAYERS_PER_FLASK): boolean {
  return flask.length >= capacity;
}

// A flask is "solved" if it's empty, or full and every layer is the same color.
export function isFlaskSolved(flask: Flask, capacity = LAYERS_PER_FLASK): boolean {
  if (isFlaskEmpty(flask)) return true;
  if (!isFlaskFull(flask, capacity)) return false;
  return flask.every((color) => color === flask[0]);
}

export function topColor(flask: Flask): Color | undefined {
  return flask[flask.length - 1];
}

// How many layers would move from source to target if poured, including 0
// when the pour is illegal. Counts the consecutive run of the source's top
// color, capped by the target's remaining space.
export function pourAmount(source: Flask, target: Flask, capacity = LAYERS_PER_FLASK): number {
  if (isFlaskEmpty(source)) return 0;

  const sourceTop = topColor(source) as Color;
  if (!isFlaskEmpty(target) && topColor(target) !== sourceTop) return 0;

  let runLength = 0;
  for (let i = source.length - 1; i >= 0 && source[i] === sourceTop; i--) {
    runLength++;
  }

  const space = capacity - target.length;
  return Math.min(runLength, space);
}

export function canPour(source: Flask, target: Flask, capacity = LAYERS_PER_FLASK): boolean {
  return pourAmount(source, target, capacity) > 0;
}

// Returns new [source, target] flasks after pouring; does not mutate inputs.
export function pour(source: Flask, target: Flask, capacity = LAYERS_PER_FLASK): [Flask, Flask] {
  const amount = pourAmount(source, target, capacity);
  if (amount === 0) return [source, target];

  const moved = source.slice(source.length - amount);
  const newSource = source.slice(0, source.length - amount);
  const newTarget = [...target, ...moved];
  return [newSource, newTarget];
}

// Returns a new board with the move applied. Assumes fromIndex !== toIndex
// and the move is legal; callers should check canPour first.
export function applyMove(
  board: Board,
  fromIndex: number,
  toIndex: number,
  capacity = LAYERS_PER_FLASK,
): Board {
  const [newSource, newTarget] = pour(board[fromIndex], board[toIndex], capacity);
  const newBoard = board.slice();
  newBoard[fromIndex] = newSource;
  newBoard[toIndex] = newTarget;
  return newBoard;
}

export function getLegalMoves(board: Board, capacity = LAYERS_PER_FLASK): [number, number][] {
  const moves: [number, number][] = [];
  for (let from = 0; from < board.length; from++) {
    if (isFlaskEmpty(board[from])) continue;
    for (let to = 0; to < board.length; to++) {
      if (from === to) continue;
      if (canPour(board[from], board[to], capacity)) {
        moves.push([from, to]);
      }
    }
  }
  return moves;
}

export function isBoardSolved(board: Board, capacity = LAYERS_PER_FLASK): boolean {
  return board.every((flask) => isFlaskSolved(flask, capacity));
}

// Compact string key for a board state, used to dedupe states in the solver.
export function hashBoard(board: Board): string {
  return board.map((flask) => flask.join(',')).join('|');
}
