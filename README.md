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

## Project status

Currently on **Milestone 6** of the plan in `CLAUDE.md`: Capacitor wired up with a real Android
build (debug APK verified building and installable), app icon and splash screen, and native
Haptics/Preferences replacing their web-only fallbacks. See `CLAUDE.md` for the full milestone
list and game design.

## Repo structure

```text
src/
  main.ts       Phaser game config and boot
  theme.ts      colors, fonts, sizes (single source of truth for the visual theme)
  core/         pure game logic (board state, level generation, solver) — no Phaser imports
  scenes/       Phaser scenes (Boot, Menu, LevelSelect, Settings, Game)
  view/         flask drawing, pour animation, particles, shared UI button helper
  services/     save/load progress (storage.ts), audio/haptics (audio.ts)
tests/          Vitest tests for src/core/
public/assets/  sounds bundled with the web app
assets/         source icon/splash images used by `@capacitor/assets` (not the generated output)
android/        generated native project (gitignored - see "Android build" above)
capacitor.config.ts  Capacitor app id, name, web asset directory
```
