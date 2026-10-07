import Phaser from 'phaser';
import { theme } from '../theme';
import { createButton } from '../view/button';
import { isHardLevel } from '../core/generator';
import { loadProgress } from '../services/storage';
import type { Progress } from '../services/storage';

const LEVELS_PER_PAGE = 20;
const COLUMNS = 5;
const MAX_LEVEL = 200;
const MAX_PAGE = Math.floor((MAX_LEVEL - 1) / LEVELS_PER_PAGE);

export class LevelSelectScene extends Phaser.Scene {
  private page = 0;
  private progress!: Progress;
  private gridContainer!: Phaser.GameObjects.Container;
  private pageText!: Phaser.GameObjects.Text;

  constructor() {
    super('LevelSelect');
  }

  async create(): Promise<void> {
    const { width, height } = this.scale;
    this.progress = await loadProgress();
    this.page = Math.floor((this.progress.unlockedLevel - 1) / LEVELS_PER_PAGE);

    this.add
      .text(width / 2, 50, 'Select Level', {
        fontFamily: theme.font.family,
        fontSize: `${theme.font.size.title}px`,
        color: '#ffffff',
        shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 0, fill: true },
      })
      .setOrigin(0.5);

    createButton(this, 75, 50, 110, 36, '< Back', () => this.scene.start('Menu'), theme.accent.blue, '#ffffff');

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

    this.scale.on('resize', () => this.scene.restart());
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
        this.createLevelCell(x, y, cellSize, levelNumber, unlocked, isHardLevel(levelNumber)),
      );
    }

    this.pageText.setText(`Page ${this.page + 1} / ${MAX_PAGE + 1}`);
  }

  // Lighter-weight than the shared Button (no drop shadow) so a 20-cell grid
  // doesn't turn into a wall of shadows - still flat-colored with a crisp
  // border to match the arcade look, just a quieter one. Hard levels (every
  // 3rd) get a pink fill instead of yellow plus a small corner diamond, so
  // they're distinguishable even for colorblind players, not just by hue.
  private createLevelCell(
    x: number,
    y: number,
    size: number,
    levelNumber: number,
    unlocked: boolean,
    hard: boolean,
  ): Phaser.GameObjects.Container {
    const box = this.add.graphics();
    const fill = unlocked ? (hard ? theme.accent.pink : theme.accent.yellow) : 0x232330;
    const border = unlocked ? theme.ui.outline : hard ? 0x5a2a3a : 0x3a3a48;
    box.fillStyle(fill, 1);
    box.fillRect(-size / 2, -size / 2, size, size);
    box.lineStyle(2, border, 1);
    box.strokeRect(-size / 2, -size / 2, size, size);

    if (hard) {
      const bx = size / 2 - 8;
      const by = -size / 2 + 8;
      const r = 6;
      box.fillStyle(0xffffff, 1);
      box.fillPoints(
        [
          { x: bx, y: by - r },
          { x: bx + r, y: by },
          { x: bx, y: by + r },
          { x: bx - r, y: by },
        ],
        true,
      );
      box.lineStyle(1.5, 0x0d0d14, 1);
      box.strokePoints(
        [
          { x: bx, y: by - r },
          { x: bx + r, y: by },
          { x: bx, y: by + r },
          { x: bx - r, y: by },
        ],
        true,
      );
    }

    const label = this.add
      .text(0, 0, String(levelNumber), {
        fontFamily: theme.font.family,
        fontSize: `${theme.font.size.small}px`,
        color: unlocked ? '#0d0d14' : '#55556a',
      })
      .setOrigin(0.5);

    const container = this.add.container(x, y, [box, label]);
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
