import Phaser from 'phaser';
import { AudioService } from '../services/audio';

// Preloads assets shared across every scene (currently just sounds - Phaser's
// cache and sound manager are shared across scenes within one Game instance,
// so this only needs to run once) before handing off to the menu.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    AudioService.preload(this);
  }

  create(): void {
    this.scene.start('Menu');
  }
}
