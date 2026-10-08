import Phaser from 'phaser';
import { theme } from '../theme';

// A 5-point star icon for move-efficiency ratings - filled gold with a
// white outline when earned, hollow dark with a dim grey outline when not,
// matching the "white outline on everything" convention the rest of the
// pixel-art UI uses. Draws into a caller-supplied Graphics so it can be one
// of several stars sharing a row (the win overlay) or sit inside another
// component's own layer stack (a future LevelSelectScene cell).
export function drawStar(
  gfx: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  size: number,
  filled: boolean,
): void {
  const outerR = size / 2;
  const innerR = outerR * 0.42;
  const points: Phaser.Types.Math.Vector2Like[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (Math.PI / 5) * i;
    const r = i % 2 === 0 ? outerR : innerR;
    points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  }

  gfx.fillStyle(filled ? theme.accent.yellow : 0x232330, 1);
  gfx.fillPoints(points, true);
  gfx.lineStyle(Math.max(1.5, size * 0.08), filled ? 0xffffff : 0x4a4a58, 1);
  gfx.strokePoints(points, true);
}
