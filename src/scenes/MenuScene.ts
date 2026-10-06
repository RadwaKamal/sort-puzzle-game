import Phaser from 'phaser';
import { theme } from '../theme';
import { createTextButton } from '../view/button';
import { loadProgress } from '../services/storage';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height * 0.25, 'Potion Sort', {
        fontFamily: theme.font.family,
        fontSize: `${theme.font.size.title}px`,
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const progress = loadProgress();
    const playLabel = progress.currentLevel > 1 ? 'Continue' : 'Play';

    createTextButton(this, width / 2, height * 0.5, playLabel, () => {
      this.scene.start('Game', { level: progress.currentLevel });
    });

    createTextButton(this, width / 2, height * 0.5 + 70, 'Level Select', () => {
      this.scene.start('LevelSelect');
    });

    createTextButton(this, width / 2, height * 0.5 + 140, 'Settings', () => {
      this.scene.start('Settings');
    });

    this.scale.on('resize', () => this.scene.restart());
  }
}
