# Play Store screenshots & graphics checklist

Current Google Play requirements (verify again closer to submission — these do change). Status
reflects this repo as of Milestone 8.

| Asset | Spec | Required? | Status |
| --- | --- | --- | --- |
| App icon | 512×512 PNG, 32-bit with alpha, ≤1024 KB | Required | ⬜ Not made — `assets/icon.png` is the in-app adaptive icon source (1024×1024), not yet resized/exported for the Play Store listing field |
| Feature graphic | 1024×500, JPEG or 24-bit PNG, no alpha | Required | ⬜ Not made |
| Phone screenshots | 2–8 images, JPEG or 24-bit PNG, no alpha, min 320px / max 3840px per side (max ≤ 2× min); 1080×1920 portrait recommended | Required | 🟡 Placeholder set captured (see below), **not final** |
| Tablet screenshots | Same format rules, min 4 recommended | Optional | ⬜ Not made — worth adding since the layout already scales to tablets per `CLAUDE.md` |
| Android TV banner | 1280×720 | Only if targeting TV | N/A — not targeting TV |
| Wear OS screenshot | 384×384, 1:1 | Only if targeting Wear OS | N/A — not targeting Wear OS |

## Placeholder screenshots

A first pass of real in-game screenshots (not staged mockups) was captured at 1080×1920 from the
actual running game: title/menu, level select, mid-pour gameplay, and the win celebration. These
prove the pipeline works end-to-end but **should be recaptured after the planned UI/icon polish
pass** (see memory note from Milestone 4/6) — current buttons and icons are functional
placeholders, not final art.

## How to recapture screenshots later

The game runs the same way in a desktop browser as on device (`npm run dev`), so screenshots can
be captured with any browser's device-emulation mode at 1080×1920, or from an actual device/
emulator running the APK. Suggested shots once UI is finalized:

1. Menu screen
2. Level select
3. Mid-pour gameplay (shows the juice/animation)
4. A flask-complete sparkle moment
5. Level-complete / win celebration
6. Settings screen

## Feature graphic and icon

Both need actual design work beyond the current flat placeholder flask icon (see
`assets/icon*.png` and the UI-polish memory note) — not just a resize of existing assets, since
the feature graphic is a banner-shaped promotional image, not an icon crop.
