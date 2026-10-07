import Phaser from 'phaser';
import { theme } from '../theme';

// A chunky arcade-style button: hard offset shadow, thick white border, flat
// accent fill, Press Start 2P label. Built as a small Container (shadow +
// box + text) rather than a plain Text object, since a real border/shadow
// needs actual drawn shapes, not CSS-ish text styling.
export class Button extends Phaser.GameObjects.Container {
  private readonly shadowGfx: Phaser.GameObjects.Graphics;
  private readonly boxGfx: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly boxW: number;
  private readonly boxH: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    onTap: () => void,
    accent: number = theme.accent.yellow,
    textColor = '#0d0d14',
  ) {
    super(scene, x, y);
    this.boxW = w;
    this.boxH = h;

    this.shadowGfx = scene.add.graphics();
    this.boxGfx = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, text.toUpperCase(), {
        fontFamily: theme.font.family,
        fontSize: `${theme.font.size.small}px`,
        color: textColor,
        align: 'center',
        wordWrap: { width: w - 16 },
      })
      .setOrigin(0.5);

    this.add([this.shadowGfx, this.boxGfx, this.label]);
    this.drawBox(accent);

    this.setSize(w, h);
    // Phaser's Container hit test resolves local (x, y) relative to the
    // container's top-left corner, not its center, even though children are
    // drawn centered at (0, 0) here — the hit area must be (0, 0, w, h).
    this.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
    this.on('pointerdown', onTap);
    scene.add.existing(this);
  }

  private drawBox(accent: number): void {
    const offset = theme.ui.shadowOffset;

    this.shadowGfx.clear();
    this.shadowGfx.fillStyle(theme.ui.shadow, 1);
    this.shadowGfx.fillRect(-this.boxW / 2 + offset, -this.boxH / 2 + offset, this.boxW, this.boxH);

    this.boxGfx.clear();
    this.boxGfx.fillStyle(accent, 1);
    this.boxGfx.fillRect(-this.boxW / 2, -this.boxH / 2, this.boxW, this.boxH);
    this.boxGfx.lineStyle(3, theme.ui.outline, 1);
    this.boxGfx.strokeRect(-this.boxW / 2, -this.boxH / 2, this.boxW, this.boxH);
  }

  setText(text: string): this {
    this.label.setText(text.toUpperCase());
    return this;
  }

  setAccent(accent: number): this {
    this.drawBox(accent);
    return this;
  }
}

export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  onTap: () => void,
  accent: number = theme.accent.yellow,
  textColor = '#0d0d14',
): Button {
  return new Button(scene, x, y, w, h, text, onTap, accent, textColor);
}
