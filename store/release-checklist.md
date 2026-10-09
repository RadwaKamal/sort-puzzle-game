# Google Play release checklist

Current requirements for a new personal developer account, researched October 2026 - verify
again before actually submitting, since Google updates these periodically.

## 1. Developer account

- **Developer name**: "Sparkvial Games" - chosen to match the app's own branding (the bolt/spark
  mark + potion theme) rather than an unrelated company name.
- One-time **$25 USD registration fee** (Mastercard, Visa, Amex, Discover US, or Visa Electron
  outside the US — prepaid cards not accepted).
- **Identity verification**: valid government ID and a credit card, both under the same legal
  name as the account.
- Must be **18+**.
- Starting early 2024, new personal accounts must also verify **Android device access** via the
  Play Console mobile app before they can distribute apps.

## 2. Closed testing (required before production access)

Accounts created after November 13, 2023 (this one will be) must, before applying for production
access:

- Have **at least 12 testers** opted into a closed test.
- Those testers must have been opted in **continuously for 14 days** — testers who opt in, test
  for under 14 days, and opt out don't count.

Practically: set up a closed testing track in Play Console, recruit 12+ people (friends, a
Reddit/Discord community, etc.) to opt in via the tester link, and wait out the 14-day window
before applying for production access. Google's review after applying typically takes ≤7 days but
can take longer.

## 3. Target API level

Currently must target **Android 16 (API level 36)** for new app submissions (as of August 2026).
**Already satisfied** — `android/app/build.gradle`'s `compileSdkVersion`/`targetSdkVersion` are
both 36 by default from the Capacitor 8 Android template (confirmed via `aapt2 dump badging` on
the built debug APK in Milestone 6/7).

## 4. Privacy policy

Required because the app shows ads. `docs/privacy-policy.html` is ready to publish via GitHub
Pages (repo Settings → Pages → Source: branch `main`, folder `/docs`); its published URL goes in
Play Console's "Privacy policy" field.

## 5. Store listing

See `store/listing.md` for app name, descriptions, category, and Data Safety section notes.

## 6. Graphics

See `store/screenshots-checklist.md` — app icon (512×512), feature graphic (1024×500), and phone
screenshots are all required and none are finalized yet (placeholder screenshots exist; icon and
feature graphic still need real design work, not just resizing the current placeholder flask
icon).

## 7. Content rating

Complete the IARC questionnaire in Play Console. Expect "Everyone"/PEGI 3 given no violence, no
user-generated content, and declared in-app ads — but the questionnaire's answers are
authoritative.

## 8. Before hitting submit

- [ ] Replace the placeholder `appId` in `capacitor.config.ts` if it needs to change (impossible
      to change after submission).
- [ ] Replace test AdMob IDs in `src/services/ads.ts` and the AndroidManifest meta-data with real
      ones from an actual AdMob account.
- [ ] Build and sign a release AAB (see README "Android build" → release AAB section).
- [ ] Finalize store graphics (icon, feature graphic, screenshots).
- [ ] Publish the privacy policy and link it in Play Console.
- [ ] Run the closed test for 12+ testers / 14+ days, then apply for production access.
