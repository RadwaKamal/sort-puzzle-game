import Phaser from 'phaser';
import { AudioService } from '../services/audio';

const PIXEL_FONT = '10px "Press Start 2P"';

// Preloads assets shared across every scene (sounds, and waiting for the
// pixel font to actually be loaded) before handing off to the menu. Phaser
// renders Text objects with whatever font is available at creation time, so
// without this wait the first frame or two would flash the fallback font
// while "Press Start 2P" finishes loading in the background.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    AudioService.preload(this);
  }

  async create(): Promise<void> {
    try {
      await document.fonts.load(PIXEL_FONT);
    } catch {
      // Font failed to load - proceed anyway with the fallback font rather
      // than blocking the game from starting.
    }
    this.scene.start('Menu');
  }
}
