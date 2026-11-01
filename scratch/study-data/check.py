"""Validate batch files. usage: python3 -I check.py [ids...]  (no ids: every file in batches/)"""
import glob, json, os, re, sys
B = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'batches')
GU = re.compile('[઀-૿]')
THEMES = {'upasana', 'bhakti', 'atma', 'dharma', 'vairagya', 'sant', 'sadhana', 'manan'}
BAD_Q = re.compile(r'\b(who asked|asked by|which date|what date|what day|when was|where was|wearing|samvat|tithi|how many)\b', re.I)
BAD_Q_GU = re.compile(r'કોણે પૂછ|કોણે પ્રશ્ન|કઈ તિથિ|સંવત|ક્યાં વિરાજ|વસ્ત્ર ધારણ|કેટલા')
IMPER = re.compile(r'(રાખો|કરો|બાંધો|સમજો|છોડો|જાણો|ટાળો|માનો|રહો)[\s.,;:!]*$|(રાખો|કરો|બાંધો|સમજો|છોડો|ટાળો|માનો)[\s,;:.]')
def check(path):
    e, w = [], []
    try: d = json.load(open(path, encoding='utf-8'))
    except Exception as x: return [f'bad json: {x}'], []
    if not set(d.get('themes', [])) or not set(d['themes']) <= THEMES or len(d['themes']) > 3: e.append('themes')
    for l in ('en', 'gu'):
        s = d.get(l) or {}
        ps = s.get('summary')
        if not isinstance(ps, list) or not ps: e.append(f'{l}: summary must be a list'); continue
        words = sum(len(p.split()) for p in ps)
        if words < 90: w.append(f'{l}: summary only {words} words')
        if len(ps) < 2 and words > 90: w.append(f'{l}: only one paragraph')
        if not s.get('key', '').strip(): e.append(f'{l}: empty key')
        text = ' '.join(ps) + s.get('key', '')
        if (l == 'gu') != bool(GU.search(text)): e.append(f'{l}: wrong script')
        if l == 'en' and GU.search(text): e.append('en contains Gujarati')
    if IMPER.search((d.get('gu') or {}).get('key', '')): e.append('gu key uses a command form')
    qs = d.get('quiz', [])
    if len(qs) != 10: e.append(f'{len(qs)} questions')
    pos = [0] * 4
    for n, q in enumerate(qs, 1):
        a = q.get('a')
        if a not in (0, 1, 2, 3): e.append(f'Q{n}: bad a'); continue
        pos[a] += 1
        for l in ('en', 'gu'):
            x = q.get(l) or {}
            opts = [x.get('correct', '')] + list(x.get('wrong', []))
            if len(opts) != 4 or not all(o.strip() for o in opts): e.append(f'Q{n} {l}: need correct + 3 wrong'); continue
            if len(set(opts)) != 4: e.append(f'Q{n} {l}: duplicate options')
            if not x.get('q', '').strip() or not x.get('why', '').strip(): e.append(f'Q{n} {l}: empty q/why')
            for o in opts:
                if len(o.split()) > 8 or len(o) > 60: e.append(f'Q{n} {l}: long option "{o}"')
                if re.search(r'all of the above|none of the above|ઉપરોક્ત', o, re.I): e.append(f'Q{n} {l}: banned option')
            if len(x['correct']) > max(len(o) for o in x['wrong']) + 14: w.append(f'Q{n} {l}: correct is much the longest')
            if (BAD_Q if l == 'en' else BAD_Q_GU).search(x.get('q', '')): e.append(f'Q{n} {l}: trivia question: {x["q"]}')
            if (l == 'gu') != bool(GU.search(x.get('q', '') + ''.join(opts))): e.append(f'Q{n} {l}: wrong script')
    if qs and max(pos) > 4: e.append(f'answer positions unbalanced {pos}')
    return e, w
ids = sys.argv[1:]
files = [os.path.join(B, f'v{i}.json') for i in ids] if ids else sorted(glob.glob(B + '/v*.json'))
bad = 0
for f in files:
    if not os.path.exists(f): print(os.path.basename(f), 'MISSING'); bad += 1; continue
    e, w = check(f)
    if e: bad += 1
    for m in e: print(os.path.basename(f), 'ERROR', m)
    for m in w: print(os.path.basename(f), 'warn ', m)
print(f'{len(files)} files, {bad} with errors')
