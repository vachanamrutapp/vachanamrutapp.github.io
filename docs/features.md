# Vachanamrut — features & progress

Living tracker. Status: ✅ shipped · 🚧 in progress · 📋 planned · 💡 idea. Detailed designs for the older phases are in [feature-plan.md](feature-plan.md). All features stay **offline-first** (no accounts, no servers).

## Shipped

| Version | What |
|---|---|
| 1.1–1.3 | Vachanamrut + Shikshapatri reading, audio, facts and glossary, Journey progress, favourites, daily reminders, first-run setup |
| 1.4–1.5 | One app (scripture switch, shared Settings), search in English letters + Gujarati with jump-to ("Gadhada 1 18"), highlights, notes, backup and restore |
| 1.6 | Glass look: floating bottom bar, audio player and play button, bottom-sheet Facts and word meanings, 4 reminders fixes, app size 87 → 30 MB (WebP images) |
| 1.7 | Dark mode (Light default; Auto follows the phone; set in setup and Settings), rounded search bar, facts follow reading language, notification permission re-prompt |
| 1.8 | ✅ Crisper type (lighter headings and tile titles; fonts and icons now **bundled**, so they work offline). ✅ Two-piece bottom bar: tabs pill (scripture switch · **Notes** · Settings) + standalone search circle, 64px thick. ✅ **Notes & Highlights** is its own page (moved out of Journey) |

## Next UX work
- [ ] 📋 Check 1.8 bar on iPhone Safari/PWA (glass refraction there is blur-only)
- [ ] 📋 New Play Store screenshots for 1.8 (glass bar, dark mode)
- [ ] 📋 Consolidate `styles.css` + UI smoke tests (card proposed in Claude Code)

## Feature backlog (ranked)
| # | Feature | Why | Effort | Status |
|---|---|---|---|---|
| 1 | Audio: background playback, lock-screen controls, speed (0.75–1.5×), sleep timer | Long discourses; biggest gap today | 1–2 days | 📋 (session card proposed) |
| 2 | Reading plans ("262 days", "Ekantik Dharma in 21 days", "Vairagya") | Gives reminders a purpose; plugs into Journey | ~1 day | 📋 |
| 3 | Quote image cards (select text → gold card with source → share) | Word-of-mouth growth, fully offline | ~1 day | 📋 |
| 4 | Gujarati in English letters reading mode | Youth abroad who speak but can't read Gujarati | ~1 day | 📋 |
| 5 | Line-spacing option (3 levels) | Readability | 1 hour | 📋 |
| 6 | Home-screen widget "Today's Vachanamrut" | Visibility | 2–3 days | 💡 |
| 7 | Side-by-side Gujarati + English (tablets, landscape) | Parallel reading | ~1 day | 💡 |
| 8 | Notes page extras: search within notes, filter by colour, export notes only | Natural follow-up to the new Notes page | 0.5 day | 💡 |

## Tech debt
- [ ] `www/css/styles.css` ~8,300 lines built in redesign layers; consolidate into component sections and colour tokens
- [ ] Automated UI smoke test (light + dark, every screen) — would have caught the 1.7 setup-button and dark-mode gaps
- [ ] Measure glass bar performance on low-end Android

## Release log
| Version | Code | Date | Notes |
|---|---|---|---|
| 1.6 | 7 | 2026-10-20 | published |
| 1.7 | 8 | 2026-10-20 | dark mode, glass bar |
| 1.8 | 9 | 2026-10-21 | type, split bar, Notes page |
