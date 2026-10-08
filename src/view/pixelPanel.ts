import Phaser from 'phaser';
import { makeClassifier } from './pixelGrid';
import type { RowBounds } from './pixelGrid';

// Base "virtual pixel" size (in real px) for every chamfered UI panel
// (buttons, badges, level-select cells) - independent of each panel's
// width/height, so a tiny badge and a big button read as built from the
// same size pixel, matching how real pixel-art UI keeps one base unit
// across differently sized elements.
const CELL = 6;
const CORNER_STEPS = 2;

// A rectangle chamfered with a 2-step pixel staircase at each corner instead
// of a smooth round-rect - same "step curves, don't smooth them" language as
// the flask's shoulder/foot tapers in pixelFlask.ts. `cols`/`rows` are given
// in cells; the chamfer depth shrinks automatically on panels too small to
// fit two full steps (e.g. the HARD badge) so corners never overlap.
function chamferedRowBounds(cols: number, rows: number): (row: number) => RowBounds | null {
  const steps = Math.max(0, Math.min(CORNER_STEPS, Math.floor((rows - 1) / 2), Math.floor((cols - 1) / 2)));
  return (row: number): RowBounds | null => {
    if (row < 0 || row >= rows) return null;
    const nearestEdge = Math.min(row, rows - 1 - row);
    const inset = nearestEdge < steps ? steps - nearestEdge : 0;
    const left = inset;
    const right = cols - 1 - inset;
    if (left > right) return null;
    return { left, right };
  };
}

export interface PixelPanelLayers {
  shadow: Phaser.GameObjects.Graphics;
  fill: Phaser.GameObjects.Graphics;
  bevel: Phaser.GameObjects.Graphics;
  outline: Phaser.GameObjects.Graphics;
}

export interface PixelPanelStyle {
  fillColor: number;
  outlineColor: number;
  shadowColor?: number;
  shadowOffset?: number;
  highlightAlpha?: number;
  shadeAlpha?: number;
}

// Draws a chunky pixel-art panel (shadow + flat fill + glass-style bevel
// sheen + thick outline) into four pre-created Graphics layers, cell by
// cell, from a chamfered-rect profile - the same technique FlaskView uses
// for the bottle shell, just with a rectangular silhouette instead of an
// organic one. Shared by Button, the level-select grid cells, and the HARD
// badge so every pixel-art panel in the game reads as one visual family.
export function drawPixelPanel(layers: PixelPanelLayers, w: number, h: number, style: PixelPanelStyle): void {
  const cols = Math.max(3, Math.round(w / CELL));
  const rows = Math.max(3, Math.round(h / CELL));
  const cellW = w / cols;
  const cellH = h / rows;
  const bounds = chamferedRowBounds(cols, rows);
  const { classifyCell, interiorBounds } = makeClassifier(bounds);

  const shadowOffset = style.shadowOffset ?? 0;
  const highlightAlpha = style.highlightAlpha ?? 0.28;
  const shadeAlpha = style.shadeAlpha ?? 0.2;

  layers.shadow.clear();
  layers.fill.clear();
  layers.bevel.clear();
  layers.outline.clear();

  if (style.shadowColor !== undefined) layers.shadow.fillStyle(style.shadowColor, 1);
  layers.fill.fillStyle(style.fillColor, 1);
  layers.outline.fillStyle(style.outlineColor, 1);

  for (let row = 0; row < rows; row++) {
    const rb = bounds(row);
    if (!rb) continue;
    const y0 = -h / 2 + row * cellH;

    if (style.shadowColor !== undefined) {
      const rowX0 = -w / 2 + rb.left * cellW;
      const rowX1 = -w / 2 + (rb.right + 1) * cellW;
      layers.shadow.fillRect(rowX0 + shadowOffset, y0 + shadowOffset, rowX1 - rowX0, cellH);
    }

    const interior = interiorBounds(row);
    if (interior) {
      const ix0 = -w / 2 + interior.left * cellW;
      const ix1 = -w / 2 + (interior.right + 1) * cellW;
      layers.fill.fillRect(ix0, y0, ix1 - ix0, cellH);
    }

    for (let col = rb.left; col <= rb.right; col++) {
      const kind = classifyCell(row, col);
      const cx0 = -w / 2 + col * cellW;
      if (kind === 'outline') {
        layers.outline.fillRect(cx0, y0, cellW, cellH);
      } else if (kind === 'highlight') {
        layers.bevel.fillStyle(0xffffff, highlightAlpha);
        layers.bevel.fillRect(cx0, y0, cellW, cellH);
      } else if (kind === 'shadow') {
        layers.bevel.fillStyle(0x000000, shadeAlpha);
        layers.bevel.fillRect(cx0, y0, cellW, cellH);
      }
    }
  }
}
