import Phaser from 'phaser';
import { theme } from '../theme';
import { drawPixelPanel } from './pixelPanel';

// A square chamfered-panel button (same shell as Button) that draws a custom
// icon instead of a text label - used for the in-level settings button,
// where "SETTINGS" wouldn't fit Press Start 2P's wide glyphs at this size
// anyway. `drawIcon` receives the icon's own Graphics (already positioned
// at the button's center) and the button's size to draw into.
export function createIconButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
  onTap: () => void,
  drawIcon: (icon: Phaser.GameObjects.Graphics, size: number) => void,
  accent: number = theme.accent.blue,
): Phaser.GameObjects.Container {
  const shadow = scene.add.graphics();
  const fill = scene.add.graphics();
  const bevel = scene.add.graphics();
  const outline = scene.add.graphics();
  const icon = scene.add.graphics();

  drawPixelPanel(
    { shadow, fill, bevel, outline },
    size,
    size,
    {
      fillColor: accent,
      outlineColor: theme.ui.outline,
      shadowColor: theme.ui.shadow,
      shadowOffset: theme.ui.shadowOffset,
    },
  );
  drawIcon(icon, size);

  const container = scene.add.container(x, y, [shadow, fill, bevel, outline, icon]);
  container.setSize(size, size);
  // Same Container hit-test quirk documented in Button/FlaskView: the hit
  // area is relative to the container's top-left corner even though every
  // child here is drawn centered at (0, 0).
  container.setInteractive(new Phaser.Geom.Rectangle(0, 0, size, size), Phaser.Geom.Rectangle.Contains);
  container.on('pointerdown', onTap);
  return container;
}

// A 3-track sliders/equalizer glyph - reads as "settings" without needing
// an actual gear (circular gear teeth don't hold up well at this pixel
// size) or relying on a font glyph Press Start 2P may not even have.
export function drawSlidersIcon(icon: Phaser.GameObjects.Graphics, size: number): void {
  const margin = size * 0.2;
  const trackY = [-size * 0.22, 0, size * 0.22];
  const knobX = [-size * 0.12, size * 0.14, -size * 0.04];
  const knobSize = size * 0.16;

  icon.lineStyle(Math.max(2, size * 0.045), 0xffffff, 1);
  for (const y of trackY) {
    icon.lineBetween(-size / 2 + margin, y, size / 2 - margin, y);
  }
  icon.fillStyle(0xffffff, 1);
  for (let i = 0; i < trackY.length; i++) {
    icon.fillRect(knobX[i] - knobSize / 2, trackY[i] - knobSize / 2, knobSize, knobSize);
  }
}
