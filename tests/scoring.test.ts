import { describe, expect, it } from 'vitest';
import { computeStars, computeScore } from '../src/core/scoring';
import { colorsForLevel } from '../src/core/generator';

describe('computeStars', () => {
  it('awards 3 stars for matching or beating par', () => {
    expect(computeStars(10, 10)).toBe(3);
    expect(computeStars(8, 10)).toBe(3);
  });

  it('awards 2 stars for up to 50% over par', () => {
    expect(computeStars(15, 10)).toBe(2); // exactly at the 50%-over ceiling
    expect(computeStars(11, 10)).toBe(2);
  });

  it('awards 1 star for solving it at all, however long it took', () => {
    expect(computeStars(16, 10)).toBe(1);
    expect(computeStars(100, 10)).toBe(1);
  });

  it('handles a tiny par without dividing by zero or similar edge cases', () => {
    expect(computeStars(1, 1)).toBe(3);
    expect(computeStars(2, 1)).toBe(2);
    expect(computeStars(3, 1)).toBe(1);
  });
});

describe('computeScore', () => {
  it('is 0 for no stored stars', () => {
    expect(computeScore({})).toBe(0);
  });

  it('weights points by level difficulty (color count) and star rating', () => {
    // Level 1 is always 3 colors (see colorsForLevel's own tests).
    expect(computeScore({ '1': 1 })).toBe(colorsForLevel(1) * 100 * 1);
    expect(computeScore({ '1': 2 })).toBe(colorsForLevel(1) * 100 * 1.5);
    expect(computeScore({ '1': 3 })).toBe(colorsForLevel(1) * 100 * 2);
  });

  it('sums across every stored level', () => {
    const level1Points = computeScore({ '1': 3 });
    const level16Points = computeScore({ '16': 2 }); // colorsForLevel(16) = 4, a different tier than level 1
    expect(computeScore({ '1': 3, '16': 2 })).toBe(level1Points + level16Points);
  });

  it('replaying a level for a better rating raises its contribution to the score', () => {
    expect(computeScore({ '1': 3 })).toBeGreaterThan(computeScore({ '1': 1 }));
  });

  // The stars blob is plain localStorage JSON, never server-validated, so a
  // hand-edited or corrupted entry is reachable in practice even though the
  // app's own writer (recordLevelStars) never produces one. A single bad
  // entry must not NaN-poison every other level's contribution to the total.
  it('skips corrupted entries instead of letting them NaN-poison the whole score', () => {
    const good = computeScore({ '1': 3 });
    expect(computeScore({ '1': 3, abc: 2 })).toBe(good); // non-numeric key
    expect(computeScore({ '1': 3, '2': NaN })).toBe(good); // non-numeric value
    expect(computeScore({ abc: 2, def: NaN })).toBe(0); // nothing valid at all
  });
});
