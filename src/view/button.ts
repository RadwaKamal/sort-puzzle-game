import Phaser from 'phaser';
import { theme } from '../theme';

export function createTextButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onTap: () => void,
  style: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {},
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, label, {
      fontFamily: theme.font.family,
      fontSize: `${theme.font.size.body}px`,
      color: '#ffffff',
      backgroundColor: '#ffffff22',
      padding: { x: 16, y: 8 },
      ...style,
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', onTap);
}
