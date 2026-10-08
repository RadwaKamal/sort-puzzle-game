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

export interface BadgedIconButton {
  container: Phaser.GameObjects.Container;
  setAccent(accent: number): void;
  // `null` hides the badge - used once a helper is spent/maxed and the
  // button's own greyed-out accent already says "disabled".
  setBadge(text: string | null, color?: number): void;
}

// Same chamfered icon button as createIconButton, plus a small corner badge
// for a remaining-use count or an "AD" tag - replaces the old text labels
// ("Undo (3)", "Hint (Ad)") on the HUD's helper buttons with an icon so they
// read at a glance on a small phone screen, while keeping the count/ad-gate
// state visible.
export function createBadgedIconButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
  onTap: () => void,
  drawIcon: (icon: Phaser.GameObjects.Graphics, size: number) => void,
  accent: number = theme.accent.blue,
): BadgedIconButton {
  const shadow = scene.add.graphics();
  const fill = scene.add.graphics();
  const bevel = scene.add.graphics();
  const outline = scene.add.graphics();
  const icon = scene.add.graphics();

  const redraw = (acc: number): void => {
    drawPixelPanel(
      { shadow, fill, bevel, outline },
      size,
      size,
      {
        fillColor: acc,
        outlineColor: theme.ui.outline,
        shadowColor: theme.ui.shadow,
        shadowOffset: theme.ui.shadowOffset,
      },
    );
  };
  redraw(accent);
  drawIcon(icon, size);

  const badgeR = Math.max(9, size * 0.22);
  const badgeX = size / 2 - badgeR * 0.75;
  const badgeY = -size / 2 + badgeR * 0.75;
  const badgeBg = scene.add.graphics();
  const badgeText = scene.add
    .text(badgeX, badgeY, '', {
      fontFamily: theme.font.family,
      fontSize: `${Math.round(badgeR)}px`,
      color: '#ffffff',
    })
    .setOrigin(0.5);
  badgeBg.setVisible(false);
  badgeText.setVisible(false);

  const container = scene.add.container(x, y, [shadow, fill, bevel, outline, icon, badgeBg, badgeText]);
  container.setSize(size, size);
  container.setInteractive(new Phaser.Geom.Rectangle(0, 0, size, size), Phaser.Geom.Rectangle.Contains);
  container.on('pointerdown', onTap);

  return {
    container,
    setAccent: redraw,
    setBadge(text: string | null, color = 0xffffff): void {
      if (text === null) {
        badgeBg.setVisible(false);
        badgeText.setVisible(false);
        return;
      }
      badgeBg.setVisible(true);
      badgeText.setVisible(true);
      badgeText.setText(text).setColor(Phaser.Display.Color.IntegerToColor(color).rgba);
      badgeBg.clear();
      badgeBg.fillStyle(theme.ui.shadow, 1);
      badgeBg.fillCircle(badgeX, badgeY, badgeR);
      badgeBg.lineStyle(2, color, 1);
      badgeBg.strokeCircle(badgeX, badgeY, badgeR);
    },
  };
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

// A left-pointing chevron with a short stem - reads as "back to menu".
export function drawBackIcon(icon: Phaser.GameObjects.Graphics, size: number): void {
  const t = Math.max(2, size * 0.1);
  const tipX = -size * 0.16;
  const wingX = size * 0.14;
  icon.lineStyle(t, 0xffffff, 1);
  icon.lineBetween(wingX, -size * 0.22, tipX, 0);
  icon.lineBetween(tipX, 0, wingX, size * 0.22);
  icon.lineBetween(tipX, 0, size * 0.26, 0);
}

// Fills a small triangle tangent to a circular arc at `angle`, pointing in
// the arc's direction of travel - the arrowhead for both curved-arrow icons
// below.
function fillArrowhead(
  icon: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  r: number,
  angle: number,
  clockwise: boolean,
  len: number,
  wide: number,
): void {
  const px = cx + Math.cos(angle) * r;
  const py = cy + Math.sin(angle) * r;
  const tangent = angle + (clockwise ? Math.PI / 2 : -Math.PI / 2);
  const tipX = px + Math.cos(tangent) * len;
  const tipY = py + Math.sin(tangent) * len;
  const baseA1 = tangent + (Math.PI * 3) / 4;
  const baseA2 = tangent - (Math.PI * 3) / 4;
  icon.fillTriangle(
    tipX,
    tipY,
    px + Math.cos(baseA1) * wide,
    py + Math.sin(baseA1) * wide,
    px + Math.cos(baseA2) * wide,
    py + Math.sin(baseA2) * wide,
  );
}

// A near-full circular arrow (clockwise) with an arrowhead - "restart the
// level from scratch".
export function drawRestartIcon(icon: Phaser.GameObjects.Graphics, size: number): void {
  const t = Math.max(2, size * 0.09);
  const r = size * 0.24;
  const startAngle = Phaser.Math.DegToRad(-50);
  const endAngle = Phaser.Math.DegToRad(220);

  icon.lineStyle(t, 0xffffff, 1);
  icon.beginPath();
  icon.arc(0, 0, r, startAngle, endAngle, false);
  icon.strokePath();

  icon.fillStyle(0xffffff, 1);
  fillArrowhead(icon, 0, 0, r, endAngle, true, size * 0.15, size * 0.11);
}

// A short hooked arrow (half-loop + arrowhead) - deliberately a different
// silhouette from the restart glyph (a small hook, not a near-full circle)
// so the two read as distinct actions at a glance.
export function drawUndoIcon(icon: Phaser.GameObjects.Graphics, size: number): void {
  const t = Math.max(2, size * 0.1);
  const r = size * 0.2;
  const cx = size * 0.05;
  const cy = -size * 0.04;
  const startAngle = Phaser.Math.DegToRad(-20);
  const endAngle = Phaser.Math.DegToRad(190);

  icon.lineStyle(t, 0xffffff, 1);
  icon.beginPath();
  icon.arc(cx, cy, r, startAngle, endAngle, true);
  icon.strokePath();

  icon.fillStyle(0xffffff, 1);
  fillArrowhead(icon, cx, cy, r, endAngle, false, size * 0.14, size * 0.1);
}

// A narrow-neck potion flask silhouette, solid-filled - echoes the real
// flasks on the board so "add an extra flask" reads visually, not just as
// text.
export function drawFlaskIcon(icon: Phaser.GameObjects.Graphics, size: number): void {
  const neckW = size * 0.16;
  const neckTop = -size * 0.32;
  const shoulderY = -size * 0.02;
  const bodyW = size * 0.46;
  const bodyBottom = size * 0.32;

  icon.fillStyle(0xffffff, 1);
  icon.fillPoints(
    [
      { x: -neckW / 2, y: neckTop },
      { x: neckW / 2, y: neckTop },
      { x: neckW / 2, y: shoulderY },
      { x: bodyW / 2, y: bodyBottom },
      { x: -bodyW / 2, y: bodyBottom },
      { x: -neckW / 2, y: shoulderY },
    ],
    true,
  );
}

// A lightbulb - the universal "hint" glyph.
export function drawHintIcon(icon: Phaser.GameObjects.Graphics, size: number): void {
  const bulbR = size * 0.22;
  const bulbY = -size * 0.08;

  icon.fillStyle(0xffffff, 1);
  icon.fillCircle(0, bulbY, bulbR);
  icon.fillRect(-size * 0.1, bulbY + bulbR * 0.55, size * 0.2, size * 0.14);
  icon.fillRect(-size * 0.13, bulbY + bulbR * 0.55 + size * 0.16, size * 0.26, size * 0.05);

  icon.fillStyle(0x0d0d14, 1);
  icon.fillRect(-size * 0.035, bulbY - bulbR * 0.3, size * 0.07, bulbR * 0.9);
}
