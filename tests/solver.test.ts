import { describe, expect, it } from 'vitest';
import type { Board } from '../src/core/board';
import { solve } from '../src/core/solver';

describe('solve', () => {
  it('reports an already-solved board as solvable in 0 moves', () => {
    const board: Board = [[0, 0, 0, 0], [1, 1, 1, 1], [], []];
    expect(solve(board)).toEqual({ solvable: true, moveCount: 0 });
  });

  it('solves a simple one-move layout', () => {
    const board: Board = [[0, 0, 0], [0], []];
    const result = solve(board);
    expect(result.solvable).toBe(true);
    expect(result.moveCount).toBe(1);
  });

  it('solves a layout that needs several pours to untangle', () => {
    const board: Board = [
      [0, 1, 0, 1],
      [1, 0, 1, 0],
      [],
      [],
    ];
    const result = solve(board);
    expect(result.solvable).toBe(true);
    expect(result.moveCount).toBeGreaterThan(0);
  });

  it('reports an unsolvable board (no empty flask, all mismatched tops, no moves)', () => {
    // Two flasks, both full, colors interleaved so nothing can ever move:
    // no empty flasks and no matching top colors between them.
    const board: Board = [
      [0, 1, 0, 1],
      [1, 0, 1, 0],
    ];
    const result = solve(board);
    expect(result.solvable).toBe(false);
  });
});
