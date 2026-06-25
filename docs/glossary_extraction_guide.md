# LLM Guide: Vachanamrut Glossary Term Extraction & Definition Writing

This guide provides instructions and a reusable prompt template for using Large Language Models (LLMs) to extract key terms from Vachanamrut chapters and draft detailed, context-rich definitions in both English and Gujarati.

---

## 1. Term Selection Criteria

When analyzing a Vachanamrut chapter, identify terms that fall into the following categories:
*   **Theological & Philosophical Concepts:** Core concepts of the Akshar-Purushottam Darshan and general Hindu philosophy (e.g., *Vrutti*, *Vairāgya*, *Bhakti*, *Nishchay*, *Anvay*, *Vyatirek*).
*   **Proper Nouns / Scriptural Entities:** Sages, celestial beings, historical figures, or places mentioned in Maharaj's examples (e.g., *King Janak*, *Nāradji*, *Tumbaru*, *Golok*).
*   **Analogies & Key Metaphors:** Specific physical objects, substances, or allegories used by Swaminarayan Bhagwan to explain complex spiritual concepts (e.g., *Chintāmani*, *Sākar*, *Ghee*, *Five Bhuts*).
*   **Satsang Terminology:** Terms specific to the practice of Satsang (e.g., *Satsangis*, *Paramhansas*, *Dharmakul*, *Atonement / Prāyashchitta*).

---

## 2. Guidelines for Writing "Context-Rich" Meanings

To ensure the glossary provides high spiritual value, follow these rules when writing definitions:

1.  **Avoid Generic Definitions:** Do not just write a standard dictionary translation. Explain the term's meaning *within the context of that specific chapter*.
2.  **Reference Analogies & Arguments:** Explicitly mention how Bhagwan Swaminarayan utilizes the term or example in the discourse.
3.  **Dual-Language Alignment:** Ensure the English translation matches the tone, details, and meaning of the Gujarati definition. Keep sentence structures corresponding as closely as possible.
4.  **Use Transliteration Diacritics:** Transliterate Gujarati terms into English using proper diacritics (e.g., *Chintāmani*, *Māyā*, *Prārabdha Karma*) to maintain pronunciation accuracy.

---

## 3. Copy-Pasteable LLM Prompt Template

Provide the following prompt to the LLM, along with the text of the Vachanamrut chapter (both English and Gujarati versions if possible).

```text
You are an expert scholar of the Swaminarayan Sampraday and the Vachanamrut scripture. Your task is to extract key glossary terms from a given Vachanamrut chapter and write detailed, chapter-specific definitions for them in both English and Gujarati.

Please read the provided Vachanamrut text (and its corresponding Gujarati version if available) and identify the most significant spiritual concepts, analogies, scriptural references, and technical terms.

For each term, generate:
1. English Word (transliterated with correct diacritics, e.g., "Vrutti", "Vairāgya", "Māyā")
2. Gujarati Word (in Gujarati script, e.g., "વૃત્તિ", "વૈરાગ્ય", "માયા")
3. English Meaning: A context-rich definition explaining how Swaminarayan Bhagwan uses this word in this specific chapter (including references to analogies or arguments he makes).
4. Gujarati Meaning: An aligned, context-rich definition in Gujarati.

Format your output as a Python list of tuples, matching the exact format below:
(vachanamrut_number, "Word_EN", "Word_GU", "Meaning_EN", "Meaning_GU")

Rules for Writing Definitions:
- Do NOT provide a generic dictionary definition.
- Connect the term to the specific arguments, analogies, or examples Maharaj uses in this Vachanamrut.
- Make the definitions highly detailed and informative.
- Keep the English and Gujarati meanings strictly aligned in substance and scope.

---
[INSERT VACHANAMRUT CHAPTER TEXT HERE]
---
```

---

## 4. Few-Shot Examples

Here are examples of how the output should look for Gadhada I-1 and Gadhada I-2:

### Example 1: Gadhada I-1 (Focus on Vrutti & Māyā)
*   **Vrutti (વૃત્તિ):**
    *   *English:* The focus of the mind. In Gadhada I-1, Maharaj explains that if the vrutti is constantly focused on God, the mind becomes like a wish-yielding gem (chintāmani), allowing the devotee to instantly see spiritual realities.
    *   *Gujarati:* મનનો પ્રવાહ અથવા એકાગ્રતા. ગઢડા પ્રથમ ૧ માં મહારાજ સમજાવે છે કે જેની વૃત્તિ ભગવાનમાં અખંડ રહે છે, તેનું મન ચિંતામણિ જેવું થાય છે, જેથી તે જીવ, ઈશ્વર, માયા અને બ્રહ્મના રૂપો અને ધામોને તત્કાળ જોઈ શકે છે.
*   **Māyā (માયા):**
    *   *English:* God's illusory power. Practically defined by Maharaj in Gadhada I-1 as: 'anything that obstructs a devotee of God while meditating on God’s form.'
    *   *Gujarati:* ભગવાનની મોહ પમાડનારી શક્તિ. ગઢડા પ્રથમ ૧ માં શ્રીજીમહારાજ આ વ્યાખ્યા આપે છે: 'ભગવાનના ભક્તને ભગવાનની મૂર્તિનું ચિંતન કરતાં જે આડું આવીને નડે તેને માયા કહેવાય.'

### Example 2: Gadhada I-2 (Focus on Vairāgya & Prārabdha)
*   **Vairāgya (વૈરાગ્ય):**
    *   *English:* Detachment from worldly pleasures. Maharaj outlines three levels: Lowest (lured by appealing objects), Intermediate (unaffected unless in adverse circumstances), and Highest (like King Janak, engaging in worldly duties as destiny commands but remaining completely indifferent and treating sensory objects as enemies).
    *   *Gujarati:* જગત અને પંચવિષય પ્રત્યેની અનાસક્તિ. મહારાજ ત્રણ પ્રકાર વર્ણવે છે: કનિષ્ઠ, મધ્યમ, અને ઉત્તમ (જેમાં જનક રાજાની જેમ પ્રારબ્ધવશ વિષયો ભોગવે છતાં વિષયો પ્રત્યે દુશ્મનની જેમ ઉદાસીન રહે).
*   **Prārabdha Karma (પ્રારબ્ધ કર્મ):**
    *   *English:* Past actions that have matured and determine the circumstances of one's current life. Maharaj explains that even a devotee of the highest vairāgya may engage in worldly activities solely due to prārabdha, remaining detached internally.
    *   *Gujarati:* પૂર્વજન્મના પાકેલા કર્મો જે વર્તમાન ભોગવે છે. મહારાજ સમજાવે છે કે ઉત્તમ વૈરાગ્યવાળો પુરુષ પણ પ્રારબ્ધ કર્મને કારણે સંસારના કાર્યો કરતો દેખાય, પણ તે આંતરિક રીતે અલિપ્ત રહે છે.
