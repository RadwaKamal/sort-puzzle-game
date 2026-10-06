// Seeded level generation. A level is built by distributing shuffled color
// units into flasks, then verified with the solver; unsolvable or trivially
// easy shuffles are rejected and regenerated with a new deterministic seed,
// so a given level number always ends up with the same final layout.

import { createEmptyFlask, LAYERS_PER_FLASK } from './board';
import type { Board, Color } from './board';
import { SeededRng } from './rng';
import { solve } from './solver';

export interface Level {
  levelNumber: number;
  numColors: number;
  board: Board;
  minMoves: number;
}

const MIN_COLORS = 3;
const MAX_COLORS = 12;
const EMPTY_FLASKS = 2;
// How many level numbers it takes to ramp from MIN_COLORS to MAX_COLORS.
const LEVELS_PER_COLOR_TIER = 20;

const MAX_GENERATION_ATTEMPTS = 500;

export function colorsForLevel(levelNumber: number): number {
  const tier = Math.floor((levelNumber - 1) / LEVELS_PER_COLOR_TIER);
  return Math.min(MAX_COLORS, MIN_COLORS + tier);
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
  const numFlasks = numColors + EMPTY_FLASKS;
  // Require at least a few real moves so a shuffle that happens to come out
  // nearly sorted doesn't get served up as a "level".
  const minMoves = numColors;

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const rng = new SeededRng(seedForAttempt(levelNumber, attempt));
    const board = buildCandidateBoard(rng, numColors, numFlasks);
    const result = solve(board);

    if (result.solvable && !result.inconclusive && (result.moveCount ?? 0) >= minMoves) {
      return { levelNumber, numColors, board, minMoves };
    }
  }

  throw new Error(
    `Could not generate a solvable level ${levelNumber} after ${MAX_GENERATION_ATTEMPTS} attempts`,
  );
}
