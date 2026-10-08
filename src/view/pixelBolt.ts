// Procedural pixel-grid profile for the spark/bolt logo mark (the app icon
// and splash screen's mark - see assets/icon.png, splash.png). Precomputed
// by rasterizing a standard zigzag bolt polygon (the same point set Feather
// Icons' "zap" uses) onto this grid via canvas Path2D fill + supersampled
// coverage sampling - see the logo review artifact for the one-off
// rasterizer this table came from. Hardcoded here, matching pixelFlask.ts's
// pattern of an explicit profile table, rather than re-rasterizing at
// runtime every time the mark is drawn.

import { makeClassifier } from './pixelGrid';
import type { RowBounds } from './pixelGrid';

export type { RowBounds, CellKind } from './pixelGrid';

export const GRID_COLS = 14;
export const GRID_ROWS = 22;

const ROWS: Array<RowBounds | null> = [
  null,
  null,
  { left: 7, right: 7 },
  { left: 6, right: 6 },
  { left: 6, right: 6 },
  { left: 5, right: 6 },
  { left: 5, right: 6 },
  { left: 4, right: 6 },
  { left: 3, right: 6 },
  { left: 3, right: 12 },
  { left: 2, right: 11 },
  { left: 2, right: 11 },
  { left: 1, right: 10 },
  { left: 7, right: 10 },
  { left: 7, right: 9 },
  { left: 7, right: 8 },
  { left: 7, right: 8 },
  { left: 7, right: 7 },
  { left: 7, right: 7 },
  { left: 6, right: 6 },
  null,
  null,
];

export function rowBounds(row: number): RowBounds | null {
  if (row < 0 || row >= GRID_ROWS) return null;
  return ROWS[row];
}

export const { classifyCell, interiorBounds } = makeClassifier(rowBounds);

// Row range that actually has interior fill - the pointed tips are only
// 1 cell wide, too narrow to hold a visible liquid band.
function findFillTop(): number {
  for (let r = 0; r < GRID_ROWS; r++) if (interiorBounds(r)) return r;
  return 0;
}
function findFillBottom(): number {
  for (let r = GRID_ROWS - 1; r >= 0; r--) if (interiorBounds(r)) return r;
  return GRID_ROWS - 1;
}
export const FILL_TOP_ROW = findFillTop();
export const FILL_BOTTOM_ROW = findFillBottom();
