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

  // Up to 12 liquid colors: pink and yellow stayed full 4-shade families,
  // but purple shrank to a single shade (violet) and green grew to 3 - see
  // the full trail below. Interleaved (one family member at a time) rather
  // than grouped, so low-color early levels always draw from different
  // families first instead of two near-identical shades of one. Color-blind
  // distinctness leans heavily on lightness/value contrast within each
  // family, since hue alone can't carry it here - see the "color symbols
  // for accessibility" gap noted in the logo/icon review artifact if this
  // ever needs to be fully colorblind-safe.
  //
  // Purple's history: started as a 4-shade family (hue 268-302, violet
  // through magenta-purple - nothing below 268, since an even earlier
  // "indigo" at hue 230 read as blue, not purple). Shrank twice: "lavender"
  // (palest) swapped for a mint green for sitting too close to the pink
  // family; "orchid" (hue 288) swapped for a second, distinctly different
  // green (hue 135, emerald) for reading near-identical to violet at a
  // glance. Finally "plum" (the dark one) was dropped too, down to just
  // "violet" - a third green (hue 150, dark forest) fills its old dark-value
  // slot.
  liquidColors: [
    0x1b6a42, // forest (dark green)
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
    purple: 0x8640e7,
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
