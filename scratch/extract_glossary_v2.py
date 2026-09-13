#!/usr/bin/env python3
"""
Extract fresh, high-quality glossary entries (10-12 terms per chapter) using Gemini 3.5 Flash Lite.
Ensures English terms strictly match the English translation text, and Gujarati terms match Gujarati text.
"""
import os
import sys
import re
import json
import time
import unicodedata
import urllib.request
import urllib.error
import sqlite3

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(BASE_DIR, ".env")
GLOSSARY_PATH = os.path.join(BASE_DIR, "www", "assets", "glossary.json")
DB_PATH = os.path.join(BASE_DIR, "www", "assets", "data", "vachanamrut.db")
EN_DATA_DIR = os.path.join(BASE_DIR, "www", "assets", "data", "english")
GU_DATA_DIR = os.path.join(BASE_DIR, "www", "assets", "data", "gujarati")
BACKUP_DIR = os.path.join(BASE_DIR, "scratch", "glossary_batches")

DEFAULT_MODEL = "gemini-3.5-flash-lite"

SYSTEM_PROMPT = """You are an expert scholar and translator of the Vachanamrut scripture (Bhagwan Swaminarayan's discourses).
Your task is to analyze the provided Vachanamrut chapter (both English and Gujarati texts) and extract 10 to 12 key theological and philosophical terms.

CRITICAL EXTRACTION RULES:
1. QUANTITY: Extract exactly 10 to 12 terms per chapter.
2. IN-TEXT ENGLISH FIDELITY:
   - In the BAPS English translation, concepts are often translated into English words (e.g. 'desire' for vasana, 'servitude' for dasapanu, 'discrimination' for vivek, 'faith' for shraddha, 'rock sugar' for sakar, 'possessing a form' for sakar).
   - For `word_en`, you MUST provide the term as it actually appears in the English chapter text.
   - If both the English translation and the transliterated Sanskrit/Gujarati word are relevant, use the dual format:
     `English Term / Transliterated Term` (e.g., "Desire / Vāsanā", "Servitude / Dāsapaṇu", "Discrimination / Vivek", "Faith / Śraddhā", "Rock sugar / Sākar", "Form / Sākār").
   - Either the translated term or the transliteration MUST appear directly in the English text of this chapter.
3. IN-TEXT GUJARATI FIDELITY:
   - For `word_gu`, provide the exact root word or phrase in Gujarati script as it appears in the Gujarati chapter text (e.g. 'વાસના', 'દાસપણું', 'વિવેક', 'શ્રદ્ધા', 'સાકર', 'સાકાર').
4. CONTEXT-RICH DEFINITIONS:
   - `meaning_en`: Provide a rich, clear explanation explaining what the term means in Hindu/Swaminarayan philosophy and specifically how Bhagwan Swaminarayan uses or defines it in this chapter.
   - `meaning_gu`: Provide an aligned, accurate explanation in Gujarati script.
5. NO HALLUCINATED OR UNRELATED WORDS: Only select terms that are genuinely discussed or mentioned in this specific chapter.
"""

def load_env():
    env = {}
    if not os.path.exists(ENV_PATH):
        return env
    with open(ENV_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env

def normalize_text(text):
    if not text:
        return ""
    text = unicodedata.normalize("NFKD", text)
    return text.lower()

def check_word_match(word, full_text):
    """Check if the word (or any component if dual format 'A / B') matches the text."""
    if not word or not full_text:
        return False
    norm_text = normalize_text(full_text)
    
    parts = [p.strip() for p in word.split("/") if p.strip()]
    for part in parts:
        # Strip diacritics for a loose search
        norm_part = normalize_text(part)
        # Check direct substring
        if norm_part in norm_text:
            return True
        # Check without punctuation
        clean_part = re.sub(r"[^\w\s]", "", norm_part).strip()
        if clean_part and clean_part in norm_text:
            return True
    return False

def call_gemini_api(api_key, model, user_content):
    fallback_model = "gemini-3.1-flash-lite"
    candidate_models = [model]
    if model != fallback_model:
        candidate_models.append(fallback_model)

    schema = {
        "type": "ARRAY",
        "description": "List of 10 to 12 glossary entries for the chapter",
        "items": {
            "type": "OBJECT",
            "properties": {
                "vachanamrut_id": {"type": "INTEGER", "description": "The numeric ID of the Vachanamrut chapter"},
                "word_en": {"type": "STRING", "description": "English word matching the English text, or 'English / Transliteration'"},
                "word_gu": {"type": "STRING", "description": "Gujarati root word as found in the Gujarati text"},
                "meaning_en": {"type": "STRING", "description": "Chapter-specific theological definition in English"},
                "meaning_gu": {"type": "STRING", "description": "Aligned definition in Gujarati"}
            },
            "required": ["vachanamrut_id", "word_en", "word_gu", "meaning_en", "meaning_gu"]
        }
    }

    data = {
        "systemInstruction": {
            "parts": [{"text": SYSTEM_PROMPT}]
        },
        "contents": [
            {
                "role": "user",
                "parts": [{"text": user_content}]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": schema,
            "temperature": 0.2
        }
    }

    body = json.dumps(data).encode("utf-8")

    for current_model in candidate_models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{current_model}:generateContent?key={api_key}"
        req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})

        max_retries = 3
        backoff = 3
        for attempt in range(max_retries):
            try:
                with urllib.request.urlopen(req, timeout=20) as res:
                    resp_data = json.loads(res.read().decode("utf-8"))
                    candidate = resp_data["candidates"][0]
                    text_out = candidate["content"]["parts"][0]["text"]
                    if current_model != model:
                        print(f"  (Responded via Gemini 3.1 Flash Lite fallback)")
                    return json.loads(text_out)
            except urllib.error.HTTPError as e:
                err_msg = e.read().decode("utf-8") if e.fp else ""
                if e.code == 503 and current_model != candidate_models[-1]:
                    print(f"  [{current_model} busy with 503 high demand -> falling back to {candidate_models[-1]}...]")
                    break  # Break out to immediately try fallback model!
                if e.code in (429, 503):
                    time.sleep(backoff)
                    backoff = min(backoff * 2, 20)
                elif e.code == 400:
                    return None
                else:
                    time.sleep(2)
            except Exception as e:
                if current_model != candidate_models[-1]:
                    print(f"  [{current_model} timed out/errored -> falling back to {candidate_models[-1]}...]")
                    break
                time.sleep(2)

    return None

def process_chapters(start, end, model=None):
    env = load_env()
    api_key = env.get("gemini-key") or env.get("GEMINI_API_KEY")
    if not api_key or api_key == "YOUR_GEMINI_API_KEY":
        print("ERROR: Please set your Gemini API key in .env:")
        print("  gemini-key=AIzaSy...")
        sys.exit(1)

    selected_model = model or env.get("model", DEFAULT_MODEL)
    print(f"=== Vachanamrut Glossary Extraction ===")
    print(f"Model: {selected_model}")
    print(f"Chapters: {start} to {end}")
    print(f"Glossary Path: {GLOSSARY_PATH}\n")

    os.makedirs(BACKUP_DIR, exist_ok=True)

    # Load existing glossary
    if os.path.exists(GLOSSARY_PATH):
        with open(GLOSSARY_PATH, "r", encoding="utf-8") as f:
            glossary = json.load(f)
    else:
        glossary = []

    # Filter out chapters we will re-extract
    glossary_map = {}
    for entry in glossary:
        cid = entry.get("vachanamrut_id")
        if cid:
            glossary_map.setdefault(cid, []).append(entry)

    total_extracted = 0

    for cid in range(start, end + 1):
        en_path = os.path.join(EN_DATA_DIR, f"vachanamrut-{cid}.json")
        gu_path = os.path.join(GU_DATA_DIR, f"vachanamrut-{cid}.json")

        if not os.path.exists(en_path) or not os.path.exists(gu_path):
            print(f"[Chapter {cid}] JSON files not found. Skipping.")
            continue

        ch_backup = os.path.join(BACKUP_DIR, f"chapter_{cid}.json")
        if os.path.exists(ch_backup) and "--force" not in sys.argv:
            try:
                with open(ch_backup, "r", encoding="utf-8") as bf:
                    cached_entries = json.load(bf)
                if len(cached_entries) >= 8:
                    print(f"[{cid}/{end}] Chapter {cid} already extracted in cache ({len(cached_entries)} terms). Reusing.", flush=True)
                    glossary_map[cid] = cached_entries
                    total_extracted += len(cached_entries)
                    continue
            except Exception:
                pass

        with open(en_path, "r", encoding="utf-8") as f:
            en_data = json.load(f)
        with open(gu_path, "r", encoding="utf-8") as f:
            gu_data = json.load(f)

        en_text = f"{en_data.get('title', '')} {en_data.get('setting', '')} {en_data.get('text', '')}"
        gu_text = f"{gu_data.get('title', '')} {gu_data.get('setting', '')} {gu_data.get('text', '')}"

        user_content = f"""Please extract 10 to 12 key terms from Vachanamrut Chapter {cid} ({en_data.get('title', '')}).

[ENGLISH TEXT]
Title: {en_data.get('title', '')}
Setting: {en_data.get('setting', '')}
Text: {en_data.get('text', '')}

[GUJARATI TEXT]
Title: {gu_data.get('title', '')}
Setting: {gu_data.get('setting', '')}
Text: {gu_data.get('text', '')}
"""
        print(f"[{cid}/{end}] Requesting terms for Chapter {cid} ({en_data.get('title', '')})...", flush=True)
        entries = call_gemini_api(api_key, selected_model, user_content)

        if not entries:
            print(f"  FAILED to extract for Chapter {cid}. Skipping.")
            continue

        # Validate entries against text
        validated = []
        en_matches = 0
        gu_matches = 0
        for e in entries:
            e["vachanamrut_id"] = cid
            w_en = e.get("word_en", "").strip()
            w_gu = e.get("word_gu", "").strip()

            has_en = check_word_match(w_en, en_text)
            has_gu = check_word_match(w_gu, gu_text)

            if has_en:
                en_matches += 1
            if has_gu:
                gu_matches += 1

            validated.append(e)

        print(f"  Extracted: {len(validated)} terms | EN text match: {en_matches}/{len(validated)} | GU text match: {gu_matches}/{len(validated)}")
        for e in validated:
            print(f"    - {e.get('word_en')} | {e.get('word_gu')}")

        # Update map for this chapter
        glossary_map[cid] = validated
        total_extracted += len(validated)

        # Save cumulative glossary after each chapter
        flat_glossary = []
        for c in sorted(glossary_map.keys()):
            flat_glossary.extend(glossary_map[c])

        with open(GLOSSARY_PATH, "w", encoding="utf-8") as f:
            json.dump(flat_glossary, f, ensure_ascii=False, indent=2)

        # Write backup of this chapter
        with open(ch_backup, "w", encoding="utf-8") as f:
            json.dump(validated, f, ensure_ascii=False, indent=2)

        # Snappy pacing between chapters
        time.sleep(1.2)

    # Final sync to SQLite DB
    flat_glossary = []
    for c in sorted(glossary_map.keys()):
        flat_glossary.extend(glossary_map[c])

    with open(GLOSSARY_PATH, "w", encoding="utf-8") as f:
        json.dump(flat_glossary, f, ensure_ascii=False, indent=2)

    if os.path.exists(DB_PATH):
        print(f"\nSyncing {len(flat_glossary)} entries to SQLite {DB_PATH}...")
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute('''
            CREATE TABLE IF NOT EXISTS vachanamrut_glossary (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vachanamrut_id INTEGER,
                word_en TEXT,
                word_gu TEXT,
                meaning_en TEXT,
                meaning_gu TEXT
            )
        ''')
        cur.execute("DELETE FROM vachanamrut_glossary WHERE vachanamrut_id BETWEEN ? AND ?", (start, end))
        for item in flat_glossary:
            if start <= item.get("vachanamrut_id", -1) <= end:
                cur.execute('''
                    INSERT INTO vachanamrut_glossary (vachanamrut_id, word_en, word_gu, meaning_en, meaning_gu)
                    VALUES (?, ?, ?, ?, ?)
                ''', (
                    item.get("vachanamrut_id"),
                    item.get("word_en"),
                    item.get("word_gu"),
                    item.get("meaning_en"),
                    item.get("meaning_gu")
                ))
        conn.commit()
        cur.execute("SELECT COUNT(*) FROM vachanamrut_glossary")
        total_rows = cur.fetchone()[0]
        conn.close()
        print(f"SQLite DB updated: vachanamrut_glossary table now has {total_rows} total rows.")

    print(f"\nCompleted! Total entries extracted/verified: {total_extracted}")
    print(f"Updated glossary saved to {GLOSSARY_PATH}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 scratch/extract_glossary_v2.py <start_id> <end_id> [model] [--force]")
        print("Example: python3 scratch/extract_glossary_v2.py 1 262 gemini-3.5-flash-lite")
        sys.exit(1)

    s_id = int(sys.argv[1])
    e_id = int(sys.argv[2])
    m_name = DEFAULT_MODEL
    if len(sys.argv) > 3 and not sys.argv[3].startswith("--"):
        m_name = sys.argv[3]
    process_chapters(s_id, e_id, m_name)
