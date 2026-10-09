// Move-efficiency star rating: compares the moves a player actually used to
// solve a level against that level's par (Level.parMoves, the solver's own
// move count for that exact board - see generator.ts). Pure so it's
// testable without a running game, same split as board/generator/solver.

import { colorsForLevel } from './generator';

// 3 stars: matched or beat par. 2 stars: within 50% over par. 1 star:
// solved it at all, however long it took.
const TWO_STAR_OVERAGE_FRACTION = 0.5;

export function computeStars(movesUsed: number, parMoves: number): number {
  if (movesUsed <= parMoves) return 3;
  const twoStarCeiling = parMoves + Math.ceil(parMoves * TWO_STAR_OVERAGE_FRACTION);
  if (movesUsed <= twoStarCeiling) return 2;
  return 1;
}

// Points per level scale with its color count (harder levels, since the
// game has no other difficulty axis to weight by - see CLAUDE.md's "each
// flask holds 4 layers" rule, which already rules out a capacity-based
// weight) and with the best star rating ever earned there (1x/1.5x/2x) -
// so going back for a better rating on an already-cleared level raises the
// lifetime score, same incentive the star display already creates.
const POINTS_PER_COLOR = 100;
const STAR_MULTIPLIER = [1, 1.5, 2]; // indexed by stars - 1

function pointsForLevel(levelNumber: number, stars: number): number {
  const multiplier = STAR_MULTIPLIER[Math.max(1, Math.min(3, stars)) - 1];
  return Math.round(colorsForLevel(levelNumber) * POINTS_PER_COLOR * multiplier);
}

// Lifetime score, derived entirely from stored stars (no separate score
// storage to drift out of sync with it) - every key is a level that's been
// won at least once, with the best rating ever earned there (see
// storage.ts's recordLevelStars, which only writes if better). Takes a
// plain record rather than importing storage.ts's LevelStars type, so
// core/ (pure logic) doesn't depend on services/ (platform I/O) even just
// for a type - same layering the repo structure already keeps.
export function computeScore(allStars: Record<string, number>): number {
  let total = 0;
  for (const [levelKey, stars] of Object.entries(allStars)) {
    total += pointsForLevel(Number(levelKey), stars);
  }
  return total;
}
