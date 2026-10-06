import { describe, expect, it } from 'vitest';
import { SeededRng } from '../src/core/rng';

describe('SeededRng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = new SeededRng(42);
    const b = new SeededRng(42);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = new SeededRng(1);
    const b = new SeededRng(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('next() stays within [0, 1)', () => {
    const rng = new SeededRng(7);
    for (let i = 0; i < 1000; i++) {
      const n = rng.next();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });

  it('nextInt() stays within the inclusive range', () => {
    const rng = new SeededRng(99);
    for (let i = 0; i < 1000; i++) {
      const n = rng.nextInt(3, 7);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(7);
      expect(Number.isInteger(n)).toBe(true);
    }
  });

  it('shuffle() preserves all elements and does not mutate the input', () => {
    const rng = new SeededRng(5);
    const original = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = rng.shuffle(original);

    expect(original).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(shuffled.slice().sort()).toEqual(original.slice().sort());
  });

  it('shuffle() is deterministic for a given seed', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const a = new SeededRng(123).shuffle(items);
    const b = new SeededRng(123).shuffle(items);
    expect(a).toEqual(b);
  });
});
