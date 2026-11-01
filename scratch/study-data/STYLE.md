# Study data style guide (summaries + quizzes)

Source of truth: only that Vachanamrut's own text in the app. Add nothing from outside.
Shriji Maharaj is the supreme God (Purushottam) throughout. Every word stays reverent. Never say
"Swaminarayan said", never casual, never critical, no modern self-help tone, no speculation.

## Read the source
- `www/assets/data/gujarati/vachanamrut-N.json` and `www/assets/data/english/vachanamrut-N.json`
  (fields: vachanamrut, title, setting, text).
- The English `text` is duplicated (diacritics version, then a plain version): read the first half only.
- Read both languages in full before writing. Write Gujarati from the Gujarati text and English from
  the English text: natural in each language, not a word-for-word translation of the other.

## Key line (`key`)
One sentence: the central teaching.
- Gujarati: use the impersonal form, never commands. Write "પૂર્વકર્મ પર આધાર ન રાખવો; ભૂંડા સંગનો ત્યાગ કરવો",
  NOT "આધાર ન રાખો", "ત્યાગ કરો", "બાંધો", "સમજો". Use રાખવું / કરવું / સમજવું / બાંધવું.
- English: "One should…" style, never a bare imperative. "One should not depend on past karma…"
- Do not repeat this sentence word for word in the summary.

## Summary (`summary`: a list of paragraphs)
Explains what Shriji Maharaj is teaching and why, so a reader truly understands the discourse.
- Length follows the discourse: 2 paragraphs for very short ones, 3–4 for typical, 5 for the longest.
  Each paragraph 3–5 sentences. Aim for 120–180 words for short ones, 220–350 for typical/long.
- Cover the actual flow: the question or topic raised, Maharaj's answer, His examples and analogies,
  the reasoning, and what it asks of a devotee. In a many-question discourse, group related answers.
- Third person: "શ્રીજીમહારાજ …" / "Shriji Maharaj …". Gujarati verbs respectful: સમજાવે છે, કહે છે, જણાવે છે.
- Use the Vachanamrut's own vocabulary (antahkaran, nishchay, ekantik bhakta, વર્તમાન, માહાત્મ્ય …) with
  source spellings. Do not invent paraphrased doctrine. No headings, no bullet lists, no dates.
- Do not start every paragraph the same way.

## Quiz (exactly 10 questions)
Every question checks understanding of WHAT THE VACHANAMRUT TEACHES.
- FORBIDDEN: who asked, who answered, names of questioners, dates, tithi, place, what Maharaj wore,
  time of day, how many people, seating, or any trivia about the setting. No "how many" number trivia.
- GOOD: what Maharaj teaches, why, what follows from it, meaning of an example or analogy, what a
  devotee should do in a situation (short scenario), the difference between two things He contrasts,
  the cause of something, the remedy for something. Roughly half should test "why/what does it mean".
- Answerable from the text, with one clearly correct option. Spread questions across the whole discourse.
- For a very short discourse still write 10, by asking about different angles, causes, results, wrong
  attitudes and application. Avoid near-duplicate questions.
- 4 options: `correct` plus 3 `wrong`. Each option at most 7 words / 50 characters (Gujarati too).
  Wrong options are plausible, sound like the same kind of answer, and are about the same length as the
  correct one. The correct one must not be the longest or most detailed. No "all/none of the above".
  Wrong options must not state anything irreverent about God or the Sant.
- `a` is the position (0–3) of the correct option, the same in both languages. Over the 10 questions use
  each position 2–3 times, in no obvious pattern.
- `why`: one sentence from the text explaining the answer. Paired: same question, same meaning, both languages.
- Gujarati numerals in Gujarati text.

## Output: one file per Vachanamrut, `scratch/study-data/batches/v{N}.json`
{
 "id": 18,
 "themes": ["sadhana", "sant"],
 "en": { "key": "...", "summary": ["para", "para", "..."] },
 "gu": { "key": "...", "summary": ["para", "para", "..."] },
 "quiz": [ { "a": 2,
             "en": { "q": "...", "correct": "...", "wrong": ["...", "...", "..."], "why": "..." },
             "gu": { "q": "...", "correct": "...", "wrong": ["...", "...", "..."], "why": "..." } }, ... ]
}
themes: 1–3 of upasana, bhakti, atma, dharma, vairagya, sant, sadhana, manan.

After writing each file run: python3 -I scratch/study-data/check.py N  and fix anything it reports.
