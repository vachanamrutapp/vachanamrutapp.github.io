# Vachanamrut location images: AI remake guide

Goal: replace the nine location images (one per prakaran) with one consistent painted set made in ChatGPT, so the app looks like a single illustrated book. Today they are a mix of photos, low-resolution scans and paintings in different styles.

Scope: only the images in `www/images/vachanamrut-locations/`. The Partharo images, the facts-sheet images (mandirs, authors, seasons) and the app backgrounds are not covered here.

## 1. Where these images are used

- Each image is the header picture of its prakaran (section) page, shown full width and **cropped to at most 250 px high** (`.section-image`, `object-fit: cover`), so a wide landscape 3:2 image works best. The top and bottom edges get cut; keep the main subject in the middle 70%.
- The mapping lives in two places: `www/assets/chapter-mappings.json` and the `sections.image` column of `www/assets/data/vachanamrut.db`. `www/sw.js` also pre-caches the files by name.
- There is no separate image per individual Vachanamrut (1–262): all 262 discourses use their prakaran's image.

## 2. What we have now

| # | Prakaran | Discourses | File | What it is now | Problem |
|---|---|---|---|---|---|
| 1 | Gadhada I (ગઢડા પ્રથમ) | 78 discourses (1–78) | `gadhada-1.webp` | 1600×1067 photo of the neem tree and courtyard (509 KB) | Photo, not a painting |
| 2 | Sarangpur (સારંગપુર) | 18 discourses (79–96) | `sarangpur.webp` | 1600×1174 painting, Maharaj on a yellow chair with sadhus writing (301 KB) | Closest to the target style |
| 3 | Kariyani (કારિયાણી) | 12 discourses (97–108) | `kariyani.webp` | 1600×1067 photo of a rustic tiled verandah (276 KB) | Photo, no people |
| 4 | Loya (લોયા) | 18 discourses (109–126) | `loya.webp` | 1600×1163 photo of a darbar house with a decorative border (191 KB) | Photo with a decorative border, no people |
| 5 | Panchala (પંચાળા) | 7 discourses (127–133) | `panchala.jpg` | 680×510 photo of a modern mandir (116 KB, low resolution) | Low-res photo of a modern mandir |
| 6 | Gadhada II (ગઢડા મધ્ય) | 67 discourses (134–200) | `gadhada-2.jpg` | 450×437 painting (64 KB, low resolution and almost square) | Very low resolution, almost square |
| 7 | Vartal (વરતાલ) | 20 discourses (201–220) | `vadtal.jpg` | 900×900 photo of the golden-domed mandir from above (195 KB) | Photo, square crop |
| 8 | Amdavad (અમદાવાદ) | 3 discourses (221–223) | `ahmedabad.jpg` | 500×326 painting (64 KB, low resolution) | Low resolution |
| 9 | Gadhada III (ગઢડા અંત્ય) | 39 discourses (224–262) | `gadhada-3.webp` | 1600×1342 painting, Maharaj in white with scribes (338 KB, not 3:2) | Not 3:2, differs from the other Gadhada images |

## 3. How to get a consistent set in ChatGPT

1. Open **one new chat** just for this series. Use ChatGPT's image generation (a GPT-4o / GPT-5 class model with images on).
2. **Upload `www/images/setup-art.webp`** (the painting behind the setup screen) and say: *"Use this painting as the style reference for every image in this chat. Reply 'ready'."* This is the look the app already has, so the new images will sit well with it.
3. Generate **image 1 (Gadhada I) first** by pasting its prompt. Regenerate until you like the face of Shriji Maharaj, the neem tree and the courtyard. This is the anchor.
4. For every next image, paste its prompt **in the same chat**. If Maharaj's face or clothes drift, add: *"Keep Shriji Maharaj's face, clothing and proportions exactly the same as the Gadhada I image."* Gadhada II and III should also say *"same courtyard and tree as Gadhada I"* (already in their prompts).
5. If an image comes out wrong, ask for one change at a time (*"remove the text"*, *"make the light warmer"*, *"fewer people"*) rather than rewriting the prompt.
6. Save each result as PNG, then send them to me. I will resize, convert to WebP (about 1600 px wide, under ~250 KB) and wire them into the app.

Each prompt below is **self-contained** (style, characters and technical rules are repeated), so it also works if you paste it into a fresh chat. Where details are uncertain (exact architecture of a darbar), they are kept generic on purpose; correct them against your own reference photos if you want them more exact.

### Style summary (for your reference)

> A richly detailed traditional Indian devotional painting in the Swaminarayan tradition: semi-realistic gouache-and-oil look on canvas, soft visible brushwork, a warm golden-hour glow with a faint luminous haze, and a palette of turmeric-gold, saffron, vermilion red, deep teal and leaf green with cream-white clothing. Faces are calm, graceful and idealised, with large lotus-shaped eyes. Fine decorative detail (flower garlands, patterned turbans, carved wood, brass vessels). Painterly background with soft depth, no hard photographic edges. Not photorealistic, not a 3D render, not anime, not flat vector art.

### Characters (identical in every prompt)

> Shriji Maharaj (Bhagwan Swaminarayan) is a radiant, serene man in his late thirties, clean-shaven, with large lotus eyes, a gentle half-smile, a vertical sandalwood tilak with a round red chandlo, a tulsi mala and fresh white flower garlands around his neck, a white angarkha with a white-and-saffron pagh (turban) wrapped with a flower garland, and a soft golden glow around his head. Paramhansas (sadhus) wear plain saffron robes, a saffron upper cloth, tulsi malas and a tilak-chandlo; some have shaved heads, some a small saffron cloth around the head. Devotees (haribhakto) are Kathiawadi men in white angarkhas or kediyus and dhotis with colourful pagh (red, orange, pink, green) and moustaches; women, if shown, sit together at the side in colourful odhanis with their heads covered. The Khachar darbars (chieftains) wear a rich red or maroon turban and a white jama with folded hands. The year is about 1820 in rural Saurashtra, Gujarat: no modern objects, no electric wires, no plastic.

## 4. The nine prompts

### 1. Gadhada I (ગઢડા પ્રથમ): `gadhada-1.webp`

- **Discourses:** 78 discourses (1–78)
- **Theme:** Delivered at Dada Khachar's Darbar in Gadhada. Self-realization (Atmanishtha), the glory of God, methods to stabilise the mind.
- **Now:** 1600×1067 photo of the neem tree and courtyard (509 KB)
- **Note:** **Make this one first. It is the anchor image of the series** (same courtyard, tree and Maharaj reused for Gadhada II and III).

```text
Create a landscape 3:2 painting for a Vachanamrut reading app: Gadhada I.

STYLE: A richly detailed traditional Indian devotional painting in the Swaminarayan tradition: semi-realistic gouache-and-oil look on canvas, soft visible brushwork, a warm golden-hour glow with a faint luminous haze, and a palette of turmeric-gold, saffron, vermilion red, deep teal and leaf green with cream-white clothing. Faces are calm, graceful and idealised, with large lotus-shaped eyes. Fine decorative detail (flower garlands, patterned turbans, carved wood, brass vessels). Painterly background with soft depth, no hard photographic edges. Not photorealistic, not a 3D render, not anime, not flat vector art.

CHARACTERS (keep them identical in every image of this series): Shriji Maharaj (Bhagwan Swaminarayan) is a radiant, serene man in his late thirties, clean-shaven, with large lotus eyes, a gentle half-smile, a vertical sandalwood tilak with a round red chandlo, a tulsi mala and fresh white flower garlands around his neck, a white angarkha with a white-and-saffron pagh (turban) wrapped with a flower garland, and a soft golden glow around his head. Paramhansas (sadhus) wear plain saffron robes, a saffron upper cloth, tulsi malas and a tilak-chandlo; some have shaved heads, some a small saffron cloth around the head. Devotees (haribhakto) are Kathiawadi men in white angarkhas or kediyus and dhotis with colourful pagh (red, orange, pink, green) and moustaches; women, if shown, sit together at the side in colourful odhanis with their heads covered. The Khachar darbars (chieftains) wear a rich red or maroon turban and a white jama with folded hands. The year is about 1820 in rural Saurashtra, Gujarat: no modern objects, no electric wires, no plastic.

SCENE: Early morning in the open courtyard (chowk) of Dada Khachar's darbar in Gadhada. A huge ancient neem tree with a raised whitewashed stone platform around its trunk fills the upper half of the frame, its branches filled with sunlit leaves and soft sun-rays falling through. Behind it, a low whitewashed building with a tiled roof, a wooden-pillared verandah and arched doorways. Shriji Maharaj sits on a wooden cot (khat) with a bolster under the tree, one hand raised gently in teaching. A small, attentive group of saffron-robed paramhansas and turbaned devotees sits on the ground facing him, a few with folded hands. A pair of pigeons on the wall, dust motes in the light. Mood: fresh, quiet, golden morning.

TECHNICAL: Landscape 3:2 aspect ratio (1536 x 1024). Keep the main subject (Shriji Maharaj and the central group) inside the middle 70% of the frame, because the app crops the top and bottom edges. No text, no letters, no Devanagari or Gujarati script, no signature, no watermark, no border or frame. Correct hands and faces, one Shriji Maharaj only.
```

### 2. Sarangpur (સારંગપુર): `sarangpur.webp`

- **Discourses:** 18 discourses (79–96)
- **Theme:** Spoken at Jiva Khachar's Darbar. The glory of the Sant, abandoning ego, ways to remove worldly desires.
- **Now:** 1600×1174 painting, Maharaj on a yellow chair with sadhus writing (301 KB)
- **Note:** The current painting is close to the target style: keep the idea of sadhus writing near Maharaj.

```text
Create a landscape 3:2 painting for a Vachanamrut reading app: Sarangpur.

STYLE: A richly detailed traditional Indian devotional painting in the Swaminarayan tradition: semi-realistic gouache-and-oil look on canvas, soft visible brushwork, a warm golden-hour glow with a faint luminous haze, and a palette of turmeric-gold, saffron, vermilion red, deep teal and leaf green with cream-white clothing. Faces are calm, graceful and idealised, with large lotus-shaped eyes. Fine decorative detail (flower garlands, patterned turbans, carved wood, brass vessels). Painterly background with soft depth, no hard photographic edges. Not photorealistic, not a 3D render, not anime, not flat vector art.

CHARACTERS (keep them identical in every image of this series): Shriji Maharaj (Bhagwan Swaminarayan) is a radiant, serene man in his late thirties, clean-shaven, with large lotus eyes, a gentle half-smile, a vertical sandalwood tilak with a round red chandlo, a tulsi mala and fresh white flower garlands around his neck, a white angarkha with a white-and-saffron pagh (turban) wrapped with a flower garland, and a soft golden glow around his head. Paramhansas (sadhus) wear plain saffron robes, a saffron upper cloth, tulsi malas and a tilak-chandlo; some have shaved heads, some a small saffron cloth around the head. Devotees (haribhakto) are Kathiawadi men in white angarkhas or kediyus and dhotis with colourful pagh (red, orange, pink, green) and moustaches; women, if shown, sit together at the side in colourful odhanis with their heads covered. The Khachar darbars (chieftains) wear a rich red or maroon turban and a white jama with folded hands. The year is about 1820 in rural Saurashtra, Gujarat: no modern objects, no electric wires, no plastic.

SCENE: Late afternoon in the shaded courtyard of Jiva Khachar's darbar in Sarangpur. Shriji Maharaj sits on an ornate gilded wooden seat with a golden-yellow cushion, leaning slightly forward as he speaks. Four or five saffron-robed paramhansas sit close around him on a rug, writing the discourse on long manuscript sheets resting on small wooden desks. Jiva Khachar stands a little behind with folded hands. A mango tree casts soft dappled shade on the left; a whitewashed wall with a carved wooden door at the back. Warm amber light, intimate and scholarly mood.

TECHNICAL: Landscape 3:2 aspect ratio (1536 x 1024). Keep the main subject (Shriji Maharaj and the central group) inside the middle 70% of the frame, because the app crops the top and bottom edges. No text, no letters, no Devanagari or Gujarati script, no signature, no watermark, no border or frame. Correct hands and faces, one Shriji Maharaj only.
```

### 3. Kariyani (કારિયાણી): `kariyani.webp`

- **Discourses:** 12 discourses (97–108)
- **Theme:** Delivered at Vasta Khachar's Darbar. Affection for the manifest form of God, distinguishing the soul from the body.
- **Now:** 1600×1067 photo of a rustic tiled verandah (276 KB)
- **Note:** The old image has no people. The new one keeps the rustic verandah but puts Maharaj and devotees in it.

```text
Create a landscape 3:2 painting for a Vachanamrut reading app: Kariyani.

STYLE: A richly detailed traditional Indian devotional painting in the Swaminarayan tradition: semi-realistic gouache-and-oil look on canvas, soft visible brushwork, a warm golden-hour glow with a faint luminous haze, and a palette of turmeric-gold, saffron, vermilion red, deep teal and leaf green with cream-white clothing. Faces are calm, graceful and idealised, with large lotus-shaped eyes. Fine decorative detail (flower garlands, patterned turbans, carved wood, brass vessels). Painterly background with soft depth, no hard photographic edges. Not photorealistic, not a 3D render, not anime, not flat vector art.

CHARACTERS (keep them identical in every image of this series): Shriji Maharaj (Bhagwan Swaminarayan) is a radiant, serene man in his late thirties, clean-shaven, with large lotus eyes, a gentle half-smile, a vertical sandalwood tilak with a round red chandlo, a tulsi mala and fresh white flower garlands around his neck, a white angarkha with a white-and-saffron pagh (turban) wrapped with a flower garland, and a soft golden glow around his head. Paramhansas (sadhus) wear plain saffron robes, a saffron upper cloth, tulsi malas and a tilak-chandlo; some have shaved heads, some a small saffron cloth around the head. Devotees (haribhakto) are Kathiawadi men in white angarkhas or kediyus and dhotis with colourful pagh (red, orange, pink, green) and moustaches; women, if shown, sit together at the side in colourful odhanis with their heads covered. The Khachar darbars (chieftains) wear a rich red or maroon turban and a white jama with folded hands. The year is about 1820 in rural Saurashtra, Gujarat: no modern objects, no electric wires, no plastic.

SCENE: Warm afternoon outside a long, low, rustic village house with an old wooden-beamed tiled roof and a raised stone plinth verandah (otla) with a red-painted wooden railing and a few broad stone steps. Shriji Maharaj sits on a simple cot at the edge of the verandah, with devotees seated on the steps and the packed-earth courtyard below him, looking up at him with love. Vasta Khachar sits closest with folded hands. A bullock and a couple of cows rest under a tree at the side, marigold garlands hang from a rope across the verandah. Soft late-afternoon sun, gentle, homely, affectionate mood.

TECHNICAL: Landscape 3:2 aspect ratio (1536 x 1024). Keep the main subject (Shriji Maharaj and the central group) inside the middle 70% of the frame, because the app crops the top and bottom edges. No text, no letters, no Devanagari or Gujarati script, no signature, no watermark, no border or frame. Correct hands and faces, one Shriji Maharaj only.
```

### 4. Loya (લોયા): `loya.webp`

- **Discourses:** 18 discourses (109–126)
- **Theme:** Spoken at Sura Khachar's Darbar, often during the Shakotsav festival. The firmness of Upasana (worship) and the supremacy of God's form.
- **Now:** 1600×1163 photo of a darbar house with a decorative border (191 KB)
- **Note:** Festive image. Colour accents (red, orange, green) are allowed to be a little stronger here.

```text
Create a landscape 3:2 painting for a Vachanamrut reading app: Loya.

STYLE: A richly detailed traditional Indian devotional painting in the Swaminarayan tradition: semi-realistic gouache-and-oil look on canvas, soft visible brushwork, a warm golden-hour glow with a faint luminous haze, and a palette of turmeric-gold, saffron, vermilion red, deep teal and leaf green with cream-white clothing. Faces are calm, graceful and idealised, with large lotus-shaped eyes. Fine decorative detail (flower garlands, patterned turbans, carved wood, brass vessels). Painterly background with soft depth, no hard photographic edges. Not photorealistic, not a 3D render, not anime, not flat vector art.

CHARACTERS (keep them identical in every image of this series): Shriji Maharaj (Bhagwan Swaminarayan) is a radiant, serene man in his late thirties, clean-shaven, with large lotus eyes, a gentle half-smile, a vertical sandalwood tilak with a round red chandlo, a tulsi mala and fresh white flower garlands around his neck, a white angarkha with a white-and-saffron pagh (turban) wrapped with a flower garland, and a soft golden glow around his head. Paramhansas (sadhus) wear plain saffron robes, a saffron upper cloth, tulsi malas and a tilak-chandlo; some have shaved heads, some a small saffron cloth around the head. Devotees (haribhakto) are Kathiawadi men in white angarkhas or kediyus and dhotis with colourful pagh (red, orange, pink, green) and moustaches; women, if shown, sit together at the side in colourful odhanis with their heads covered. The Khachar darbars (chieftains) wear a rich red or maroon turban and a white jama with folded hands. The year is about 1820 in rural Saurashtra, Gujarat: no modern objects, no electric wires, no plastic.

SCENE: Bright festive morning in the whitewashed courtyard of Sura Khachar's darbar in Loya during the Shakotsav (festival of vegetables). The tiled verandah is decorated with mango-leaf torans, marigold garlands and red swastikas and handprints on the white walls. In the foreground, saffron-robed sadhus and devotees cook with large copper cauldrons over wood fires, with baskets of vegetables, a few children watching. In the middle ground, Shriji Maharaj sits on a decorated cot under a small canopy, watching the festival with a gentle smile; devotees seated around him with folded hands. Joyful, celebratory mood with rising smoke catching the sunlight.

TECHNICAL: Landscape 3:2 aspect ratio (1536 x 1024). Keep the main subject (Shriji Maharaj and the central group) inside the middle 70% of the frame, because the app crops the top and bottom edges. No text, no letters, no Devanagari or Gujarati script, no signature, no watermark, no border or frame. Correct hands and faces, one Shriji Maharaj only.
```

### 5. Panchala (પંચાળા): `panchala.jpg`

- **Discourses:** 7 discourses (127–133)
- **Theme:** Delivered at Jhinabhai's Darbar. Single-minded devotion, Nishkam Dharma (selfless duty), the characteristics of a chaste devotee.
- **Now:** 680×510 photo of a modern mandir (116 KB, low resolution)
- **Note:** Evening scene. This is the "lamp-lit" image of the series, so it sits well between the bright ones.

```text
Create a landscape 3:2 painting for a Vachanamrut reading app: Panchala.

STYLE: A richly detailed traditional Indian devotional painting in the Swaminarayan tradition: semi-realistic gouache-and-oil look on canvas, soft visible brushwork, a warm golden-hour glow with a faint luminous haze, and a palette of turmeric-gold, saffron, vermilion red, deep teal and leaf green with cream-white clothing. Faces are calm, graceful and idealised, with large lotus-shaped eyes. Fine decorative detail (flower garlands, patterned turbans, carved wood, brass vessels). Painterly background with soft depth, no hard photographic edges. Not photorealistic, not a 3D render, not anime, not flat vector art.

CHARACTERS (keep them identical in every image of this series): Shriji Maharaj (Bhagwan Swaminarayan) is a radiant, serene man in his late thirties, clean-shaven, with large lotus eyes, a gentle half-smile, a vertical sandalwood tilak with a round red chandlo, a tulsi mala and fresh white flower garlands around his neck, a white angarkha with a white-and-saffron pagh (turban) wrapped with a flower garland, and a soft golden glow around his head. Paramhansas (sadhus) wear plain saffron robes, a saffron upper cloth, tulsi malas and a tilak-chandlo; some have shaved heads, some a small saffron cloth around the head. Devotees (haribhakto) are Kathiawadi men in white angarkhas or kediyus and dhotis with colourful pagh (red, orange, pink, green) and moustaches; women, if shown, sit together at the side in colourful odhanis with their heads covered. The Khachar darbars (chieftains) wear a rich red or maroon turban and a white jama with folded hands. The year is about 1820 in rural Saurashtra, Gujarat: no modern objects, no electric wires, no plastic.

SCENE: Twilight in the courtyard of Jhinabhai's darbar in Panchala. The sky is deep teal fading to a thin band of orange at the horizon, with the first stars. Rows of clay oil lamps (diyas) glow along the edge of the courtyard and on the verandah. Shriji Maharaj sits on a cot in the lamp-light, the warm glow on his face and white clothes. A circle of paramhansas and devotees sits close around him, absorbed in listening. Jhinabhai Darbar stands humbly with folded hands. In the far distance, the silhouette of a small stone temple spire against the sky. Calm, inward, devotional mood.

TECHNICAL: Landscape 3:2 aspect ratio (1536 x 1024). Keep the main subject (Shriji Maharaj and the central group) inside the middle 70% of the frame, because the app crops the top and bottom edges. No text, no letters, no Devanagari or Gujarati script, no signature, no watermark, no border or frame. Correct hands and faces, one Shriji Maharaj only.
```

### 6. Gadhada II (ગઢડા મધ્ય): `gadhada-2.jpg`

- **Discourses:** 67 discourses (134–200)
- **Theme:** The middle section at Gadhada. Devotion (Bhakti), God's incarnations and divine actions, the life of a true devotee.
- **Now:** 450×437 painting (64 KB, low resolution and almost square)
- **Note:** Same courtyard and neem tree as Gadhada I, seen from another angle, with a bigger and more joyful sabha.

```text
Create a landscape 3:2 painting for a Vachanamrut reading app: Gadhada II.

STYLE: A richly detailed traditional Indian devotional painting in the Swaminarayan tradition: semi-realistic gouache-and-oil look on canvas, soft visible brushwork, a warm golden-hour glow with a faint luminous haze, and a palette of turmeric-gold, saffron, vermilion red, deep teal and leaf green with cream-white clothing. Faces are calm, graceful and idealised, with large lotus-shaped eyes. Fine decorative detail (flower garlands, patterned turbans, carved wood, brass vessels). Painterly background with soft depth, no hard photographic edges. Not photorealistic, not a 3D render, not anime, not flat vector art.

CHARACTERS (keep them identical in every image of this series): Shriji Maharaj (Bhagwan Swaminarayan) is a radiant, serene man in his late thirties, clean-shaven, with large lotus eyes, a gentle half-smile, a vertical sandalwood tilak with a round red chandlo, a tulsi mala and fresh white flower garlands around his neck, a white angarkha with a white-and-saffron pagh (turban) wrapped with a flower garland, and a soft golden glow around his head. Paramhansas (sadhus) wear plain saffron robes, a saffron upper cloth, tulsi malas and a tilak-chandlo; some have shaved heads, some a small saffron cloth around the head. Devotees (haribhakto) are Kathiawadi men in white angarkhas or kediyus and dhotis with colourful pagh (red, orange, pink, green) and moustaches; women, if shown, sit together at the side in colourful odhanis with their heads covered. The Khachar darbars (chieftains) wear a rich red or maroon turban and a white jama with folded hands. The year is about 1820 in rural Saurashtra, Gujarat: no modern objects, no electric wires, no plastic.

SCENE: Mid-morning in Dada Khachar's darbar at Gadhada, the same courtyard and ancient neem tree as the Gadhada I image, seen from a slightly different angle on the left side. Shriji Maharaj sits on a decorated dais under the tree with garlands of flowers hanging beside him. In front of him is a large rangoli of coloured flower petals. A big sabha fills the courtyard: rows of saffron-robed paramhansas on one side and colourful turbaned devotees on the other, some with folded hands, some singing, one playing a tanpura. A pink-tiled-roof building is visible behind. Bright, celebratory, devotional mood.

TECHNICAL: Landscape 3:2 aspect ratio (1536 x 1024). Keep the main subject (Shriji Maharaj and the central group) inside the middle 70% of the frame, because the app crops the top and bottom edges. No text, no letters, no Devanagari or Gujarati script, no signature, no watermark, no border or frame. Correct hands and faces, one Shriji Maharaj only.
```

### 7. Vartal (વરતાલ): `vadtal.jpg`

- **Discourses:** 20 discourses (201–220)
- **Theme:** Spoken in the presence of Shri Lakshminarayan Dev in Vartal. The four pillars of Ekantik Dharma: Dharma, Jnana, Vairagya, Bhakti.
- **Now:** 900×900 photo of the golden-domed mandir from above (195 KB)
- **Note:** This is the "grand temple" image. Architecture stays in the same painted style, not a photo.

```text
Create a landscape 3:2 painting for a Vachanamrut reading app: Vartal.

STYLE: A richly detailed traditional Indian devotional painting in the Swaminarayan tradition: semi-realistic gouache-and-oil look on canvas, soft visible brushwork, a warm golden-hour glow with a faint luminous haze, and a palette of turmeric-gold, saffron, vermilion red, deep teal and leaf green with cream-white clothing. Faces are calm, graceful and idealised, with large lotus-shaped eyes. Fine decorative detail (flower garlands, patterned turbans, carved wood, brass vessels). Painterly background with soft depth, no hard photographic edges. Not photorealistic, not a 3D render, not anime, not flat vector art.

CHARACTERS (keep them identical in every image of this series): Shriji Maharaj (Bhagwan Swaminarayan) is a radiant, serene man in his late thirties, clean-shaven, with large lotus eyes, a gentle half-smile, a vertical sandalwood tilak with a round red chandlo, a tulsi mala and fresh white flower garlands around his neck, a white angarkha with a white-and-saffron pagh (turban) wrapped with a flower garland, and a soft golden glow around his head. Paramhansas (sadhus) wear plain saffron robes, a saffron upper cloth, tulsi malas and a tilak-chandlo; some have shaved heads, some a small saffron cloth around the head. Devotees (haribhakto) are Kathiawadi men in white angarkhas or kediyus and dhotis with colourful pagh (red, orange, pink, green) and moustaches; women, if shown, sit together at the side in colourful odhanis with their heads covered. The Khachar darbars (chieftains) wear a rich red or maroon turban and a white jama with folded hands. The year is about 1820 in rural Saurashtra, Gujarat: no modern objects, no electric wires, no plastic.

SCENE: Sunrise at the Vartal Lakshminarayan Dev mandir, painted as a grand traditional Gujarati stone temple with a tall central spire and several smaller carved shikhars with golden tips, fluttering saffron flags, and intricately carved pillars and arches, standing at the top of a wide stone staircase. In the foreground courtyard, Shriji Maharaj sits on a raised seat in front of the temple, speaking to a large sabha of paramhansas and devotees who sit in neat rows and listen with folded hands. A few devotees carry brass aarti plates up the steps. Soft golden sky with a few rose-coloured clouds. Majestic, uplifting mood.

TECHNICAL: Landscape 3:2 aspect ratio (1536 x 1024). Keep the main subject (Shriji Maharaj and the central group) inside the middle 70% of the frame, because the app crops the top and bottom edges. No text, no letters, no Devanagari or Gujarati script, no signature, no watermark, no border or frame. Correct hands and faces, one Shriji Maharaj only.
```

### 8. Amdavad (અમદાવાદ): `ahmedabad.jpg`

- **Discourses:** 3 discourses (221–223)
- **Theme:** Short, precise discourses in Amdavad: keeping the mind constantly engaged in God and staying detached from worldly life.
- **Now:** 500×326 painting (64 KB, low resolution)
- **Note:** A very small section. The scene is intimate and meditative, with the old Ahmedabad (pol) wooden architecture.

```text
Create a landscape 3:2 painting for a Vachanamrut reading app: Amdavad.

STYLE: A richly detailed traditional Indian devotional painting in the Swaminarayan tradition: semi-realistic gouache-and-oil look on canvas, soft visible brushwork, a warm golden-hour glow with a faint luminous haze, and a palette of turmeric-gold, saffron, vermilion red, deep teal and leaf green with cream-white clothing. Faces are calm, graceful and idealised, with large lotus-shaped eyes. Fine decorative detail (flower garlands, patterned turbans, carved wood, brass vessels). Painterly background with soft depth, no hard photographic edges. Not photorealistic, not a 3D render, not anime, not flat vector art.

CHARACTERS (keep them identical in every image of this series): Shriji Maharaj (Bhagwan Swaminarayan) is a radiant, serene man in his late thirties, clean-shaven, with large lotus eyes, a gentle half-smile, a vertical sandalwood tilak with a round red chandlo, a tulsi mala and fresh white flower garlands around his neck, a white angarkha with a white-and-saffron pagh (turban) wrapped with a flower garland, and a soft golden glow around his head. Paramhansas (sadhus) wear plain saffron robes, a saffron upper cloth, tulsi malas and a tilak-chandlo; some have shaved heads, some a small saffron cloth around the head. Devotees (haribhakto) are Kathiawadi men in white angarkhas or kediyus and dhotis with colourful pagh (red, orange, pink, green) and moustaches; women, if shown, sit together at the side in colourful odhanis with their heads covered. The Khachar darbars (chieftains) wear a rich red or maroon turban and a white jama with folded hands. The year is about 1820 in rural Saurashtra, Gujarat: no modern objects, no electric wires, no plastic.

SCENE: Evening in the courtyard of the Ahmedabad Swaminarayan mandir, in the old-city (pol) style: tall intricately carved wooden balconies, jharokhas and lattice windows in warm brown wood on the upper floors, and a whitewashed courtyard below with a large neem tree. Shriji Maharaj sits on a decorated seat under a small cloth canopy, his eyes soft and his expression deeply peaceful. Paramhansas sit in a semicircle; one plays a mridanga and another small brass cymbals (kartal), others sit with eyes closed in meditation. A few devotees stand listening in the carved doorways. Warm lantern light beginning to appear. Quiet, absorbed mood.

TECHNICAL: Landscape 3:2 aspect ratio (1536 x 1024). Keep the main subject (Shriji Maharaj and the central group) inside the middle 70% of the frame, because the app crops the top and bottom edges. No text, no letters, no Devanagari or Gujarati script, no signature, no watermark, no border or frame. Correct hands and faces, one Shriji Maharaj only.
```

### 9. Gadhada III (ગઢડા અંત્ય): `gadhada-3.webp`

- **Discourses:** 39 discourses (224–262)
- **Theme:** The final section at Gadhada. The essence of Satsang, the true glory of God and the Saint, subtle principles of liberation.
- **Now:** 1600×1342 painting, Maharaj in white with scribes (338 KB, not 3:2)
- **Note:** The closing image of the series: same courtyard and tree, quieter palette (whites, saffron, soft gold), and a more spiritual atmosphere.

```text
Create a landscape 3:2 painting for a Vachanamrut reading app: Gadhada III.

STYLE: A richly detailed traditional Indian devotional painting in the Swaminarayan tradition: semi-realistic gouache-and-oil look on canvas, soft visible brushwork, a warm golden-hour glow with a faint luminous haze, and a palette of turmeric-gold, saffron, vermilion red, deep teal and leaf green with cream-white clothing. Faces are calm, graceful and idealised, with large lotus-shaped eyes. Fine decorative detail (flower garlands, patterned turbans, carved wood, brass vessels). Painterly background with soft depth, no hard photographic edges. Not photorealistic, not a 3D render, not anime, not flat vector art.

CHARACTERS (keep them identical in every image of this series): Shriji Maharaj (Bhagwan Swaminarayan) is a radiant, serene man in his late thirties, clean-shaven, with large lotus eyes, a gentle half-smile, a vertical sandalwood tilak with a round red chandlo, a tulsi mala and fresh white flower garlands around his neck, a white angarkha with a white-and-saffron pagh (turban) wrapped with a flower garland, and a soft golden glow around his head. Paramhansas (sadhus) wear plain saffron robes, a saffron upper cloth, tulsi malas and a tilak-chandlo; some have shaved heads, some a small saffron cloth around the head. Devotees (haribhakto) are Kathiawadi men in white angarkhas or kediyus and dhotis with colourful pagh (red, orange, pink, green) and moustaches; women, if shown, sit together at the side in colourful odhanis with their heads covered. The Khachar darbars (chieftains) wear a rich red or maroon turban and a white jama with folded hands. The year is about 1820 in rural Saurashtra, Gujarat: no modern objects, no electric wires, no plastic.

SCENE: Soft late afternoon in Dada Khachar's darbar at Gadhada, the same courtyard and neem tree as in the Gadhada I and II images, now calm and nearly silent. Shriji Maharaj wears plain white clothes with a simple white pagh and sits upright on a cot beneath the tree, a subtle golden aura around him, his gaze directed at the viewer with deep compassion. Paramhansas sit on rugs at small wooden writing desks to his right, recording his words on manuscript sheets, a few devotees seated behind them with folded hands. The light is soft and golden, with long gentle shadows across the packed-earth courtyard. Serene, final, timeless mood.

TECHNICAL: Landscape 3:2 aspect ratio (1536 x 1024). Keep the main subject (Shriji Maharaj and the central group) inside the middle 70% of the frame, because the app crops the top and bottom edges. No text, no letters, no Devanagari or Gujarati script, no signature, no watermark, no border or frame. Correct hands and faces, one Shriji Maharaj only.
```

## 5. After you generate them

- Send me the PNGs named by slug (`gadhada-1.png`, `sarangpur.png`, `kariyani.png`, `loya.png`, `panchala.png`, `gadhada-2.png`, `vadtal.png`, `ahmedabad.png`, `gadhada-3.png`).
- I will convert them to WebP (`cwebp -q 82 -resize 1600 0`), replace the files, and where a name changes from `.jpg` to `.webp` (panchala, gadhada-2, vadtal, ahmedabad) update `chapter-mappings.json`, the `sections` table in `vachanamrut.db` and the list in `sw.js`, then bump the cache version.
- Check list before sending: same Shriji Maharaj in all nine, no text or watermark in any image, landscape 3:2, main subject not at the very top or bottom edge, warm golden overall tone so the set matches the app's gold and red.
