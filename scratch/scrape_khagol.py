import urllib.request
import json
import re

def clean_html(text):
    # Remove HTML tags and comments
    text = re.sub(r'<[^>]+>', '', text)
    # Fix escaped slashes
    text = text.replace('\\/', '/')
    # Decode Unicode escape characters if any
    # Replace multiple spaces/newlines
    text = re.sub(r'\n\s*\n', '\n\n', text)
    return text.strip()

url = "https://www.anirdesh.com/vachanamrut/get_format.php?f_lt=gu&f_rt=en&vachno=263"
print(f"Fetching from {url}...")

req = urllib.request.Request(
    url, 
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
)

try:
    with urllib.request.urlopen(req) as response:
        html_data = response.read().decode('utf-8')
        
    data = json.loads(html_data)
    
    # Parse Gujarati data
    guj_data = json.loads(data['f_lt'])
    # Parse English data
    eng_data = json.loads(data['f_rt'])
    
    # Clean texts
    guj_text = clean_html(guj_data['text'])
    eng_text = clean_html(eng_data['text'])
    
    # Extract settings (the intro in square brackets)
    # The intro is usually enclosed in [ ... ]
    guj_setting = ""
    guj_body = guj_text
    match_guj = re.match(r'^\[(.*?)\]\n*(.*)$', guj_text, re.DOTALL)
    if match_guj:
        guj_setting = match_guj.group(1).strip()
        guj_body = match_guj.group(2).strip()
        
    eng_setting = ""
    eng_body = eng_text
    match_eng = re.match(r'^\[(.*?)\]\n*(.*)$', eng_text, re.DOTALL)
    if match_eng:
        eng_setting = match_eng.group(1).strip()
        eng_body = match_eng.group(2).strip()
        
    # Remove brackets from setting if present
    guj_setting = guj_setting.replace("[", "").replace("]", "").strip()
    eng_setting = eng_setting.replace("[", "").replace("]", "").strip()

    # Create Gujarati Output
    guj_out = {
        "section": {
            "name": "ખગોળ ભૂગોળ",
            "description": "ભગવાન શ્રી સ્વામિનારાયણે ગઢડામાં લખાવેલો ખગોળ અને ભૂગોળ સંબંધી અદ્ભુત પત્ર, જેમાં ભરતખંડમાં મનુષ્ય જન્મની દુર્લભતા અને મોક્ષનું રહસ્ય સમજાવ્યું છે.",
            "language": "gujarati"
        },
        "chapters": [
            {
                "id": 1,
                "vachanamrut": "ખગોળ ભૂગોળ",
                "title": "ભૂગોળ-ખગોળનું વચનામૃત (પત્ર)",
                "setting": guj_setting,
                "text": guj_body,
                "verses": ""
            }
        ]
    }
    
    # Create English Output
    eng_out = {
        "section": {
            "name": "Khagol Bhugol",
            "description": "A unique letter dictated by Bhagwan Swaminarayan regarding geography and astronomy, explaining the rarity of human birth and the secret of liberation.",
            "language": "english"
        },
        "chapters": [
            {
                "id": 1,
                "vachanamrut": "Khagol Bhugol",
                "title": "Discourse on Geography and Astronomy (Letter)",
                "setting": eng_setting,
                "text": eng_body,
                "verses": ""
            }
        ]
    }
    
    # Write files
    import os
    os.makedirs("../assets/data/gujarati", exist_ok=True)
    os.makedirs("../assets/data/english", exist_ok=True)
    
    with open("../assets/data/gujarati/khagol.json", "w", encoding="utf-8") as f:
        json.dump(guj_out, f, ensure_ascii=False, indent=2)
        
    with open("../assets/data/english/khagol.json", "w", encoding="utf-8") as f:
        json.dump(eng_out, f, ensure_ascii=False, indent=2)
        
    print("Successfully wrote khagol.json to both Gujarati and English data folders!")
    
except Exception as e:
    print(f"Error: {e}")
