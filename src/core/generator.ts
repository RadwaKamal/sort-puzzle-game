// Seeded level generation. A level is built by distributing shuffled color
// units into flasks, then verified with the solver; unsolvable or trivially
// easy shuffles are rejected and regenerated with a new deterministic seed,
// so a given level number always ends up with the same final layout.

import { createEmptyFlask, LAYERS_PER_FLASK } from './board';
import type { Board, Color } from './board';
import { SeededRng } from './rng';
import { solve } from './solver';
import type { FrozenSpec } from './solver';

export interface Level {
  levelNumber: number;
  numColors: number;
  board: Board;
  // The solver's actual move count for this specific board (not the
  // generation-acceptance threshold below, which only bounds how easy a
  // shuffle generation will accept - this is the real per-level par used
  // for star scoring). The solver is a weighted best-first search, not a
  // guaranteed-shortest-path one, so this is "a good target", not a proven
  // optimum - see solver.ts's module comment.
  parMoves: number;
  isHard: boolean;
  // null on every level except the occasional frozen one (see isFrozenLevel).
  frozen: FrozenSpec | null;
}

const MIN_COLORS = 3;
const MAX_COLORS = 12;
const EMPTY_FLASKS = 2;
// Hard levels get one fewer free flask than their tier would normally have -
// same color count, noticeably less room to maneuver. Only safe up to a
// point though: with 8+ colors, dropping to a single free flask makes a
// random shuffle solvable so rarely that generation can't reliably find one
// within the attempt budget (empirically ~1% or less of shuffles qualify at
// 8 colors, ~0% at 10+) - past that cutoff hard levels keep the normal flask
// count and lean on the raised minMoves bar instead.
const HARD_EMPTY_FLASKS = 1;
const HARD_FEWER_FLASKS_MAX_COLORS = 7;
// How many level numbers it takes to ramp from MIN_COLORS to MAX_COLORS.
// Was 20 (reaching the 12-color cap at level 181, only 20 levels before the
// 200-level arc ends) - tightened to 15 so the back third of the arc
// (level 136 on) spends more time at the harder end instead of the easy
// ramp eating most of the level list.
const LEVELS_PER_COLOR_TIER = 15;
// Every 3rd level is a spotlighted hard level - same color-count tier as its
// neighbors, but tighter on space and biased toward gnarlier shuffles.
const HARD_LEVEL_INTERVAL = 3;
// A different spotlighted twist, offset from the hard-level cadence so the
// two only coincide occasionally (every lcm(3,5) = 15 levels) rather than
// every single special level being a double-whammy. Starts a bit later than
// hard levels so the player meets sealing/hard first before a second rule
// shows up.
const FROZEN_LEVEL_START = 10;
const FROZEN_LEVEL_INTERVAL = 5;
// How far into the level's typical solve length a frozen flask stays iced -
// long enough to force planning around it, short enough that it's not just
// dead time. Applied to the generation-acceptance move bar (minMoves below),
// not the solver's real parMoves, since parMoves isn't known until the
// board - including the freeze - has actually been solved.
const FROZEN_THAW_FRACTION = 0.4;
const FROZEN_THAW_MIN_MOVES = 2;

const MAX_GENERATION_ATTEMPTS = 500;

export function colorsForLevel(levelNumber: number): number {
  const tier = Math.floor((levelNumber - 1) / LEVELS_PER_COLOR_TIER);
  return Math.min(MAX_COLORS, MIN_COLORS + tier);
}

export function isHardLevel(levelNumber: number): boolean {
  return levelNumber % HARD_LEVEL_INTERVAL === 0;
}

export function isFrozenLevel(levelNumber: number): boolean {
  return levelNumber >= FROZEN_LEVEL_START && levelNumber % FROZEN_LEVEL_INTERVAL === 0;
}

// A deterministic per-attempt seed so retries are reproducible: the same
// level number always walks the same sequence of candidate boards.
function seedForAttempt(levelNumber: number, attempt: number): number {
  const h = Math.imul(levelNumber, 2654435761) ^ Math.imul(attempt + 1, 0x9e3779b9);
  return h >>> 0;
}

function buildCandidateBoard(rng: SeededRng, numColors: number, numFlasks: number): Board {
  const units: Color[] = [];
  for (let color = 0; color < numColors; color++) {
    for (let layer = 0; layer < LAYERS_PER_FLASK; layer++) {
      units.push(color);
    }
  }
  const shuffled = rng.shuffle(units);

  const board: Board = [];
  for (let f = 0; f < numColors; f++) {
    board.push(shuffled.slice(f * LAYERS_PER_FLASK, (f + 1) * LAYERS_PER_FLASK));
  }
  for (let e = 0; e < numFlasks - numColors; e++) {
    board.push(createEmptyFlask());
  }
  return board;
}

export function generateLevel(levelNumber: number): Level {
  const numColors = colorsForLevel(levelNumber);
  const isHard = isHardLevel(levelNumber);
  const hardFewerFlasks = isHard && numColors <= HARD_FEWER_FLASKS_MAX_COLORS;
  const numFlasks = numColors + (hardFewerFlasks ? HARD_EMPTY_FLASKS : EMPTY_FLASKS);
  // Require at least a few real moves so a shuffle that happens to come out
  // nearly sorted doesn't get served up as a "level". Hard levels additionally
  // bias toward gnarlier shuffles by raising that bar further. Even the
  // normal-level bar is above a flat `numColors` (was, until this got tuned
  // harder) - a small multiplier keeps every level from occasionally
  // generating a borderline-trivial shuffle, not just hard ones. This is
  // purely a generation-acceptance threshold, not the returned Level's
  // parMoves (see that field's comment) - a candidate board just has to meet
  // or beat it.
  const minMoves = Math.ceil(numColors * (isHard ? 1.3 : 1.15));
  const frozenThisLevel = isFrozenLevel(levelNumber);

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const rng = new SeededRng(seedForAttempt(levelNumber, attempt));
    const board = buildCandidateBoard(rng, numColors, numFlasks);
    // Only ever freezes one of the starting color flasks (indices
    // 0..numColors-1 per buildCandidateBoard) - the free empty flasks are
    // the player's maneuvering room, freezing one of those would just be a
    // no-op since there'd be nothing in it to pour out anyway.
    const frozen: FrozenSpec | null = frozenThisLevel
      ? {
          flaskIndex: rng.nextInt(0, numColors - 1),
          thawAtMove: Math.max(FROZEN_THAW_MIN_MOVES, Math.round(minMoves * FROZEN_THAW_FRACTION)),
        }
      : null;
    const result = solve(board, LAYERS_PER_FLASK, undefined, frozen);

    if (result.solvable && !result.inconclusive && (result.moveCount ?? 0) >= minMoves) {
      return { levelNumber, numColors, board, parMoves: result.moveCount as number, isHard, frozen };
    }
  }

  throw new Error(
    `Could not generate a solvable level ${levelNumber} after ${MAX_GENERATION_ATTEMPTS} attempts ` +
      `(numColors=${numColors}, numFlasks=${numFlasks}, minMoves=${minMoves}, isHard=${isHard})`,
  );
}
