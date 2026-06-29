import json
import os
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom

def generate_sitemap():
    # Paths
    base_dir = "/Users/simkeyur/src/antigravity-apps/vachanamrut-app/vachanamrutapp.github.io"
    mappings_path = os.path.join(base_dir, "assets", "chapter-mappings.json")
    sitemap_path = os.path.join(base_dir, "sitemap.xml")
    
    # Load chapter mappings
    with open(mappings_path, "r", encoding="utf-8") as f:
        sections = json.load(f)
        
    # XML Root
    urlset = Element("urlset")
    urlset.set("xmlns", "http://www.sitemaps.org/schemas/sitemap/0.9")
    urlset.set("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance")
    urlset.set("xsi:schemaLocation", "http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd")
    
    # Base domain
    base_url = "https://vachanamrut.in/"
    
    # 1. Add Home page variations
    home_urls = [
        "",
        "?lang=gujarati",
        "?lang=english"
    ]
    for hu in home_urls:
        url_el = SubElement(urlset, "url")
        loc_el = SubElement(url_el, "loc")
        loc_el.text = f"{base_url}{hu}"
        changefreq_el = SubElement(url_el, "changefreq")
        changefreq_el.text = "monthly"
        priority_el = SubElement(url_el, "priority")
        priority_el.text = "1.0" if hu == "" else "0.8"
        
    # 2. Add each Vachanamrut deep-link
    for section in sections:
        vachanamrut_ids = section.get("vachanamruts", [])
        for vid in vachanamrut_ids:
            for lang in ["gujarati", "english"]:
                url_el = SubElement(urlset, "url")
                loc_el = SubElement(url_el, "loc")
                loc_el.text = f"{base_url}?id={vid}&lang={lang}"
                changefreq_el = SubElement(url_el, "changefreq")
                changefreq_el.text = "monthly"
                priority_el = SubElement(url_el, "priority")
                priority_el.text = "0.7"
                
    # Pretty XML string
    rough_str = tostring(urlset, 'utf-8')
    reparsed = minidom.parseString(rough_str)
    pretty_xml = reparsed.toprettyxml(indent="  ", encoding="utf-8")
    
    # Write file
    with open(sitemap_path, "wb") as f:
        f.write(pretty_xml)
        
    print(f"Successfully generated sitemap.xml with all Vachanamrut deep-links at {sitemap_path}")

if __name__ == "__main__":
    generate_sitemap()
