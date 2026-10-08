// Shared cell-classification core for every pixel-art shape in the game
// (flask silhouettes in pixelFlask.ts, chamfered button/panel shapes in
// pixelPanel.ts). A shape is defined purely as a per-row column span
// (`RowBounds`); this module turns that into outline/highlight/shadow/hollow
// cells by checking each filled cell's 4-neighbours, so staircase step edges
// (wherever a row is narrower or wider than its neighbour) get outlined
// automatically along with the plain left/right/top/bottom edges.

export interface RowBounds {
  left: number;
  right: number; // inclusive
}

export type CellKind = 'outline' | 'highlight' | 'shadow' | 'hollow';

export interface PixelClassifier {
  classifyCell(row: number, col: number): CellKind | null;
  // Interior column span (inclusive) one cell in from the silhouette on each
  // side, so a fill sits just inside the outline rather than underneath it.
  interiorBounds(row: number): RowBounds | null;
}

export function makeClassifier(rowBounds: (row: number) => RowBounds | null): PixelClassifier {
  function isFilled(row: number, col: number): boolean {
    const b = rowBounds(row);
    return b !== null && col >= b.left && col <= b.right;
  }

  function classifyCell(row: number, col: number): CellKind | null {
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

  function interiorBounds(row: number): RowBounds | null {
    const b = rowBounds(row);
    if (!b) return null;
    const left = b.left + 1;
    const right = b.right - 1;
    if (left > right) return null;
    return { left, right };
  }

  return { classifyCell, interiorBounds };
}
