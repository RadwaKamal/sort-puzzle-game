import Phaser from 'phaser';
import { theme } from '../theme';

// Placeholder scene for Milestone 1: confirms the Vite + Phaser setup boots
// in the browser. Real scenes (Menu, LevelSelect, Game, Settings) replace
// this in later milestones.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2, 'Potion Sort', {
        fontFamily: theme.font.family,
        fontSize: `${theme.font.size.title}px`,
        color: '#ffffff',
      })
      .setOrigin(0.5);
  }
}
