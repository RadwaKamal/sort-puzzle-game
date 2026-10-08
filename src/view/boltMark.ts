import Phaser from 'phaser';
import { theme } from '../theme';
import {
  FILL_BOTTOM_ROW,
  FILL_TOP_ROW,
  GRID_COLS,
  GRID_ROWS,
  classifyCell,
  interiorBounds,
  rowBounds,
} from './pixelBolt';

export interface BoltMarkOptions {
  fillFraction?: number; // 0-1, how far up the bolt the liquid rises. Default 0.55.
  glint?: boolean; // small sparkle flourish above the tip. Default true.
}

// Draws the pixel-art spark/bolt logo mark - the external app icon/splash
// mark (see assets/icon.png) - as an actual in-game Phaser graphic rather
// than an image asset, so it stays crisp at any size and is pixel-identical
// to the shipped assets (same grid, same classifier, same layering FlaskView
// uses for the bottle: shadow, dark cavity, semi-filled liquid with a bevel,
// glass-style sheen, thick outline). Returns a static Container - unlike
// FlaskView there's no re-render path, since the mark never changes state.
export function createBoltMark(
  scene: Phaser.Scene,
  size: number,
  options: BoltMarkOptions = {},
): Phaser.GameObjects.Container {
  const fillFraction = options.fillFraction ?? 0.55;
  const glint = options.glint ?? true;
  const cell = size / GRID_ROWS;
  const w = GRID_COLS * cell;
  const h = GRID_ROWS * cell;

  const shadow = scene.add.graphics();
  const cavity = scene.add.graphics();
  const liquid = scene.add.graphics();
  const shine = scene.add.graphics();
  const outline = scene.add.graphics();
  const glintGfx = scene.add.graphics();

  const cellRect = (
    row: number,
    colFrom: number,
    colTo: number,
    dx: number,
    dy: number,
  ): [number, number, number, number] => [
    -w / 2 + colFrom * cell + dx,
    -h / 2 + row * cell + dy,
    (colTo - colFrom + 1) * cell,
    cell,
  ];

  const shadowOffset = Math.max(2, cell * 0.5);
  shadow.fillStyle(0x000000, 0.9);
  for (let row = 0; row < GRID_ROWS; row++) {
    const b = rowBounds(row);
    if (b) shadow.fillRect(...cellRect(row, b.left, b.right, shadowOffset, shadowOffset));
  }

  cavity.fillStyle(0x1a1a24, 1);
  for (let row = 0; row < GRID_ROWS; row++) {
    const b = interiorBounds(row);
    if (b) cavity.fillRect(...cellRect(row, b.left, b.right, 0, 0));
  }

  const totalFillRows = FILL_BOTTOM_ROW - FILL_TOP_ROW + 1;
  const filledRows = Math.round(totalFillRows * fillFraction);
  const splitAt = Math.round(filledRows * 0.45);
  const bevelH = Math.max(1, cell * 0.16);
  const lowColor = theme.liquidColors[1]; // magenta
  const highColor = theme.liquidColors[3]; // violet
  for (let i = 0; i < filledRows; i++) {
    const row = FILL_BOTTOM_ROW - i;
    const b = interiorBounds(row);
    if (!b) continue;
    const [x, y, rw, rh] = cellRect(row, b.left, b.right, 0, 0);
    liquid.fillStyle(i < splitAt ? lowColor : highColor, 1);
    liquid.fillRect(x, y, rw, rh);
    liquid.fillStyle(0xffffff, 0.18);
    liquid.fillRect(x, y, rw, bevelH);
    liquid.fillStyle(0x000000, 0.18);
    liquid.fillRect(x, y + rh - bevelH, rw, bevelH);
  }
  if (filledRows > 0) {
    const topRow = FILL_BOTTOM_ROW - (filledRows - 1);
    const b = interiorBounds(topRow);
    if (b) {
      const [x, y, rw] = cellRect(topRow, b.left, b.right, 0, 0);
      liquid.fillStyle(0xffffff, 0.32);
      liquid.fillRect(x, y, rw, Math.max(1, cell * 0.2));
    }
  }

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const kind = classifyCell(row, col);
      if (kind === 'highlight') {
        shine.fillStyle(0xffffff, 0.22);
        shine.fillRect(...cellRect(row, col, col, 0, 0));
      } else if (kind === 'shadow') {
        shine.fillStyle(0x000000, 0.22);
        shine.fillRect(...cellRect(row, col, col, 0, 0));
      }
    }
  }

  outline.fillStyle(0xffffff, 1);
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (classifyCell(row, col) === 'outline') {
        outline.fillRect(...cellRect(row, col, col, 0, 0));
      }
    }
  }

  if (glint) {
    let tipRow = 0;
    while (tipRow < GRID_ROWS && !rowBounds(tipRow)) tipRow++;
    const tipBounds = rowBounds(tipRow);
    if (tipBounds) {
      const gx = -w / 2 + ((tipBounds.left + tipBounds.right + 1) / 2) * cell + cell * 2.2;
      const gy = -h / 2 + tipRow * cell - cell * 1.4;
      const r1 = cell * 1.5;
      const r2 = cell * 0.5;
      glintGfx.fillStyle(theme.accent.yellow, 1);
      const points: Phaser.Types.Math.Vector2Like[] = [];
      for (let i = 0; i < 8; i++) {
        const ang = (Math.PI / 4) * i;
        const rad = i % 2 === 0 ? r1 : r2;
        points.push({ x: gx + Math.cos(ang) * rad, y: gy + Math.sin(ang) * rad });
      }
      glintGfx.fillPoints(points, true);
    }
  }

  return scene.add.container(0, 0, [shadow, cavity, liquid, shine, outline, glintGfx]);
}
