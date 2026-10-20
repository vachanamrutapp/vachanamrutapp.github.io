# Vachanamrut app — feature plan (offline-first)

Status: draft, October 2026. App version at time of writing: 1.2 (code 3).

Everything here works **without internet and without accounts or servers**. All user data stays on the device, which is why backup/export (Phase 3) is part of the plan rather than an extra.

| Phase | Status | Features |
|---|---|---|
| 2 | ✅ Built (1.3, code 4) | One app: Vachanamrut ↔ Shikshapatri switch, combined Settings, Journey for both, transliteration search, find-in-page, text size, splash |
| 4a | ✅ Built (unreleased) | Quick wins: resume where you stopped, audio speed + sleep timer, read time on tiles; glass audio bar |
| 4b | ✅ Built (unreleased) | Audio backup source: jsDelivr, then GitHub raw, when vachanamrut.in is unreachable |
| 3 | ✅ Built (unreleased) | Highlights (4 colours), notes, note per Vachanamrut, My Notes in Journey, backup & restore |
| 1 | ✅ Built (unreleased) | Morning + evening reminders, first-run setup, Settings → Reminders (decisions below) |
| 4c | Later | Bigger extras (list at the end) |

**Unreleased** = on `main` / the website once pushed, but not yet in a signed Play build.

---|---|---|---|
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
- **Storage.** Everything is in `localStorage` on the device, including notes and highlights (key `annotations`). Even thousands of notes are well under its limit, and it keeps backup simple. Settings → Your Data exports and restores it all.
- **Native plugins** (all official Capacitor 8):
  - `@capacitor/app` (installed in 1.2: back gesture, app version)
  - `@capacitor/local-notifications` 8.3.x: reminders (Phase 1)
  - `@capacitor/filesystem` + `@capacitor/share`: backup export, quote images (Phases 3–4)
- **Website.** Search and notes also work on vachanamrut.in (stored per browser). Reminders are app-only, because web push needs a server.
- **Version bumps.** Each release raises `versionCode` in `android/app/build.gradle` plus the cache versions in `www/sw.js` and the `?v=` query on `app.js`/`styles.css` in `www/index.html`.

---

## Phase 1 — Daily reminders + first-run setup (built)

**Decisions (2026-10-20):**
1. Reminders start only after the user allows notifications. The setup card asks, and Settings can ask again later.
2. There are two reminders, chosen in setup and in Settings: **Morning** (default 7:00, on by default in setup) and **Evening** (default 8:00 PM, off by default).
3. Content is always "where you left off": the next Vachanamrut after the last one finished. **Shikshapatri appears only in the morning**, as the next shloka with its own "Shloka" button. The evening reminder is the Vachanamrut only.

**As built:**
- Code: `www/js/reminders.js` (scheduler) and `www/js/onboarding.js` (setup flow plus the Settings rows).
- Reminders are inexact (`isExactNotification: false`), and `SCHEDULE_EXACT_ALARM` is removed from the manifest, so users never see an "Alarms & reminders" permission screen.
- The next 14 days are re-scheduled on every app open or resume, and whenever a Vachanamrut or shloka is finished.
- Setup for new users has 4 cards: Welcome and language → Reminders → Text size → All set. Users updating from an older version see only the "New: daily reminders" card.
- Tested on an Android 16 emulator:
  - the permission prompt appears
  - 27 reminders are scheduled
  - a test reminder arrives
  - tapping it with the app killed opens the Vachanamrut, and the Shloka button opens the shloka
  - the content moves on after reading

The original plan follows, for reference.

### What the reader gets
- **A gentle daily nudge, on by default at 7:00 AM device time.** Changeable or off in Settings, and offered in the first-run setup.
- **Different every day, and useful:** the notification names what to read next, and tapping it opens straight to it.

| Situation | Title | Body |
|---|---|---|
| Reading Vachanamrut | આજનું વચનામૃત / Today's Vachanamrut | ચાલુ રાખો: ગઢડા પ્રથમ ૧૯ · ~૮ મિનિટ / Continue with Gadhada I-19 · ~8 min |
| On a streak (3+ days) | 🔥 ૫ દિવસની સ્ટ્રીક / 5-day streak | Same body, so the streak is the hook |
| Has been reading Shikshapatri more recently | આજનો શ્લોક / Today's shloka | શ્લોક ૩૮ … first line of the translation |
| Nothing read yet | વચનામૃત વાંચવાનું શરૂ કરો / Start the Vachanamrut | ગઢડા પ્રથમ ૧ · ~૩ મિનિટ |

- Text follows the app language (ગુજ / EN).
- "Next" reuses existing logic: Journey's Continue target (`vach_last_read` → the next one in that section) and `sp_last_read` + 1.
- Read time reuses `readingMinutes()`.

### How it's built
- **Plugin:** `@capacitor/local-notifications` 8.3.x (official). Everything runs on the phone, with no server.
- **New file:** `www/js/reminders.js`. It exposes `Reminders.reschedule()`, `Reminders.setEnabled()`, `Reminders.setTime()` and `Reminders.sendTest()`.
- **Rolling 14-day window:** every app open (and on every Settings change), cancel ids 1001–1014 and schedule the next 14 days, one notification per day at the chosen local time, each with that day's content. `allowWhileIdle: true`, `isExactNotification: false`.
  - It follows time-zone and daylight-saving changes automatically, since times are recomputed in local time on each open.
  - If someone stops opening the app for 2 weeks, the reminders stop on their own. That's deliberate: no nagging people who've lost interest.
  - Content beyond day 1 assumes they keep reading in order. When they open the app, it's recomputed.
- **Tap → open:** `extra: { scripture, id }` on each notification. A `localNotificationActionPerformed` listener calls `openVachanamrutById(id)` or `Shikshapatri.showSloka(id)`. It also works when the tap cold-starts the app; the listener is registered before the first screen renders, and the native splash covers the wait.
- **Reboots:** handled by the plugin's own boot receiver (`RECEIVE_BOOT_COMPLETED`). Already verified in the package.
- **No exact alarms:** remove `SCHEDULE_EXACT_ALARM` from the merged manifest (`tools:node="remove"`). Delivery may be a few minutes late, which is fine for a reading reminder, and it avoids a special permission screen and extra Play review attention.
- **Notification channel** "Daily reading / દૈનિક વાંચન": default importance, the app's small icon (white silhouette, `ic_stat_reminder`), and gold accent `#E6A623`.
- **Permission (Android 13+):** asked **only** from the setup card or the Settings toggle, after explaining why, never cold on launch. If it's denied, the toggle shows "Off in Android settings → Open" and links there with `App.openSettings` via the existing App plugin.
- **Storage:** `reminderEnabled` (default true), `reminderTime` ("07:00"), and `onboardingDone`. All of them are included in Backup.
- **Website:** nothing. Reminders and setup are app-only, because web push needs a server.

### First-run setup (shown once, skippable; appears right after the splash)
Full-screen glass cards on the gold background, with progress dots, Skip and Next. It uses the same components as Settings and Journey.
1. **Welcome:** the Vachanamrut and Shikshapatri in one app. Pick a language: ગુજરાતી / English (sets `appLanguage`).
2. **Daily reminder:** time picker (default 7:00) and **Allow notifications**, which triggers the system prompt. "Not now" leaves it off. If the user allows, the first 14 reminders are scheduled straight away.
3. **Read your way:** Text Size Default / Large (from Settings), plus a note that Offline Audio is in Settings. The ~650 MB download isn't offered here, so a first launch never starts a big download.
4. **You're all set:** two buttons, "Start: Gadhada I-1" and "Open Shikshapatri".

- **Existing users updating:** setup is skipped. They see one card, "New: daily reminder", the next time the home screen opens, with Allow / Not now.

### Settings changes
A new **Reminders / રિમાઇન્ડર** group under Language & Reading:
- **Daily reminder:** toggle.
- **Time:** a native time picker (`<input type="time">`) showing "7:00 AM".
- **Send a test reminder:** fires one in 5 seconds.
- **Help line:** "Not getting reminders? Allow the app to run in the background in your phone's battery settings." This matters on Xiaomi, Oppo, Vivo and some Samsung phones, which kill scheduled notifications.

### Test checklist
- Set the time 2 minutes ahead and confirm it arrives. Tap it from a killed app, and from the background; both should open the right Vachanamrut or shloka.
- Read something, reopen the app, and confirm tomorrow's reminder content updated.
- Reboot the phone, then confirm it still fires.
- Force Doze (`adb shell dumpsys deviceidle force-idle`) and confirm it still arrives, possibly late.
- Deny permission in setup, then turn it on from Settings: the system prompt or the "Open settings" path appears.
- Change the time zone or toggle daylight saving, and confirm it still fires at 7:00 local.
- Fresh install shows setup, an update shows only the "New" card, and Skip never shows it again.

### Open questions
1. Default **on** at 7:00 (as you asked) but only after the permission is granted. On Android 13+ nothing can be shown until the user allows notifications. OK?
2. Also offer an **evening** reminder (e.g. 8 PM, off by default)?
3. Alternate Vachanamrut and Shikshapatri days, or follow whichever was read most recently (current plan)?

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
