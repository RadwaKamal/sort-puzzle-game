// Deterministic seeded RNG so a given level number always produces the same
// layout. Uses mulberry32 (small, fast, good enough statistical quality for
// shuffling puzzle layouts — not for anything security-sensitive).

export class SeededRng {
  private state: number;

  constructor(seed: number) {
    // Force a 32-bit unsigned integer state.
    this.state = seed >>> 0;
  }

  // Returns a float in [0, 1).
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Returns an integer in [min, max] inclusive.
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  // Fisher-Yates shuffle, returns a new array (does not mutate the input).
  shuffle<T>(items: readonly T[]): T[] {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
