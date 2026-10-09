import Phaser from 'phaser';
import { theme } from '../theme';
import { createButton } from '../view/button';
import { drawPixelPanel } from '../view/pixelPanel';
import { drawStarRow } from '../view/star';
import { isFrozenLevel, isHardLevel } from '../core/generator';
import { loadProgress, loadAllLevelStars } from '../services/storage';
import type { Progress, LevelStars } from '../services/storage';

const LEVELS_PER_PAGE = 20;
const COLUMNS = 5;
const MAX_LEVEL = 200;
const MAX_PAGE = Math.floor((MAX_LEVEL - 1) / LEVELS_PER_PAGE);

export class LevelSelectScene extends Phaser.Scene {
  private page = 0;
  private progress!: Progress;
  private stars: LevelStars = {};
  private gridContainer!: Phaser.GameObjects.Container;
  private pageText!: Phaser.GameObjects.Text;

  constructor() {
    super('LevelSelect');
  }

  async create(): Promise<void> {
    const { width, height } = this.scale;
    [this.progress, this.stars] = await Promise.all([loadProgress(), loadAllLevelStars()]);
    this.page = Math.floor((this.progress.unlockedLevel - 1) / LEVELS_PER_PAGE);

    this.add
      .text(width / 2, 72, 'Select Level', {
        fontFamily: theme.font.family,
        fontSize: `${theme.font.size.title}px`,
        color: '#ffffff',
        shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 0, fill: true },
      })
      .setOrigin(0.5);

    createButton(this, 65, 30, 110, 36, '< Back', () => this.scene.start('Menu'), theme.accent.blue, '#ffffff');

    createButton(
      this,
      width / 2 - 120,
      height - 60,
      110,
      40,
      '< Prev',
      () => this.changePage(-1),
      theme.accent.blue,
      '#ffffff',
    );
    createButton(
      this,
      width / 2 + 120,
      height - 60,
      110,
      40,
      'Next >',
      () => this.changePage(1),
      theme.accent.blue,
      '#ffffff',
    );
    this.pageText = this.add
      .text(width / 2, height - 60, '', {
        fontFamily: theme.font.family,
        fontSize: `${theme.font.size.small}px`,
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.gridContainer = this.add.container(0, 0);
    this.renderPage();

    // See MenuScene's identical comment: must unsubscribe on shutdown or
    // this listener outlives the scene and keeps firing in the background.
    const onResize = () => this.scene.restart();
    this.scale.on('resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', onResize));
  }

  private changePage(delta: number): void {
    this.page = Phaser.Math.Clamp(this.page + delta, 0, MAX_PAGE);
    this.renderPage();
  }

  private renderPage(): void {
    this.gridContainer.removeAll(true);
    const { width } = this.scale;

    const startLevel = this.page * LEVELS_PER_PAGE + 1;
    const cellW = Math.min(110, (width - 80) / COLUMNS);
    const startX = width / 2 - (cellW * (COLUMNS - 1)) / 2;
    const startY = 160;
    const rowH = 90;
    const cellSize = 56;

    for (let i = 0; i < LEVELS_PER_PAGE; i++) {
      const levelNumber = startLevel + i;
      if (levelNumber > MAX_LEVEL) break;

      const col = i % COLUMNS;
      const row = Math.floor(i / COLUMNS);
      const x = startX + col * cellW;
      const y = startY + row * rowH;
      const unlocked = levelNumber <= this.progress.unlockedLevel;

      this.gridContainer.add(
        this.createLevelCell(
          x,
          y,
          cellSize,
          levelNumber,
          unlocked,
          isHardLevel(levelNumber),
          isFrozenLevel(levelNumber),
          this.stars[levelNumber] ?? 0,
        ),
      );
    }

    this.pageText.setText(`Page ${this.page + 1} / ${MAX_PAGE + 1}`);
  }

  // Lighter-weight than the shared Button (no drop shadow) so a 20-cell grid
  // doesn't turn into a wall of shadows - still a chamfered pixel-art panel
  // (via drawPixelPanel) to match the arcade look, just a quieter one. Hard
  // levels (every 3rd) get a pink fill instead of yellow plus a small corner
  // diamond, so they're distinguishable even for colorblind players, not
  // just by hue. Frozen levels (every 5th from 10 on) get a second, icy-blue
  // diamond in the opposite corner - a separate shape+corner rather than a
  // fill-color change, since fill is already spoken for by hard/normal and
  // the two twists occasionally land on the same level.
  private createLevelCell(
    x: number,
    y: number,
    size: number,
    levelNumber: number,
    unlocked: boolean,
    hard: boolean,
    frozen: boolean,
    starsEarned: number,
  ): Phaser.GameObjects.Container {
    // Blue rather than yellow for normal cells - yellow is also the star
    // icon's "earned" gold, and a gold star on a gold cell was invisible.
    const fill = unlocked ? (hard ? theme.accent.pink : theme.accent.blue) : 0x232330;
    const border = unlocked ? theme.ui.outline : hard ? 0x5a2a3a : 0x3a3a48;
    const box = this.add.graphics();
    const bevel = this.add.graphics();
    const outline = this.add.graphics();
    // No shadowColor is passed, so drawPixelPanel never touches the "shadow"
    // layer - reusing `box` there instead of allocating a throwaway Graphics
    // object is safe and avoids 20 empty objects sitting in the scene.
    drawPixelPanel(
      { shadow: box, fill: box, bevel, outline },
      size,
      size,
      { fillColor: fill, outlineColor: border, highlightAlpha: unlocked ? 0.22 : 0.08 },
    );

    // Hard (top-right, white) and frozen (top-left, icy blue) each get their
    // own small corner diamond - same shape, mirrored corner, different
    // fill, so the two are readable independently and compose when a level
    // is both.
    const drawCornerDiamond = (cornerX: number, fillColor: number): void => {
      const bx = cornerX;
      const by = -size / 2 + 8;
      const r = 6;
      const points = [
        { x: bx, y: by - r },
        { x: bx + r, y: by },
        { x: bx, y: by + r },
        { x: bx - r, y: by },
      ];
      outline.fillStyle(fillColor, 1);
      outline.fillPoints(points, true);
      outline.lineStyle(1.5, 0x0d0d14, 1);
      outline.strokePoints(points, true);
    };

    if (hard) drawCornerDiamond(size / 2 - 8, 0xffffff);
    if (frozen) drawCornerDiamond(-size / 2 + 8, 0xbfe9ff);

    const label = this.add
      .text(0, 0, String(levelNumber), {
        fontFamily: theme.font.family,
        fontSize: `${theme.font.size.small}px`,
        // White rather than dark text - blue and pink (this cell's two
        // unlocked fills) both read better with white, same as every Button
        // elsewhere that uses these two accents.
        color: unlocked ? '#ffffff' : '#55556a',
      })
      .setOrigin(0.5);

    // Best move-efficiency rating earned so far, tucked along the cell's
    // bottom edge - a 1-star (or unstarred) cleared level visibly invites a
    // replay for a better score, which is the whole point of tracking this.
    const starsGfx = this.add.graphics();
    if (unlocked && starsEarned > 0) {
      // Same gold as the win overlay - now that normal cells are blue
      // rather than yellow, gold reads fine here too.
      drawStarRow(starsGfx, 0, size / 2 - 9, 10, 2, starsEarned);
    }

    const container = this.add.container(x, y, [box, bevel, outline, label, starsGfx]);
    container.setSize(size, size);

    if (unlocked) {
      // Phaser's Container hit test resolves local (x, y) relative to the
      // container's top-left corner, not its center, even though box/label
      // are drawn centered at (0, 0) above — the hit area must be (0, 0, size, size).
      container.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, size, size),
        Phaser.Geom.Rectangle.Contains,
      );
      container.on('pointerdown', () => this.scene.start('Game', { level: levelNumber }));
    }

    return container;
  }
}
