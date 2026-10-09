// Solvability check used by the generator to reject bad layouts, and the
// hint feature's "what should I do next" lookup - both run the same search,
// just reading a different field off the result.
//
// Plain BFS explores every state at each depth before going deeper, which
// blows up combinatorially once a level has more than ~6-7 colors (branching
// factor grows with flask count). Instead this does a weighted-A* style
// best-first search: states are prioritized by moves-so-far plus a heuristic
// estimate of moves-remaining, so the search dives toward a solution instead
// of exhaustively fanning out. It still dedupes visited states by hash, and
// still proves unsolvability by exhausting the reachable state space — it
// just finds *a* solution rather than guaranteeing the shortest one.

import { applyMove, getLegalMoves, hashBoard, isBoardSolved, isFlaskSealed, LAYERS_PER_FLASK } from './board';
import type { Board } from './board';

// A single flask that can't be poured *from* until `thawAtMove` real moves
// have been made since the level started (pouring *into* it is unaffected).
// `thawAtMove` is always relative to level start, not to wherever a given
// search happens to begin - see `startMoves` below.
export interface FrozenSpec {
  flaskIndex: number;
  thawAtMove: number;
}

// A single flask that can't be poured *from* until a *different* flask
// (`keyFlaskIndex`) is sealed (full, single-color) - a dependency/ordering
// puzzle rather than frozen's wait-it-out timer. Unlike frozen, this needs
// no move-count bookkeeping at all: "is flaskIndex locked" is a pure
// function of the current board (is keyFlaskIndex sealed yet?), so it
// naturally re-locks on undo for free, same as frozen's live recompute.
export interface LockSpec {
  flaskIndex: number;
  keyFlaskIndex: number;
}

export interface SolveResult {
  solvable: boolean;
  // Moves in the solution found. Not guaranteed to be the shortest possible.
  moveCount?: number;
  // True if we gave up after maxStates without proving solvable or not.
  // Treat as unsolved for the purposes of level generation (reject and retry).
  inconclusive?: boolean;
}

export type Move = [from: number, to: number];

interface SearchResult {
  solvable: boolean;
  moveCount?: number;
  inconclusive?: boolean;
  // The move that starts the found solution - null only when the board was
  // already solved (0 moves needed).
  firstMove: Move | null;
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
  // The move taken from the root to reach this node's branch - inherited
  // from the parent, set fresh only on the root's direct children. Lets a
  // solved node anywhere in the tree answer "what move should I make first"
  // without needing parent back-pointers or a path walk.
  firstMove: Move | null;
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

// `startMoves` offsets `node.moves` (depth within *this* search) so a
// mid-game Hint search - which starts from the player's current board, not
// the level's original one - still checks the frozen flask's thaw threshold
// against real moves-since-level-start, not moves-since-this-search-began.
// `locked` needs no such offset - it's checked against each node's own
// board, not a move count.
function search(
  board: Board,
  capacity: number,
  maxStates: number,
  frozen: FrozenSpec | null,
  locked: LockSpec | null,
  startMoves: number,
): SearchResult {
  if (isBoardSolved(board, capacity)) {
    return { solvable: true, moveCount: 0, firstMove: null };
  }

  const isFrozenFlask = (totalMoves: number, index: number): boolean =>
    frozen !== null && index === frozen.flaskIndex && totalMoves < frozen.thawAtMove;
  const isLockedFlask = (currentBoard: Board, index: number): boolean =>
    locked !== null &&
    index === locked.flaskIndex &&
    !isFlaskSealed(currentBoard[locked.keyFlaskIndex], capacity);

  const visited = new Set<string>([hashBoard(board)]);
  const open = new MinHeap();
  open.push({ board, moves: 0, priority: heuristic(board) * HEURISTIC_WEIGHT, firstMove: null });

  while (open.size > 0) {
    if (visited.size > maxStates) {
      return { solvable: false, inconclusive: true, firstMove: null };
    }

    const node = open.pop();
    // Only builds a per-node adapter closure for whichever constraints are
    // actually active - most searches have neither, and this loop can pop
    // tens of thousands of nodes.
    const totalMoves = startMoves + node.moves;
    const blocked =
      frozen || locked
        ? (index: number) => isFrozenFlask(totalMoves, index) || isLockedFlask(node.board, index)
        : undefined;

    for (const move of getLegalMoves(node.board, capacity, blocked)) {
      const [from, to] = move;
      const next = applyMove(node.board, from, to, capacity);
      const key = hashBoard(next);
      if (visited.has(key)) continue;
      visited.add(key);

      const moves = node.moves + 1;
      const firstMove = node.firstMove ?? move;
      if (isBoardSolved(next, capacity)) {
        return { solvable: true, moveCount: moves, firstMove };
      }
      open.push({ board: next, moves, priority: moves + heuristic(next) * HEURISTIC_WEIGHT, firstMove });
    }
  }

  return { solvable: false, firstMove: null };
}

export function solve(
  board: Board,
  capacity = LAYERS_PER_FLASK,
  maxStates = DEFAULT_MAX_STATES,
  frozen: FrozenSpec | null = null,
  locked: LockSpec | null = null,
  startMoves = 0,
): SolveResult {
  const result = search(board, capacity, maxStates, frozen, locked, startMoves);
  return { solvable: result.solvable, moveCount: result.moveCount, inconclusive: result.inconclusive };
}

// The move (source flask, target flask) that starts a solution from the
// current board - used by the in-game hint button. Returns null if the
// board is already solved or no solution could be found within maxStates.
// `startMoves` should be the real moves made so far this level (see
// `search`'s comment) so a frozen flask's thaw threshold stays correct when
// hinting mid-game rather than from a fresh board.
export function findHintMove(
  board: Board,
  capacity = LAYERS_PER_FLASK,
  maxStates = DEFAULT_MAX_STATES,
  frozen: FrozenSpec | null = null,
  locked: LockSpec | null = null,
  startMoves = 0,
): Move | null {
  const result = search(board, capacity, maxStates, frozen, locked, startMoves);
  if (!result.solvable) return null;
  return result.firstMove;
}
