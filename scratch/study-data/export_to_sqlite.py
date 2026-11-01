"""Populate study_summaries and study_quizzes tables in www/assets/data/vachanamrut.db."""
import glob, json, os, sqlite3

H = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(H, '..', '..', 'www', 'assets', 'data', 'vachanamrut.db')
BATCH_DIR = os.path.join(H, 'batches')

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Create tables
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

# Clear existing study entries for clean reload
cur.execute("DELETE FROM study_summaries;")
cur.execute("DELETE FROM study_quizzes;")

files = sorted(glob.glob(os.path.join(BATCH_DIR, 'v*.json')), key=lambda p: int(os.path.basename(p)[1:-5]))
print(f"Loading {len(files)} batch files into SQLite...")

summary_rows = 0
quiz_rows = 0

for f in files:
    d = json.load(open(f, encoding='utf-8'))
    vid = d['id']
    themes_json = json.dumps(d.get('themes', []), ensure_ascii=False)

    for lang in ('en', 'gu'):
        key_line = d[lang]['key']
        summary_json = json.dumps(d[lang]['summary'], ensure_ascii=False)
        cur.execute(
            "INSERT INTO study_summaries (vachanamrut_id, language, key_line, summary, themes) VALUES (?, ?, ?, ?, ?)",
            (vid, lang, key_line, summary_json, themes_json)
        )
        summary_rows += 1

        for order, q in enumerate(d['quiz'], 1):
            q_lang = q[lang]
            a = q['a']
            opts = list(q_lang['wrong'])
            opts.insert(a, q_lang['correct'])
            cur.execute(
                "INSERT INTO study_quizzes (vachanamrut_id, language, question_order, question, options, answer_index, why) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (vid, lang, order, q_lang['q'], json.dumps(opts, ensure_ascii=False), a, q_lang['why'])
            )
            quiz_rows += 1

conn.commit()
print(f"Successfully inserted {summary_rows} summary rows and {quiz_rows} quiz rows into {DB_PATH}")

# Verify counts
cur.execute("SELECT language, COUNT(*) FROM study_summaries GROUP BY language;")
print("Summaries by language:", cur.fetchall())

cur.execute("SELECT language, COUNT(*) FROM study_quizzes GROUP BY language;")
print("Quizzes by language:", cur.fetchall())

conn.close()

