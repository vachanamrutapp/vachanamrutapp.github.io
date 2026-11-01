"""Validate study data from SQLite (vachanamrut.db) and (optionally) write a readable review sheet.
usage: python3 -I validate.py [review.md]"""
import json, os, re, sqlite3, sys
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'www', 'assets', 'data', 'vachanamrut.db')
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

S = {'en': {}, 'gu': {}}
Q = {'en': {}, 'gu': {}}

for l in ('en', 'gu'):
    cur.execute("SELECT vachanamrut_id, key_line, summary, themes FROM study_summaries WHERE language = ?", (l,))
    for vid, key, summary, themes in cur.fetchall():
        S[l][str(vid)] = dict(key=key, summary=json.loads(summary), themes=json.loads(themes))

    cur.execute("SELECT vachanamrut_id, question, options, answer_index, why FROM study_quizzes WHERE language = ? ORDER BY vachanamrut_id, question_order", (l,))
    for vid, q, o, a, why in cur.fetchall():
        svid = str(vid)
        if svid not in Q[l]: Q[l][svid] = []
        Q[l][svid].append(dict(q=q, o=json.loads(o), a=a, why=why))

conn.close()
GU = re.compile('[઀-૿]')
THEMES = {'upasana', 'bhakti', 'atma', 'dharma', 'vairagya', 'sant', 'sadhana', 'manan'}
errors, warns = [], []
def E(m): errors.append(m)
def W(m): warns.append(m)
ids = sorted(set(S['en']) | set(S['gu']) | set(Q['en']) | set(Q['gu']), key=int)
for i in ids:
    for l in ('en', 'gu'):
        if i not in S[l]: E(f'{i} {l}: missing summary'); continue
        s = S[l][i]
        if isinstance(s['summary'], list):
            words = sum(len(p.split()) for p in s['summary'])
            sum_text = ' '.join(s['summary'])
        else:
            words = len(s['summary'].split())
            sum_text = s['summary']
        if not 90 <= words <= 450: W(f'{i} {l}: summary {words} words')
        if not s['key'].strip(): E(f'{i} {l}: empty key')
        if not s['themes'] or not set(s['themes']) <= THEMES: E(f'{i} {l}: bad themes {s["themes"]}')
        hasgu = bool(GU.search(sum_text))
        if (l == 'gu') != hasgu: E(f'{i} {l}: summary script mismatch')
        if i not in Q[l]: E(f'{i} {l}: missing quiz'); continue
        qs = Q[l][i]
        if len(qs) != 10: E(f'{i} {l}: {len(qs)} questions')
        pos = [0, 0, 0, 0]
        for n, q in enumerate(qs, 1):
            o = q['o']
            if len(o) != 4: E(f'{i} {l} Q{n}: {len(o)} options')
            if len(set(o)) != len(o): E(f'{i} {l} Q{n}: duplicate options')
            if not 0 <= q['a'] < 4: E(f'{i} {l} Q{n}: bad answer index')
            else: pos[q['a']] += 1
            if not q['why'].strip(): E(f'{i} {l} Q{n}: empty why')
            for t in o:
                if len(t.split()) > 8 or len(t) > 60: W(f'{i} {l} Q{n}: long option "{t}"')
                if re.search(r'none of the above|all of the above|ઉપરોક્ત', t, re.I): E(f'{i} {l} Q{n}: banned option')
            if (l == 'gu') != bool(GU.search(q['q'] + ''.join(o))): E(f'{i} {l} Q{n}: script mismatch')
        if max(pos) > 4: W(f'{i} {l}: answer positions {pos}')
    if i in Q['en'] and i in Q['gu']:
        if [q['a'] for q in Q['en'][i]] != [q['a'] for q in Q['gu'][i]]: E(f'{i}: en/gu answer positions differ')
print(f'{len(ids)} vachanamruts checked: {len(errors)} errors, {len(warns)} warnings')
for m in errors: print('ERROR', m)
for m in warns: print('warn ', m)
if len(sys.argv) > 1:
    L = ['# Study mode pilot: review sheet\n', 'Correct answers are marked ✔. English first, then Gujarati, for each Vachanamrut.\n']
    for i in ids:
        L.append(f'\n---\n\n## Vachanamrut {i}\n')
        for l, name in (('en', 'English'), ('gu', 'ગુજરાતી')):
            s = S[l][i]
            L.append(f'\n### {name}\n\n**Key message:** {s["key"]}\n\n**Summary:** {s["summary"]}\n\n*Themes: {", ".join(s["themes"])}*\n')
            for n, q in enumerate(Q[l][i], 1):
                L.append(f'\n**{n}. {q["q"]}**\n')
                for k, t in enumerate(q['o']):
                    L.append(f'- {"ABCD"[k]}. {t}' + ('  ✔' if k == q['a'] else ''))
                L.append(f'\n  *Why: {q["why"]}*\n')
    open(sys.argv[1], 'w', encoding='utf-8').write('\n'.join(L))
    print('wrote', sys.argv[1])
