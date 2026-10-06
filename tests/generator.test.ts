import { describe, expect, it } from 'vitest';
import { colorsForLevel, generateLevel } from '../src/core/generator';
import { solve } from '../src/core/solver';

describe('colorsForLevel', () => {
  it('starts at 3 colors and caps at 12', () => {
    expect(colorsForLevel(1)).toBe(3);
    expect(colorsForLevel(20)).toBe(3);
    expect(colorsForLevel(21)).toBe(4);
    expect(colorsForLevel(2000)).toBe(12);
  });
});

describe('generateLevel', () => {
  it('is deterministic: the same level number always produces the same board', () => {
    const a = generateLevel(37);
    const b = generateLevel(37);
    expect(a.board).toEqual(b.board);
  });

  it('builds N colors in N + 2 flasks with two empty', () => {
    const level = generateLevel(50);
    const emptyFlasks = level.board.filter((flask) => flask.length === 0);
    expect(level.board.length).toBe(level.numColors + 2);
    expect(emptyFlasks.length).toBe(2);
  });

  it('every generated level for levels 1-200 is solvable', () => {
    for (let levelNumber = 1; levelNumber <= 200; levelNumber++) {
      const level = generateLevel(levelNumber);
      const result = solve(level.board);
      expect(result.solvable, `level ${levelNumber} should be solvable`).toBe(true);
      expect(result.inconclusive, `level ${levelNumber} solve() should be conclusive`).toBeFalsy();
    }
  });
});
