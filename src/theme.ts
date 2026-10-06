// All colors, fonts and sizes for the game live here so the potion theme
// can be swapped later without touching game logic or scenes.

export const theme = {
  background: 0x0b0c10,

  // Up to 12 liquid colors, chosen to stay distinct for color-blind players.
  // Each has an optional symbol for accessibility (added alongside color in the view layer).
  liquidColors: [
    0xe63946, // red
    0x2a9d8f, // teal
    0xf4a261, // orange
    0x457b9d, // blue
    0xe9c46a, // yellow
    0x9b5de5, // purple
    0x2ec4b6, // mint
    0xff6b9d, // pink
    0x606c38, // olive
    0xbdbdbd, // grey
    0x774936, // brown
    0x00b4d8, // cyan
  ],

  flask: {
    glass: 0xffffff,
    glassAlpha: 0.12,
    outline: 0xffffff,
    outlineAlpha: 0.35,
  },

  font: {
    family: 'Fredoka',
    size: {
      title: 48,
      body: 24,
      small: 16,
    },
  },
} as const;
