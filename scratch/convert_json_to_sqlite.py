#!/usr/bin/env python3
import sqlite3
import json
import os

def main():
    db_path = 'assets/data/vachanamrut.db'
    
    # Make sure output directory exists
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    # Remove existing db if any to start fresh
    if os.path.exists(db_path):
        os.remove(db_path)
        print(f"Removed existing {db_path}")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Create scriptures table
    cursor.execute('''
        CREATE TABLE scriptures (
            id INTEGER,
            language TEXT,
            type TEXT,
            number INTEGER,
            vachanamrut TEXT,
            title TEXT,
            setting TEXT,
            text TEXT,
            verses TEXT,
            PRIMARY KEY (id, language)
        )
    ''')
    print("Created table 'scriptures'")

    # 2. Create sections table
    cursor.execute('''
        CREATE TABLE sections (
            id INTEGER PRIMARY KEY,
            name TEXT,
            nameEn TEXT,
            image TEXT,
            description TEXT,
            descriptionEn TEXT,
            vachanamruts TEXT
        )
    ''')
    print("Created table 'sections'")

    # 3. Create videos table
    cursor.execute('''
        CREATE TABLE videos (
            number INTEGER PRIMARY KEY,
            title TEXT,
            url TEXT,
            videoId TEXT
        )
    ''')
    print("Created table 'videos'")

    languages = ['gujarati', 'english']
    
    for lang in languages:
        lang_dir = os.path.join('assets', 'data', lang)
        if not os.path.exists(lang_dir):
            print(f"Warning: Directory {lang_dir} does not exist. Skipping.")
            continue
            
        print(f"Processing scripture data for language: {lang}")
        
        # 1. Load Vachanamrut files (1 to 262)
        vach_count = 0
        for i in range(1, 263):
            file_path = os.path.join(lang_dir, f"vachanamrut-{i}.json")
            if os.path.exists(file_path):
                with open(file_path, 'r', encoding='utf-8') as f:
                    try:
                        data = json.load(f)
                        cursor.execute('''
                            INSERT INTO scriptures (id, language, type, number, vachanamrut, title, setting, text, verses)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            i,
                            lang,
                            'vachanamrut',
                            data.get('number', i),
                            data.get('vachanamrut', ''),
                            data.get('title', ''),
                            data.get('setting', ''),
                            data.get('text', ''),
                            None
                        ))
                        vach_count += 1
                    except Exception as e:
                        print(f"Error parsing {file_path}: {e}")
            else:
                if lang == 'gujarati':
                    print(f"Warning: File {file_path} not found.")
        print(f"  Loaded {vach_count} vachanamruts.")

        # 2. Load Partharo files
        partharo_path = os.path.join(lang_dir, "partharo.json")
        partharo_count = 0
        if os.path.exists(partharo_path):
            with open(partharo_path, 'r', encoding='utf-8') as f:
                try:
                    data = json.load(f)
                    for p in data.get('partharos', []):
                        p_id = int(p.get('id'))
                        mapped_id = 10000 + p_id
                        cursor.execute('''
                            INSERT INTO scriptures (id, language, type, number, vachanamrut, title, setting, text, verses)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            mapped_id,
                            lang,
                            'partharo',
                            p_id,
                            p.get('vachanamrut', ''),
                            p.get('title', ''),
                            p.get('setting', ''),
                            p.get('text', ''),
                            p.get('verses', '')
                        ))
                        partharo_count += 1
                except Exception as e:
                    print(f"Error parsing {partharo_path}: {e}")
        else:
            print(f"Warning: {partharo_path} not found.")
        print(f"  Loaded {partharo_count} partharos.")

        # 3. Load Khagol files
        khagol_path = os.path.join(lang_dir, "khagol.json")
        khagol_count = 0
        if os.path.exists(khagol_path):
            with open(khagol_path, 'r', encoding='utf-8') as f:
                try:
                    data = json.load(f)
                    for c in data.get('chapters', []):
                        c_id = int(c.get('id'))
                        mapped_id = 10005 + c_id
                        cursor.execute('''
                            INSERT INTO scriptures (id, language, type, number, vachanamrut, title, setting, text, verses)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            mapped_id,
                            lang,
                            'khagol',
                            c_id,
                            c.get('vachanamrut', ''),
                            c.get('title', ''),
                            c.get('setting', ''),
                            c.get('text', ''),
                            None
                        ))
                        khagol_count += 1
                except Exception as e:
                    print(f"Error parsing {khagol_path}: {e}")
        else:
            print(f"Warning: {khagol_path} not found.")
        print(f"  Loaded {khagol_count} khagol chapters.")

    # 4. Load chapter mappings (sections)
    mappings_path = 'assets/chapter-mappings.json'
    if os.path.exists(mappings_path):
        print(f"\nProcessing chapter mappings from: {mappings_path}")
        with open(mappings_path, 'r', encoding='utf-8') as f:
            try:
                sections_data = json.load(f)
                for index, item in enumerate(sections_data):
                    sec_id = index + 1
                    cursor.execute('''
                        INSERT INTO sections (id, name, nameEn, image, description, descriptionEn, vachanamruts)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        sec_id,
                        item.get('name', ''),
                        item.get('nameEn', ''),
                        item.get('image', ''),
                        item.get('description', ''),
                        item.get('descriptionEn', ''),
                        json.dumps(item.get('vachanamruts', []))
                    ))
                print(f"  Loaded {len(sections_data)} sections.")
            except Exception as e:
                print(f"Error parsing {mappings_path}: {e}")
    else:
        print(f"Error: {mappings_path} not found.")

    # 5. Load YouTube video mappings
    videos_path = 'assets/youtube_videos.json'
    if os.path.exists(videos_path):
        print(f"\nProcessing video data from: {videos_path}")
        with open(videos_path, 'r', encoding='utf-8') as f:
            try:
                videos_data = json.load(f)
                for item in videos_data:
                    cursor.execute('''
                        INSERT OR REPLACE INTO videos (number, title, url, videoId)
                        VALUES (?, ?, ?, ?)
                    ''', (
                        item.get('number'),
                        item.get('title', ''),
                        item.get('url', ''),
                        item.get('videoId', '')
                    ))
                print(f"  Loaded {len(videos_data)} video entries.")
            except Exception as e:
                print(f"Error parsing {videos_path}: {e}")
    else:
        print(f"Error: {videos_path} not found.")

    conn.commit()
    
    # Query count to verify
    cursor.execute("SELECT language, type, COUNT(*) FROM scriptures GROUP BY language, type")
    rows = cursor.fetchall()
    print("\nDatabase compilation summary (Scriptures):")
    for row in rows:
        print(f"  Language: {row[0]}, Type: {row[1]}, Count: {row[2]}")
        
    cursor.execute("SELECT COUNT(*) FROM sections")
    print(f"Total sections loaded: {cursor.fetchone()[0]}")

    cursor.execute("SELECT COUNT(*) FROM videos")
    print(f"Total videos loaded: {cursor.fetchone()[0]}")

    conn.close()
    print(f"\nSuccessfully compiled all data into {db_path}!")

if __name__ == '__main__':
    main()
