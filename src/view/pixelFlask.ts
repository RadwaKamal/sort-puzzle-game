// Procedural pixel-grid profile for the flask silhouette: a classic narrow-
// neck, round-bottom potion flask, staircase-tapered the way hand-drawn
// pixel art steps out curves instead of using smooth diagonals. FlaskView
// draws the glass shell and the liquid cell-by-cell from this single
// profile so they always agree on the exact silhouette, at any flask size.
// Cell classification (outline/highlight/shadow/hollow) is shared with
// pixelPanel.ts's chamfered button shapes via pixelGrid.ts.

import { makeClassifier } from './pixelGrid';
import type { RowBounds } from './pixelGrid';

export type { RowBounds, CellKind } from './pixelGrid';

export const GRID_COLS = 10;
export const GRID_ROWS = 22;

// Liquid only ever occupies the body - the neck/shoulder above stay empty so
// a full flask reads as filled to the shoulder, not spilling into the spout.
export const LIQUID_TOP_ROW = 6;
export const LIQUID_BOTTOM_ROW = GRID_ROWS - 1;

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

export const { classifyCell, interiorBounds } = makeClassifier(rowBounds);
