// Move-efficiency star rating: compares the moves a player actually used to
// solve a level against that level's par (Level.parMoves, the solver's own
// move count for that exact board - see generator.ts). Pure so it's
// testable without a running game, same split as board/generator/solver.

// 3 stars: matched or beat par. 2 stars: within 50% over par. 1 star:
// solved it at all, however long it took.
const TWO_STAR_OVERAGE_FRACTION = 0.5;

export function computeStars(movesUsed: number, parMoves: number): number {
  if (movesUsed <= parMoves) return 3;
  const twoStarCeiling = parMoves + Math.ceil(parMoves * TWO_STAR_OVERAGE_FRACTION);
  if (movesUsed <= twoStarCeiling) return 2;
  return 1;
}
