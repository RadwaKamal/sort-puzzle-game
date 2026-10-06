// Rewarded and interstitial ads via @capacitor-community/admob. The plugin
// ships its own web implementation (logs and resolves instantly, no real ad)
// so this file works unchanged in the browser and with real AdMob on native
// Android - no separate mock class needed.
import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';
import type { PluginListenerHandle } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

// Google's official test ad unit IDs - public constants meant to be used
// exactly like this during development, safe to hardcode. Swap for real ad
// unit IDs sourced from build config (never hard-coded) before a Play Store
// release; see https://developers.google.com/admob/android/test-ads.
const REWARDED_AD_ID = 'ca-app-pub-3940256099942544/5224354917';
const INTERSTITIAL_AD_ID = 'ca-app-pub-3940256099942544/1033173712';

const COMPLETED_COUNT_KEY = 'potion-sort:ads-completed-count';
const INTERSTITIAL_EVERY_N_LEVELS = 3;
const NO_INTERSTITIAL_BELOW_LEVEL = 5;

async function nextCompletedCount(): Promise<number> {
  const { value } = await Preferences.get({ key: COMPLETED_COUNT_KEY });
  const count = (value ? Number(value) : 0) + 1;
  await Preferences.set({ key: COMPLETED_COUNT_KEY, value: String(count) });
  return count;
}

export class AdService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    await AdMob.initialize({ initializeForTesting: true });
  }

  // Resolves true if the player earned the reward, false if they dismissed
  // the ad without finishing it. Never rejects: if the ad fails to load or
  // show, the reward is granted anyway so broken ad infra never blocks
  // gameplay (test ad units in particular can be flaky).
  async showRewardedAd(): Promise<boolean> {
    try {
      await AdMob.prepareRewardVideoAd({ adId: REWARDED_AD_ID, isTesting: true });
    } catch {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      let rewardedListener: PluginListenerHandle | undefined;
      let dismissedListener: PluginListenerHandle | undefined;
      let settled = false;

      const settle = (value: boolean) => {
        if (settled) return;
        settled = true;
        void rewardedListener?.remove();
        void dismissedListener?.remove();
        resolve(value);
      };

      Promise.all([
        AdMob.addListener(RewardAdPluginEvents.Rewarded, () => settle(true)),
        // Dismissed fires whether or not a reward was earned - Rewarded
        // (handled above) always arrives first when it does, so Dismissed
        // alone here means the player closed the ad early.
        AdMob.addListener(RewardAdPluginEvents.Dismissed, () => settle(false)),
      ]).then(([rewarded, dismissed]) => {
        rewardedListener = rewarded;
        dismissedListener = dismissed;
        // showRewardVideoAd() resolving is also a success signal (and the
        // only one the web mock ever gives, since it never fires events) -
        // settle() is idempotent, so this just backstops the Rewarded event.
        AdMob.showRewardVideoAd()
          .then(() => settle(true))
          .catch(() => settle(true));
      });
    });
  }

  // Shows an interstitial if this level completion is due for one: never in
  // the first 5 levels, then at most once every 3 completed levels (win or
  // skip both count). Silently does nothing if the ad isn't available - an
  // interstitial is not important enough to ever block progression.
  async maybeShowInterstitial(levelNumber: number): Promise<void> {
    if (levelNumber <= NO_INTERSTITIAL_BELOW_LEVEL) return;
    const count = await nextCompletedCount();
    if (count % INTERSTITIAL_EVERY_N_LEVELS !== 0) return;

    try {
      await AdMob.prepareInterstitial({ adId: INTERSTITIAL_AD_ID, isTesting: true });
      await AdMob.showInterstitial();
    } catch {
      // No ad available - not critical, just skip it.
    }
  }
}
