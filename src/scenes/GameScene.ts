import Phaser from 'phaser';
import { theme } from '../theme';
import {
  applyMove,
  canPour,
  isBoardSolved,
  isFlaskEmpty,
  isFlaskSealed,
  isFlaskSolved,
  LAYERS_PER_FLASK,
  pourAmount,
  topColor,
} from '../core/board';
import type { Board, Color, Flask } from '../core/board';
import { generateLevel } from '../core/generator';
import type { Level } from '../core/generator';
import { findHintMove } from '../core/solver';
import { FlaskView } from '../view/FlaskView';
import { createButton, Button } from '../view/button';
import { createIconButton, drawSlidersIcon } from '../view/iconButton';
import { drawPixelPanel } from '../view/pixelPanel';
import { AudioService } from '../services/audio';
import { saveCurrentLevel, unlockLevel } from '../services/storage';
import { AdService } from '../services/ads';

const TOP_MARGIN = 220;
const BOTTOM_MARGIN = 40;
const SIDE_MARGIN = 24;
const FLASK_ASPECT = 2.2; // height / width
// Hard ceiling on hints per level, free or ad-gated - unlike Undo (which
// only undoes the player's own moves) a hint just hands over the answer, so
// leaving it ad-unlimited would let a player solve any level without
// thinking at all past the free allowance. 1 free + 2 more via ads.
const MAX_HINTS_PER_LEVEL = 3;
const PARTICLE_TEXTURE = 'particle';
const POUR_CUBE_TEXTURE = 'pourCube';
const POUR_CUBE_SIZE = 18;

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
  // Flask indices in the order they became sealed, so the front-grouping in
  // computeDisplayOrder() is stable - a newly-sealed flask joins the end of
  // the line instead of the whole group re-sorting on every seal.
  private sealedOrder: number[] = [];
  private selectedIndex: number | null = null;
  private won = false;
  private animating = false;
  private settingsOpen = false;
  private audio!: AudioService;
  private ads!: AdService;
  private freeUndoesRemaining = 3;
  private freeHintsRemaining = 1;
  // Total hints used this level (free + ad-gated combined), capped at
  // MAX_HINTS_PER_LEVEL - see that constant's comment.
  private hintsUsed = 0;
  // Unlike Undo (N free, then ad-gated forever after - undoing your own
  // moves never makes the puzzle itself easier), Extra Flask is capped hard
  // at 1 per level - an extra empty flask meaningfully eases a puzzle, so
  // unlimited ad-gated uses would let a player trivialize any level by just
  // watching enough ads.
  private extraFlaskUsed = false;

  private flaskViews: FlaskView[] = [];
  private levelText!: Phaser.GameObjects.Text;
  private hardBadge!: Phaser.GameObjects.Container;
  private hardBadgeBox!: Phaser.GameObjects.Graphics;
  private hardBadgeBevel!: Phaser.GameObjects.Graphics;
  private hardBadgeOutline!: Phaser.GameObjects.Graphics;
  private hardBadgeLabel!: Phaser.GameObjects.Text;
  private menuButton!: Button;
  private restartButton!: Button;
  private undoButton!: Button;
  private extraFlaskButton!: Button;
  private hintButton!: Button;
  private settingsButton!: Phaser.GameObjects.Container;
  private soundButton!: Button;
  private hapticsButton!: Button;
  private winOverlay!: Phaser.GameObjects.Container;
  private winBackdrop!: Phaser.GameObjects.Rectangle;
  private winTitle!: Phaser.GameObjects.Text;
  private winButton!: Button;
  private settingsOverlay!: Phaser.GameObjects.Container;
  private settingsBackdrop!: Phaser.GameObjects.Rectangle;
  private settingsPanelBox!: Phaser.GameObjects.Graphics;
  private settingsPanelBevel!: Phaser.GameObjects.Graphics;
  private settingsPanelOutline!: Phaser.GameObjects.Graphics;
  private settingsTitle!: Phaser.GameObjects.Text;
  private settingsCloseButton!: Button;

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
    this.createPourCubeTexture();

    this.levelText = this.add
      .text(this.scale.width / 2, 60, '', {
        fontFamily: theme.font.family,
        fontSize: `${theme.font.size.title}px`,
        color: '#ffffff',
        shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 0, fill: true },
      })
      .setOrigin(0.5);

    // Small "HARD" pill shown next to the title on every 3rd level - built
    // once here, repositioned/shown per level in loadLevel() once the title
    // text (and therefore its width) is known.
    this.hardBadgeBox = this.add.graphics();
    this.hardBadgeBevel = this.add.graphics();
    this.hardBadgeOutline = this.add.graphics();
    this.hardBadgeLabel = this.add
      .text(0, 1, 'HARD', {
        fontFamily: theme.font.family,
        fontSize: '9px',
        color: '#0d0d14',
      })
      .setOrigin(0.5);
    this.hardBadge = this.add.container(0, 0, [
      this.hardBadgeBox,
      this.hardBadgeBevel,
      this.hardBadgeOutline,
      this.hardBadgeLabel,
    ]);
    this.hardBadge.setVisible(false);

    this.menuButton = createButton(
      this,
      0,
      0,
      110,
      36,
      '< Menu',
      () => this.scene.start('Menu'),
      theme.accent.blue,
      '#ffffff',
    );
    this.restartButton = createButton(
      this,
      0,
      0,
      140,
      40,
      'Restart',
      () => this.restart(),
      theme.accent.blue,
      '#ffffff',
    );
    this.undoButton = createButton(this, 0, 0, 140, 40, '', () => void this.undo(), theme.accent.green);
    this.extraFlaskButton = createButton(
      this,
      0,
      0,
      150,
      40,
      'Flask (Ad)',
      () => void this.onExtraFlask(),
      theme.accent.yellow,
    );
    this.hintButton = createButton(
      this,
      0,
      0,
      150,
      40,
      '',
      () => void this.onHint(),
      theme.accent.pink,
      '#ffffff',
    );
    // A single gear-ish icon button opens a small in-level settings popup
    // (sound/haptics toggles) instead of two always-visible HUD buttons -
    // SettingsScene still has the full "Sound: On/Off" versions.
    this.settingsButton = createIconButton(this, 0, 0, 52, () => this.toggleSettings(), drawSlidersIcon);
    this.soundButton = createButton(this, 0, 0, 200, 48, '', () => this.toggleSound());
    this.hapticsButton = createButton(this, 0, 0, 200, 48, '', () => this.toggleHaptics());
    this.updateAudioToggleAccents();

    this.winOverlay = this.buildWinOverlay();
    this.winOverlay.setVisible(false);
    this.settingsOverlay = this.buildSettingsOverlay();
    this.settingsOverlay.setVisible(false);

    this.layoutControls();
    // The Scale Manager's resize event is global, not scoped to whichever
    // scene is active - without unsubscribing on shutdown, this listener
    // would outlive the scene (every stopped GameScene still re-laying-out
    // in the background on every future resize, bleeding onto whatever
    // scene is actually showing - see also the identical fix in Menu/
    // LevelSelect/SettingsScene).
    const onResize = () => {
      this.layoutControls();
      this.relayout();
    };
    this.scale.on('resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', onResize));

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

  // A small square "pixel cube" sprite, tinted per-color at spawn time, used
  // to fly from the source flask to the target during a pour so the liquid
  // visibly moves as chunky cubes rather than a smoothly growing rectangle.
  private createPourCubeTexture(): void {
    if (this.textures.exists(POUR_CUBE_TEXTURE)) return;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, POUR_CUBE_SIZE, POUR_CUBE_SIZE);
    g.lineStyle(2, 0x000000, 0.35);
    g.strokeRect(1, 1, POUR_CUBE_SIZE - 2, POUR_CUBE_SIZE - 2);
    g.fillStyle(0xffffff, 0.4);
    g.fillRect(2, 2, POUR_CUBE_SIZE - 4, 3);
    g.generateTexture(POUR_CUBE_TEXTURE, POUR_CUBE_SIZE, POUR_CUBE_SIZE);
    g.destroy();
  }

  private spawnPourCube(fromX: number, fromY: number, toX: number, toY: number, color: Color): void {
    const tint = theme.liquidColors[color % theme.liquidColors.length];
    const cube = this.add.image(fromX, fromY, POUR_CUBE_TEXTURE).setTint(tint).setDepth(20);
    this.tweens.add({
      targets: cube,
      x: toX,
      y: toY,
      angle: Phaser.Math.Between(-200, 200),
      duration: 150,
      ease: 'Cubic.easeIn',
      onComplete: () => cube.destroy(),
    });
  }

  private buildWinOverlay(): Phaser.GameObjects.Container {
    this.winBackdrop = this.add.rectangle(0, 0, 0, 0, 0x000000, 0.75).setOrigin(0);
    this.winTitle = this.add
      .text(0, 0, 'LEVEL\nCOMPLETE!', {
        fontFamily: theme.font.family,
        fontSize: `${theme.font.size.title}px`,
        color: '#ffd23f',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 2,
        shadow: { offsetX: 3, offsetY: 3, color: '#ef476f', blur: 0, fill: true },
      })
      .setOrigin(0.5);
    this.winButton = createButton(
      this,
      0,
      0,
      200,
      48,
      'Next Level',
      () => void this.nextLevel(),
      theme.accent.green,
    );

    const container = this.add.container(0, 0, [this.winBackdrop, this.winTitle, this.winButton]);
    container.setDepth(1000);
    this.layoutWinOverlay();
    return container;
  }

  private layoutWinOverlay(): void {
    const { width, height } = this.scale;
    this.winBackdrop.setSize(width, height);
    this.winTitle.setPosition(width / 2, height / 2 - 60);
    this.winButton.setPosition(width / 2, height / 2 + 55);
  }

  // Small in-level settings popup (sound/haptics) opened from the gear-ish
  // HUD icon - a dim full-screen backdrop (tap to close) behind a dark
  // pixel-art panel holding the two toggle buttons and an explicit close
  // button, since relying on "tap outside" alone isn't always discoverable.
  private buildSettingsOverlay(): Phaser.GameObjects.Container {
    this.settingsBackdrop = this.add.rectangle(0, 0, 0, 0, 0x000000, 0.75).setOrigin(0);
    this.settingsBackdrop.setInteractive();
    this.settingsBackdrop.on('pointerdown', () => this.closeSettings());

    this.settingsPanelBox = this.add.graphics();
    this.settingsPanelBevel = this.add.graphics();
    this.settingsPanelOutline = this.add.graphics();
    this.settingsTitle = this.add
      .text(0, 0, 'Settings', {
        fontFamily: theme.font.family,
        fontSize: `${theme.font.size.body}px`,
        color: '#ffffff',
        shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 0, fill: true },
      })
      .setOrigin(0.5);
    this.settingsCloseButton = createButton(
      this,
      0,
      0,
      140,
      40,
      'Close',
      () => this.closeSettings(),
      theme.accent.blue,
      '#ffffff',
    );

    const container = this.add.container(0, 0, [
      this.settingsBackdrop,
      this.settingsPanelBox,
      this.settingsPanelBevel,
      this.settingsPanelOutline,
      this.settingsTitle,
      this.soundButton,
      this.hapticsButton,
      this.settingsCloseButton,
    ]);
    container.setDepth(900);
    this.layoutSettingsOverlay();
    return container;
  }

  private layoutSettingsOverlay(): void {
    const { width, height } = this.scale;
    this.settingsBackdrop.setSize(width, height);

    const panelW = 260;
    const panelH = 280;
    const cx = width / 2;
    const cy = height / 2;
    drawPixelPanel(
      {
        shadow: this.settingsPanelBox,
        fill: this.settingsPanelBox,
        bevel: this.settingsPanelBevel,
        outline: this.settingsPanelOutline,
      },
      panelW,
      panelH,
      { fillColor: theme.flask.glass, outlineColor: theme.ui.outline },
    );
    this.settingsPanelBox.setPosition(cx, cy);
    this.settingsPanelBevel.setPosition(cx, cy);
    this.settingsPanelOutline.setPosition(cx, cy);

    this.settingsTitle.setPosition(cx, cy - panelH / 2 + 28);
    this.soundButton.setPosition(cx, cy - 45);
    this.hapticsButton.setPosition(cx, cy + 15);
    this.settingsCloseButton.setPosition(cx, cy + panelH / 2 - 35);
  }

  private toggleSettings(): void {
    if (this.settingsOpen) this.closeSettings();
    else this.openSettings();
  }

  private openSettings(): void {
    this.settingsOpen = true;
    this.layoutSettingsOverlay();
    this.settingsOverlay.setVisible(true);
  }

  private closeSettings(): void {
    this.settingsOpen = false;
    this.settingsOverlay.setVisible(false);
  }

  private loadLevel(levelNumber: number): void {
    this.levelNumber = levelNumber;
    this.level = generateLevel(levelNumber);
    this.board = this.level.board;
    this.history = [];
    this.sealedOrder = [];
    this.selectedIndex = null;
    this.won = false;
    this.animating = false;
    this.freeUndoesRemaining = 3;
    this.freeHintsRemaining = 1;
    this.hintsUsed = 0;
    this.extraFlaskUsed = false;
    this.updateUndoButtonLabel();
    this.updateHintButtonLabel();
    this.updateExtraFlaskButtonLabel();
    this.winOverlay.setVisible(false);
    this.closeSettings();
    this.levelText.setText(`Level ${levelNumber}`);
    void saveCurrentLevel(levelNumber);
    this.layoutHardBadge();

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

  // Positions the "HARD" pill just to the right of the level title - must
  // run after levelText.setText() so its measured width is current.
  private layoutHardBadge(): void {
    if (!this.level.isHard) {
      this.hardBadge.setVisible(false);
      return;
    }
    const badgeW = 56;
    const badgeH = 20;
    const x = this.levelText.x + this.levelText.width / 2 + 10 + badgeW / 2;
    const y = this.levelText.y;

    drawPixelPanel(
      { shadow: this.hardBadgeBox, fill: this.hardBadgeBox, bevel: this.hardBadgeBevel, outline: this.hardBadgeOutline },
      badgeW,
      badgeH,
      { fillColor: theme.accent.pink, outlineColor: theme.ui.outline },
    );

    this.hardBadge.setPosition(x, y);
    this.hardBadge.setVisible(true);
  }

  // Positions every fixed-chrome control (title, badge, top button row) from
  // the current scale - called once in create() and again on every resize,
  // since Phaser's RESIZE scale mode means `this.scale.width` can change
  // after a device rotation or a desktop window resize while this scene is
  // already live. Previously only the flask grid re-ran this math on resize
  // (via relayout()); the button row stayed anchored to whatever width was
  // current at create() time, so a mid-level resize could leave it
  // off-center or clipped - this fixes that.
  private layoutControls(): void {
    const { width } = this.scale;
    const midX = width / 2;

    this.menuButton.setPosition(65, 30);
    this.restartButton.setPosition(midX - 75, 110);
    this.undoButton.setPosition(midX + 75, 110);
    this.extraFlaskButton.setPosition(midX - 80, 170);
    this.hintButton.setPosition(midX + 80, 170);
    this.settingsButton.setPosition(width - 46, 30);

    this.levelText.setX(midX);
    if (this.level) this.layoutHardBadge();
    if (this.settingsOverlay) this.layoutSettingsOverlay();
  }

  // Groups sealed (full, single-color) flasks to the front of the board so
  // completed ones stay out of the way of whatever's still in play. Flask
  // taps always resolve through each FlaskView's own fixed `index`, so
  // reordering display slots here never affects move logic. The sealed group
  // is ordered by *when* each flask sealed (oldest first), not re-sorted
  // every call, so a newly-sealed flask joins the end of the line instead of
  // shuffling flasks that are already sitting there.
  private computeDisplayOrder(): number[] {
    const nowSealed = new Set<number>();
    this.board.forEach((flask, i) => {
      if (isFlaskSealed(flask, LAYERS_PER_FLASK)) nowSealed.add(i);
    });

    // Drop any that got unsealed (undo) and append newly-sealed ones.
    this.sealedOrder = this.sealedOrder.filter((i) => nowSealed.has(i));
    for (let i = 0; i < this.board.length; i++) {
      if (nowSealed.has(i) && !this.sealedOrder.includes(i)) this.sealedOrder.push(i);
    }

    const rest = this.board.map((_, i) => i).filter((i) => !nowSealed.has(i));
    return [...this.sealedOrder, ...rest];
  }

  private relayout(animate = false): void {
    this.layoutWinOverlay();
    const order = this.computeDisplayOrder();
    const slots = this.computeLayout(this.board.length);
    order.forEach((flaskIndex, slotIndex) => {
      const slot = slots[slotIndex];
      const view = this.flaskViews[flaskIndex];
      if (animate) {
        view.slideTo(slot.x, slot.y);
      } else {
        view.layout(slot.x, slot.y, slot.w, slot.h);
      }
      view.render(this.board[flaskIndex]);
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
    if (this.won || this.animating || this.settingsOpen) return;

    if (this.selectedIndex === null) {
      if (isFlaskSealed(this.board[index], LAYERS_PER_FLASK)) {
        // Sealed flasks hold every unit of their color - there's never a
        // legal pour out of one, so say so instead of silently ignoring it.
        this.audio.play('error');
        this.audio.haptic('error');
        this.flaskViews[index].shake();
        return;
      }
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

    // Quantize the fill into chunky notches instead of a smooth tween, so the
    // liquid visibly steps down/up pixel-by-pixel rather than sliding - a few
    // steps per layer-unit being poured reads as blocky without looking like
    // it's stuttering.
    const STEPS_PER_UNIT = 5;
    const steps = Math.max(4, Math.round(amount * STEPS_PER_UNIT));

    // Lip the cubes launch from (top of the tilted, lifted source flask, on
    // the side facing the target) - an approximation, not exact tilt trig,
    // good enough for a juice effect.
    const lipX = sourceView.layoutX + direction * (sourceView.flaskWidth / 2 - 4);
    const lipY = sourceView.layoutY - sourceView.flaskHeight / 2 - 16;
    const targetBaseUnits = targetBefore.length;

    sourceView.tiltTowards(direction, () => {
      const progress = { t: 0 };
      let lastStep = 0;
      this.tweens.add({
        targets: progress,
        t: 1,
        duration: 320,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          const stepIndex = Math.floor(progress.t * steps);
          const stepped = stepIndex / steps;
          this.renderPourFrame(sourceView, sourceBefore, true, amount, pourColor, 1 - stepped);
          this.renderPourFrame(targetView, targetBefore, false, amount, pourColor, stepped);

          if (stepIndex > lastStep) {
            lastStep = stepIndex;
            const landingY =
              targetView.layoutY + targetView.liquidTopLocalY(targetBaseUnits + amount * stepped);
            this.spawnPourCube(lipX, lipY, targetView.layoutX, landingY, pourColor);
            this.audio.playPourBlip(stepIndex, steps);
          }
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

      // Slide sealed flasks to the front once the squash-bounce (~180ms) has
      // had its moment, rather than fighting it for the same tween target.
      this.time.delayedCall(250, () => {
        if (!this.won) this.relayout(true);
      });
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
  // tap on Undo/Extra Flask/Hint/Restart can't race this one.
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
    this.relayout(true);
  }

  private updateUndoButtonLabel(): void {
    const free = this.freeUndoesRemaining > 0;
    this.undoButton
      .setText(free ? `Undo (${this.freeUndoesRemaining})` : 'Undo (Ad)')
      .setAccent(free ? theme.accent.green : theme.accent.pink);
  }

  private updateHintButtonLabel(): void {
    if (this.hintsUsed >= MAX_HINTS_PER_LEVEL) {
      // Same muted/disabled look as Extra Flask once spent.
      this.hintButton.setText('Hint (Max)').setAccent(0x4a4a58);
      return;
    }
    const free = this.freeHintsRemaining > 0;
    this.hintButton
      .setText(free ? `Hint (${this.freeHintsRemaining})` : 'Hint (Ad)')
      // Purple rather than Undo's green for the free state - the two
      // buttons sit right next to each other, and green would read as "the
      // same button twice" rather than two independent counters.
      .setAccent(free ? theme.accent.purple : theme.accent.pink);
  }

  // Quick in-level toggles mirroring SettingsScene's Sound/Haptics buttons,
  // so the player doesn't have to leave the level to mute either one.
  private toggleSound(): void {
    this.audio.toggleSound();
    this.updateAudioToggleAccents();
  }

  private toggleHaptics(): void {
    this.audio.toggleHaptics();
    this.updateAudioToggleAccents();
  }

  private updateAudioToggleAccents(): void {
    const soundOn = this.audio.soundEnabled;
    const hapticsOn = this.audio.hapticsEnabled;
    this.soundButton
      .setText(`Sound: ${soundOn ? 'On' : 'Off'}`)
      .setAccent(soundOn ? theme.accent.green : theme.accent.pink);
    this.hapticsButton
      .setText(`Haptics: ${hapticsOn ? 'On' : 'Off'}`)
      .setAccent(hapticsOn ? theme.accent.green : theme.accent.pink);
  }

  // Adds one empty flask to the current board - behind a rewarded ad, and
  // capped at 1 per level (see extraFlaskUsed's comment).
  private async onExtraFlask(): Promise<void> {
    if (this.won || this.animating || this.extraFlaskUsed) return;
    this.animating = true;
    const earned = await this.ads.showRewardedAd();
    this.animating = false;
    if (!earned || this.won) return;

    this.extraFlaskUsed = true;
    this.updateExtraFlaskButtonLabel();

    this.board = [...this.board, []];
    const index = this.board.length - 1;
    const view = new FlaskView(this, index, (i) => this.onFlaskTapped(i));
    this.add.existing(view);
    this.flaskViews = [...this.flaskViews, view];
    this.relayout();
  }

  private updateExtraFlaskButtonLabel(): void {
    this.extraFlaskButton
      .setText(this.extraFlaskUsed ? 'Flask (Used)' : 'Flask (Ad)')
      .setAccent(this.extraFlaskUsed ? 0x4a4a58 : theme.accent.yellow);
  }

  // 1 hint per level is free (same allowance/display convention as Undo);
  // after that, each one costs a rewarded ad, up to MAX_HINTS_PER_LEVEL
  // total - unlike Undo/Extra Flask, ads don't lift the cap entirely, since
  // a hint just hands over the answer. Highlights the next correct move
  // (source -> target flask) via the solver - purely a visual nudge, it
  // pulses the two flasks rather than selecting/pouring them, so it can
  // never desync from the player's own in-progress selection.
  private async onHint(): Promise<void> {
    if (this.won || this.animating || this.hintsUsed >= MAX_HINTS_PER_LEVEL) return;

    if (this.freeHintsRemaining > 0) {
      this.freeHintsRemaining--;
    } else {
      this.animating = true;
      const earned = await this.ads.showRewardedAd();
      this.animating = false;
      if (!earned) return;
    }
    this.hintsUsed++;
    this.updateHintButtonLabel();

    const move = findHintMove(this.board);
    if (!move) return;
    const [from, to] = move;
    this.flaskViews[from].hintPulse();
    this.flaskViews[to].hintPulse();
    this.audio.play('select');
    this.audio.haptic('select');
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
