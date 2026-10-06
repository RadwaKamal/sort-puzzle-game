import { describe, expect, it } from 'vitest';
import {
  applyMove,
  canPour,
  getLegalMoves,
  hashBoard,
  isBoardSolved,
  isFlaskSolved,
  pour,
  pourAmount,
  type Board,
} from '../src/core/board';

describe('pourAmount / canPour', () => {
  it('pours into an empty flask up to its capacity', () => {
    const source = [0, 0, 1, 1]; // top is 1,1
    const target: number[] = [];
    expect(pourAmount(source, target, 4)).toBe(2);
    expect(canPour(source, target, 4)).toBe(true);
  });

  it('pours onto a matching top color, capped by remaining space', () => {
    const source = [2, 1, 1]; // top run of 1s, length 2
    const target = [1, 1, 1]; // 1 space left
    expect(pourAmount(source, target, 4)).toBe(1);
  });

  it('refuses to pour onto a mismatched top color', () => {
    const source = [0, 0];
    const target = [1];
    expect(pourAmount(source, target, 4)).toBe(0);
    expect(canPour(source, target, 4)).toBe(false);
  });

  it('refuses to pour from an empty flask', () => {
    expect(pourAmount([], [0], 4)).toBe(0);
  });

  it('refuses to pour into a full flask', () => {
    const source = [0, 0];
    const target = [1, 1, 1, 1];
    expect(pourAmount(source, target, 4)).toBe(0);
  });
});

describe('pour', () => {
  it('moves the matching top run and leaves the rest behind', () => {
    const [newSource, newTarget] = pour([0, 1, 2, 2], [], 4);
    expect(newSource).toEqual([0, 1]);
    expect(newTarget).toEqual([2, 2]);
  });

  it('is a no-op when the pour is illegal', () => {
    const source = [0];
    const target = [1, 1, 1, 1];
    const [newSource, newTarget] = pour(source, target, 4);
    expect(newSource).toBe(source);
    expect(newTarget).toBe(target);
  });
});

describe('isFlaskSolved', () => {
  it('treats empty as solved', () => {
    expect(isFlaskSolved([], 4)).toBe(true);
  });

  it('treats a full single-color flask as solved', () => {
    expect(isFlaskSolved([3, 3, 3, 3], 4)).toBe(true);
  });

  it('treats a partially filled single-color flask as unsolved', () => {
    expect(isFlaskSolved([3, 3], 4)).toBe(false);
  });

  it('treats a full mixed-color flask as unsolved', () => {
    expect(isFlaskSolved([3, 3, 3, 4], 4)).toBe(false);
  });
});

describe('isBoardSolved', () => {
  it('is true only when every flask is empty or full single-color', () => {
    const solved: Board = [[0, 0, 0, 0], [1, 1, 1, 1], [], []];
    const unsolved: Board = [[0, 0, 0, 1], [1, 1, 1, 0], [], []];
    expect(isBoardSolved(solved, 4)).toBe(true);
    expect(isBoardSolved(unsolved, 4)).toBe(false);
  });
});

describe('getLegalMoves / applyMove', () => {
  it('enumerates all legal (from, to) pairs', () => {
    const board: Board = [[0, 0], [1], []];
    const moves = getLegalMoves(board, 4);

    // 0 -> 2 (empty), 1 -> 2 (empty); 0 -> 1 and 1 -> 0 are color mismatches.
    expect(moves).toContainEqual([0, 2]);
    expect(moves).toContainEqual([1, 2]);
    expect(moves).not.toContainEqual([0, 1]);
    expect(moves).not.toContainEqual([1, 0]);
  });

  it('applyMove returns a new board without mutating the original', () => {
    const board: Board = [[0, 0], [], []];
    const next = applyMove(board, 0, 1, 4);

    expect(board).toEqual([[0, 0], [], []]);
    expect(next).toEqual([[], [0, 0], []]);
  });
});

describe('hashBoard', () => {
  it('produces equal hashes for equal states and different hashes otherwise', () => {
    const a: Board = [[0, 1], [], [2]];
    const b: Board = [[0, 1], [], [2]];
    const c: Board = [[1, 0], [], [2]];

    expect(hashBoard(a)).toBe(hashBoard(b));
    expect(hashBoard(a)).not.toBe(hashBoard(c));
  });
});
