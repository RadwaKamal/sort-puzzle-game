import { describe, expect, it } from 'vitest';
import { computeStars } from '../src/core/scoring';

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
