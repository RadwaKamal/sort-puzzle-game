import { describe, expect, it } from 'vitest';
import { colorsForLevel, generateLevel, isFrozenLevel, isHardLevel } from '../src/core/generator';
import { solve } from '../src/core/solver';

describe('colorsForLevel', () => {
  it('starts at 3 colors and caps at 12', () => {
    expect(colorsForLevel(1)).toBe(3);
    expect(colorsForLevel(20)).toBe(3);
    expect(colorsForLevel(21)).toBe(4);
    expect(colorsForLevel(2000)).toBe(12);
  });
});

describe('isHardLevel', () => {
  it('flags every 3rd level as hard', () => {
    expect(isHardLevel(3)).toBe(true);
    expect(isHardLevel(6)).toBe(true);
    expect(isHardLevel(1)).toBe(false);
    expect(isHardLevel(2)).toBe(false);
    expect(isHardLevel(4)).toBe(false);
  });
});

describe('isFrozenLevel', () => {
  it('flags every 5th level from level 10 on, and only those', () => {
    expect(isFrozenLevel(10)).toBe(true);
    expect(isFrozenLevel(15)).toBe(true);
    expect(isFrozenLevel(5)).toBe(false);
    expect(isFrozenLevel(9)).toBe(false);
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
    expect(level.isHard).toBe(false);
  });

  it('hard levels get one fewer empty flask and are flagged', () => {
    const level = generateLevel(21); // 21 % 3 === 0
    const emptyFlasks = level.board.filter((flask) => flask.length === 0);
    expect(level.isHard).toBe(true);
    expect(level.board.length).toBe(level.numColors + 1);
    expect(emptyFlasks.length).toBe(1);
  });

  it('every generated level for levels 1-200 is solvable (respecting its frozen flask, if any)', () => {
    for (let levelNumber = 1; levelNumber <= 200; levelNumber++) {
      const level = generateLevel(levelNumber);
      const result = solve(level.board, undefined, undefined, level.frozen);
      expect(result.solvable, `level ${levelNumber} should be solvable`).toBe(true);
      expect(result.inconclusive, `level ${levelNumber} solve() should be conclusive`).toBeFalsy();
    }
  });

  it('parMoves matches the solver\'s actual move count for that exact board, not just a threshold', () => {
    const level = generateLevel(50);
    const result = solve(level.board, undefined, undefined, level.frozen);
    expect(level.parMoves).toBe(result.moveCount);
    expect(level.parMoves).toBeGreaterThan(0);
  });

  it('frozen levels freeze one of the starting color flasks, with a thaw threshold the solve respects', () => {
    const level = generateLevel(10); // 10 >= 10 && 10 % 5 === 0
    expect(level.frozen).not.toBeNull();
    const frozen = level.frozen!;
    expect(frozen.flaskIndex).toBeGreaterThanOrEqual(0);
    expect(frozen.flaskIndex).toBeLessThan(level.numColors);
    expect(frozen.thawAtMove).toBeGreaterThan(0);
  });

  it('non-frozen levels have a null frozen field', () => {
    const level = generateLevel(11); // not a multiple of 5
    expect(level.frozen).toBeNull();
  });
});
