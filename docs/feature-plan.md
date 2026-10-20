# Vachanamrut app — feature plan (offline-first)

Status: draft, October 2026. App version at time of writing: 1.2 (code 3).

Everything here works **without internet and without accounts or servers**. All user data stays on the device, which is why backup/export (Phase 3) is part of the plan rather than an extra.

| Phase | Version | Features | Effort |
|---|---|---|---|
| 1 | 1.3 | Daily reminder + first-run setup | ~1 day |
| 2 | 1.4 | One app: Vachanamrut ↔ Shikshapatri switch, shared Settings (with Journey), search button for both | ~3 days |
| 3 | 1.5 | Highlights, notes, "My Notes", backup & restore | ~3 days |
| 4 | 1.6+ | Extras (pick from the list at the end) | 0.5–1 day each |

**Why reminders first:** the app is in its 14-day closed test, and Google's production questions ask how testers used the app. A daily nudge keeps testers opening it. It's also independent of the navigation rework, so it can ship while Phase 2 is built.

**Why navigation and search ship together:** the new bottom bar's centre button *is* the search button, and search has to know which scripture you're in. Shipping the bar without search would leave a gap.

---

## Shared foundations

- **Code layout.** `www/js/app.js` is ~3,000 lines. New features go in their own files, loaded with plain `<script>` tags (no bundler): `js/shikshapatri.js`, `js/search.js`, `js/search-worker.js`, `js/reminders.js`, `js/onboarding.js`, `js/annotations.js`, `js/backup.js`.
- **One single-page app.** Today Shikshapatri is a separate page (`www/shikshapatri/`, own JS/CSS/database). Phase 2 moves it into the main page, so switching is instant, there's one Settings, one search button and one back-gesture handler.
- **Storage.** Settings stay in `localStorage` as today. Notes and highlights go in **IndexedDB** (`vachanamrut-user` database), which handles more data and structured queries. Both are on-device only.
- **Native plugins** (all official Capacitor 8):
  - `@capacitor/app` (installed in 1.2: back gesture, app version)
  - `@capacitor/local-notifications` 8.3.x: reminders (Phase 1)
  - `@capacitor/filesystem` + `@capacitor/share`: backup export, quote images (Phases 3–4)
- **Website.** Search and notes also work on vachanamrut.in (stored per browser). Reminders are app-only, because web push needs a server.
- **Version bumps.** Each release raises `versionCode` in `android/app/build.gradle` plus the cache versions in `www/sw.js` and the `?v=` query on `app.js`/`styles.css` in `www/index.html`.

---

## Phase 1 — Daily reminder + first-run setup (v1.3)

### Reminder behaviour
- **Default on at 7:00 AM device time.** Users can turn it off or pick another time in Settings.
- **Content changes daily**, so it doesn't feel like spam. It suggests the next Vachanamrut to read, using the Journey "continue" logic:
  - Title: "આજનું વચનામૃત" / "Today's Vachanamrut"
  - Body: "Continue with Gadhada I-19 · ~8 min read"
  - On the user's streak days: "Keep your 5-day streak going 🔥"
- **Tapping it opens that Vachanamrut** (`localNotificationActionPerformed` carries the Vachanamrut id).

### How scheduling works
- **Rolling window:** each time the app opens, cancel and re-schedule the next **14 days** as individual notifications (`schedule.at`, `allowWhileIdle: true`), each with that day's content. This keeps the content personal and adjusts automatically for time-zone travel and daylight-saving changes. If someone doesn't open the app for 14 days, reminders stop, which avoids nagging inactive users.
- **Reboots:** the plugin's built-in boot receiver (`LocalNotificationRestoreReceiver`, `RECEIVE_BOOT_COMPLETED`) restores pending reminders after a restart. Verified in the 8.3.1 package.
- **Inexact timing:** use `isExactNotification: false`. Android may deliver a few minutes after 7:00 to save battery, which is fine for a reading reminder. Remove the plugin's `SCHEDULE_EXACT_ALARM` permission from the merged manifest (`tools:node="remove"`): Android 14+ denies it by default, it would mean an extra settings screen for users, and Play scrutinises alarm permissions.
- **Permission:** Android 13+ needs the notification permission (`requestPermissions()`). It's requested **only** in the setup step below, after explaining why, never cold on launch.
- **Known limit:** some phone brands (Xiaomi, Oppo, Vivo, some Samsung battery modes) kill scheduled notifications aggressively. Add a short "Not getting reminders?" help line in Settings.

### First-run setup (skippable, 4 cards)
1. **Welcome** — app name, short tagline, language choice ગુજરાતી / English (sets `appLanguage`).
2. **Daily reminder** — on/off and a time picker (default 7:00), with an **"Allow notifications"** button that triggers the system prompt. If denied, show "You can turn this on later in Settings."
3. **Offline audio** — explain streaming vs. downloading (~650 MB), with a "Download now (Wi-Fi)" / "Later" choice.
4. **You're set** — "Start reading: Gadhada I-1" or "Continue: …".

- Stored as `onboardingDone` in `localStorage`.
- **Existing users updating to 1.3** see only card 2 once, as a "New: daily reminder" card.
- Style: full-screen glass cards on the golden background, matching Settings and Journey, with progress dots and Skip.

### Settings additions
- Under a new **Reminders** section: Daily reminder toggle, Time, "Send a test notification", and a help line.
- If the permission was denied: a row saying "Notifications are off for this app → Open settings".

### Test checklist
- Set the time 2 minutes ahead and confirm it arrives. Tap it and confirm the right Vachanamrut opens.
- Reboot the phone and confirm the reminder still fires.
- Force Doze (`adb shell dumpsys deviceidle force-idle`) and confirm it still arrives, possibly late.
- Deny permission, then re-enable from Settings.
- Change the time zone and confirm the time follows local time.

---

## Phase 2 — One app: switch, shared Settings, search (v1.4)

### Navigation
**New bottom bar**, the same in both scriptures:

| Left | Centre | Right |
|---|---|---|
| **Switch scripture**: shows "શિક્ષાપત્રી / Shikshapatri" while in Vachanamrut, and "વચનામૃત / Vachanamrut" while in Shikshapatri | **Search** — a raised round button (the only search button) | **Settings** — one shared screen |

- **Your Journey moves into Settings.** It's already a row there ("Your Journey"); the bar no longer has its own Journey tab. Journey opens from Settings, and back returns to Settings.
- **Switching keeps your place.** Going Vachanamrut → Shikshapatri → Vachanamrut returns you to the same screen and scroll position in each.
- **The header title follows the scripture:** ‖ વચનામૃત ‖ or the Shikshapatri artwork.
- **The Shikshapatri floating button on the home screen is removed**, since the bar's left tab replaces it.
- **Reading screens** (a Vachanamrut or a shloka) keep their prev/next reading footer instead of the bar, as today. There, a 🔍 icon in the header opens "Find in this page". *(Open decision: or keep the bar visible while reading.)*

### Merging Shikshapatri into the main app
- **Screens:** `shikshapatri-list-screen` (212 shlokas) and `shikshapatri-detail-screen` (illustration, Sanskrit, translation, bhashya) become screens in `www/index.html`. Code moves from `www/shikshapatri/js/app.js` into `www/js/shikshapatri.js`; its styles are scoped under `.shikshapatri` so they can't clash with Vachanamrut's.
- **Data:** `shikshapatri.db` is loaded on first switch, using the same sql.js engine that's already running.
- **Existing preferences carry over** (same storage): `shikshapatri-bookmark`, and the translation language (Gujarati / Hindi / English) via `shikshapatri-lang-override`.
- **Shared Settings gains a Shikshapatri section:** translation language (Gujarati / Hindi / English) and "Go to bookmarked shloka".
- **Back gesture:** shloka → list → home of the *current* scripture → exit. Switching scriptures isn't treated as a back step.
- **Old links keep working:** `www/shikshapatri/index.html` becomes a tiny redirect (`/shikshapatri/?id=5` → `/?s=shikshapatri&id=5`) and unregisters its old service worker, so people who installed the Shikshapatri web app aren't left with a stale copy.
- **Website:** gets the same switch and bar.

### Search, scoped to where you are
- **The search screen opens on the scripture you were in,** with a toggle at the top: **Vachanamrut · Shikshapatri** (one tap to search the other).
- **Vachanamrut scope:** Gujarati text, English text, titles, glossary (details below).
- **Shikshapatri scope:** Sanskrit (Devanagari), Gujarati, English and Hindi translations, and the bhashya commentary. Results show "Shloka 37" with the matching line. Typing a number ("37", "shlok 37", "શ્લોક ૩૭") jumps straight there.
- **Devanagari for free:** Unicode's Devanagari block is laid out exactly like Gujarati's (offset 0x180), so Sanskrit/Hindi are converted to Gujarati letters first and then reuse the same transliteration: `dharma`, `dharm`, `ધર્મ` and `धर्म` all match.

### Matching
1. **Gujarati → Latin** with a ~60-character table (consonants with the inherent "a", matras, virama, anusvara, Gujarati digits): આહાર → `aahaara`.
2. **Sound key**, applied the same way to the text and to whatever the user types:
   - lowercase; strip accents (`āhār → ahar`, so the English translation's diacritics match too)
   - `ksh→x`, `chh/ch→c`, `sh/ṣ/ś→s`, `ph→f`, `w→v`, `z→j`
   - drop aspiration: `kh/gh/jh/th/dh/bh → k/g/j/t/d/b`
   - vowel length: `aa→a`, `ee/ii→i`, `oo/uu→u`, `y→i`
   - collapse doubled letters; drop the final "a" on words of 4+ letters (`dharma → dharm`)
3. **Matching:** each query word must match a word in the Vachanamrut:
   - exact match = 3 points
   - prefix match = 2 (Gujarati endings: આહાર**માં**, આહાર**નો**)
   - one typo = 1, only for query words of 6+ letters (shorter words gave false hits like `ahar`→`ahan`)
   - a match in the title counts ×10
   - all query words must match
4. **Index** covers the Gujarati text, the English text and titles (plus the Shikshapatri texts, as a separate index). It's built in a **Web Worker** in the background ~3 seconds after launch (~1–2 s on a phone), so the reading screen never stutters and search is instant when opened.

### Experience
- **Entry point:** the centre button of the new bottom bar (see Navigation above).
- **Search screen:** keyboard opens immediately; placeholder "ahar, આહાર, bhakti, Gadhada 18…"; results update as you type (150 ms debounce).
- **Results, in order:**
  1. **Jump to a Vachanamrut:** "gadhada 1 18", "g1-18", "gp 18", "loya 8", "ગઢડા પ્રથમ ૧૮", plain "18".
  2. **Glossary card** if the word is in the 2,756-entry glossary, showing its meaning (e.g. vairagya).
  3. **Vachanamrut list:** name + title, a match count ("આહાર ×6"), and a two-line excerpt in the current language with the matched word highlighted.
- **Opening a result** scrolls to the first match and highlights it (cleared on next tap).
- **Find in this Vachanamrut:** the same engine, run inside the open reading page, with next/previous arrows.
- **Recent searches:** last 10, stored on the device, with "Clear".

### Test list
Before building, collect 15–20 real searches from testers (e.g. ahar, ekantik, swabhav, kusang, maya, vairagya, satsang, murti, akshardham, Gadhada 18). Each must return sensible top results; keep the list in `docs/search-test-queries.md` and re-run it after any change.

---

## Phase 3 — Highlights, notes and backup (v1.5)

**What BAPS apps offer**, for reference:
- The *Vachanamrut Learning App* has notes on a whole Vachanamrut or on individual paragraphs, a reading list, reading history and search history, synced through an account.
- The older *Vachanamrut Study App* offers bookmarks, history and backup/restore.
- Neither listing mentions colour highlighting.

Our version adds word-level highlights and works without an account.

### Highlighting
- **Select text** in a Vachanamrut, and a toolbar slides up from the **bottom** of the screen. It sits at the bottom because Android's own Copy/Share menu appears above the selection and can't be replaced from web code.
- **Toolbar:** 4 colours (yellow, saffron, green, blue) · Add note · Copy · Share quote.
- **Tapping an existing highlight** opens a small sheet: change colour, add/edit note, remove.
- **Rendering:** highlights are drawn after the glossary underlines, by wrapping text segments in `<mark>`, so the two can overlap safely.

### Notes
- **Note on a highlight:** written from the toolbar or by tapping the highlight. Shown as a small 📝 marker at the end of the highlight.
- **Note on the whole Vachanamrut:** a "My note" card below the title (collapsed when empty).
- Plain text with line breaks; no rich text in v1.

### Anchoring (so highlights stay on the right words)
Each highlight stores: `vachanamrutId`, `language`, `paragraphIndex`, `start`/`end` character offsets in that paragraph's plain text, and the **quoted text plus ~20 characters before and after**. If the text is ever corrected in a later update, the quote is used to find the new position; if it can't be found, the highlight moves to an "unattached" list instead of disappearing. Highlights belong to the language they were made in; the other language shows "2 highlights in Gujarati — switch".

### "My Notes" screen
- **Entry point:** a new section in **Your Journey** (next to Favourites), plus a count chip.
- **Content:** all highlights and notes grouped by Vachanamrut, newest first. Filter by colour or "notes only"; search within notes (reuses the Phase 2 engine). Tapping an item opens the Vachanamrut scrolled to it.

### Backup & restore
**Why it's required:** with no accounts, uninstalling the app or changing phones deletes everything. Testers switching from the sideloaded build to the Play build would lose their notes today.
- **Export:** Settings → *Backup* → creates `vachanamrut-backup-2026-10-20.json` (notes, highlights, favourites, reading progress, settings) and opens the Android share sheet, so it can be saved to Drive or sent on WhatsApp. Uses `@capacitor/filesystem` + `@capacitor/share`.
- **Import:** pick the file and merge it, keeping the newer copy when an item exists in both.
- **Gentle prompt:** "You have 25 notes. Back them up?" once a month while notes exist.
- Android's own Auto Backup (`allowBackup="true"`, already on) may also restore app data to a new phone, but it isn't guaranteed, so it's not relied on.

---

## Phase 4 — More ideas (offline, ranked by value for effort)

| Idea | Why | Effort |
|---|---|---|
| **Gujarati-in-English-letters reading mode** | Lets non-Gujarati readers (youth abroad) read the original wording; BAPS offers "Lipi/Latin". Reuses the Phase 2 transliterator. | ~1 day |
| **Reading plans** ("262 days", "Ekantik Dharma in 21 days", "Vairagya") | Gives the daily reminder a purpose; plugs into Journey progress. | ~1 day |
| **Audio: playback speed + sleep timer** | Common request for long discourses; speed is one line (`playbackRate`). | 0.5 day |
| **Quote image cards** | Select text → golden card image with the source → share to WhatsApp status. Drawn on a canvas, fully offline. | ~1 day |
| **Read-time on tiles** ("~8 min") | Helps pick what to read; computed from word count. | 2 hours |
| **Resume exact scroll position** | Reopens a Vachanamrut where you stopped, not at the top. | 2 hours |
| **Side-by-side Gujarati + English** | Parallel reading on tablets and in landscape. | ~1 day |
| **Line spacing option** | Readability; BAPS offers three levels. | 1 hour |
| **Background audio with lock-screen controls** | WebView audio can stop when the app is in the background; needs a native media-session plugin. | ~1–2 days |
| **Home-screen widget** ("Today's Vachanamrut") | High visibility, but needs native Android code. | 2–3 days |

---

## Open decisions
1. **Reading screens:** hide the bottom bar and use a header 🔍 for find-in-page (recommended, keeps the prev/next footer), or keep the bar visible while reading?
2. **Reminder content:** "next unread Vachanamrut" (recommended), alternate with a Shikshapatri shloka, or a reading-plan item once plans exist?
3. **Phase order:** reminders (1.3) → one app + search (1.4) → notes (1.5) (recommended), or navigation + search first?
4. **Highlights in Shikshapatri too** (Phase 3), or Vachanamrut only at first?
5. **Which Phase 4 items** to schedule after 1.5?

## Sources
- [Vachanamrut Learning App — App Store listing](https://apps.apple.com/us/app/vachanamrut-learning-app/id1476077803)
- [Vachanamrut Study App — BAPS downloads](https://www.baps.org/Downloads/apps/Vachanamrut-Study-App.aspx)
- [Capacitor Local Notifications API (v8)](https://capacitorjs.com/docs/apis/local-notifications)
- [Ionic forum — daily notification at a fixed time](https://forum.ionicframework.com/t/how-to-schedule-localnotification-every-day-at-hh-mm-with-capacitor/200912)
