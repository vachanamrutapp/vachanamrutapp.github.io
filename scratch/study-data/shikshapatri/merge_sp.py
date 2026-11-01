#!/usr/bin/env python3
import json
import sqlite3
from pathlib import Path

DB_PATH = 'www/assets/data/vachanamrut.db'

SECTIONS_META = [
    {
        "id": 1,
        "start": 1,
        "end": 48,
        "range": "1–48",
        "pill_gu": "સામાન્ય સદાચાર",
        "pill_en": "General Conduct",
        "title_gu": "મંગલાચરણ અને સામાન્ય સદાચાર",
        "title_en": "Invocation & Universal Moral Code"
    },
    {
        "id": 2,
        "start": 49,
        "end": 122,
        "range": "49–122",
        "pill_gu": "પૂજા અને સિદ્ધાંત",
        "pill_en": "Puja & Philosophy",
        "title_gu": "નિત્યકર્મ, ભક્તિ, પ્રમાણ શાસ્ત્રો અને સિદ્ધાંત",
        "title_en": "Daily Puja, Festivals, Shastras & Philosophy"
    },
    {
        "id": 3,
        "start": 123,
        "end": 158,
        "range": "123–158",
        "pill_gu": "આચાર્ય અને ગૃહસ્થ",
        "pill_en": "Acharyas & Householders",
        "title_gu": "ધર્મવંશી આચાર્યો, ગૃહસ્થ અને રાજાઓના વિશેષ ધર્મ",
        "title_en": "Special Duties: Acharyas, Householders & Kings"
    },
    {
        "id": 4,
        "start": 159,
        "end": 174,
        "range": "159–174",
        "pill_gu": "સ્ત્રીધર્મ",
        "pill_en": "Women's Code",
        "title_gu": "સ્ત્રીઓના વિશેષ ધર્મ: સુવાસિની અને વિધવા",
        "title_en": "Special Duties: Married Women & Widows"
    },
    {
        "id": 5,
        "start": 175,
        "end": 202,
        "range": "175–202",
        "pill_gu": "ત્યાગી અને સાધુ",
        "pill_en": "Celibates & Sadhus",
        "title_gu": "નૈષ્ઠિક બ્રહ્મચારી અને સાધુઓના વિશેષ ધર્મ",
        "title_en": "Special Duties: Celibates & Ascetics"
    },
    {
        "id": 6,
        "start": 203,
        "end": 212,
        "range": "203–212",
        "pill_gu": "ઉપસંહાર અને ફળશ્રુતિ",
        "pill_en": "Conclusion & Glory",
        "title_gu": "ઉપસંહાર, ગ્રંથનું માહાત્મ્ય અને ફળશ્રુતિ",
        "title_en": "Conclusion, Glory of Scripture & Blessings"
    }
]

def merge():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS shikshapatri_study_sections (
        section_id INTEGER PRIMARY KEY,
        start_shloka INTEGER NOT NULL,
        end_shloka INTEGER NOT NULL,
        shloka_range TEXT NOT NULL,
        pill_gu TEXT NOT NULL,
        pill_en TEXT NOT NULL,
        title_gu TEXT NOT NULL,
        title_en TEXT NOT NULL
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS shikshapatri_study_summaries (
        section_id INTEGER NOT NULL,
        language TEXT NOT NULL,
        key_line TEXT NOT NULL,
        summary TEXT NOT NULL,
        themes TEXT NOT NULL,
        PRIMARY KEY (section_id, language)
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS shikshapatri_study_quizzes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        section_id INTEGER NOT NULL,
        language TEXT NOT NULL,
        question_order INTEGER NOT NULL,
        question TEXT NOT NULL,
        options TEXT NOT NULL,
        answer_index INTEGER NOT NULL,
        why TEXT NOT NULL
    );
    """)

    cur.execute("""
    CREATE INDEX IF NOT EXISTS idx_sp_study_quizzes_sec_lang
    ON shikshapatri_study_quizzes (section_id, language);
    """)

    # Clear existing SP study data
    cur.execute("DELETE FROM shikshapatri_study_sections;")
    cur.execute("DELETE FROM shikshapatri_study_summaries;")
    cur.execute("DELETE FROM shikshapatri_study_quizzes;")

    for meta in SECTIONS_META:
        cur.execute("""
        INSERT INTO shikshapatri_study_sections (section_id, start_shloka, end_shloka, shloka_range, pill_gu, pill_en, title_gu, title_en)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (meta['id'], meta['start'], meta['end'], meta['range'], meta['pill_gu'], meta['pill_en'], meta['title_gu'], meta['title_en']))

    for sec_id in range(1, 7):
        json_path = Path(f'scratch/study-data/shikshapatri/sp{sec_id}.json')
        if not json_path.exists():
            print(f"File {json_path} does not exist yet, skipping...")
            continue
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if isinstance(data, list):
                data = data[0]

        themes_json = json.dumps(data.get('themes', []))

        # Summaries
        for lang in ('gu', 'en'):
            obj = data[lang]
            cur.execute("""
            INSERT INTO shikshapatri_study_summaries (section_id, language, key_line, summary, themes)
            VALUES (?, ?, ?, ?, ?)
            """, (sec_id, lang, obj['key'], json.dumps(obj['summary'], ensure_ascii=False), themes_json))

        # Quizzes
        quiz = data.get('quiz', [])
        for order, q in enumerate(quiz):
            a_idx = q['a']
            for lang in ('gu', 'en'):
                q_obj = q[lang]
                # If options already in 4-item list or correct/wrong
                if 'o' in q_obj:
                    opts = q_obj['o']
                else:
                    opts = list(q_obj['wrong'])
                    opts.insert(a_idx, q_obj['correct'])
                cur.execute("""
                INSERT INTO shikshapatri_study_quizzes (section_id, language, question_order, question, options, answer_index, why)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (sec_id, lang, order, q_obj['q'], json.dumps(opts, ensure_ascii=False), a_idx, q_obj['why']))

    conn.commit()
    conn.close()
    print("Shikshapatri study data successfully merged into vachanamrut.db!")

if __name__ == '__main__':
    merge()

