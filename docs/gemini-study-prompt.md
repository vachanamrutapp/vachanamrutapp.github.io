# Gemini prompt: Vachanamrut summaries and quizzes

Upload one file from `scratch/study-data/gemini-input/` with each message, or paste its text after the prompt.

```text
You are preparing study material for a Vachanamrut reading app (Swaminarayan tradition). The attached text contains one or more Vachanamruts, each in Gujarati and English. For EACH Vachanamrut, write a summary and a 10-question quiz in both languages.

SOURCE AND TONE
- Use only that Vachanamrut's own text. Add nothing from outside. Do not speculate.
- Shriji Maharaj is the supreme God (Purushottam). Every word stays reverent. Never write "Swaminarayan said". No casual or modern self-help tone.
- Write Gujarati from the Gujarati text and English from the English text. Each must read naturally; do not translate word for word.
- Keep the scripture's own terms and spellings (antahkaran, nishchay, ekantik bhakta, વર્તમાન, માહાત્મ્ય).

KEY LINE ("key"): one sentence with the central teaching.
- Gujarati: impersonal form only: રાખવું, કરવું, સમજવું, બાંધવું. Never commands like રાખો, કરો, સમજો, બાંધો. Example: "પૂર્વકર્મ પર આધાર ન રાખવો; ભૂંડા સંગનો ત્યાગ કરવો."
- English: "One should ..." style, never a bare imperative.

SUMMARY ("summary"): a list of paragraphs that explain what Shriji Maharaj teaches and why.
- 2 paragraphs for very short discourses, 3-4 for typical, 5 for the longest. 3-5 sentences each. Aim for 120-180 words for short ones and 220-350 for typical or long ones.
- Cover the flow: the question or topic, Maharaj's answer, His examples, the reasoning, and what it asks of a devotee.
- Third person: "શ્રીજીમહારાજ સમજાવે છે ..." / "Shriji Maharaj explains ...". No headings, lists or dates. Do not start every paragraph the same way.

QUIZ ("quiz"): exactly 10 questions that test understanding of what the Vachanamrut teaches.
- FORBIDDEN: who asked, names of questioners, dates, tithi, place, what Maharaj wore, time of day, how many people, or any number trivia.
- GOOD: what He teaches, why, what follows, the meaning of an example, what a devotee should do in a short situation, the difference between two things He contrasts, causes and remedies. About half should test "why" or "what does it mean".
- Every question must be answerable from the text, with one clearly correct option. Spread them across the whole discourse. For a very short discourse, still write 10 with no near-duplicates.
- "correct" plus 3 "wrong" options. Each option at most 7 words and 50 characters. Wrong options must be plausible, the same kind of answer, and about the same length as the correct one. The correct one must not be the longest. No "all/none of the above". Wrong options must not say anything irreverent about God or the Sant.
- "a" is the position (0-3) of the correct option, the same in both languages. Use each position 2-3 times in no obvious pattern.
- "why": one sentence from the text explaining the answer.
- The Gujarati and English of a question must have the same meaning. Use Gujarati numerals in Gujarati text.

OUTPUT
Return ONLY a valid JSON array with one object per Vachanamrut, in this exact shape, with no commentary:
[
  {
    "id": 18,
    "themes": ["sadhana", "sant"],
    "en": { "key": "...", "summary": ["paragraph", "paragraph"] },
    "gu": { "key": "...", "summary": ["paragraph", "paragraph"] },
    "quiz": [
      {
        "a": 2,
        "en": { "q": "...", "correct": "...", "wrong": ["...", "...", "..."], "why": "..." },
        "gu": { "q": "...", "correct": "...", "wrong": ["...", "...", "..."], "why": "..." }
      }
    ]
  }
]
"id" is the number in each "=== VACHANAMRUT id=N ===" header. "themes" is 1-3 of: upasana, bhakti, atma, dharma, vairagya, sant, sadhana, manan.
```
