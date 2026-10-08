// All colors, fonts and sizes for the game live here so the visual theme can
// be swapped later without touching game logic or scenes.
//
// Current theme: "Arcade Potion Lab" - bold flat primaries, thick white
// outlines, hard offset shadows, Press Start 2P. See the UI brainstorm
// artifact from the pixel-art direction pass for the other two directions
// that were considered (warm wood "Alchemist's Workshop" and soft glowing
// "Moonlit Potion Garden").

export const theme = {
  background: 0x0d0d14,

  // Up to 12 liquid colors, mostly built from 3 hue families - purple, pink,
  // yellow - instead of a full-spectrum rainbow, interleaved (one from each
  // family, repeated) rather than grouped, so low-color early levels always
  // draw one of each family first instead of two near-identical purples.
  // Within each family the hue is spread ~20-35deg apart and lightness
  // spans dark/mid/light/very-light, since 3 families alone can't carry
  // color-blind distinctness the way 12 spread-out hues could - value
  // contrast is doing a lot of that work here. See the "color symbols for
  // accessibility" gap noted in the logo/icon review artifact if this ever
  // needs to be fully colorblind-safe.
  // Purple family is kept to hue 268-302 (violet through magenta-purple) -
  // an earlier "indigo" shade at hue 230 read as blue rather than purple
  // and sat too close to the violet next to it, so nothing here dips below
  // 268. Down to 2 purples now (plum, violet): the palest ("lavender") was
  // swapped for a mint green early on, and "orchid" (hue 288) turned out to
  // still read as near-identical to violet (hue 270) at a glance - swapped
  // for a second, clearly different green (hue 135, true emerald, not the
  // mint-teal the other green already uses) rather than adding a 3rd purple
  // back.
  liquidColors: [
    0x4a206f, // plum (dark purple)
    0xef39a3, // magenta
    0xf6a123, // amber
    0x8529e0, // violet
    0xf55c94, // hot pink
    0xffd23f, // gold (kept - matches the UI's yellow accent)
    0x25d050, // emerald
    0xf58493, // salmon
    0xf8ec81, // lemon
    0x06d6a0, // mint green
    0x7a1f49, // wine
    0x9c761c, // mustard
  ],

  flask: {
    glass: 0x1a1a24, // solid dark fill, not translucent
    glassAlpha: 1,
    outline: 0xffffff,
    outlineAlpha: 1,
    outlineWidth: 4,
    selectedOutline: 0xffd23f, // yellow ring when a flask is picked up
    shadow: 0x000000,
    shadowOffset: 5,
  },

  // Named accent colors for buttons/panels - pick one per button by role,
  // not by position, so the same label always reads the same color.
  accent: {
    yellow: 0xffd23f,
    blue: 0x118ab2,
    pink: 0xef476f,
    green: 0x06d6a0,
  },

  ui: {
    outline: 0xffffff,
    shadow: 0x000000,
    shadowOffset: 4,
  },

  font: {
    // Quoted: Phaser builds the canvas font string without quoting
    // multi-word family names, and "Press Start 2P" (a space, and "2P"
    // starting with a digit) gets silently rejected by the canvas font
    // parser, leaving it stuck on the browser's default ("10px sans-serif")
    // instead of erroring. Embedding the quotes here fixes every call site.
    family: '"Press Start 2P"',
    // Press Start 2P's glyphs are much wider per character than a normal
    // sans/serif, so these sizes are deliberately much smaller than a
    // typical type scale would use at this viewport size.
    size: {
      title: 26,
      body: 15,
      small: 10,
    },
  },
} as const;
