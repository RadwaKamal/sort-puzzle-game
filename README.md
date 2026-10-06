# Potion Sort

A casual sort puzzle game: pour colored potions between flasks until every flask holds one
color. Built for Android first with a single web codebase (see `CLAUDE.md` for the full project
brief, milestones, and constraints).

## Tech stack

- TypeScript + Phaser 3 (game engine)
- Vite (dev server and build)
- Vitest (unit tests for game logic)
- Capacitor (native Android wrapper; iOS later, same codebase)

## Setup

Requires [Node.js](https://nodejs.org/) 20 or later.

```bash
npm install
```

## Run the game

Starts a dev server with hot reload at http://localhost:5173:

```bash
npm run dev
```

## Build

Type-checks and bundles for production into `dist/`:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Test

Runs the Vitest suite (pure game logic in `src/core/`, no Phaser/browser needed):

```bash
npm run test
```

Watch mode while developing:

```bash
npm run test:watch
```

## Lint and format

```bash
npm run lint
npm run format
```

## Android build

The native Android project under `android/` is **generated, not committed** (see `.gitignore`) —
it's fully reproducible from `capacitor.config.ts` plus the icon/splash sources in `assets/`.

### Prerequisites

- [Android Studio](https://developer.android.com/studio) (provides the Android SDK, build-tools,
  and platform-tools). The Capacitor CLI reads the SDK location from `ANDROID_HOME` or
  Android Studio's own config.
- A JDK (17+). Android Studio bundles one; `java -version` should already work if Android Studio
  is installed.

### First-time setup (or after deleting `android/`)

```bash
npm run build                        # produces dist/, which Capacitor wraps
npx cap add android                  # generates the android/ native project
npx @capacitor/assets generate --android   # writes the app icon + splash screen from assets/
```

Then add the AdMob app ID meta-data to `android/app/src/main/AndroidManifest.xml` inside the
`<application>` tag (the plugin doesn't inject this automatically, and the file is regenerated
each time, so it's not something that can live in the repo):

```xml
<!-- Google's test AdMob app ID - safe to use in all development builds.
     Replace with the real app ID (from a config, not hard-coded) before
     a Play Store release. -->
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-3940256099942544~3347511713" />
```

### After any change to web code or assets

```bash
npm run build
npx cap sync android                 # copies the new web build + native plugins into android/
```

### Build a debug APK

```bash
cd android
./gradlew assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`. Install it on a connected
device/emulator with `adb install -r app/build/outputs/apk/debug/app-debug.apk`, or open the
`android/` folder in Android Studio and run it from there.

The very first build downloads the Gradle distribution and Android Gradle Plugin (a few hundred
MB) and can take a long time depending on connection speed; every build after that is fast.

Current debug APK size is ~12 MB (most of it the AdMob SDK), against the ~15 MB target in
`CLAUDE.md` - worth watching if more native plugins are added later.

### Build a release AAB (for Play Store submission)

Release builds must be signed. Generate a keystore once and **keep it and its passwords safe and
out of version control** — losing it means losing the ability to update the app on the Play
Store:

```bash
keytool -genkey -v -keystore potion-sort-release.keystore -alias potion-sort \
  -keyalg RSA -keysize 2048 -validity 10000
```

Then either configure signing in `android/app/build.gradle` (a `signingConfigs` block pointing at
the keystore, with the passwords read from environment variables or a local, gitignored
`keystore.properties` — not hard-coded), or sign manually after an unsigned build:

```bash
cd android
./gradlew bundleRelease
# android/app/build/outputs/bundle/release/app-release.aab
```

Google Play's current requirements for new personal developer accounts (closed testing with
real testers, target API level minimums) should be checked before the actual submission — see
Milestone 8 in `CLAUDE.md`.

### App identity

`capacitor.config.ts`'s `appId` (`com.radwakamal.potionsort`) is a placeholder reverse-domain
package name. Changing it after a Play Store submission is effectively impossible (it's the
app's permanent identity), so confirm it before release.

## Ads

`src/services/ads.ts` wraps `@capacitor-community/admob`. It currently uses Google's public test
ad unit IDs everywhere (safe to hardcode — they're meant for exactly this) and the AndroidManifest
app ID is the test app ID (see "Android build" above). Before a real release: get a real AdMob
account/app, source the real ad unit IDs and app ID from build config instead of the constants in
`ads.ts`, and update the manifest meta-data.

The plugin ships its own web implementation (logs and resolves instantly, no real ad UI), so
`AdService` works unchanged in the browser — no separate mock class was needed.

- **Undo**: 3 free per level, then each one costs a rewarded ad.
- **Extra Flask**: adds one empty flask to the current board, always behind a rewarded ad.
- **Skip Level**: advances to the next level without solving it, always behind a rewarded ad.
- **Interstitial**: shown at most once every 3 completed levels (win or skip both count), never
  during the first 5 levels, right before the next level loads.

## Project status

Currently on **Milestone 7** of the plan in `CLAUDE.md`: ads wired up end to end (rewarded
helpers, interstitial cadence) on Google's test ad units, verified in the browser and with a
real Android debug build. See `CLAUDE.md` for the full milestone list and game design.

## Repo structure

```text
src/
  main.ts       Phaser game config and boot
  theme.ts      colors, fonts, sizes (single source of truth for the visual theme)
  core/         pure game logic (board state, level generation, solver) — no Phaser imports
  scenes/       Phaser scenes (Boot, Menu, LevelSelect, Settings, Game)
  view/         flask drawing, pour animation, particles, shared UI button helper
  services/     save/load progress (storage.ts), audio/haptics (audio.ts), ads (ads.ts)
tests/          Vitest tests for src/core/
public/assets/  sounds bundled with the web app
assets/         source icon/splash images used by `@capacitor/assets` (not the generated output)
android/        generated native project (gitignored - see "Android build" above)
capacitor.config.ts  Capacitor app id, name, web asset directory
```
