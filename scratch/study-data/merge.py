"""Merge batches/v*.json into www/assets/data/vachanamrut.db (SQLite)"""
import glob, json, os, sqlite3

H = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(H, '..', '..', 'www', 'assets', 'data', 'vachanamrut.db')

batch_files = sorted(glob.glob(H + '/batches/v*.json'), key=lambda p: int(os.path.basename(p)[1:-5]))

# Export to SQLite database
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

cur.execute("""
CREATE TABLE IF NOT EXISTS study_summaries (
    vachanamrut_id INTEGER NOT NULL,
    language TEXT NOT NULL,
    key_line TEXT NOT NULL,
    summary TEXT NOT NULL,
    themes TEXT NOT NULL,
    PRIMARY KEY (vachanamrut_id, language)
);
""")

cur.execute("""
CREATE TABLE IF NOT EXISTS study_quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vachanamrut_id INTEGER NOT NULL,
    language TEXT NOT NULL,
    question_order INTEGER NOT NULL,
    question TEXT NOT NULL,
    options TEXT NOT NULL,
    answer_index INTEGER NOT NULL,
    why TEXT NOT NULL
);
""")

cur.execute("""
CREATE INDEX IF NOT EXISTS idx_study_quizzes_vid_lang
ON study_quizzes (vachanamrut_id, language);
""")

cur.execute("DELETE FROM study_summaries;")
cur.execute("DELETE FROM study_quizzes;")

for f in batch_files:
    d = json.load(open(f, encoding='utf-8'))
    vid = d['id']
    themes_json = json.dumps(d.get('themes', []), ensure_ascii=False)
    for l in ('en', 'gu'):
        key_line = d[l]['key']
        summary_json = json.dumps(d[l]['summary'], ensure_ascii=False)
        cur.execute(
            "INSERT INTO study_summaries (vachanamrut_id, language, key_line, summary, themes) VALUES (?, ?, ?, ?, ?)",
            (vid, l, key_line, summary_json, themes_json)
        )
        for order, q in enumerate(d['quiz'], 1):
            x = q[l]
            a = q['a']
            o = list(x['wrong'])
            o.insert(a, x['correct'])
            cur.execute(
                "INSERT INTO study_quizzes (vachanamrut_id, language, question_order, question, options, answer_index, why) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (vid, l, order, x['q'], json.dumps(o, ensure_ascii=False), a, x['why'])
            )

conn.commit()
conn.close()

# Also sync to platform asset copies if directories exist
for target in [
    os.path.join(H, '..', '..', 'android', 'app', 'src', 'main', 'assets', 'public', 'assets', 'data', 'vachanamrut.db'),
    os.path.join(H, '..', '..', 'ios', 'App', 'App', 'public', 'assets', 'data', 'vachanamrut.db')
]:
    if os.path.exists(os.path.dirname(target)):
        import shutil
        shutil.copy2(DB_PATH, target)

print('merged', len(batch_files), 'discourses into SQLite (vachanamrut.db)')
