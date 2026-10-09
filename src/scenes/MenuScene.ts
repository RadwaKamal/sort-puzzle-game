import Phaser from 'phaser';
import { theme } from '../theme';
import { createButton } from '../view/button';
import { createBoltMark } from '../view/boltMark';
import { loadProgress, loadAllLevelStars } from '../services/storage';
import { computeScore } from '../core/scoring';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  async create(): Promise<void> {
    const { width, height } = this.scale;

    createBoltMark(this, 110).setPosition(width / 2, height * 0.14);

    this.add
      .text(width / 2, height * 0.27, 'POTION\nSORT', {
        fontFamily: theme.font.family,
        fontSize: '34px',
        color: '#ffd23f',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 2,
        shadow: { offsetX: 4, offsetY: 4, color: '#ef476f', blur: 0, fill: true },
      })
      .setOrigin(0.5);

    const [progress, stars] = await Promise.all([loadProgress(), loadAllLevelStars()]);
    const playLabel = progress.currentLevel > 1 ? 'Continue' : 'Play';

    // Lifetime score, derived from stored stars rather than tracked
    // separately - see computeScore's comment. Sits between the title and
    // the buttons, a running total that only ever goes up (replaying a
    // level for a better star rating raises it, same incentive the
    // Level Select star row already creates).
    this.add
      .text(width / 2, height * 0.4, `Score: ${computeScore(stars).toLocaleString()}`, {
        fontFamily: theme.font.family,
        fontSize: `${theme.font.size.body}px`,
        color: '#ffd23f',
        shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 0, fill: true },
      })
      .setOrigin(0.5);

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

    // The Scale Manager's resize event is global, not scoped to whichever
    // scene is active - without unsubscribing on shutdown, this listener
    // would outlive the scene (every stopped scene still restarting itself
    // in the background on every future resize, bleeding onto whatever
    // scene is actually showing).
    const onResize = () => this.scene.restart();
    this.scale.on('resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', onResize));
  }
}
