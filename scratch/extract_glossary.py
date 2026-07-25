#!/usr/bin/env python3
import os
import sys
import json
import time
import urllib.request
import urllib.error

def load_env():
    env = {}
    env_path = ".env"
    if not os.path.exists(env_path):
        print(f"Error: {env_path} file not found.")
        sys.exit(1)
    
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                env[key.strip()] = val.strip()
    return env

SYSTEM_PROMPT = """You are an expert translator and scholar of Swaminarayan philosophy, specializing in the Vachanamrut scripture.
Your task is to analyze the provided Vachanamrut chapter (both English and Gujarati texts) and extract the key glossary terms.

For each chapter, extract key terms that fall into the following categories:
1. Spiritual/Theological concepts (e.g., Vāsanā, Upāsanā, Brahmarup, Ekāntik Dharma).
2. Key analogies or metaphors used by Maharaj (e.g., Hollow Stones, Banyan Tree branch, Red-hot branding iron, Chintāmani).
3. Important entities, characters, or attributes mentioned (e.g., King Bali, Bhishma Pitāmah, Nirmānpanu, Sanyam).

CRITICAL RULES:
- FREE-FLOWING COUNT: Do not extract a fixed number of terms per chapter. Assess the length and theological complexity of the chapter. Extract between 2 and 8 terms naturally. Do not include low-value filler terms.
- DIACRITICS: The English transliterated word (word_en) MUST use proper diacritics (e.g. ā, ī, ū, ś, ṣ, ṅ, ñ, ṭ, ḍ, ḷ, r̥, and capital variants like Ā, Ś, etc.). Examples: 'Vāsanā', 'Brahmarup', 'Sākār', 'Nirmānpanu', 'Māhātmyagnān'.
- GUJARATI SCRIPT: The Gujarati word (word_gu) MUST be in correct Gujarati script (e.g. 'વાસના', 'બ્રહ્મરૂપ', 'સાકાર', 'નિર્માનીપણું').
- CONTEXT-AWARE DEFINITIONS: The English meaning (meaning_en) should explain the term generally but ALSO mention how it is defined or used by Maharaj in this specific chapter. The Gujarati meaning (meaning_gu) must align strictly with the English meaning in substance, tone, and scope.
- ACCURACY: Ensure proper distinction between similar-sounding terms depending on the chapter context. For example:
  - In Gadhada I-10, the term is 'Sākar' (સાકર) meaning rock sugar.
  - In Gadhada I-45, the term is 'Sākār' (સાકાર) meaning possessing a form.
"""

def call_gemini_api(api_key, model, user_content):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    
    # Define structured output schema for the API response
    schema = {
        "type": "ARRAY",
        "description": "List of glossary entries for the chapter",
        "items": {
            "type": "OBJECT",
            "properties": {
                "vachanamrut_id": {"type": "INTEGER", "description": "The numeric ID of the Vachanamrut chapter"},
                "word_en": {"type": "STRING", "description": "Transliterated English word with proper diacritics"},
                "word_gu": {"type": "STRING", "description": "Gujarati script representation of the word"},
                "meaning_en": {"type": "STRING", "description": "Context-rich Vachanamrut-specific definition in English"},
                "meaning_gu": {"type": "STRING", "description": "Aligned definition in Gujarati"}
            },
            "required": ["vachanamrut_id", "word_en", "word_gu", "meaning_en", "meaning_gu"]
        }
    }
    
    data = {
        "systemInstruction": {
            "parts": [
                {"text": SYSTEM_PROMPT}
            ]
        },
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": user_content}
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": schema
        }
    }
    
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"}
    )
    
    max_retries = 5
    backoff = 2
    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req) as res:
                resp_data = json.loads(res.read().decode("utf-8"))
                # Extract text content from candidate response
                candidate = resp_data["candidates"][0]
                text_out = candidate["content"]["parts"][0]["text"]
                return json.loads(text_out)
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode("utf-8") if e.fp else ""
            print(f"HTTP Error {e.code} on attempt {attempt + 1}: {e.reason}")
            print(f"Details: {err_msg}")
            if e.code == 429: # Rate Limit
                time.sleep(backoff)
                backoff *= 2
            else:
                time.sleep(1)
        except Exception as e:
            print(f"Error on attempt {attempt + 1}: {e}")
            time.sleep(1)
            
    print("Error: Max retries exceeded.")
    return None

def process_batch(start, end, env):
    api_key = env.get("gemini-key")
    model = env.get("model", "gemini-3.1-flash-lite")
    
    if not api_key:
        print("Error: gemini-key not found in .env.")
        sys.exit(1)
        
    print(f"Starting glossary extraction for chapters {start} to {end}...", flush=True)

    glossary_path = "assets/glossary.json"
    if os.path.exists(glossary_path):
        with open(glossary_path, "r", encoding="utf-8") as f:
            glossary = json.load(f)
    else:
        glossary = []

    # Drop any existing entries for chapters we're about to (re)process
    glossary = [e for e in glossary if e.get("vachanamrut_id") not in range(start, end + 1)]

    all_entries = []
    for i in range(start, end + 1):
        en_path = f"assets/data/english/vachanamrut-{i}.json"
        gu_path = f"assets/data/gujarati/vachanamrut-{i}.json"

        if not os.path.exists(en_path) or not os.path.exists(gu_path):
            print(f"Warning: Chapter {i} files not found. Skipping.", flush=True)
            continue

        print(f"[{i}/{end}] Processing chapter {i}...", flush=True)

        with open(en_path, "r", encoding="utf-8") as f:
            en_data = json.load(f)
        with open(gu_path, "r", encoding="utf-8") as f:
            gu_data = json.load(f)
            
        user_content = f"""Please extract key terms from Gadhada I-{i} according to the instructions.

[ENGLISH DATA]
vachanamrut_id: {i}
title: {en_data.get('title', '')}
setting: {en_data.get('setting', '')}
text: {en_data.get('text', '')}

[GUJARATI DATA]
vachanamrut_id: {i}
title: {gu_data.get('title', '')}
setting: {gu_data.get('setting', '')}
text: {gu_data.get('text', '')}
"""
        
        batch_entries = call_gemini_api(api_key, model, user_content)
        if batch_entries:
            print(f"  Extracted {len(batch_entries)} terms for chapter {i}:", flush=True)
            for entry in batch_entries:
                print(f"    - {entry.get('word_en')} ({entry.get('word_gu')})", flush=True)
            all_entries.extend(batch_entries)

            # Persist progress after every chapter so partial runs aren't lost
            glossary_so_far = glossary + all_entries
            glossary_so_far.sort(key=lambda e: e.get("vachanamrut_id", 0))
            with open(glossary_path, "w", encoding="utf-8") as f:
                json.dump(glossary_so_far, f, ensure_ascii=False, indent=2)
            print(f"  Saved progress to {glossary_path} ({len(glossary_so_far)} total entries)", flush=True)
        else:
            print(f"  Failed to extract terms for chapter {i}", flush=True)

        # Sleep slightly to respect rate limits
        time.sleep(1)

    # Write batch to scratch file (backup copy)
    out_dir = "/Users/simkeyur/.gemini/antigravity/brain/5d521eb4-b20f-4a86-9da4-53a7adc4212b/scratch"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"batch_{start}_{end}.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(all_entries, f, ensure_ascii=False, indent=2)

    # Merge into the main glossary file
    glossary.extend(all_entries)
    glossary.sort(key=lambda e: e.get("vachanamrut_id", 0))
    with open(glossary_path, "w", encoding="utf-8") as f:
        json.dump(glossary, f, ensure_ascii=False, indent=2)

    print(f"\nBatch processing complete. Wrote {len(all_entries)} entries to {out_path}")
    print(f"Merged into {glossary_path} (now {len(glossary)} total entries)")
    return out_path

def main():
    if len(sys.argv) < 3:
        print("Usage: python3 extract_glossary.py <start_id> <end_id>")
        sys.exit(1)
        
    try:
        start = int(sys.argv[1])
        end = int(sys.argv[2])
    except ValueError:
        print("Error: start_id and end_id must be integers.")
        sys.exit(1)
        
    env = load_env()
    process_batch(start, end, env)

if __name__ == "__main__":
    main()
