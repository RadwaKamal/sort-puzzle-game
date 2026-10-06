import Phaser from 'phaser';
import { theme } from '../theme';
import { applyMove, canPour, isBoardSolved, isFlaskEmpty, LAYERS_PER_FLASK } from '../core/board';
import type { Board } from '../core/board';
import { generateLevel } from '../core/generator';
import type { Level } from '../core/generator';
import { FlaskView } from '../view/FlaskView';

const TOP_MARGIN = 160;
const BOTTOM_MARGIN = 40;
const SIDE_MARGIN = 24;
const FLASK_ASPECT = 2.2; // height / width

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

  private flaskViews: FlaskView[] = [];
  private levelText!: Phaser.GameObjects.Text;
  private winOverlay!: Phaser.GameObjects.Container;
  private winBackdrop!: Phaser.GameObjects.Rectangle;
  private winTitle!: Phaser.GameObjects.Text;
  private winButton!: Phaser.GameObjects.Text;

  constructor() {
    super('Game');
  }

  create(): void {
    this.levelText = this.add
      .text(this.scale.width / 2, 60, '', {
        fontFamily: theme.font.family,
        fontSize: `${theme.font.size.title}px`,
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.createButton(this.scale.width / 2 - 90, 110, 'Restart', () => this.restart());
    this.createButton(this.scale.width / 2 + 90, 110, 'Undo', () => this.undo());

    this.winOverlay = this.buildWinOverlay();
    this.winOverlay.setVisible(false);

    this.scale.on('resize', () => this.relayout());

    this.loadLevel(this.levelNumber);
  }

  private createButton(x: number, y: number, label: string, onTap: () => void): void {
    this.add
      .text(x, y, label, {
        fontFamily: theme.font.family,
        fontSize: `${theme.font.size.body}px`,
        color: '#ffffff',
        backgroundColor: '#ffffff22',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onTap);
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
      .on('pointerdown', () => this.nextLevel());

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
    this.level = generateLevel(levelNumber);
    this.board = this.level.board;
    this.history = [];
    this.selectedIndex = null;
    this.won = false;
    this.winOverlay.setVisible(false);
    this.levelText.setText(`Level ${levelNumber}`);

    for (const view of this.flaskViews) view.destroy();
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
    if (this.won) return;

    if (this.selectedIndex === null) {
      if (!isFlaskEmpty(this.board[index])) {
        this.selectedIndex = index;
        this.flaskViews[index].setSelected(true);
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
      this.history.push(this.board);
      this.board = applyMove(this.board, from, index, LAYERS_PER_FLASK);
      this.flaskViews[from].setSelected(false);
      this.selectedIndex = null;
      this.flaskViews.forEach((view, i) => view.render(this.board[i]));
      this.checkWin();
      return;
    }

    this.flaskViews[from].setSelected(false);
    if (!isFlaskEmpty(this.board[index])) {
      this.selectedIndex = index;
      this.flaskViews[index].setSelected(true);
    } else {
      this.selectedIndex = null;
    }
  }

  private checkWin(): void {
    if (isBoardSolved(this.board, LAYERS_PER_FLASK)) {
      this.won = true;
      this.winOverlay.setVisible(true);
    }
  }

  private undo(): void {
    if (this.won || this.history.length === 0) return;
    if (this.selectedIndex !== null) {
      this.flaskViews[this.selectedIndex].setSelected(false);
      this.selectedIndex = null;
    }
    this.board = this.history.pop() as Board;
    this.flaskViews.forEach((view, i) => view.render(this.board[i]));
  }

  private restart(): void {
    this.loadLevel(this.levelNumber);
  }

  private nextLevel(): void {
    this.levelNumber += 1;
    this.loadLevel(this.levelNumber);
  }
}
