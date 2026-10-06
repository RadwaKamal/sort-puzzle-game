import Phaser from 'phaser';
import { theme } from '../theme';
import {
  applyMove,
  canPour,
  isBoardSolved,
  isFlaskEmpty,
  isFlaskSolved,
  LAYERS_PER_FLASK,
  pourAmount,
  topColor,
} from '../core/board';
import type { Board, Color, Flask } from '../core/board';
import { generateLevel } from '../core/generator';
import type { Level } from '../core/generator';
import { FlaskView } from '../view/FlaskView';
import { createTextButton } from '../view/button';
import { AudioService } from '../services/audio';
import { saveCurrentLevel, unlockLevel } from '../services/storage';
import { AdService } from '../services/ads';

const TOP_MARGIN = 220;
const BOTTOM_MARGIN = 40;
const SIDE_MARGIN = 24;
const FLASK_ASPECT = 2.2; // height / width
const PARTICLE_TEXTURE = 'particle';

interface FlaskSlot {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class GameScene extends Phaser.Scene {
  private levelNumber = 1;
  private level!: Level;
  private board: Board = [];
  private history: Board[] = [];
  private selectedIndex: number | null = null;
  private won = false;
  private animating = false;
  private audio!: AudioService;
  private ads!: AdService;
  private freeUndoesRemaining = 3;

  private flaskViews: FlaskView[] = [];
  private levelText!: Phaser.GameObjects.Text;
  private undoButton!: Phaser.GameObjects.Text;
  private winOverlay!: Phaser.GameObjects.Container;
  private winBackdrop!: Phaser.GameObjects.Rectangle;
  private winTitle!: Phaser.GameObjects.Text;
  private winButton!: Phaser.GameObjects.Text;

  constructor() {
    super('Game');
  }

  init(data: { level?: number }): void {
    this.levelNumber = data.level ?? 1;
  }

  create(): void {
    this.audio = new AudioService(this);
    this.ads = new AdService();
    void this.ads.initialize();
    this.createParticleTexture();

    this.levelText = this.add
      .text(this.scale.width / 2, 60, '', {
        fontFamily: theme.font.family,
        fontSize: `${theme.font.size.title}px`,
        color: '#ffffff',
      })
      .setOrigin(0.5);

    createTextButton(this, 70, 30, '< Menu', () => this.scene.start('Menu'));
    createTextButton(this, this.scale.width / 2 - 90, 110, 'Restart', () => this.restart());
    this.undoButton = createTextButton(this, this.scale.width / 2 + 90, 110, '', () =>
      void this.undo(),
    );
    createTextButton(this, this.scale.width / 2 - 90, 170, 'Extra Flask (Ad)', () =>
      void this.onExtraFlask(),
    );
    createTextButton(this, this.scale.width / 2 + 90, 170, 'Skip Level (Ad)', () =>
      void this.onSkip(),
    );

    this.winOverlay = this.buildWinOverlay();
    this.winOverlay.setVisible(false);

    this.scale.on('resize', () => this.relayout());

    this.loadLevel(this.levelNumber);
  }

  private createParticleTexture(): void {
    if (this.textures.exists(PARTICLE_TEXTURE)) return;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture(PARTICLE_TEXTURE, 8, 8);
    g.destroy();
  }

  private buildWinOverlay(): Phaser.GameObjects.Container {
    this.winBackdrop = this.add.rectangle(0, 0, 0, 0, 0x000000, 0.6).setOrigin(0);
    this.winTitle = this.add
      .text(0, 0, 'Level Complete!', {
        fontFamily: theme.font.family,
        fontSize: `${theme.font.size.title}px`,
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this.winButton = this.add
      .text(0, 0, 'Next Level', {
        fontFamily: theme.font.family,
        fontSize: `${theme.font.size.body}px`,
        color: '#0b0c10',
        backgroundColor: '#ffffff',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => void this.nextLevel());

    const container = this.add.container(0, 0, [this.winBackdrop, this.winTitle, this.winButton]);
    container.setDepth(1000);
    this.layoutWinOverlay();
    return container;
  }

  private layoutWinOverlay(): void {
    const { width, height } = this.scale;
    this.winBackdrop.setSize(width, height);
    this.winTitle.setPosition(width / 2, height / 2 - 40);
    this.winButton.setPosition(width / 2, height / 2 + 40);
  }

  private loadLevel(levelNumber: number): void {
    this.levelNumber = levelNumber;
    this.level = generateLevel(levelNumber);
    this.board = this.level.board;
    this.history = [];
    this.selectedIndex = null;
    this.won = false;
    this.animating = false;
    this.freeUndoesRemaining = 3;
    this.updateUndoButtonLabel();
    this.winOverlay.setVisible(false);
    this.levelText.setText(`Level ${levelNumber}`);
    void saveCurrentLevel(levelNumber);

    for (const view of this.flaskViews) {
      this.tweens.killTweensOf(view);
      view.destroy();
    }
    this.flaskViews = this.board.map(
      (_, index) => new FlaskView(this, index, (i) => this.onFlaskTapped(i)),
    );
    for (const view of this.flaskViews) this.add.existing(view);

    this.relayout();
  }

  private relayout(): void {
    this.layoutWinOverlay();
    const slots = this.computeLayout(this.board.length);
    this.flaskViews.forEach((view, i) => {
      const slot = slots[i];
      view.layout(slot.x, slot.y, slot.w, slot.h);
      view.render(this.board[i]);
    });
  }

  private computeLayout(count: number): FlaskSlot[] {
    const { width, height } = this.scale;
    const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
    const rows = Math.ceil(count / columns);

    const availableWidth = width - SIDE_MARGIN * 2;
    const availableHeight = height - TOP_MARGIN - BOTTOM_MARGIN;
    const cellW = availableWidth / columns;
    const cellH = availableHeight / rows;

    let flaskWidth = cellW * 0.7;
    let flaskHeight = flaskWidth * FLASK_ASPECT;
    const maxFlaskHeight = cellH * 0.85;
    if (flaskHeight > maxFlaskHeight) {
      flaskHeight = maxFlaskHeight;
      flaskWidth = flaskHeight / FLASK_ASPECT;
    }

    const slots: FlaskSlot[] = [];
    for (let i = 0; i < count; i++) {
      const col = i % columns;
      const row = Math.floor(i / columns);
      slots.push({
        x: SIDE_MARGIN + cellW * col + cellW / 2,
        y: TOP_MARGIN + cellH * row + cellH / 2,
        w: flaskWidth,
        h: flaskHeight,
      });
    }
    return slots;
  }

  private onFlaskTapped(index: number): void {
    if (this.won || this.animating) return;

    if (this.selectedIndex === null) {
      if (!isFlaskEmpty(this.board[index])) {
        this.selectedIndex = index;
        this.flaskViews[index].setSelected(true);
        this.audio.play('select');
        this.audio.haptic('select');
      }
      return;
    }

    if (this.selectedIndex === index) {
      this.flaskViews[index].setSelected(false);
      this.selectedIndex = null;
      return;
    }

    const from = this.selectedIndex;
    if (canPour(this.board[from], this.board[index], LAYERS_PER_FLASK)) {
      this.selectedIndex = null;
      this.performPour(from, index);
      return;
    }

    this.audio.play('error');
    this.audio.haptic('error');
    this.flaskViews[index].shake();
  }

  private performPour(from: number, to: number): void {
    const sourceView = this.flaskViews[from];
    const targetView = this.flaskViews[to];
    const sourceBefore = this.board[from];
    const targetBefore = this.board[to];
    const amount = pourAmount(sourceBefore, targetBefore, LAYERS_PER_FLASK);
    const pourColor = topColor(sourceBefore) as Color;
    const direction: 1 | -1 = targetView.layoutX >= sourceView.layoutX ? 1 : -1;

    this.animating = true;
    sourceView.setSelected(false);
    this.audio.play('pour');

    sourceView.tiltTowards(direction, () => {
      const progress = { t: 0 };
      this.tweens.add({
        targets: progress,
        t: 1,
        duration: 260,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          this.renderPourFrame(sourceView, sourceBefore, true, amount, pourColor, 1 - progress.t);
          this.renderPourFrame(targetView, targetBefore, false, amount, pourColor, progress.t);
        },
        onComplete: () => {
          this.history.push(this.board);
          this.board = applyMove(this.board, from, to, LAYERS_PER_FLASK);
          sourceView.render(this.board[from]);
          targetView.render(this.board[to]);

          sourceView.settle(() => {
            this.animating = false;
            this.afterPour(to, targetBefore);
          });
        },
      });
    });
  }

  // Renders `base` plus/minus a fractional top segment of `pourColor`, used
  // for both the draining source (fraction shrinks 1 -> 0, isSource=true
  // strips the amount being poured off the top of base first) and the
  // filling target (fraction grows 0 -> 1, on top of its unaffected layers)
  // during a pour's liquid-transfer phase.
  private renderPourFrame(
    view: FlaskView,
    base: Flask,
    isSource: boolean,
    amount: number,
    pourColor: Color,
    fraction: number,
  ): void {
    const keep = isSource ? base.slice(0, base.length - amount) : base;
    view.renderLayers([
      ...keep.map((color) => ({ color, height: 1 })),
      { color: pourColor, height: amount * fraction },
    ]);
  }

  private afterPour(targetIndex: number, targetBefore: Flask): void {
    const targetView = this.flaskViews[targetIndex];
    const wasSolved = isFlaskSolved(targetBefore, LAYERS_PER_FLASK);
    const isSolvedNow = isFlaskSolved(this.board[targetIndex], LAYERS_PER_FLASK);

    if (!wasSolved && isSolvedNow) {
      targetView.squashBounce();
      this.spawnSparkle(targetView.layoutX, targetView.layoutY, this.board[targetIndex][0]);
      this.audio.play('complete');
      this.audio.haptic('complete');
    }

    this.checkWin();
  }

  private spawnSparkle(x: number, y: number, color: Color): void {
    const tint = theme.liquidColors[color % theme.liquidColors.length];
    const emitter = this.add.particles(x, y, PARTICLE_TEXTURE, {
      tint,
      speed: { min: 80, max: 160 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 450,
      quantity: 14,
      blendMode: 'ADD',
    });
    emitter.explode(14);
    this.time.delayedCall(500, () => emitter.destroy());
  }

  private spawnWinCelebration(): void {
    const { width } = this.scale;
    const emitter = this.add.particles(0, 0, PARTICLE_TEXTURE, {
      x: { min: 0, max: width },
      y: -10,
      tint: [...theme.liquidColors],
      speed: { min: 60, max: 160 },
      angle: { min: 80, max: 100 },
      gravityY: 220,
      scale: { start: 1, end: 0.3 },
      lifespan: 1800,
      quantity: 2,
      frequency: 30,
    });
    emitter.setDepth(1001);
    this.time.delayedCall(2000, () => emitter.stop());
    this.time.delayedCall(2500, () => emitter.destroy());
  }

  private checkWin(): void {
    if (isBoardSolved(this.board, LAYERS_PER_FLASK)) {
      this.won = true;
      this.winOverlay.setVisible(true);
      this.audio.play('win');
      this.audio.haptic('win');
      this.spawnWinCelebration();
      void unlockLevel(this.levelNumber + 1);
      void saveCurrentLevel(this.levelNumber + 1);
    }
  }

  // 3 undos per level are free; after that, each one costs a rewarded ad.
  // `animating` doubles as a busy-flag while the ad is in flight, so a second
  // tap on Undo/Extra Flask/Skip/Restart can't race this one.
  private async undo(): Promise<void> {
    if (this.won || this.animating || this.history.length === 0) return;

    if (this.freeUndoesRemaining > 0) {
      this.freeUndoesRemaining--;
    } else {
      this.animating = true;
      const earned = await this.ads.showRewardedAd();
      this.animating = false;
      if (!earned) return;
    }
    this.updateUndoButtonLabel();

    if (this.selectedIndex !== null) {
      this.flaskViews[this.selectedIndex].setSelected(false);
      this.selectedIndex = null;
    }
    this.board = this.history.pop() as Board;
    this.flaskViews.forEach((view, i) => view.render(this.board[i]));
  }

  private updateUndoButtonLabel(): void {
    this.undoButton.setText(
      this.freeUndoesRemaining > 0 ? `Undo (${this.freeUndoesRemaining})` : 'Undo (Ad)',
    );
  }

  // Adds one empty flask to the current board - always behind a rewarded ad.
  private async onExtraFlask(): Promise<void> {
    if (this.won || this.animating) return;
    this.animating = true;
    const earned = await this.ads.showRewardedAd();
    this.animating = false;
    if (!earned || this.won) return;

    this.board = [...this.board, []];
    const index = this.board.length - 1;
    const view = new FlaskView(this, index, (i) => this.onFlaskTapped(i));
    this.add.existing(view);
    this.flaskViews = [...this.flaskViews, view];
    this.relayout();
  }

  // Skips straight to the next level - always behind a rewarded ad. Counts
  // as a completed level for progress and the interstitial cadence, but
  // skips the win celebration since the player didn't actually solve it.
  private async onSkip(): Promise<void> {
    if (this.won || this.animating) return;
    this.animating = true;
    const earned = await this.ads.showRewardedAd();
    if (!earned) {
      this.animating = false;
      return;
    }

    void unlockLevel(this.levelNumber + 1);
    await this.advanceToLevel(this.levelNumber + 1);
  }

  private restart(): void {
    if (this.animating) return;
    this.loadLevel(this.levelNumber);
  }

  private async nextLevel(): Promise<void> {
    await this.advanceToLevel(this.levelNumber + 1);
  }

  private async advanceToLevel(levelNumber: number): Promise<void> {
    await this.ads.maybeShowInterstitial(this.levelNumber);
    this.loadLevel(levelNumber);
  }
}
