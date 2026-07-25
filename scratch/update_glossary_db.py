#!/usr/bin/env python3
"""Sync assets/glossary.json into the vachanamrut_glossary table of the existing
sqlite db, without rebuilding the rest of the database.

Usage:
  python3 scratch/update_glossary_db.py            # sync all chapters
  python3 scratch/update_glossary_db.py 79 96      # sync only chapters 79-96
"""
import sqlite3
import json
import os
import sys

DB_PATH = "assets/data/vachanamrut.db"
GLOSSARY_PATH = "assets/glossary.json"


def main():
    if not os.path.exists(DB_PATH):
        print(f"Error: {DB_PATH} not found. Run convert_json_to_sqlite.py first.")
        sys.exit(1)
    if not os.path.exists(GLOSSARY_PATH):
        print(f"Error: {GLOSSARY_PATH} not found.")
        sys.exit(1)

    with open(GLOSSARY_PATH, "r", encoding="utf-8") as f:
        glossary_entries = json.load(f)

    if len(sys.argv) >= 3:
        start, end = int(sys.argv[1]), int(sys.argv[2])
        glossary_entries = [e for e in glossary_entries if start <= e.get("vachanamrut_id", -1) <= end]
        print(f"Syncing glossary for chapters {start}-{end} ({len(glossary_entries)} entries)...")
    else:
        start, end = None, None
        print(f"Syncing entire glossary ({len(glossary_entries)} entries)...")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS vachanamrut_glossary (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vachanamrut_id INTEGER,
            word_en TEXT,
            word_gu TEXT,
            meaning_en TEXT,
            meaning_gu TEXT
        )
    ''')

    if start is not None:
        cursor.execute(
            "DELETE FROM vachanamrut_glossary WHERE vachanamrut_id BETWEEN ? AND ?",
            (start, end),
        )
    else:
        cursor.execute("DELETE FROM vachanamrut_glossary")

    for entry in glossary_entries:
        cursor.execute('''
            INSERT INTO vachanamrut_glossary (vachanamrut_id, word_en, word_gu, meaning_en, meaning_gu)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            entry.get("vachanamrut_id"),
            entry.get("word_en"),
            entry.get("word_gu"),
            entry.get("meaning_en"),
            entry.get("meaning_gu"),
        ))

    conn.commit()

    cursor.execute("SELECT COUNT(*) FROM vachanamrut_glossary")
    total = cursor.fetchone()[0]
    conn.close()

    print(f"Done. vachanamrut_glossary now has {total} total rows in {DB_PATH}.")


if __name__ == "__main__":
    main()
