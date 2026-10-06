import Phaser from 'phaser';
import { theme } from '../theme';
import { LAYERS_PER_FLASK } from '../core/board';
import type { Flask } from '../core/board';

const CORNER_RADIUS = 10;
const LAYER_PADDING = 4;

// Draws one flask: a glass outline plus stacked liquid layers. Index 0 in the
// flask array is the bottom layer, matching the core board model. Selection
// is shown as a brighter outline only — lift/tilt motion is a Milestone 4
// "juice" feature, not part of the base playable game.
export class FlaskView extends Phaser.GameObjects.Container {
  readonly index: number;
  private readonly glass: Phaser.GameObjects.Graphics;
  private readonly liquid: Phaser.GameObjects.Graphics;
  private width_ = 0;
  private height_ = 0;
  private selected = false;

  constructor(scene: Phaser.Scene, index: number, onTap: (index: number) => void) {
    super(scene);
    this.index = index;

    this.glass = scene.add.graphics();
    this.liquid = scene.add.graphics();
    this.add([this.liquid, this.glass]);

    this.setSize(0, 0);
    this.on('pointerdown', () => onTap(this.index));
  }

  layout(x: number, y: number, w: number, h: number): void {
    this.setPosition(x, y);
    this.width_ = w;
    this.height_ = h;
    this.setSize(w, h);
    this.setInteractive(
      new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      Phaser.Geom.Rectangle.Contains,
    );
    this.drawGlass();
  }

  setSelected(selected: boolean): void {
    this.selected = selected;
    this.drawGlass();
  }

  render(flask: Flask, capacity = LAYERS_PER_FLASK): void {
    const w = this.width_;
    const h = this.height_;
    const innerW = w - LAYER_PADDING * 2;
    const layerH = (h - LAYER_PADDING * 2) / capacity;

    this.liquid.clear();
    for (let i = 0; i < flask.length; i++) {
      const color = theme.liquidColors[flask[i] % theme.liquidColors.length];
      const layerY = h / 2 - LAYER_PADDING - (i + 1) * layerH;
      this.liquid.fillStyle(color, 1);
      this.liquid.fillRect(-innerW / 2, layerY, innerW, layerH);
    }
  }

  private drawGlass(): void {
    const w = this.width_;
    const h = this.height_;

    this.glass.clear();
    this.glass.fillStyle(theme.flask.glass, theme.flask.glassAlpha);
    this.glass.fillRoundedRect(-w / 2, -h / 2, w, h, CORNER_RADIUS);

    const outlineColor = this.selected ? 0xffffff : theme.flask.outline;
    const outlineAlpha = this.selected ? 1 : theme.flask.outlineAlpha;
    const lineWidth = this.selected ? 4 : 2;
    this.glass.lineStyle(lineWidth, outlineColor, outlineAlpha);
    this.glass.strokeRoundedRect(-w / 2, -h / 2, w, h, CORNER_RADIUS);
  }
}
