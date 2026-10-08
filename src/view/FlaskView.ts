import Phaser from 'phaser';
import { theme } from '../theme';
import { isFlaskSealed, LAYERS_PER_FLASK } from '../core/board';
import type { Color, Flask } from '../core/board';
import {
  GRID_COLS,
  GRID_ROWS,
  LIQUID_BOTTOM_ROW,
  LIQUID_TOP_ROW,
  classifyCell,
  interiorBounds,
  rowBounds,
} from './pixelFlask';

interface LiquidSegment {
  color: Color;
  height: number;
}

// Draws one flask as a genuine pixel-art potion bottle: a narrow neck, a
// staircase-tapered shoulder, a round body and a tapered rounded foot, all
// built cell-by-cell from the shared grid profile in pixelFlask.ts rather
// than a plain rectangle. A hard drop shadow, a dark glass cavity, a glass
// highlight/shadow sheen and a thick pixel outline stack up to read as a
// chunky glass bottle; liquid is drawn the same way, row by row, so it rises
// and sits inside the exact same silhouette at any flask size.
//
// Index 0 in the flask array is the bottom layer, matching the core board
// model.
//
// All "juice" motion (select lift/tilt, pour tilt, shake, squash-and-stretch)
// animates relative to the layout position set in layout() — layoutX/layoutY
// and angle 0 are always "home". Each animation method kills any tween
// already running on this view first, so a new motion can interrupt an
// in-flight one (e.g. deselecting mid-lift) without fighting over x/y/angle.
export class FlaskView extends Phaser.GameObjects.Container {
  readonly index: number;
  private readonly shadow: Phaser.GameObjects.Graphics;
  private readonly background: Phaser.GameObjects.Graphics;
  private readonly liquid: Phaser.GameObjects.Graphics;
  private readonly glassShine: Phaser.GameObjects.Graphics;
  private readonly cap: Phaser.GameObjects.Graphics;
  private readonly outline: Phaser.GameObjects.Graphics;
  private width_ = 0;
  private height_ = 0;
  private selected = false;
  private moveTween?: Phaser.Tweens.Tween;
  layoutX = 0;
  layoutY = 0;

  constructor(scene: Phaser.Scene, index: number, onTap: (index: number) => void) {
    super(scene);
    this.index = index;

    this.shadow = scene.add.graphics();
    this.background = scene.add.graphics();
    this.liquid = scene.add.graphics();
    this.glassShine = scene.add.graphics();
    this.cap = scene.add.graphics();
    this.outline = scene.add.graphics();
    this.add([this.shadow, this.background, this.liquid, this.glassShine, this.outline, this.cap]);

    this.setSize(0, 0);
    this.on('pointerdown', () => onTap(this.index));
  }

  get flaskWidth(): number {
    return this.width_;
  }

  get flaskHeight(): number {
    return this.height_;
  }

  // World-space-relative local Y of the liquid surface for a given fill
  // amount in layer-units (fractional mid-pour). Used by GameScene to land
  // flying pour cubes exactly on the rising liquid's current top edge.
  liquidTopLocalY(units: number, capacity = LAYERS_PER_FLASK): number {
    const totalLiquidRows = LIQUID_BOTTOM_ROW - LIQUID_TOP_ROW + 1;
    const rowsPerUnit = totalLiquidRows / capacity;
    const cellH = this.height_ / GRID_ROWS;
    return this.height_ / 2 - units * rowsPerUnit * cellH;
  }

  layout(x: number, y: number, w: number, h: number): void {
    this.scene.tweens.killTweensOf(this);
    this.layoutX = x;
    this.layoutY = y;
    this.setPosition(x, y);
    this.setAngle(0);
    this.setScale(1, 1);
    this.width_ = w;
    this.height_ = h;
    this.setSize(w, h);
    // Phaser's Container hit test resolves the callback's local (x, y) relative
    // to the container's top-left corner, not its center — even though children
    // are drawn centered at (0, 0). A centered hit area rect (-w/2, -h/2, w, h)
    // silently only catches the top-left quadrant of clicks; it must be (0, 0, w, h).
    this.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
    this.drawShell();
  }

  // Slides to a new home position (used to regroup sealed flasks to the
  // front of the board) without touching size, rotation, or scale - unlike
  // layout(), this only stops its own previous move so it can't cancel an
  // unrelated tween (e.g. a completion squash-bounce) running at the same
  // time on this flask.
  slideTo(x: number, y: number, duration = 260): void {
    this.layoutX = x;
    this.layoutY = y;
    this.moveTween?.stop();
    this.moveTween = this.scene.tweens.add({
      targets: this,
      x,
      y,
      duration,
      ease: 'Back.easeOut',
    });
  }

  setSelected(selected: boolean): void {
    this.selected = selected;
    this.drawShell();

    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      y: selected ? this.layoutY - 10 : this.layoutY,
      angle: selected ? -4 : 0,
      duration: 150,
      ease: 'Sine.easeOut',
    });
  }

  // Tilts toward (or away from) a neighbouring flask for the pour animation.
  // Caller is responsible for tweening back to neutral once the pour settles.
  tiltTowards(direction: 1 | -1, onComplete: () => void): void {
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      y: this.layoutY - 16,
      angle: direction * 22,
      duration: 180,
      ease: 'Sine.easeOut',
      onComplete,
    });
  }

  settle(onComplete?: () => void): void {
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      y: this.layoutY,
      angle: 0,
      duration: 220,
      ease: 'Back.easeOut',
      onComplete,
    });
  }

  shake(): void {
    this.scene.tweens.killTweensOf(this);
    this.x = this.layoutX;
    this.scene.tweens.add({
      targets: this,
      x: this.layoutX + 10,
      duration: 50,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.x = this.layoutX;
      },
    });
  }

  squashBounce(): void {
    this.scene.tweens.killTweensOf(this);
    this.setScale(1, 1);
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.1,
      scaleY: 0.85,
      duration: 90,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => this.setScale(1, 1),
    });
  }

  // A gentle "look here" bounce for the hint feature - deliberately a
  // different motion from setSelected()'s lift/tilt so a hint can never be
  // mistaken for (or clash with) the player's own selection state, since
  // this never touches it.
  hintPulse(): void {
    this.scene.tweens.killTweensOf(this);
    this.setScale(1, 1);
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 160,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
      onComplete: () => this.setScale(1, 1),
    });
  }

  render(flask: Flask, capacity = LAYERS_PER_FLASK): void {
    this.renderLayers(
      flask.map((color) => ({ color, height: 1 })),
      capacity,
    );
    this.drawCap(isFlaskSealed(flask, capacity));
  }

  // Renders arbitrary fractional-height liquid segments bottom-to-top, used
  // mid-pour to show liquid draining from the source and filling the target
  // in sync rather than snapping between discrete states. Liquid is drawn
  // grid-row by grid-row (4 rows per layer-unit) so even a mid-pour fraction
  // steps down in small pixel-art notches instead of sliding smoothly.
  renderLayers(segments: LiquidSegment[], capacity = LAYERS_PER_FLASK): void {
    this.drawCap(false);
    this.liquid.clear();

    const totalLiquidRows = LIQUID_BOTTOM_ROW - LIQUID_TOP_ROW + 1;
    const rowsPerUnit = totalLiquidRows / capacity;
    const cellW = this.width_ / GRID_COLS;
    const cellH = this.height_ / GRID_ROWS;

    let cumulative = 0;
    const segBounds = segments
      .filter((s) => s.height > 0)
      .map((s) => {
        const from = cumulative;
        cumulative += s.height * rowsPerUnit;
        return { from, to: cumulative, color: s.color };
      });
    const totalRows = cumulative;
    if (totalRows <= 0 || segBounds.length === 0) return;

    const colorAt = (rowUnits: number): Color => {
      for (const b of segBounds) {
        if (rowUnits < b.to) return b.color;
      }
      return segBounds[segBounds.length - 1].color;
    };

    const fullRows = Math.min(totalLiquidRows, Math.floor(totalRows + 1e-6));
    const frac = totalRows - fullRows;
    const bevel = Math.min(2, cellH);
    let topY = this.height_ / 2;

    for (let r = 0; r < fullRows; r++) {
      const gridRow = LIQUID_BOTTOM_ROW - r;
      const interior = interiorBounds(gridRow);
      if (!interior) continue;
      const x0 = -this.width_ / 2 + interior.left * cellW;
      const x1 = -this.width_ / 2 + (interior.right + 1) * cellW;
      const y1 = this.height_ / 2 - r * cellH;
      const y0 = y1 - cellH;
      const color = theme.liquidColors[colorAt(r + 0.5) % theme.liquidColors.length];
      this.liquid.fillStyle(color, 1);
      this.liquid.fillRect(x0, y0, x1 - x0, cellH);
      this.liquid.fillStyle(0xffffff, 0.16);
      this.liquid.fillRect(x0, y0, x1 - x0, bevel);
      this.liquid.fillStyle(0x000000, 0.16);
      this.liquid.fillRect(x0, y1 - bevel, x1 - x0, bevel);
      topY = y0;
    }

    if (frac > 1e-3 && fullRows < totalLiquidRows) {
      const gridRow = LIQUID_BOTTOM_ROW - fullRows;
      const interior = interiorBounds(gridRow);
      if (interior) {
        const x0 = -this.width_ / 2 + interior.left * cellW;
        const x1 = -this.width_ / 2 + (interior.right + 1) * cellW;
        const rowBottom = this.height_ / 2 - fullRows * cellH;
        const partialH = frac * cellH;
        const y0 = rowBottom - partialH;
        const color = theme.liquidColors[colorAt(fullRows + frac / 2) % theme.liquidColors.length];
        this.liquid.fillStyle(color, 1);
        this.liquid.fillRect(x0, y0, x1 - x0, partialH);
        topY = y0;
      }
    }

    // Bright pixel shine along the very top of the liquid stack.
    const topmostIndex = frac > 1e-3 ? fullRows : fullRows - 1;
    if (topmostIndex >= 0) {
      const gridRow = Math.max(LIQUID_TOP_ROW, LIQUID_BOTTOM_ROW - topmostIndex);
      const interiorTop = interiorBounds(gridRow);
      if (interiorTop) {
        const x0 = -this.width_ / 2 + interiorTop.left * cellW;
        const x1 = -this.width_ / 2 + (interiorTop.right + 1) * cellW;
        this.liquid.fillStyle(0xffffff, 0.3);
        this.liquid.fillRect(x0, topY, x1 - x0, bevel);
      }
    }
  }

  // Draws the shadow, glass cavity, glass highlight/shadow sheen and the
  // thick pixel outline, all from the pixelFlask grid profile. Re-run on
  // every layout() (size can change on resize/regroup) and on every
  // setSelected() toggle (only the outline color actually changes, but
  // redrawing the whole shell is a few hundred cheap fillRect calls on a tap
  // - not worth caching separately).
  private drawShell(): void {
    const w = this.width_;
    const h = this.height_;
    const cellW = w / GRID_COLS;
    const cellH = h / GRID_ROWS;
    const offset = theme.flask.shadowOffset;

    this.shadow.clear();
    this.background.clear();
    this.glassShine.clear();
    this.outline.clear();

    this.shadow.fillStyle(theme.flask.shadow, 1);
    this.background.fillStyle(theme.flask.glass, theme.flask.glassAlpha);
    const outlineColor = this.selected ? theme.flask.selectedOutline : theme.flask.outline;
    this.outline.fillStyle(outlineColor, 1);

    for (let row = 0; row < GRID_ROWS; row++) {
      const bounds = rowBounds(row);
      if (!bounds) continue;
      const rowX0 = -w / 2 + bounds.left * cellW;
      const rowX1 = -w / 2 + (bounds.right + 1) * cellW;
      const y0 = -h / 2 + row * cellH;
      this.shadow.fillRect(rowX0 + offset, y0 + offset, rowX1 - rowX0, cellH);

      const interior = interiorBounds(row);
      if (interior) {
        const ix0 = -w / 2 + interior.left * cellW;
        const ix1 = -w / 2 + (interior.right + 1) * cellW;
        this.background.fillRect(ix0, y0, ix1 - ix0, cellH);
      }

      for (let col = bounds.left; col <= bounds.right; col++) {
        const kind = classifyCell(row, col);
        const cx0 = -w / 2 + col * cellW;
        if (kind === 'outline') {
          this.outline.fillRect(cx0, y0, cellW, cellH);
        } else if (kind === 'highlight') {
          this.glassShine.fillStyle(0xffffff, 0.22);
          this.glassShine.fillRect(cx0, y0, cellW, cellH);
        } else if (kind === 'shadow') {
          this.glassShine.fillStyle(0x000000, 0.22);
          this.glassShine.fillRect(cx0, y0, cellW, cellH);
        }
      }
    }
  }

  // A cork-stopper bar plugged into the neck of a sealed (full, single-color)
  // flask - echoes the app icon's cork, and tells the player at a glance
  // this one's locked and can't be poured from anymore.
  private drawCap(sealed: boolean): void {
    this.cap.clear();
    if (!sealed) return;

    const cellW = this.width_ / GRID_COLS;
    const cellH = this.height_ / GRID_ROWS;
    const neck = rowBounds(0)!;
    const x0 = -this.width_ / 2 + neck.left * cellW;
    const x1 = -this.width_ / 2 + (neck.right + 1) * cellW;
    const capH = cellH * 2.2;
    const bevel = Math.min(2, capH);
    const y1 = -this.height_ / 2 + cellH * 0.6;
    const y0 = y1 - capH;

    this.cap.fillStyle(0xc1662f, 1);
    this.cap.fillRect(x0, y0, x1 - x0, capH);
    this.cap.fillStyle(0xffffff, 0.5);
    this.cap.fillRect(x0, y0, x1 - x0, bevel);
    this.cap.lineStyle(2, theme.flask.outline, 1);
    this.cap.strokeRect(x0, y0, x1 - x0, capH);
  }
}
