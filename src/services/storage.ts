// Saves progress so it survives a reload/relaunch. Capacitor Preferences has
// its own web implementation (backed by localStorage) as well as native
// implementations on Android/iOS, so this one API works unchanged everywhere.
import { Preferences } from '@capacitor/preferences';

const CURRENT_LEVEL_KEY = 'potion-sort:current-level';
const UNLOCKED_LEVEL_KEY = 'potion-sort:unlocked-level';

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
