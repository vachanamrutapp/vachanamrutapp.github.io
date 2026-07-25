#!/usr/bin/env python3
"""
Re-scrape all English Vachanamrut files with fixed spacing
"""

import requests
from bs4 import BeautifulSoup
import json
import time

def scrape_vachanamrut(vach_num):
    """Scrape a single Vachanamrut and return as dict"""
    url = f"https://anirdesh.com/vachanamrut/index.php?format=en&vachno={vach_num}"
    
    print(f"Fetching Vachanamrut {vach_num}...")
    response = requests.get(url, timeout=10)
    response.raise_for_status()
    
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Get all headings with space separator
    headings = []
    for heading in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
        h_text = heading.get_text(separator=' ', strip=True)
        if h_text:
            headings.append(h_text)
    
    # Get all paragraphs with space separator
    paragraphs = []
    for p in soup.find_all('p'):
        p_text = p.get_text(separator=' ', strip=True)
        if p_text:
            paragraphs.append(p_text)
    
    if len(headings) < 6:
        print(f"Warning: Not enough headings found for Vachanamrut {vach_num}")
        return None
        
    if len(paragraphs) < 5:
        print(f"Warning: Not enough paragraphs found for Vachanamrut {vach_num}")
        return None
    
    # Extract based on positions (0-indexed)
    vachanamrut = headings[4] if len(headings) > 4 else ""
    title = headings[5] if len(headings) > 5 else ""
    setting = paragraphs[3] if len(paragraphs) > 3 else ""
    
    # Text starts from paragraph 4, stop at paragraph starting with "Vachanamrut"
    text_paragraphs = []
    for p in paragraphs[4:]:
        if p.startswith("Vachanamrut"):
            break
        text_paragraphs.append(p)
    
    text = "\n\n".join(text_paragraphs)
    
    # Create JSON structure matching Gujarati format
    return {
        "number": vach_num,
        "vachanamrut": vachanamrut,
        "title": title,
        "setting": setting,
        "text": text
    }

def main():
    # Re-scrape ALL 263 Vachanamruts with fixed spacing
    output_dir = "assets/data/english"
    
    print("Re-scraping all 263 Vachanamruts with fixed text spacing...")
    print("This will take approximately 13-15 minutes.\n")
    
    for vach_num in range(1, 264):  # 1 to 263
        try:
            data = scrape_vachanamrut(vach_num)
            if data:
                filename = f"{output_dir}/vachanamrut-{vach_num}.json"
                with open(filename, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=4)
                print(f"✓ Saved: vachanamrut-{vach_num}.json ({vach_num}/263)")
            
            # Add delay to avoid getting blocked
            if vach_num < 263:
                time.sleep(2.5)
                
        except Exception as e:
            print(f"✗ Error scraping Vachanamrut {vach_num}: {e}")
            continue
    
    print(f"\n✓ Completed! Re-scraped all Vachanamruts with fixed spacing.")

if __name__ == "__main__":
    main()
