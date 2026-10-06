// Saves progress locally so it survives a reload/relaunch. Uses localStorage
// directly on web; Capacitor Preferences replaces this storage backend on
// native Android/iOS once Capacitor is wired up in Milestone 6, same as the
// haptics fallback in services/audio.ts.

const CURRENT_LEVEL_KEY = 'potion-sort:current-level';
const UNLOCKED_LEVEL_KEY = 'potion-sort:unlocked-level';

export interface Progress {
  // The level the player should resume into from "Continue".
  currentLevel: number;
  // The highest level number the player is allowed to play.
  unlockedLevel: number;
}

function readNumber(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function writeNumber(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Private browsing or disabled storage - progress just won't persist.
  }
}

export function loadProgress(): Progress {
  return {
    currentLevel: readNumber(CURRENT_LEVEL_KEY, 1),
    unlockedLevel: readNumber(UNLOCKED_LEVEL_KEY, 1),
  };
}

export function saveCurrentLevel(level: number): void {
  writeNumber(CURRENT_LEVEL_KEY, level);
}

export function unlockLevel(level: number): void {
  const { unlockedLevel } = loadProgress();
  if (level > unlockedLevel) {
    writeNumber(UNLOCKED_LEVEL_KEY, level);
  }
}
