#!/usr/bin/env python3
import json
import sys
import re
from pathlib import Path

IMPERSONAL_GU = ('વું', 'વો', 'વી', 'વા', 'વ્યા', 'કરવો', 'રાખવો', 'પાળવો', 'સમજવું', 'ત્યાગ કરવો')
COMMAND_GU = ('કરો', 'રાખો', 'પાળો', 'સમજો', 'કરો.', 'રાખો.', 'પાળો.', 'સમજો.')
ALLOWED_THEMES = {'upasana', 'bhakti', 'atma', 'dharma', 'vairagya', 'sant', 'sadhana', 'manan'}

def check_file(path):
    p = Path(path)
    with open(p, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    errors = []
    
    # Can be single dict or list of dicts
    items = data if isinstance(data, list) else [data]
    
    for item in items:
        sec_id = item.get('id')
        prefix = f"Section {sec_id}: "
        
        # Check themes
        themes = item.get('themes', [])
        if not (1 <= len(themes) <= 3):
            errors.append(f"{prefix}themes must have 1-3 items, got {len(themes)}")
        for th in themes:
            if th not in ALLOWED_THEMES:
                errors.append(f"{prefix}invalid theme '{th}'")
                
        # Check EN/GU key and summary
        for lang in ('gu', 'en'):
            if lang not in item:
                errors.append(f"{prefix}missing '{lang}' object")
                continue
            lang_obj = item[lang]
            key = lang_obj.get('key', '')
            if not key:
                errors.append(f"{prefix}missing key line in {lang}")
            elif lang == 'en':
                if not key.strip().startswith('One should'):
                    errors.append(f"{prefix}English key must start with 'One should...', got: '{key[:30]}...'")
            elif lang == 'gu':
                words = key.strip().rstrip('.,;:!?').split()
                last_word = words[-1] if words else ''
                if any(cmd in key for cmd in COMMAND_GU):
                    errors.append(f"{prefix}Gujarati key has command verb: '{key}'")
                if not any(last_word.endswith(imp) for imp in ('વું', 'વો', 'વી', 'વા', 'કરવો', 'રાખવો', 'પાળવો', 'ત્યાગ કરવો', 'માનવું')):
                    errors.append(f"{prefix}Gujarati key must end in impersonal form, got: '{last_word}' in '{key}'")
                    
            summary = lang_obj.get('summary', [])
            if not isinstance(summary, list) or len(summary) < 2:
                errors.append(f"{prefix}summary in {lang} must be list of >=2 paragraphs")
            for pi, para in enumerate(summary):
                sents = [s for s in re.split(r'[.!?।]+', para) if s.strip()]
                if len(sents) < 2:
                    errors.append(f"{prefix}{lang} para {pi+1} has fewer than 2 sentences: '{para[:40]}...'")
                    
        # Check Quiz
        quiz = item.get('quiz', [])
        if len(quiz) != 15:
            errors.append(f"{prefix}quiz must have exactly 15 questions, got {len(quiz)}")
            
        a_counts = {0: 0, 1: 0, 2: 0, 3: 0}
        for qi, q in enumerate(quiz, 1):
            q_prefix = f"{prefix}Q{qi}: "
            a = q.get('a')
            if a not in (0, 1, 2, 3):
                errors.append(f"{q_prefix}invalid answer index 'a': {a}")
            else:
                a_counts[a] += 1
                
            for lang in ('gu', 'en'):
                if lang not in q:
                    errors.append(f"{q_prefix}missing '{lang}' in quiz")
                    continue
                q_obj = q[lang]
                question = q_obj.get('q', '')
                if not question:
                    errors.append(f"{q_prefix}missing question text in {lang}")
                if re.search(r'\b(shloka|sloka|శ్લોక|શ્લોક)\s*\d+', question, re.IGNORECASE):
                    errors.append(f"{q_prefix}forbidden verse number trivia in {lang}: '{question}'")
                    
                correct = q_obj.get('correct', '')
                wrong = q_obj.get('wrong', [])
                if not correct:
                    errors.append(f"{q_prefix}missing correct option in {lang}")
                if len(wrong) != 3:
                    errors.append(f"{q_prefix}wrong options must have 3 items, got {len(wrong)}")
                
                all_opts = [correct] + wrong
                for oi, opt in enumerate(all_opts):
                    opt_str = str(opt).strip()
                    word_count = len(opt_str.split())
                    char_count = len(opt_str)
                    if word_count > 7:
                        errors.append(f"{q_prefix}{lang} option '{opt_str}' has {word_count} words (>7)")
                    if char_count > 50:
                        errors.append(f"{q_prefix}{lang} option '{opt_str}' has {char_count} chars (>50)")
                        
                why = q_obj.get('why', '')
                if not why or len(why.strip()) < 10:
                    errors.append(f"{q_prefix}missing or too short 'why' in {lang}")

        # Check distribution of 'a'
        for ans_idx, count in a_counts.items():
            if count < 2 or count > 6:
                errors.append(f"{prefix}answer index {ans_idx} count {count} is unbalanced (expected 2-6)")
                
    return errors

if __name__ == '__main__':
    all_errors = {}
    files = sys.argv[1:]
    if not files:
        files = sorted(Path('scratch/study-data/shikshapatri').glob('sp*.json'))
    for f in files:
        errs = check_file(f)
        if errs:
            all_errors[str(f)] = errs
            
    if all_errors:
        print("FAILURES FOUND:")
        for f, errs in all_errors.items():
            print(f"\n--- {f} ---")
            for e in errs:
                print(f"  * {e}")
        sys.exit(1)
    else:
        print("ALL CHECKS PASSED!")

