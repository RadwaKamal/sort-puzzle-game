// Procedural pixel-grid profile for the flask silhouette: a classic narrow-
// neck, round-bottom potion flask, staircase-tapered the way hand-drawn
// pixel art steps out curves instead of using smooth diagonals. FlaskView
// draws the glass shell and the liquid cell-by-cell from this single
// profile so they always agree on the exact silhouette, at any flask size.

export const GRID_COLS = 10;
export const GRID_ROWS = 22;

// Liquid only ever occupies the body - the neck/shoulder above stay empty so
// a full flask reads as filled to the shoulder, not spilling into the spout.
export const LIQUID_TOP_ROW = 6;
export const LIQUID_BOTTOM_ROW = GRID_ROWS - 1;

export interface RowBounds {
  left: number;
  right: number; // inclusive
}

const NECK: RowBounds = { left: 3, right: 6 };
const SHOULDER_1: RowBounds = { left: 2, right: 7 };
const SHOULDER_2: RowBounds = { left: 1, right: 8 };
const BODY: RowBounds = { left: 0, right: 9 };
const FOOT_1: RowBounds = { left: 1, right: 8 };
const FOOT_2: RowBounds = { left: 2, right: 7 };
const FOOT_3: RowBounds = { left: 3, right: 6 };

export function rowBounds(row: number): RowBounds | null {
  if (row < 0 || row >= GRID_ROWS) return null;
  if (row <= 3) return NECK;
  if (row === 4) return SHOULDER_1;
  if (row === 5) return SHOULDER_2;
  if (row <= 18) return BODY;
  if (row === 19) return FOOT_1;
  if (row === 20) return FOOT_2;
  return FOOT_3;
}

function isFilled(row: number, col: number): boolean {
  const b = rowBounds(row);
  return b !== null && col >= b.left && col <= b.right;
}

export type CellKind = 'outline' | 'highlight' | 'shadow' | 'hollow';

// A filled cell with any empty 4-neighbour is on the silhouette boundary -
// the outline, including the staircase steps at the shoulder/foot tapers.
// Of the remaining interior cells, the innermost column on each side is a
// glass highlight/shadow band; everything else is hollow (the liquid cavity).
export function classifyCell(row: number, col: number): CellKind | null {
  if (!isFilled(row, col)) return null;
  if (
    !isFilled(row - 1, col) ||
    !isFilled(row + 1, col) ||
    !isFilled(row, col - 1) ||
    !isFilled(row, col + 1)
  ) {
    return 'outline';
  }
  const b = rowBounds(row)!;
  if (col <= b.left + 1) return 'highlight';
  if (col >= b.right - 1) return 'shadow';
  return 'hollow';
}

// Interior column span (inclusive) available to the glass cavity/liquid at a
// row - one cell in from the silhouette on each side, so fill sits just
// inside the outline rather than underneath it.
export function interiorBounds(row: number): RowBounds | null {
  const b = rowBounds(row);
  if (!b) return null;
  const left = b.left + 1;
  const right = b.right - 1;
  if (left > right) return null;
  return { left, right };
}
