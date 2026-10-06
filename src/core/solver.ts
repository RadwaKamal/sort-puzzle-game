// Solvability check used by the generator to reject bad layouts.
//
// Plain BFS explores every state at each depth before going deeper, which
// blows up combinatorially once a level has more than ~6-7 colors (branching
// factor grows with flask count). Instead this does a weighted-A* style
// best-first search: states are prioritized by moves-so-far plus a heuristic
// estimate of moves-remaining, so the search dives toward a solution instead
// of exhaustively fanning out. It still dedupes visited states by hash, and
// still proves unsolvability by exhausting the reachable state space — it
// just finds *a* solution rather than guaranteeing the shortest one.

import { applyMove, getLegalMoves, hashBoard, isBoardSolved, LAYERS_PER_FLASK } from './board';
import type { Board } from './board';

export interface SolveResult {
  solvable: boolean;
  // Moves in the solution found. Not guaranteed to be the shortest possible.
  moveCount?: number;
  // True if we gave up after maxStates without proving solvable or not.
  // Treat as unsolved for the purposes of level generation (reject and retry).
  inconclusive?: boolean;
}

const DEFAULT_MAX_STATES = 100_000;
// Weighted A*: favoring the heuristic over moves-so-far finds a solution
// faster at the cost of it being longer than optimal, which is fine here.
const HEURISTIC_WEIGHT = 3;

// Counts color "breaks" (adjacent differing colors) across all flasks. Each
// pour can remove at most one break, so this estimates moves remaining.
function heuristic(board: Board): number {
  let breaks = 0;
  for (const flask of board) {
    for (let i = 1; i < flask.length; i++) {
      if (flask[i] !== flask[i - 1]) breaks++;
    }
  }
  return breaks;
}

interface Node {
  board: Board;
  moves: number;
  priority: number;
}

// Binary min-heap ordered by priority, so picking the next node to expand is
// O(log n) instead of scanning the whole open set every time.
class MinHeap {
  private items: Node[] = [];

  get size(): number {
    return this.items.length;
  }

  push(node: Node): void {
    this.items.push(node);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].priority <= this.items[i].priority) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }

  pop(): Node {
    const top = this.items[0];
    const last = this.items.pop() as Node;
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        let smallest = i;
        if (left < this.items.length && this.items[left].priority < this.items[smallest].priority) {
          smallest = left;
        }
        if (
          right < this.items.length &&
          this.items[right].priority < this.items[smallest].priority
        ) {
          smallest = right;
        }
        if (smallest === i) break;
        [this.items[i], this.items[smallest]] = [this.items[smallest], this.items[i]];
        i = smallest;
      }
    }
    return top;
  }
}

export function solve(
  board: Board,
  capacity = LAYERS_PER_FLASK,
  maxStates = DEFAULT_MAX_STATES,
): SolveResult {
  if (isBoardSolved(board, capacity)) {
    return { solvable: true, moveCount: 0 };
  }

  const visited = new Set<string>([hashBoard(board)]);
  const open = new MinHeap();
  open.push({ board, moves: 0, priority: heuristic(board) * HEURISTIC_WEIGHT });

  while (open.size > 0) {
    if (visited.size > maxStates) {
      return { solvable: false, inconclusive: true };
    }

    const node = open.pop();

    for (const [from, to] of getLegalMoves(node.board, capacity)) {
      const next = applyMove(node.board, from, to, capacity);
      const key = hashBoard(next);
      if (visited.has(key)) continue;
      visited.add(key);

      const moves = node.moves + 1;
      if (isBoardSolved(next, capacity)) {
        return { solvable: true, moveCount: moves };
      }
      open.push({ board: next, moves, priority: moves + heuristic(next) * HEURISTIC_WEIGHT });
    }
  }

  return { solvable: false };
}
