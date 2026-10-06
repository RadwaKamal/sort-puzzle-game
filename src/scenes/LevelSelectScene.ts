import Phaser from 'phaser';
import { theme } from '../theme';
import { createTextButton } from '../view/button';
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
      })
      .setOrigin(0.5);

    createTextButton(this, 70, 50, '< Back', () => this.scene.start('Menu'));

    createTextButton(this, width / 2 - 110, height - 60, '< Prev', () => this.changePage(-1));
    createTextButton(this, width / 2 + 110, height - 60, 'Next >', () => this.changePage(1));
    this.pageText = this.add
      .text(width / 2, height - 60, '', {
        fontFamily: theme.font.family,
        fontSize: `${theme.font.size.body}px`,
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

    for (let i = 0; i < LEVELS_PER_PAGE; i++) {
      const levelNumber = startLevel + i;
      if (levelNumber > MAX_LEVEL) break;

      const col = i % COLUMNS;
      const row = Math.floor(i / COLUMNS);
      const x = startX + col * cellW;
      const y = startY + row * rowH;
      const unlocked = levelNumber <= this.progress.unlockedLevel;

      const button = this.add
        .text(x, y, String(levelNumber), {
          fontFamily: theme.font.family,
          fontSize: `${theme.font.size.body}px`,
          color: unlocked ? '#ffffff' : '#555566',
          backgroundColor: unlocked ? '#ffffff22' : '#ffffff0a',
          padding: { x: 14, y: 10 },
        })
        .setOrigin(0.5);

      if (unlocked) {
        button
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => this.scene.start('Game', { level: levelNumber }));
      }
      this.gridContainer.add(button);
    }

    this.pageText.setText(`Page ${this.page + 1} / ${MAX_PAGE + 1}`);
  }
}
