import Phaser from 'phaser';
import { theme } from '../theme';
import { createButton, Button } from '../view/button';
import { AudioService } from '../services/audio';

export class SettingsScene extends Phaser.Scene {
  private audio!: AudioService;
  private soundButton!: Button;
  private hapticsButton!: Button;

  constructor() {
    super('Settings');
  }

  create(): void {
    this.audio = new AudioService(this);
    const { width, height } = this.scale;

    this.add
      .text(width / 2, 72, 'Settings', {
        fontFamily: theme.font.family,
        fontSize: `${theme.font.size.title}px`,
        color: '#ffffff',
        shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 0, fill: true },
      })
      .setOrigin(0.5);

    createButton(this, 65, 30, 110, 36, '< Back', () => this.scene.start('Menu'), theme.accent.blue, '#ffffff');

    this.soundButton = createButton(this, width / 2, height * 0.4, 220, 52, '', () => {
      this.audio.toggleSound();
      this.updateLabels();
    });

    this.hapticsButton = createButton(this, width / 2, height * 0.4 + 70, 220, 52, '', () => {
      this.audio.toggleHaptics();
      this.updateLabels();
    });

    this.updateLabels();
    // See MenuScene's identical comment: must unsubscribe on shutdown or
    // this listener outlives the scene and keeps firing in the background.
    const onResize = () => this.scene.restart();
    this.scale.on('resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', onResize));
  }

  private updateLabels(): void {
    const soundOn = this.audio.soundEnabled;
    const hapticsOn = this.audio.hapticsEnabled;
    this.soundButton
      .setText(`Sound: ${soundOn ? 'On' : 'Off'}`)
      .setAccent(soundOn ? theme.accent.green : theme.accent.pink);
    this.hapticsButton
      .setText(`Haptics: ${hapticsOn ? 'On' : 'Off'}`)
      .setAccent(hapticsOn ? theme.accent.green : theme.accent.pink);
  }
}
