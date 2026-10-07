import Phaser from 'phaser';
import { theme } from '../theme';
import { LAYERS_PER_FLASK } from '../core/board';
import type { Color, Flask } from '../core/board';

const LAYER_PADDING = 3;
const CUBE_SIZE = 10;
const CUBE_GRID_TEXTURE = 'liquidCubeGrid';

interface LiquidSegment {
  color: Color;
  height: number;
}

// One tileable cell: a dark bevel on the bottom/right edge and a light bevel
// on the top/left, so tiling it across a flat fill reads as a stack of small
// cubes (like voxel-art liquid) instead of a single flat rectangle.
function ensureCubeGridTexture(scene: Phaser.Scene): string {
  if (scene.textures.exists(CUBE_GRID_TEXTURE)) return CUBE_GRID_TEXTURE;
  const g = scene.add.graphics();
  g.lineStyle(1, 0x000000, 0.25);
  g.lineBetween(0, CUBE_SIZE - 0.5, CUBE_SIZE, CUBE_SIZE - 0.5);
  g.lineBetween(CUBE_SIZE - 0.5, 0, CUBE_SIZE - 0.5, CUBE_SIZE);
  g.lineStyle(1, 0xffffff, 0.18);
  g.lineBetween(0, 0.5, CUBE_SIZE, 0.5);
  g.lineBetween(0.5, 0, 0.5, CUBE_SIZE);
  g.generateTexture(CUBE_GRID_TEXTURE, CUBE_SIZE, CUBE_SIZE);
  g.destroy();
  return CUBE_GRID_TEXTURE;
}

// Draws one flask: a hard drop shadow, solid dark background, stacked liquid
// layers, and a thick white outline on top - sharp rectangular corners
// throughout, no rounding, matching the "Arcade Potion Lab" pixel-art theme.
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
  private readonly liquidGrid: Phaser.GameObjects.TileSprite;
  private readonly outline: Phaser.GameObjects.Graphics;
  private width_ = 0;
  private height_ = 0;
  private selected = false;
  layoutX = 0;
  layoutY = 0;

  constructor(scene: Phaser.Scene, index: number, onTap: (index: number) => void) {
    super(scene);
    this.index = index;

    this.shadow = scene.add.graphics();
    this.background = scene.add.graphics();
    this.liquid = scene.add.graphics();
    this.liquidGrid = scene.add.tileSprite(0, 0, 1, 1, ensureCubeGridTexture(scene));
    this.liquidGrid.setOrigin(0, 0);
    this.liquidGrid.setVisible(false);
    this.outline = scene.add.graphics();
    this.add([this.shadow, this.background, this.liquid, this.liquidGrid, this.outline]);

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
    const layerH = (this.height_ - LAYER_PADDING * 2) / capacity;
    return this.height_ / 2 - LAYER_PADDING - units * layerH;
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
    this.drawShadowAndBackground();
    this.drawOutline();
  }

  setSelected(selected: boolean): void {
    this.selected = selected;
    this.drawOutline();

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

  render(flask: Flask, capacity = LAYERS_PER_FLASK): void {
    this.renderLayers(
      flask.map((color) => ({ color, height: 1 })),
      capacity,
    );
  }

  // Renders arbitrary fractional-height liquid segments bottom-to-top, used
  // mid-pour to show liquid draining from the source and filling the target
  // in sync rather than snapping between discrete states.
  renderLayers(segments: LiquidSegment[], capacity = LAYERS_PER_FLASK): void {
    const innerW = this.width_ - LAYER_PADDING * 2;
    const layerH = (this.height_ - LAYER_PADDING * 2) / capacity;

    this.liquid.clear();
    let cursor = 0;
    for (const segment of segments) {
      if (segment.height <= 0) continue;
      const color = theme.liquidColors[segment.color % theme.liquidColors.length];
      const segmentHeightPx = segment.height * layerH;
      const y = this.height_ / 2 - LAYER_PADDING - cursor * layerH - segmentHeightPx;
      this.liquid.fillStyle(color, 1);
      this.liquid.fillRect(-innerW / 2, y, innerW, segmentHeightPx);
      cursor += segment.height;
    }

    // Pixel-cube grid overlay + a 1px top "shine" line, matching the
    // Arcade Potion Lab pixel-art direction - the liquid should read as
    // stacked little cubes, not a flat tinted rectangle.
    const totalPx = cursor * layerH;
    if (totalPx > 0) {
      const topY = this.height_ / 2 - LAYER_PADDING - totalPx;
      this.liquid.fillStyle(0xffffff, 0.22);
      this.liquid.fillRect(-innerW / 2, topY, innerW, Math.min(2, totalPx));

      this.liquidGrid.setVisible(true);
      this.liquidGrid.setPosition(-innerW / 2, topY);
      this.liquidGrid.setSize(innerW, totalPx);
    } else {
      this.liquidGrid.setVisible(false);
    }
  }

  private drawShadowAndBackground(): void {
    const w = this.width_;
    const h = this.height_;
    const offset = theme.flask.shadowOffset;

    this.shadow.clear();
    this.shadow.fillStyle(theme.flask.shadow, 1);
    this.shadow.fillRect(-w / 2 + offset, -h / 2 + offset, w, h);

    this.background.clear();
    this.background.fillStyle(theme.flask.glass, theme.flask.glassAlpha);
    this.background.fillRect(-w / 2, -h / 2, w, h);
  }

  private drawOutline(): void {
    const w = this.width_;
    const h = this.height_;

    this.outline.clear();
    const color = this.selected ? theme.flask.selectedOutline : theme.flask.outline;
    this.outline.lineStyle(theme.flask.outlineWidth, color, 1);
    this.outline.strokeRect(-w / 2, -h / 2, w, h);
  }
}
