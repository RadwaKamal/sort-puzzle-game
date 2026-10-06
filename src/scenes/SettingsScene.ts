import Phaser from 'phaser';
import { theme } from '../theme';
import { createTextButton } from '../view/button';
import { AudioService } from '../services/audio';

export class SettingsScene extends Phaser.Scene {
  private audio!: AudioService;
  private soundButton!: Phaser.GameObjects.Text;
  private hapticsButton!: Phaser.GameObjects.Text;

  constructor() {
    super('Settings');
  }

  create(): void {
    this.audio = new AudioService(this);
    const { width, height } = this.scale;

    this.add
      .text(width / 2, 50, 'Settings', {
        fontFamily: theme.font.family,
        fontSize: `${theme.font.size.title}px`,
        color: '#ffffff',
      })
      .setOrigin(0.5);

    createTextButton(this, 70, 50, '< Back', () => this.scene.start('Menu'));

    this.soundButton = createTextButton(this, width / 2, height * 0.4, '', () => {
      this.audio.toggleSound();
      this.updateLabels();
    });

    this.hapticsButton = createTextButton(this, width / 2, height * 0.4 + 70, '', () => {
      this.audio.toggleHaptics();
      this.updateLabels();
    });

    this.updateLabels();
    this.scale.on('resize', () => this.scene.restart());
  }

  private updateLabels(): void {
    this.soundButton.setText(`Sound: ${this.audio.soundEnabled ? 'On' : 'Off'}`);
    this.hapticsButton.setText(`Haptics: ${this.audio.hapticsEnabled ? 'On' : 'Off'}`);
  }
}
