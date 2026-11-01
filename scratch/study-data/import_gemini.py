"""Split Gemini's JSON array answer(s) into batches/v{id}.json. usage: python3 -I import_gemini.py file.json ..."""
import json, os, re, sys
B = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'batches')
for f in sys.argv[1:]:
    t = open(f, encoding='utf-8').read().strip()
    t = re.sub(r'^```(?:json)?\s*|\s*```$', '', t)
    for d in json.loads(t):
        json.dump(d, open(f'{B}/v{d["id"]}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print('saved', d['id'])
