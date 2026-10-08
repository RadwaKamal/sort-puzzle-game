// Saves progress so it survives a reload/relaunch. Capacitor Preferences has
// its own web implementation (backed by localStorage) as well as native
// implementations on Android/iOS, so this one API works unchanged everywhere.
import { Preferences } from '@capacitor/preferences';

const CURRENT_LEVEL_KEY = 'potion-sort:current-level';
const UNLOCKED_LEVEL_KEY = 'potion-sort:unlocked-level';
const LEVEL_STARS_KEY = 'potion-sort:level-stars';

export interface Progress {
  // The level the player should resume into from "Continue".
  currentLevel: number;
  // The highest level number the player is allowed to play.
  unlockedLevel: number;
}

async function readNumber(key: string, fallback: number): Promise<number> {
  const { value } = await Preferences.get({ key });
  if (value === null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function writeNumber(key: string, value: number): Promise<void> {
  await Preferences.set({ key, value: String(value) });
}

export async function loadProgress(): Promise<Progress> {
  const [currentLevel, unlockedLevel] = await Promise.all([
    readNumber(CURRENT_LEVEL_KEY, 1),
    readNumber(UNLOCKED_LEVEL_KEY, 1),
  ]);
  return { currentLevel, unlockedLevel };
}

export function saveCurrentLevel(level: number): Promise<void> {
  return writeNumber(CURRENT_LEVEL_KEY, level);
}

export async function unlockLevel(level: number): Promise<void> {
  const { unlockedLevel } = await loadProgress();
  if (level > unlockedLevel) {
    await writeNumber(UNLOCKED_LEVEL_KEY, level);
  }
}

// Best star rating (0-3) earned per level, keyed by level number. Loaded as
// one JSON blob rather than one Preferences key per level, so
// LevelSelectScene can show every cell's stars with a single read instead of
// up to 200 of them. Keyed as string, not number: JSON object keys are
// always strings (JSON.parse can never hand back a numeric key), and typing
// this Record<number, ...> would claim otherwise - plain numeric indexing
// (`all[level]`) still works fine either way since JS coerces, but the
// string type is the honest one.
export type LevelStars = Record<string, number>;

export async function loadAllLevelStars(): Promise<LevelStars> {
  const { value } = await Preferences.get({ key: LEVEL_STARS_KEY });
  if (!value) return {};
  try {
    return JSON.parse(value) as LevelStars;
  } catch {
    // Corrupt/unexpected stored value - treat as no stars earned yet rather
    // than throwing and blocking the level from loading.
    return {};
  }
}

// Queues writes one after another rather than letting them race - without
// this, two overlapping calls could both read the blob before either had
// written, and the second write back would silently discard the first
// call's update (to this level or any other). Unlikely in practice (this is
// a single-player, turn-based game; it'd take two wins resolving within the
// same async tick) but cheap enough to just not have the race at all.
let writeQueue: Promise<void> = Promise.resolve();

// Only writes if `stars` beats whatever's already stored for this level, so
// a worse replay can never erase a better past result.
export function recordLevelStars(level: number, stars: number): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    const all = await loadAllLevelStars();
    if (stars > (all[level] ?? 0)) {
      all[level] = stars;
      await Preferences.set({ key: LEVEL_STARS_KEY, value: JSON.stringify(all) });
    }
  });
  return writeQueue;
}
