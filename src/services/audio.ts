import Phaser from 'phaser';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// Pouring has its own synthesized blip sound (see playPourBlip) rather than
// a sample, so it isn't in this set.
export type SoundName = 'select' | 'complete' | 'win' | 'error';
export type HapticCue = 'select' | 'complete' | 'error' | 'win';

const SOUND_FILES: Record<SoundName, string> = {
  select: 'assets/sounds/select.ogg',
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

// Wraps Phaser's sound manager for short SFX, plus Capacitor Haptics for
// haptic taps. Haptics has its own web implementation (Web Vibration API
// under the hood) so this works unchanged in the browser and with real
// native haptics once this runs inside the Capacitor Android shell.
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

  // A short synthesized 8-bit "blip" (square-wave tone, quick rise then
  // decay) rather than a sample - each one is cheap to generate on the fly
  // and gives the pour its own chip-tune identity matching the pixel-cube
  // pour animation, one blip per cube landing instead of a single sample
  // covering the whole pour. `step`/`totalSteps` nudge the pitch upward as
  // the pour progresses, like a little rising arpeggio.
  playPourBlip(step: number, totalSteps: number): void {
    if (!this.soundEnabled) return;
    const ctx = this.webAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const progress = totalSteps > 1 ? step / (totalSteps - 1) : 0;
    const freq = 360 + progress * 260;
    const duration = 0.07;

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  // Phaser falls back to HTML5Audio (no AudioContext) on some browsers -
  // the synthesized blip needs Web Audio specifically, so this quietly
  // returns null there instead of throwing.
  private webAudioContext(): AudioContext | null {
    const manager = this.scene.sound as Phaser.Sound.WebAudioSoundManager;
    return manager.context ?? null;
  }

  haptic(cue: HapticCue): void {
    if (!this.hapticsEnabled) return;
    switch (cue) {
      case 'select':
        void Haptics.impact({ style: ImpactStyle.Light });
        break;
      case 'complete':
        void Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'error':
        void Haptics.notification({ type: NotificationType.Error });
        break;
      case 'win':
        void Haptics.notification({ type: NotificationType.Success });
        break;
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
