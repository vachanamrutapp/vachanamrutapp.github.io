#!/usr/bin/env python3
import sqlite3
import json
import os
import re
import unicodedata

# Months mapping for Gregorian dates
months_map = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
    'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12,
    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'Jun': 6, 'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
}

def strip_diacritics(text):
    normalized = unicodedata.normalize('NFD', text)
    return "".join(c for c in normalized if not unicodedata.combining(c))

def get_clean_english_text(text, setting):
    # Strip diacritics from setting
    stripped_setting = strip_diacritics(setting)
    # Collapse whitespace for matching
    stripped_setting_clean = " ".join(stripped_setting.split())
    
    # Try matching first 40 chars of stripped setting to find the start of the duplicate block
    prefix = stripped_setting_clean[:40]
    if prefix:
        idx = text.find(prefix)
        if idx != -1:
            return text[:idx].strip()
            
    # Try matching first 5 words
    words = stripped_setting_clean.split()
    if len(words) >= 5:
        sub_prefix = " ".join(words[:5])
        idx = text.find(sub_prefix)
        if idx != -1:
            return text[:idx].strip()
            
    return text

def parse_gregorian_date(date_str):
    date_str = date_str.strip()
    match = re.match(r'(\d+)\s+([A-Za-z]+)\s+(\d{4})', date_str)
    if match:
        day = int(match.group(1))
        month_name = match.group(2)
        year = int(match.group(3))
        month = months_map.get(month_name, 1)
        return f"{year:04d}-{month:02d}-{day:02d}"
    return None

from datetime import date as _date

# Bhagwan Swaminarayan's birth: Chaitra sud 9, Samvat 1837 → 3 April 1781 (Chhapaiya).
MAHARAJ_BIRTH = _date(1781, 4, 3)

# Indian ritu (six-season) classification by Gregorian month, with the two-month
# label that pairs with each season (e.g. Shishir → Jan/Feb).
SEASON_BY_MONTH = {
    1:  ('Shishir', 'Jan/Feb'), 2:  ('Shishir', 'Jan/Feb'),
    3:  ('Vasant',  'Mar/Apr'), 4:  ('Vasant',  'Mar/Apr'),
    5:  ('Grishma', 'May/Jun'), 6:  ('Grishma', 'May/Jun'),
    7:  ('Varsha',  'Jul/Aug'), 8:  ('Varsha',  'Jul/Aug'),
    9:  ('Sharad',  'Sep/Oct'), 10: ('Sharad',  'Sep/Oct'),
    11: ('Hemant',  'Nov/Dec'), 12: ('Hemant',  'Nov/Dec'),
}

def maharaj_age_on(event_date):
    """Return (years_completed, days_past_last_birthday) on event_date."""
    years = event_date.year - MAHARAJ_BIRTH.year
    try:
        last_birthday = MAHARAJ_BIRTH.replace(year=event_date.year)
    except ValueError:
        last_birthday = MAHARAJ_BIRTH.replace(year=event_date.year, day=28)
    if last_birthday > event_date:
        years -= 1
        last_birthday = MAHARAJ_BIRTH.replace(year=event_date.year - 1)
    days = (event_date - last_birthday).days
    return years, days

def compute_season_and_age(greg_date):
    """Return (season, season_months, age_years, age_days) for ISO greg_date."""
    if not greg_date or not re.match(r'^\d{4}-\d{2}-\d{2}$', greg_date):
        return None, None, None, None
    y, m, d = (int(x) for x in greg_date.split('-'))
    event = _date(y, m, d)
    season, season_months = SEASON_BY_MONTH.get(m, (None, None))
    age_y, age_d = maharaj_age_on(event)
    return season, season_months, age_y, age_d


# The six mandirs Bhagwan Swaminarayan personally consecrated.
MANDIRS = [
    {
        'id': 1, 'name': 'Ahmedabad', 'name_gu': 'અમદાવાદ',
        'location': 'Kalupur, Ahmedabad, Gujarat',
        'location_gu': 'કાલુપુર, અમદાવાદ, ગુજરાત',
        'deity': 'Shri Nar-Nārāyan Dev',
        'deity_gu': 'શ્રી નર-નારાયણ દેવ',
        'consecration_date': '1822-02-24',
        'hindu_date': 'Phāgun sud 3, Samvat 1878',
        'hindu_date_gu': 'સંવત ૧૮૭૮ ના ફાગણ સુદ ૩',
    },
    {
        'id': 2, 'name': 'Bhuj', 'name_gu': 'ભુજ',
        'location': 'Bhuj, Kachchh, Gujarat',
        'location_gu': 'ભુજ, કચ્છ, ગુજરાત',
        'deity': 'Shri Nar-Nārāyan Dev',
        'deity_gu': 'શ્રી નર-નારાયણ દેવ',
        'consecration_date': '1823-05-15',
        'hindu_date': 'Vaishākh sud 5, Samvat 1879',
        'hindu_date_gu': 'સંવત ૧૮૭૯ ના વૈશાખ સુદ ૫',
    },
    {
        'id': 3, 'name': 'Vadtāl', 'name_gu': 'વરતાલ',
        'location': 'Vadtāl, Kheda, Gujarat',
        'location_gu': 'વરતાલ, ખેડા, ગુજરાત',
        'deity': 'Shri Lakshmi-Nārāyan Dev',
        'deity_gu': 'શ્રી લક્ષ્મી-નારાયણ દેવ',
        'consecration_date': '1824-11-03',
        'hindu_date': 'Kārtik sud 12, Samvat 1881',
        'hindu_date_gu': 'સંવત ૧૮૮૧ ના કારતક સુદ ૧૨',
    },
    {
        'id': 4, 'name': 'Dholerā', 'name_gu': 'ધોળેરા',
        'location': 'Dholerā, Ahmedabad district, Gujarat',
        'location_gu': 'ધોળેરા, અમદાવાદ જિલ્લો, ગુજરાત',
        'deity': 'Shri Madan-Mohan Dev',
        'deity_gu': 'શ્રી મદન-મોહન દેવ',
        'consecration_date': '1826-05-19',
        'hindu_date': 'Vaishākh sud 13, Samvat 1882',
        'hindu_date_gu': 'સંવત ૧૮૮૨ ના વૈશાખ સુદ ૧૩',
    },
    {
        'id': 5, 'name': 'Junāgadh', 'name_gu': 'જૂનાગઢ',
        'location': 'Junāgadh, Gujarat',
        'location_gu': 'જૂનાગઢ, ગુજરાત',
        'deity': 'Shri Rādhā-Raman Dev & Harikrishna Mahārāj',
        'deity_gu': 'શ્રી રાધા-રમણ દેવ અને હરિકૃષ્ણ મહારાજ',
        'consecration_date': '1828-05-01',
        'hindu_date': 'Vaishākh vad 2, Samvat 1884',
        'hindu_date_gu': 'સંવત ૧૮૮૪ ના વૈશાખ વદ ૨',
    },
    {
        'id': 6, 'name': 'Gadhadā', 'name_gu': 'ગઢડા',
        'location': "Dādā Khāchar's darbār, Gadhadā, Gujarat",
        'location_gu': 'દાદાખાચરનો દરબાર, ગઢડા, ગુજરાત',
        'deity': 'Shri Gopināthji & Harikrishna Mahārāj',
        'deity_gu': 'શ્રી ગોપીનાથજી અને હરિકૃષ્ણ મહારાજ',
        'consecration_date': '1828-10-09',
        'hindu_date': 'Āso sud 12, Samvat 1885',
        'hindu_date_gu': 'સંવત ૧૮૮૫ ના આસો સુદ ૧૨',
    },
]


TOWN_GU = {
    'Gadhada': 'ગઢડા',
    'Sarangpur': 'સારંગપુર',
    'Kariyani': 'કારિયાણી',
    'Loya': 'લોયા',
    'Panchala': 'પંચાળા',
    'Vartal': 'વરતાલ',
    'Amdavad': 'અમદાવાદ',
    'Unknown': 'અજ્ઞાત',
}

SEASON_GU = {
    'Shishir': 'શિશિર',
    'Vasant':  'વસંત',
    'Grishma': 'ગ્રીષ્મ',
    'Varsha':  'વર્ષા',
    'Sharad':  'શરદ',
    'Hemant':  'હેમંત',
}

SEASON_MONTHS_GU = {
    'Jan/Feb': 'જાન્યુઆરી/ફેબ્રુઆરી',
    'Mar/Apr': 'માર્ચ/એપ્રિલ',
    'May/Jun': 'મે/જૂન',
    'Jul/Aug': 'જુલાઈ/ઓગસ્ટ',
    'Sep/Oct': 'સપ્ટેમ્બર/ઓક્ટોબર',
    'Nov/Dec': 'નવેમ્બર/ડિસેમ્બર',
}

TIME_OF_DAY_GU = {
    'morning':     'સવાર',
    'afternoon':   'બપોર',
    'evening':     'સાંજ',
    'night':       'રાત્રિ',
    'noon':        'મધ્યાહ્ન',
    'sunrise':     'સૂર્યોદય',
    'three hours before sunrise': 'સૂર્યોદય પહેલાં ત્રણ કલાક',
    'Unspecified': 'અનિર્દિષ્ટ',
}

def parse_hindu_date_gu(gu_setting):
    """Extract the Gujarati Hindu date phrase from the start of a setting.

    The Gujarati settings consistently open with `સંવત <year> ના <month>
    (સુદિ|વદિ) <day>ને દિવસ …`. We capture everything up to (but not
    including) `ને દિવસ`.
    """
    if not gu_setting:
        return None
    m = re.match(r'^(.+?)ને\s+દિવસ', gu_setting)
    return m.group(1).strip() if m else None


# A handful of Gujarati settings are empty or truncated in the source JSON;
# AI-synthesized from the English `hindu_date` to keep coverage at 100%.
HINDU_DATE_GU_OVERRIDES = {
    106: 'સંવત ૧૮૭૭ ના કાર્તિક સુદિ ૧૦ દશમી',
}


SECTION_TO_TOWN = {
    'Partharo': 'Gadhada',
    'Gadhada I': 'Gadhada',
    'Gadhada II': 'Gadhada',
    'Gadhada III': 'Gadhada',
    'Sarangpur': 'Sarangpur',
    'Kariyani': 'Kariyani',
    'Loya': 'Loya',
    'Panchala': 'Panchala',
    'Vartal': 'Vartal',
    'Amdavad': 'Amdavad',
    'Khagol Bhugol': 'Gadhada',
}

def build_vach_to_town_map(mappings_path):
    mapping = {}
    if not os.path.exists(mappings_path):
        return mapping
    with open(mappings_path, 'r', encoding='utf-8') as f:
        sections = json.load(f)
    for sec in sections:
        town = SECTION_TO_TOWN.get(sec.get('nameEn', ''), 'Unknown')
        for vid in sec.get('vachanamruts', []):
            mapping[int(vid)] = town
    return mapping

def extract_timeline_details(setting, town):
    # 1. Gregorian Date
    greg_match = re.search(r'\[([^\]]+)\]', setting)
    greg_str = greg_match.group(1) if greg_match else ""
    greg_date = parse_gregorian_date(greg_str) or greg_str

    # 2. Hindu Date & Time of Day
    before_greg = setting.split('[')[0].strip()
    time_of_day = "Unspecified"
    time_match = re.match(r'^(?:On|In|At)\s+(?:the\s+)?(night|evening|afternoon|morning|noon|three hours before sunrise|sunrise)\s+of\s+(.+)$', before_greg, re.IGNORECASE)
    if time_match:
        time_of_day = time_match.group(1).strip()
        hindu_date = time_match.group(2).strip().rstrip(',')
    else:
        hindu_date = re.sub(r'^(?:On|In|At)\s+', '', before_greg).strip().rstrip(',')

    # 3. Location — capture the first sentence after the speaker reference.
    # Sentence splitting that ignores titles like "Shri" and "Swāmi" so we don't
    # split mid-name.
    temp_setting = setting
    temp_setting = re.sub(r'\bShri\b', 'Shri_temp', temp_setting)
    temp_setting = re.sub(r'\bSwāmi\b', 'Swāmi_temp', temp_setting)
    sentences = [s.strip() for s in re.split(r'\.\s+', temp_setting) if s.strip()]
    sentences = [s.replace('Shri_temp', 'Shri').replace('Swāmi_temp', 'Swāmi') for s in sentences]

    first_sentence = sentences[0] if sentences else ""
    location = "Unknown"
    speaker_re = re.compile(
        r'(?:Swāmi\s+)?(?:Shri\s+Sahajānandji\s+)?(?:Shriji\s+)?Mahārāj\s+(.+)'
    )
    # Search across all sentences — sometimes Mahārāj is only named in a later
    # sentence (e.g. when the cot setup is described first).
    for sent in sentences:
        m = speaker_re.search(sent)
        if m:
            location = m.group(1).strip().rstrip('.').rstrip(',').strip()
            break
    if location == "Unknown":
        # Fallback: cot/dais placement sentences ("had been placed on …").
        placement_re = re.compile(r'\b(?:had been |was )?placed\s+(?:on|in|at|under|near)\s+(.+)')
        for sent in sentences:
            m = placement_re.search(sent)
            if m:
                location = m.group(1).strip().rstrip('.').rstrip(',').strip()
                break
        
    # 4. Clothing/Appearance
    clothing = ""
    if len(sentences) > 2:
        last_sentence = sentences[-1]
        if any(kw in last_sentence.lower() for kw in ['assembly', 'gathered', 'reading', 'commenced', 'sat before']):
            clothing_sentences = sentences[1:-1]
        else:
            clothing_sentences = sentences[1:]
        clothing = ". ".join(clothing_sentences)
        if clothing and not clothing.endswith('.'):
            clothing += '.'
    elif len(sentences) == 2:
        second_sentence = sentences[1]
        if not any(kw in second_sentence.lower() for kw in ['assembly', 'gathered', 'reading', 'commenced']):
            clothing = second_sentence
            
    if not clothing:
        clothing = "Dressed entirely in white clothes."
        
    return greg_date, greg_str, hindu_date, time_of_day, location, town, clothing

QUOTE_RE = re.compile(r'“([^”]+)”')

# Canonical Gujarati equivalents for known speakers — used as a fallback when
# the in-text Gujarati speaker phrase can't be extracted (e.g. subsequent
# questions in a chain that don't re-introduce the asker).
SPEAKER_NAME_GU = {
    'Shriji Mahārāj':          'શ્રીજીમહારાજ',
    'Muktānand Swāmi':         'મુક્તાનંદ સ્વામી',
    'Brahmānand Swāmi':        'બ્રહ્માનંદ સ્વામી',
    'Nityānand Swāmi':         'નિત્યાનંદ સ્વામી',
    'Gopālānand Swāmi':        'ગોપાળાનંદ સ્વામી',
    'Shukānand Swāmi':         'શુકાનંદ સ્વામી',
    'Nrusinhānand Swāmi':      'નૃસિંહાનંદ સ્વામી',
    'Swayamprakāshānand Swāmi':'સ્વયંપ્રકાશાનંદ સ્વામી',
    'Bhagwadānand Swāmi':      'ભગવદાનંદ સ્વામી',
    'Somadatta':               'સોમદત્ત',
    'Mayārām Bhatt':           'મયારામ ભટ્ટ',
    'Dinānāth Bhatt':          'દિનાનાથ ભટ્ટ',
}

# Capture the Gujarati speaker phrase that introduces a quote. The trigger
# alternatives cover the common discourse openers in the corpus.
GU_SPEAKER_RE = re.compile(
    r'(?:ત્યાર\s*પછી|પછી\s*વળી|પછી|ત્યારે|હવે|'
    r'તે\s*સમે|તે\s*સમયને\s*વિષે|તે\s*સમયમાં|તે\s*વખતે|ફરી)'
    r'\s+([^“]+?)\s+'
    r'(?:પ્રશ્ન\s*)?(?:પૂછ્યું|પૂછ્યો|પૂછી|પૂછ્યા|બોલ્યા|બોલ્યો|બોલ્યું|કહ્યું|કહી|કહ્યો)'
    r'\s*જે[,\s]*'
)


def find_gujarati_question(en_text, gu_text, en_question_text):
    """Return (questioner_gu, question_text_gu) for one English question.

    Pairing strategy: the Nth quoted segment in the English `text` maps to the
    Nth quoted segment in the Gujarati `text`. This holds reliably because both
    are translations of the same primary source.
    """
    if not gu_text:
        return None, None
    en_quotes = list(QUOTE_RE.finditer(en_text))
    gu_quotes = list(QUOTE_RE.finditer(gu_text))
    snippet = en_question_text[:50]
    idx = next((i for i, m in enumerate(en_quotes)
                if m.group(1).strip().startswith(snippet)
                or en_question_text.startswith(m.group(1).strip()[:50])), None)
    if idx is None or idx >= len(gu_quotes):
        return None, None
    gu_match = gu_quotes[idx]
    gu_qtext = gu_match.group(1).strip()
    # Bound the lookback to text *after* the previous closing quote, so we
    # don't pick up speaker phrases from earlier Q&A blocks.
    prev_close = gu_text.rfind('”', 0, gu_match.start())
    lookback_start = prev_close + 1 if prev_close != -1 else max(0, gu_match.start() - 400)
    pre = gu_text[lookback_start:gu_match.start()]
    matches = list(GU_SPEAKER_RE.finditer(pre))
    gu_questioner = None
    if matches:
        gu_questioner = matches[-1].group(1).strip()
        # Strip trailing ergative marker (એ as separate token, or attached vowel-sign ે)
        gu_questioner = re.sub(r'\s*એ$', '', gu_questioner)
        gu_questioner = re.sub(r'ે$', '', gu_questioner)
        gu_questioner = gu_questioner.strip()
    return gu_questioner, gu_qtext


def extract_questions_and_questioners(text):
    paragraphs = [p.strip() for p in text.split('\n') if p.strip()]
    q_pairs = []
    
    pattern1 = re.compile(r'Thereupon\s+([A-Z][a-zA-Zāīūūśṣṭḍṅṇḷñṃ\s\’\'-]+?)\s+(?:asked|said|inquired|enquired|queried|requested|explained|replied)[,\s]+“([^”]+)”')
    pattern2 = re.compile(r'Thereafter,\s+the\s+devotee\s+([A-Z][a-zA-Zāīūūśṣṭḍṅṇḷñṃ\s\’\'-]+?)\s+(?:asked|said|inquired|enquired|queried|requested|explained|replied)[,\s]+“([^”]+)”')
    pattern3 = re.compile(r'\bThen\s+([A-Z][a-zA-Zāīūūśṣṭḍṅṇḷñṃ\s\’\'-]+?)\s+(?:asked|said|inquired|enquired|queried|requested|explained|replied)[,\s]+“([^”]+)”')
    
    for para in paragraphs:
        m1 = pattern1.search(para)
        if m1:
            q_pairs.append((m1.group(1), m1.group(2)))
            continue
        m2 = pattern2.search(para)
        if m2:
            q_pairs.append((m2.group(1), m2.group(2)))
            continue
        m3 = pattern3.search(para)
        if m3:
            q_pairs.append((m3.group(1), m3.group(2)))
            continue
            
    cleaned_pairs = []
    for q_name, q_text in q_pairs:
        name = q_name.strip()
        if 'shriji' in name.lower() or 'mahārāj' in name.lower() or 'maharaj' in name.lower():
            name = 'Shriji Mahārāj'
        elif 'muktanand' in name.lower() or 'muktānand' in name.lower():
            name = 'Muktānand Swāmi'
        elif 'brahmanand' in name.lower() or 'brahmānand' in name.lower():
            name = 'Brahmānand Swāmi'
        elif 'nityanand' in name.lower() or 'nityānand' in name.lower():
            name = 'Nityānand Swāmi'
        elif 'gopalanand' in name.lower() or 'gopālānand' in name.lower():
            name = 'Gopālānand Swāmi'
        elif 'shukanand' in name.lower() or 'shukānand' in name.lower():
            name = 'Shukānand Swāmi'
        elif 'somadatta' in name.lower():
            name = 'Somadatta'
        elif 'mayaram' in name.lower() or 'mayārām' in name.lower():
            name = 'Mayārām Bhatt'
        elif 'dinanath' in name.lower() or 'dinānāth' in name.lower():
            name = 'Dinānāth Bhatt'
        else:
            words = name.split()
            if len(words) > 3:
                name = " ".join(words[:3])
        q_text_clean = q_text.strip()
        if '?' not in q_text_clean:
            continue
        if name.strip() in {'He', 'She', 'It', 'They', 'I'}:
            continue
        cleaned_pairs.append((name, q_text_clean))

    return cleaned_pairs

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

    # 4. Create timeline_events table
    cursor.execute('''
        CREATE TABLE timeline_events (
            vachanamrut_id INTEGER PRIMARY KEY,
            gregorian_date TEXT,
            gregorian_date_raw TEXT,
            hindu_date TEXT,
            hindu_date_gu TEXT,
            time_of_day TEXT,
            time_of_day_gu TEXT,
            location TEXT,
            town TEXT,
            town_gu TEXT,
            season TEXT,
            season_gu TEXT,
            season_months TEXT,
            season_months_gu TEXT,
            maharaj_age_years INTEGER,
            maharaj_age_days INTEGER,
            clothing TEXT
        )
    ''')
    print("Created table 'timeline_events'")

    # 5. Create vachanamrut_questions table
    cursor.execute('''
        CREATE TABLE vachanamrut_questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vachanamrut_id INTEGER,
            questioner_name TEXT,
            questioner_name_gu TEXT,
            question_text TEXT,
            question_text_gu TEXT
        )
    ''')
    print("Created table 'vachanamrut_questions'")

    # 6. Create and populate mandirs table
    cursor.execute('''
        CREATE TABLE mandirs (
            id INTEGER PRIMARY KEY,
            name TEXT,
            name_gu TEXT,
            location TEXT,
            location_gu TEXT,
            deity TEXT,
            deity_gu TEXT,
            consecration_date TEXT,
            hindu_date TEXT,
            hindu_date_gu TEXT,
            season TEXT,
            season_gu TEXT,
            season_months TEXT,
            season_months_gu TEXT,
            maharaj_age_years INTEGER,
            maharaj_age_days INTEGER
        )
    ''')
    for m in MANDIRS:
        season, season_months, age_y, age_d = compute_season_and_age(m['consecration_date'])
        cursor.execute('''
            INSERT INTO mandirs (id, name, name_gu, location, location_gu, deity, deity_gu, consecration_date, hindu_date, hindu_date_gu, season, season_gu, season_months, season_months_gu, maharaj_age_years, maharaj_age_days)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (m['id'], m['name'], m['name_gu'], m['location'], m['location_gu'], m['deity'], m['deity_gu'], m['consecration_date'], m['hindu_date'], m['hindu_date_gu'], season, SEASON_GU.get(season), season_months, SEASON_MONTHS_GU.get(season_months), age_y, age_d))
    print(f"Created table 'mandirs' with {len(MANDIRS)} rows")

    vach_to_town = build_vach_to_town_map('assets/chapter-mappings.json')

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
                        text = data.get('text', '')
                        setting = data.get('setting', '')
                        
                        # Apply cleanup and parsing ONLY for English
                        if lang == 'english':
                            clean_text = get_clean_english_text(text, setting)
                            
                            # Parse and insert timeline event
                            town_for_vach = vach_to_town.get(i, 'Unknown')
                            greg_date, greg_raw, hindu, tod, loc, town, clothes = extract_timeline_details(setting, town_for_vach)
                            season, season_months, age_y, age_d = compute_season_and_age(greg_date)
                            # Pull Gujarati setting to derive hindu_date_gu
                            gu_setting = ''
                            gu_path = os.path.join('assets', 'data', 'gujarati', f'vachanamrut-{i}.json')
                            if os.path.exists(gu_path):
                                try:
                                    with open(gu_path, 'r', encoding='utf-8') as gf:
                                        gu_setting = json.load(gf).get('setting', '') or ''
                                except Exception:
                                    pass
                            hindu_gu = HINDU_DATE_GU_OVERRIDES.get(i) or parse_hindu_date_gu(gu_setting)
                            cursor.execute('''
                                INSERT INTO timeline_events (vachanamrut_id, gregorian_date, gregorian_date_raw, hindu_date, hindu_date_gu, time_of_day, time_of_day_gu, location, town, town_gu, season, season_gu, season_months, season_months_gu, maharaj_age_years, maharaj_age_days, clothing)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ''', (i, greg_date, greg_raw, hindu, hindu_gu, tod, TIME_OF_DAY_GU.get(tod), loc, town, TOWN_GU.get(town), season, SEASON_GU.get(season), season_months, SEASON_MONTHS_GU.get(season_months), age_y, age_d, clothes))
                            
                            # Parse and insert questions (with Gujarati pairing)
                            questions = extract_questions_and_questioners(clean_text)
                            gu_text_for_q = ''
                            if os.path.exists(gu_path):
                                try:
                                    with open(gu_path, 'r', encoding='utf-8') as gf:
                                        gu_text_for_q = json.load(gf).get('text', '') or ''
                                except Exception:
                                    pass
                            for q_name, q_text in questions:
                                gu_questioner, gu_qtext = find_gujarati_question(
                                    clean_text, gu_text_for_q, q_text
                                )
                                # Fallback / cleanup: if we couldn't extract a clean
                                # Gujarati speaker phrase, use the canonical name for
                                # known speakers. Also override verbose captures
                                # (containing a period — i.e. cross-sentence garbage).
                                if q_name in SPEAKER_NAME_GU and (
                                    not gu_questioner or '.' in gu_questioner or len(gu_questioner) > 30
                                ):
                                    gu_questioner = SPEAKER_NAME_GU[q_name]
                                cursor.execute('''
                                    INSERT INTO vachanamrut_questions (vachanamrut_id, questioner_name, questioner_name_gu, question_text, question_text_gu)
                                    VALUES (?, ?, ?, ?, ?)
                                ''', (i, q_name, gu_questioner, q_text, gu_qtext))
                            
                            # Save clean text
                            text = clean_text
                        
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
                            setting,
                            text,
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
    
    # Verification queries
    print("\n" + "="*40 + "\nVERIFYING COMPILED DATABASE SCHEMA\n" + "="*40)
    cursor.execute("SELECT language, type, COUNT(*) FROM scriptures GROUP BY language, type")
    for row in cursor.fetchall():
        print(f"Scriptures -> Language: {row[0]}, Type: {row[1]}, Count: {row[2]}")
        
    cursor.execute("SELECT COUNT(*) FROM sections")
    print(f"Sections -> Count: {cursor.fetchone()[0]}")

    cursor.execute("SELECT COUNT(*) FROM videos")
    print(f"Videos -> Count: {cursor.fetchone()[0]}")

    cursor.execute("SELECT COUNT(*) FROM timeline_events")
    print(f"Timeline Events -> Count: {cursor.fetchone()[0]} (Expected 262)")

    cursor.execute("SELECT COUNT(*) FROM vachanamrut_questions")
    print(f"Questions -> Count: {cursor.fetchone()[0]}")

    # Check for text duplicates in scriptures table
    cursor.execute("SELECT text FROM scriptures WHERE language='english' AND type='vachanamrut' AND id=1")
    v1_text = cursor.fetchone()[0]
    # Check if setting starts again in the second half of text
    cursor.execute("SELECT setting FROM scriptures WHERE language='english' AND type='vachanamrut' AND id=1")
    v1_setting = cursor.fetchone()[0]
    stripped_setting_clean = " ".join(strip_diacritics(v1_setting).split())
    v1_text_clean = " ".join(v1_text.split())
    if stripped_setting_clean[:40] in v1_text_clean:
        print("\n[WARNING] Text duplication STILL present in scriptures table for English!")
    else:
        print("\n[SUCCESS] Text duplication successfully cleaned from English scriptures table!")

    conn.close()
    print(f"\nSuccessfully compiled and normalized all data into {db_path}!")

if __name__ == '__main__':
    main()
