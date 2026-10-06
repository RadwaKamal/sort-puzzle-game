import Phaser from 'phaser';

export type SoundName = 'select' | 'pour' | 'complete' | 'win' | 'error';

const SOUND_FILES: Record<SoundName, string> = {
  select: 'assets/sounds/select.ogg',
  pour: 'assets/sounds/pour.ogg',
  complete: 'assets/sounds/complete.ogg',
  win: 'assets/sounds/win.ogg',
  error: 'assets/sounds/error.ogg',
};

const SOUND_ENABLED_KEY = 'potion-sort:sound-enabled';
const HAPTICS_ENABLED_KEY = 'potion-sort:haptics-enabled';

function readBoolean(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw === 'true';
  } catch {
    return fallback;
  }
}

function writeBoolean(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Private browsing or disabled storage - setting just won't persist.
  }
}

// Wraps Phaser's sound manager for short SFX, plus a Web Vibration API haptic
// tap. Capacitor Haptics replaces the vibration call on native Android once
// Capacitor is wired up in Milestone 6; this keeps working as a web fallback.
export class AudioService {
  private readonly scene: Phaser.Scene;
  soundEnabled: boolean;
  hapticsEnabled: boolean;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.soundEnabled = readBoolean(SOUND_ENABLED_KEY, true);
    this.hapticsEnabled = readBoolean(HAPTICS_ENABLED_KEY, true);
  }

  static preload(scene: Phaser.Scene): void {
    for (const [name, path] of Object.entries(SOUND_FILES)) {
      scene.load.audio(name, path);
    }
  }

  play(name: SoundName): void {
    if (!this.soundEnabled) return;
    this.scene.sound.play(name, { volume: 0.6 });
  }

  vibrate(pattern: number | number[] = 15): void {
    if (!this.hapticsEnabled) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }

  toggleSound(): boolean {
    this.soundEnabled = !this.soundEnabled;
    writeBoolean(SOUND_ENABLED_KEY, this.soundEnabled);
    return this.soundEnabled;
  }

  toggleHaptics(): boolean {
    this.hapticsEnabled = !this.hapticsEnabled;
    writeBoolean(HAPTICS_ENABLED_KEY, this.hapticsEnabled);
    return this.hapticsEnabled;
  }
}
