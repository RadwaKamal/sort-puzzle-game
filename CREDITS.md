# Credits

## Sounds

All sounds are from [Kenney.nl](https://kenney.nl) asset packs, licensed
[CC0 (Creative Commons Zero)](https://creativecommons.org/publicdomain/zero/1.0/) —
public domain, free for personal and commercial use, no attribution required.
Credited here anyway as thanks.

| File | Source pack | Original file |
| --- | --- | --- |
| `public/assets/sounds/select.ogg` | [Interface Sounds](https://kenney.nl/assets/interface-sounds) | `select_001.ogg` |
| `public/assets/sounds/pour.ogg` | [Interface Sounds](https://kenney.nl/assets/interface-sounds) | `glass_002.ogg` |
| `public/assets/sounds/complete.ogg` | [Interface Sounds](https://kenney.nl/assets/interface-sounds) | `confirmation_002.ogg` |
| `public/assets/sounds/error.ogg` | [Interface Sounds](https://kenney.nl/assets/interface-sounds) | `error_002.ogg` |
| `public/assets/sounds/win.ogg` | [Music Jingles](https://kenney.nl/assets/music-jingles) | `Pizzicato jingles/jingles_PIZZI00.ogg` |

## Fonts

| File | Source | License |
| --- | --- | --- |
| `public/assets/fonts/PressStart2P-Regular.ttf` | [Press Start 2P](https://github.com/google/fonts/tree/main/ofl/pressstart2p) by Cody "CodeMan38" Boisclair, via Google Fonts | [SIL Open Font License 1.1](https://scripts.sil.org/OFL) |

Used throughout the UI as part of the "Arcade Potion Lab" pixel-art visual direction (chosen from
three brainstormed directions — see project memory/session history for the others).

## Visual direction

The current UI (bold flat colors, thick white outlines, hard offset shadows) was inspired by
[Kenney.nl](https://kenney.nl)'s CC0 "Pixel UI Pack" as a style reference during the brainstorm
phase; no files from that pack are used directly — all button/flask graphics are drawn in code
via Phaser Graphics (see `src/view/button.ts`, `src/view/FlaskView.ts`).

## App icon and splash screen

Self-made (`assets/icon*.png`, `assets/splash.png`): a flat flask glyph matching the in-game
`FlaskView` art style — sharp corners, thick white outline, hard offset shadow, "Arcade Potion
Lab" palette (red/teal/orange liquid bands on a dark `#0d0d14` ground).
