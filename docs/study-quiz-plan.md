# Study mode: summaries and quizzes for all 262 Vachanamruts

Data prep first, app UI later. The data is written by Claude inside Claude Code sessions (no API keys, no server) and ships as bundled JSON, so the app stays offline-first.

## 1. What we are making

For each of the 262 Vachanamruts, in both Gujarati and English:

| Item | Spec |
|---|---|
| **Key message** | One line: what Shriji Maharaj wants us to take from this discourse |
| **Summary** | 2–3 sentences (about 50–70 words) written as the divine message: what Shriji Maharaj is explaining and why. Third person, always "Shriji Maharaj", never casual. He is the supreme God throughout. |
| **Themes** | 1–3 tags from the existing Study Time topics (Atma, Dharma, Vairagya, Sant, Sadhana, Manan, Upasana, Bhakti) so Study Time can group readings automatically |
| **Quiz** | 10 multiple-choice questions, 4 short options (at most about 6 words each), exactly one correct, plus a one-line "why" shown after answering |

Not in scope: Partharo 1–5 and Khagol Bhugol (can be added later with the same pipeline).

## 2. Decisions (change any of these before the bulk run)

You answered 1–3. The rest are my defaults.

1. Scope: the 262 Vachanamruts only. (you)
2. Pilot first, then bulk. (you)
3. You review samples; I make no doctrinal claims beyond the text. (you)
4. **Paired languages:** the same 10 questions in the same order with the same correct option, each written naturally in its own language. Gujarati is written from the original Gujarati text, English from the English text. I do not machine-translate one from the other.
5. **Question mix:** about 4 on what Shriji Maharaj says, 4 on what it means and why, and at most 2 on the setting (who asked, where, how he began).
6. **Answers:** short, plausible wrong options, and the correct answer's position spread evenly (about 2–3 of each A–D per Vachanamrut).
7. **"Why" line:** one sentence, grounded in the text.
8. **Voice:** third person, "Shriji Maharaj" / "શ્રીજી મહારાજ".
9. **Terminology:** use the spellings in `www/assets/glossary.json` (2,756 entries) for Akshardham, Ekantik, Upasana and so on.
10. **No outside knowledge:** every question must be answerable from that Vachanamrut's own text.

## 3. Source data we build from

- `www/assets/data/gujarati/vachanamrut-N.json` and `www/assets/data/english/vachanamrut-N.json`, with fields `number, vachanamrut, title, setting, text`.
- Size: English is about 2.5 million characters in total (median 8,100 per Vachanamrut, longest #78 at 40,600). Gujarati is about 0.9 million (median 2,900). The English edition includes explanatory brackets, so it is about three times longer than the Gujarati.
- The app database already holds `vachanamrut_questions` (the 128 questions that devotees ask Shriji Maharaj). Those are *not* quiz questions. I can use them as a check that "who asked" questions are accurate.

## 4. Output files and schema

All under `www/assets/data/study/`, one summary file and one quiz file per language, keyed by Vachanamrut number:

```text
summary-gu.json, summary-en.json
  { "1": { "key": "...", "summary": "...", "themes": ["sadhana", "atma"] }, ... }

quiz-gu.json, quiz-en.json
  { "1": [ { "q": "...", "o": ["...", "...", "...", "..."], "a": 2, "why": "..." }, ... 10 items ], ... }
```

- `a` is the index (0–3) of the correct option. `themes` are identical in both languages.
- Expected size: roughly 3 MB for all four files. They are bundled in the app and cached by the service worker, so everything works offline.

## 5. How the work is run

1. **Work files.** I work in `scratch/study-data/` (outside the shipped app): `batches/NNN.json` per batch, merged later by a script into the four files above.
2. **Batches.** 262 Vachanamruts in batches of about 6 (long ones in smaller batches), so roughly 45 batches. Each batch is done by one helper agent that reads both the Gujarati and the English text of its Vachanamruts and writes all four items (both summaries, both quizzes). Waves of about 8 batches run in parallel.
3. **Validation script** (`scratch/study-data/validate.py`), run on every batch and again after merge:
   - exactly 10 questions, exactly 4 options, `a` in 0–3, no duplicate options
   - option length limit, summary length range, no empty fields
   - Gujarati items contain Gujarati script, English items do not
   - correct-answer positions balanced; Gujarati and English have the same `a` for each question
   - terms checked against the glossary spellings
   - no "none of the above" or "all of the above" options
4. **Review.** I write a review sheet per batch (`review-NNN.md`: summary, then each question with the correct answer marked), so you can read it without opening JSON.
5. **Merge and ship.** After all batches pass validation, one script merges them into `www/assets/data/study/` and I add the files to the service worker list. The app UI is a separate step.

## 6. Pilot (before anything bulk)

Four Vachanamruts chosen to stress different cases:

| # | Why |
|---|---|
| **5** | The shortest one (about 900 English characters) |
| **18** | A typical Gadhada I discourse, medium length |
| **78** | The longest (about 40,000 English characters), which tests whether the questions stay focused |
| **201** | The median length, from Vartal (a different section and style) |

Deliverable: `review-pilot.md` with both languages. You read it and tell me about tone, difficulty, wording and anything doctrinally off. I adjust the style rules, re-run the pilot if needed, and only then start the bulk run.

## 7. Open points to confirm

- Is 10 questions a hard requirement even for the shortest discourse (#5 is a few lines)? Default: yes, 10, with the setting questions and "meaning" questions filling in.
- Do you want the quiz to avoid trivia such as numbers and place names where possible? Default: mostly meaning and teaching, a couple of setting questions.
- Gujarati numerals in the Gujarati text (૧૮૭૬) or Western digits? Default: follow the source text.

## 8. After the data

Later steps, planned separately: show the summary at the top of each reading, a quiz screen (score, retry, progress in Journey), and use `themes` to group Study Time automatically.
