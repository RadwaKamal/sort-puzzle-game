# Play Store screenshots & graphics checklist

Current Google Play requirements (verify again closer to submission — these do change). Status
reflects this repo as of Milestone 8.

| Asset | Spec | Required? | Status |
| --- | --- | --- | --- |
| App icon | 512×512 PNG, 32-bit with alpha, ≤1024 KB | Required | ⬜ Not made — `assets/icon.png` is the in-app adaptive icon source (1024×1024), not yet resized/exported for the Play Store listing field |
| Feature graphic | 1024×500, JPEG or 24-bit PNG, no alpha | Required | ⬜ Not made |
| Phone screenshots | 2–8 images, JPEG or 24-bit PNG, no alpha, min 320px / max 3840px per side (max ≤ 2× min); 1080×1920 portrait recommended | Required | ✅ Done — current UI, see below |
| Tablet screenshots | Same format rules, min 4 recommended | Optional | ⬜ Not made — worth adding since the layout already scales to tablets per `CLAUDE.md` |
| Android TV banner | 1280×720 | Only if targeting TV | N/A — not targeting TV |
| Wear OS screenshot | 384×384, 1:1 | Only if targeting Wear OS | N/A — not targeting Wear OS |

## Current screenshots

`store/screenshots/01-menu.png` through `06-settings.png`, captured 2026-10-09 at 1080×1920 from
the actual running game (not staged mockups) via Playwright, after the icon/badge/tooltip/score/
endless-mode UI work:

1. Menu — score + "Continue" visible, populated progress state.
2. Level select — a 20-cell page showing hard/frozen/locked badges and star ratings together.
3. Mid-pour — a flask tilted mid-animation with a liquid cube in flight and the landing splash
   visible on the target, captured by replaying a real solver-computed move sequence and timing
   the shot inside the pour tween.
4. Flask-complete — a freshly-sealed flask (cork + sparkle burst still fading).
5. Win — full confetti celebration, 3 stars, "12 moves - par 12".
6. Settings — the in-level popup (Sound/Haptics/Restart/Close).

Recapture if the UI changes meaningfully again (another visual pass, new HUD elements, etc.).

## How to recapture screenshots

The game runs the same way in a desktop browser as on device (`npm run dev`), so screenshots can
be captured with any browser's device-emulation mode at 1080×1920 (viewport 360×640 at
deviceScaleFactor 3 via Playwright gives exactly that), or from an actual device/emulator running
the APK. For the action shots (mid-pour, flask-complete, win), the most reliable way is to
generate a real, solver-verified move sequence for a chosen level first (a throwaway
`tests/_zz_*.test.ts` using `findHintMove()` in a loop, same pattern documented in the
scoring-and-retention project memory), since display order reshuffles whenever a flask seals -
replaying taps against stale coordinates silently misses.

## Feature graphic and icon

Both need actual design work beyond the current flat placeholder flask icon (see
`assets/icon*.png` and the UI-polish memory note) — not just a resize of existing assets, since
the feature graphic is a banner-shaped promotional image, not an icon crop.
