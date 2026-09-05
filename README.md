# Vachanamrut

A [Capacitor](https://capacitorjs.com/) app with three deployment targets sharing one web codebase: **web/PWA**, **iOS**, and **Android**.

- **App name:** Vachanamrut
- **Bundle/Application ID:** `com.vachanamrut.app`
- **Web assets (canonical source):** [`www/`](www) (plain HTML/CSS/JS — no frontend framework/bundler) — edit here directly, this is not a copy of anything
- **Web/PWA deploy:**
  - **GitHub Pages:** Auto-deployed directly from `www/` by [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) on push to `main` → https://vachanamrut.in.
  - **Firebase Hosting (mirror):** Auto-deployed by [`.github/workflows/firebase-hosting-deploy.yml`](.github/workflows/firebase-hosting-deploy.yml) on push to `main` → https://vachanamrutam.web.app.
- **Native projects:** [`ios/App`](ios/App) (Xcode, Swift Package Manager) and [`android`](android) (Gradle) — both built from the same `www/` via `npx cap sync`
- **iOS CI:** [`codemagic.yaml`](codemagic.yaml) builds and publishes to TestFlight on push to `main`, skipped automatically for commits that only touch `www/` (see [pre-publish checklist](#pre-publish-checklist))

## Architecture: one `www/`, all targets

`www/` is the single source for all deployment targets:

1. **Web/PWA** — deployed straight from `www/`:
   - To GitHub Pages via [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).
   - To Firebase Hosting via [`.github/workflows/firebase-hosting-deploy.yml`](.github/workflows/firebase-hosting-deploy.yml).
2. **iOS** — `npx cap sync` copies `www/` into `ios/App/App/public`; [`codemagic.yaml`](codemagic.yaml) builds and ships to TestFlight.
3. **Android** — `npx cap sync` copies `www/` into `android/app/src/main/assets/public`; build locally (see below) or wire up Codemagic/other CI the same way as iOS if needed.

Editing `www/` and pushing to `main` updates the live web app automatically.
It does **not** by itself ship a new native build — `npx cap sync` +
rebuilding/reinstalling (or a Codemagic run) is still a separate step for
iOS/Android, same as any native app update.

### Why the iOS CI skips pure content pushes

Editing `www/` (Vachanamrut text, styling, etc.) doesn't need a new App Store
build every time, and Apple review/TestFlight processing isn't free in time
even when free in money. `codemagic.yaml` uses Codemagic's `changeset`
condition to skip the `ios-testflight` workflow when a push **only** touches
`www/**`. Any commit that touches something outside `www/` (native code,
`capacitor.config.json`, `package.json`, `codemagic.yaml` itself, etc.) still
triggers a build normally, even if it also touches `www/`.

### A note on app size

`www/assets/data/audio/` currently holds ~650MB of MP3 narration for offline
in-app playback, bundled straight into both native shells (per the
architecture decision for this app — unlike some other Capacitor apps that
stream audio remotely to keep the download small). That makes this a large
app: expect long `npx cap sync` copies, long Xcode/Gradle builds, and a
multi-hundred-MB install size on both stores. If that ever becomes a problem,
the fix is switching `js/app.js`'s audio `src` to an absolute URL pointing at
the Firebase-hosted `www/` instead of the bundled relative path, and dropping
`assets/data/audio/` from the native copies.

## Project structure

```
vachanamrut-app/
├── www/                     # Web app source — this is what ships inside both native shells
├── ios/App/                 # Xcode project (open App.xcodeproj or App.xcworkspace)
├── android/                 # Android Studio / Gradle project
├── capacitor.config.json    # Capacitor config (appId, appName, webDir)
├── package.json
├── scraper.py, rescrape_all.py, scraper_missing.py, range_server.py
│                            # Python tooling used to build/refresh the Vachanamrut data
│                            # (not part of the shipped app; not run automatically)
├── raw-vachanamrut-1.json   # Raw scrape output
├── scratch/                 # Working data files for the scraper tooling
└── data-tooling-docs/       # Notes on the data pipeline (analytics setup, glossary extraction)
```

Capacitor copies `www/` into each native project (`ios/App/App/public`, `android/app/src/main/assets/public`) whenever you run `npx cap sync` or `npx cap copy`. **Never edit those copied folders directly** — they're overwritten on every sync. Edit `www/` itself; it's the canonical source.

The Python scraper scripts need their own virtualenv (`python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt` — no `requirements.txt` is committed yet, install what each script imports) — that environment is gitignored and isn't needed to build or run the app itself.

## Prerequisites

| Tool | Notes |
|---|---|
| [Node.js](https://nodejs.org/) 18+ and npm | Runs the Capacitor CLI |
| **macOS + Xcode** (latest stable) | Required for iOS builds; install via the App Store |
| Xcode Command Line Tools | `xcode-select --install` |
| **Android Studio** (latest stable) | Required for Android builds |
| **JDK 21** | This project pins Gradle to JDK 21 in [`android/gradle.properties`](android/gradle.properties) via `org.gradle.java.home`. Install with `brew install openjdk@21`, or update/remove that line to point at your own JDK 21 install. |
| Apple Developer account | Needed to sign and upload to App Store Connect |
| Google Play Console account | Needed to sign and upload to the Play Store |

CocoaPods is **not** used — iOS dependencies are managed via Swift Package Manager (`ios/App/CapApp-SPM`), so there's no `pod install` step.

## Initial setup

```bash
npm install
```

This installs the Capacitor CLI and core/iOS/Android platform packages listed in [`package.json`](package.json). The `ios/` and `android/` native projects are already generated and committed — you don't need to run `npx cap add`.

## Everyday development workflow

1. Edit `www/` directly. Pushing to `main` auto-deploys the web/PWA and, if the push also touches non-`www/` files, triggers the iOS CI build.
2. To see changes in the native apps, sync and rebuild:
   ```bash
   npx cap sync
   ```
   You can also sync a single platform: `npx cap sync ios` or `npx cap sync android`. Use `npx cap copy` instead if you only changed web assets and haven't touched Capacitor plugins/config — it's faster since it skips the native dependency update step (though with ~650MB of bundled audio, both commands take a while regardless).
3. Open the native IDE and run on a simulator/emulator or device (see below).

## Building for iOS

1. Sync and open the Xcode workspace:
   ```bash
   npx cap sync ios
   npx cap open ios
   ```
   (Opens `ios/App/App.xcworkspace` in Xcode.)
2. In Xcode, select the **App** target → **Signing & Capabilities**:
   - Choose your Team.
   - Set a unique bundle identifier if you don't have access to `com.vachanamrut.app`.
3. Bump version numbers as needed (target → General tab, or edit directly):
   - **Version** (`MARKETING_VERSION`, currently `1.0`) — user-facing version.
   - **Build** (`CURRENT_PROJECT_VERSION`, currently `1`) — must increase on every App Store Connect upload.
4. Select **Any iOS Device (arm64)** as the run destination (not a simulator).
5. **Product → Archive**.
6. When the Organizer window opens, click **Distribute App → App Store Connect → Upload**, and follow the prompts (automatic signing is easiest).
7. In [App Store Connect](https://appstoreconnect.apple.com/), attach the uploaded build to a version, fill in release notes/screenshots/metadata, and submit for review.

Minimum supported iOS version is **15.0** (set in `ios/App/CapApp-SPM/Package.swift`).

### Quick device/simulator testing without archiving

```bash
npx cap run ios
```

## Building for Android

1. Sync and open the project in Android Studio:
   ```bash
   npx cap sync android
   npx cap open android
   ```
   (Opens the `android/` folder in Android Studio.)
2. Bump versions in [`android/app/build.gradle`](android/app/build.gradle):
   - `versionCode` (currently `1`) — integer, must increase on every Play Store upload.
   - `versionName` (currently `"1.0"`) — user-facing version string.
3. Create a release keystore (one-time, keep it **outside of git** and back it up — losing it means you can never update the app again under the same listing):
   ```bash
   keytool -genkey -v -keystore vachanamrut-release.keystore \
     -alias vachanamrut -keyalg RSA -keysize 2048 -validity 10000
   ```
4. Build a signed release bundle. Easiest path is via Android Studio: **Build → Generate Signed App Bundle / APK → Android App Bundle**, point it at your keystore, and build the `release` variant.
   - Or from the command line, after configuring signing in `android/app/build.gradle` (or a `keystore.properties` file):
     ```bash
     cd android
     ./gradlew bundleRelease
     ```
     The output `.aab` lands in `android/app/build/outputs/bundle/release/`.
5. Upload the `.aab` to the [Google Play Console](https://play.google.com/console/), fill in the release track (internal/closed/open/production), listing details, and submit.

Supported SDKs (from [`android/variables.gradle`](android/variables.gradle)): `minSdkVersion 24`, `compileSdkVersion`/`targetSdkVersion 36`.

### Quick device/emulator testing without a signed build

```bash
npx cap run android
```

## Pre-publish checklist

- [ ] Store listing content (description, keywords, age rating, privacy/data-collection answers, etc.)
- [ ] iOS builds/TestFlight without a local Mac for every collaborator — wire up a Codemagic team, App Store Connect integration named `codemagic_asc_integration`, and signing before relying on [`codemagic.yaml`](codemagic.yaml).
- [ ] App icons and splash screens — currently the same placeholder assets copied from the source PWA (`www/images/`). Regenerate with [`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets) once final art is ready.
- [ ] Version/build numbers bumped on both platforms.
- [ ] Privacy policy URL ready (required by both stores).
- [ ] Store listing copy and screenshots prepared at each store's required resolutions.
- [ ] iOS: archived with a **distribution** (not development) signing profile.
- [ ] Android: built with the **release** keystore, and that keystore is safely backed up.
- [ ] Tested a release build on a real device for both platforms before submitting.
- [ ] Confirm the ~650MB bundled audio is acceptable for both stores' size guidance, or switch to remote streaming (see [A note on app size](#a-note-on-app-size)).

## Useful Capacitor CLI commands

| Command | Purpose |
|---|---|
| `npx cap sync` | Copy `www/` into both native projects and update native plugin dependencies |
| `npx cap copy [ios\|android]` | Copy web assets only (no dependency update) |
| `npx cap open [ios\|android]` | Open the native IDE for a platform |
| `npx cap run [ios\|android]` | Build and run on a connected device/simulator |
| `npx cap doctor` | Sanity-check your Capacitor setup |
