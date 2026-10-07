import Phaser from 'phaser';
import { theme } from '../theme';
import { createButton } from '../view/button';
import { loadProgress } from '../services/storage';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  async create(): Promise<void> {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height * 0.25, 'POTION\nSORT', {
        fontFamily: theme.font.family,
        fontSize: '34px',
        color: '#ffd23f',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 2,
        shadow: { offsetX: 4, offsetY: 4, color: '#ef476f', blur: 0, fill: true },
      })
      .setOrigin(0.5);

    const progress = await loadProgress();
    const playLabel = progress.currentLevel > 1 ? 'Continue' : 'Play';

    createButton(
      this,
      width / 2,
      height * 0.55,
      220,
      52,
      playLabel,
      () => {
        this.scene.start('Game', { level: progress.currentLevel });
      },
      theme.accent.yellow,
    );

    createButton(
      this,
      width / 2,
      height * 0.55 + 70,
      220,
      52,
      'Level Select',
      () => {
        this.scene.start('LevelSelect');
      },
      theme.accent.blue,
      '#ffffff',
    );

    createButton(
      this,
      width / 2,
      height * 0.55 + 140,
      220,
      52,
      'Settings',
      () => {
        this.scene.start('Settings');
      },
      theme.accent.pink,
      '#ffffff',
    );

    this.scale.on('resize', () => this.scene.restart());
  }
}
