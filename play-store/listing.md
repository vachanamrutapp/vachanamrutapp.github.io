# Google Play store listing — Vachanamrut

Paste each block into Play Console → Grow users → Store presence → Main store listing.

## App name (max 30 characters)

```
Vachanamrut – વચનામૃત
```

## Short description (max 80 characters)

```
Read and listen to all 262 Vachanamruts in Gujarati and English.
```

## Full description (max 4,000 characters)

```
Read and listen to the Vachanamrut, the sacred discourses of Bhagwan Swaminarayan, in a calm, beautiful reader made for daily study.

THE COMPLETE VACHANAMRUT
• All 262 Vachanamruts, plus the five-part Partharo and Khagol-Bhugol
• Full Gujarati text and English translation, switch with one tap
• Organised by section: Gadhada I, Sarangpur, Kariyani, Loya, Panchala, Gadhada II, Vartal, Amdavad and Gadhada III

LISTEN WHILE YOU READ
• Audio narration for every Vachanamrut
• Play, pause, skip back or forward, and follow along on the page

UNDERSTAND EVERY WORD
• Over 2,700 glossary terms highlighted in the text, with meanings at a tap
• Background for each Vachanamrut: when and where it was spoken, and what was happening in Shriji Maharaj's life at the time
• Introductions to the section and the compilers: Muktanand Swami, Gopalanand Swami, Nityanand Swami and Shukanand Swami

BUILD A DAILY HABIT
• Your Journey tracks the Vachanamruts you have read
• Daily streak and milestones to keep you going
• Section map showing your progress through the whole scripture

READ YOUR WAY
• Adjustable font size
• Golden, sepia and dark reading themes
• Bookmark where you left off and save your favourites
• Share any Vachanamrut with family and friends

ALSO INCLUDED
• The Shikshapatri, with illustrated shlokas

PRIVATE BY DESIGN
No account, no sign-in and no ads. Your favourites, bookmarks and progress stay on your device.

The text works offline. Audio narration streams, so it needs an internet connection.

Jay Swaminarayan.
```

## Other fields

- **App category:** Books & Reference
- **Tags:** Religion, Books & Reference, Education
- **Contact email:** vachanamrutquotes@gmail.com
- **Website:** https://vachanamrut.in
- **Privacy policy:** https://vachanamrut.in/privacy.html

## Graphics checklist

| Asset | Required size | Status |
|---|---|---|
| App icon | 512 × 512 PNG | Ready: `play-store/icon-512.png` |
| Feature graphic | 1024 × 500 PNG/JPEG | Not made yet |
| Phone screenshots | 2–8, 1080 × 1920 (9:16) | Ready: 8 framed in `play-store/screenshots-framed/` (temple backdrops), or 8 plain in `play-store/screenshots/`; upload in filename order |
| 7-inch and 10-inch tablet screenshots | 1080 × 1920 (9:16) | Ready: 6 in `play-store/screenshots-tablet/` (Timeless Wisdom template); use the same set for both slots |

Screenshot order: Gujarati home, reading with audio, Partharo, glossary meaning, historical facts, English reading, dark theme, Your Journey. The Journey shot uses sample progress (96 of 262 read).

To regenerate the framed set, capture each screen on the emulator at its template's screen ratio (`adb shell wm size 1080x2382` for Poster-1, `1080x2368` for Launch-2, `1080x2305` for Launch-3; see `FRAMES` in `frame_screenshots.py`), save them as `NN-name.png` in one folder, then run `python3 play-store/frame_screenshots.py phone <that folder> play-store/screenshots-framed`.

For the tablet set, capture with `adb shell wm size 2560x1532` and `adb shell wm density 320` (keep the emulator in portrait rotation so the phone's camera cutout stays in the status bar), then run `python3 play-store/frame_screenshots.py tablet <that folder> play-store/screenshots-tablet`.
