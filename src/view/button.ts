import Phaser from 'phaser';
import { theme } from '../theme';
import { drawPixelPanel } from './pixelPanel';

// A chunky pixel-art button: hard offset shadow, flat accent fill, a glass-
// style bevel sheen and a thick chamfered-corner outline (see pixelPanel.ts),
// topped with a Press Start 2P label. Built as a small Container (four
// Graphics layers + text) rather than a plain Text object, since a real
// border/shadow/bevel needs actual drawn shapes, not CSS-ish text styling.
export class Button extends Phaser.GameObjects.Container {
  private readonly shadowGfx: Phaser.GameObjects.Graphics;
  private readonly fillGfx: Phaser.GameObjects.Graphics;
  private readonly bevelGfx: Phaser.GameObjects.Graphics;
  private readonly outlineGfx: Phaser.GameObjects.Graphics;
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
    this.fillGfx = scene.add.graphics();
    this.bevelGfx = scene.add.graphics();
    this.outlineGfx = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, text.toUpperCase(), {
        fontFamily: theme.font.family,
        fontSize: `${theme.font.size.small}px`,
        color: textColor,
        align: 'center',
        wordWrap: { width: w - 16 },
      })
      .setOrigin(0.5);

    this.add([this.shadowGfx, this.fillGfx, this.bevelGfx, this.outlineGfx, this.label]);
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
    drawPixelPanel(
      { shadow: this.shadowGfx, fill: this.fillGfx, bevel: this.bevelGfx, outline: this.outlineGfx },
      this.boxW,
      this.boxH,
      {
        fillColor: accent,
        outlineColor: theme.ui.outline,
        shadowColor: theme.ui.shadow,
        shadowOffset: theme.ui.shadowOffset,
      },
    );
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
