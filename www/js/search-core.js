// Search core: Gujarati/Devanagari transliteration, loose "sound keys", index + scoring.
// Pure functions only, so the same file runs on the page (find-in-page, jumps) and in js/search-worker.js.
// Typing "ahaar", "aahar" or "આહાર" all become the key "ahar". See docs/feature-plan.md (Phase 2).
(function (root) {
    const CONS = {
        'ક': 'k', 'ખ': 'kh', 'ગ': 'g', 'ઘ': 'gh', 'ઙ': 'n', 'ચ': 'ch', 'છ': 'chh', 'જ': 'j', 'ઝ': 'jh', 'ઞ': 'n',
        'ટ': 't', 'ઠ': 'th', 'ડ': 'd', 'ઢ': 'dh', 'ણ': 'n', 'ત': 't', 'થ': 'th', 'દ': 'd', 'ધ': 'dh', 'ન': 'n',
        'પ': 'p', 'ફ': 'f', 'બ': 'b', 'ભ': 'bh', 'મ': 'm', 'ય': 'y', 'ર': 'r', 'લ': 'l', 'ળ': 'l', 'વ': 'v',
        'શ': 'sh', 'ષ': 'sh', 'સ': 's', 'હ': 'h',
    };
    const VOWELS = {
        'અ': 'a', 'આ': 'aa', 'ઇ': 'i', 'ઈ': 'ii', 'ઉ': 'u', 'ઊ': 'uu', 'ઋ': 'ru', 'એ': 'e', 'ઐ': 'ai',
        'ઓ': 'o', 'ઔ': 'au', 'ઍ': 'e', 'ઑ': 'o',
    };
    const MATRAS = {
        'ા': 'aa', 'િ': 'i', 'ી': 'ii', 'ુ': 'u', 'ૂ': 'uu', 'ૃ': 'ru', 'ે': 'e', 'ૈ': 'ai', 'ો': 'o',
        'ૌ': 'au', 'ૅ': 'e', 'ૉ': 'o',
    };
    const MARKS = { 'ં': 'n', 'ઁ': 'n', 'ઃ': 'h' };
    const VIRAMA = '્', NUKTA = '઼';

    // Devanagari (Sanskrit/Hindi) is laid out like Gujarati, 0x180 lower: map it across, then reuse the table.
    function devanagariToGujarati(text) {
        return text.replace(/[ँ-ॣ०-९]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x180));
    }

    function toLatin(text) {
        text = devanagariToGujarati(text);
        let out = '';
        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            if (CONS[c]) {
                out += CONS[c];
                let next = text[i + 1];
                if (next === NUKTA) next = text[++i + 1];
                if (MATRAS[next]) { out += MATRAS[next]; i++; }
                else if (next === VIRAMA) { i++; }
                else { out += 'a'; } // inherent vowel
            } else if (VOWELS[c]) out += VOWELS[c];
            else if (MATRAS[c]) out += MATRAS[c];
            else if (MARKS[c]) out += MARKS[c];
            else if (c >= '૦' && c <= '૯') out += String(c.charCodeAt(0) - 0x0AE6);
            else out += c;
        }
        return out;
    }

    // Applied in order to both the text and the query, so spelling variants meet in the middle.
    const LOOSE = [
        ['ksh', 'x'], ['chh', 'c'], ['ch', 'c'], ['sh', 's'], ['ph', 'f'], ['w', 'v'], ['z', 'j'],
        ['kh', 'k'], ['gh', 'g'], ['jh', 'j'], ['th', 't'], ['dh', 'd'], ['bh', 'b'],
        ['ee', 'i'], ['oo', 'u'], ['aa', 'a'], ['ii', 'i'], ['uu', 'u'], ['ri', 'ru'], ['y', 'i'],
    ];
    const keyCache = new Map();

    // One word (any script) -> sound key, e.g. "Āhār" / "aahaar" / "આહાર" -> "ahar"
    function soundKey(word) {
        let cached = keyCache.get(word);
        if (cached !== undefined) return cached;
        let w = toLatin(word).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        w = w.replace(/[^a-z0-9]/g, '');
        for (const [from, to] of LOOSE) w = w.split(from).join(to);
        w = w.replace(/(.)\1+/g, '$1');
        if (w.length > 3 && w.endsWith('a')) w = w.slice(0, -1); // final schwa: dharma -> dharm
        if (keyCache.size < 200000) keyCache.set(word, w);
        return w;
    }

    const WORD_SPLIT = /[\s.,;:!?"“”‘’'()[\]{}\-—–/|।॥*…]+/;

    function words(text) {
        return (text || '').split(WORD_SPLIT).filter(Boolean);
    }

    function queryKeys(query) {
        return words(query)
            .filter(w => !/^[0-9૦-૯०-९]+$/.test(w)) // numbers are handled as "jump to" instead
            .map(soundKey)
            .filter(k => k.length >= 2);
    }

    function withinOneEdit(a, b) {
        if (Math.abs(a.length - b.length) > 1) return false;
        let i = 0, j = 0, edits = 0;
        while (i < a.length && j < b.length) {
            if (a[i] === b[j]) { i++; j++; continue; }
            if (++edits > 1) return false;
            if (a.length > b.length) i++;
            else if (b.length > a.length) j++;
            else { i++; j++; }
        }
        return edits + (a.length - i) + (b.length - j) <= 1;
    }

    // How strongly a word key matches a query key: exact 3, prefix 2 (Gujarati endings: આહારમાં),
    // one typo 1 — only for query words of 6+ letters, shorter ones gave false hits (ahar ~ ahan).
    function matchStrength(queryKey, wordKey) {
        if (wordKey === queryKey) return 3;
        if (wordKey.startsWith(queryKey)) return 2;
        if (queryKey.length >= 6 && withinOneEdit(queryKey, wordKey)) return 1;
        return 0;
    }

    /**
     * docs: [{ id, fields: { name: weight-10 text, <field>: text, ... } }]
     * Field "title" counts 10x; every other field counts 1x.
     */
    function buildIndex(docs) {
        const postings = new Map(); // key -> [[docIndex, fieldName, count], ...]
        docs.forEach((doc, docIndex) => {
            for (const [field, text] of Object.entries(doc.fields)) {
                const counts = new Map();
                for (const w of words(text)) {
                    const k = soundKey(w);
                    if (k.length >= 2) counts.set(k, (counts.get(k) || 0) + 1);
                }
                for (const [k, n] of counts) {
                    let list = postings.get(k);
                    if (!list) postings.set(k, (list = []));
                    list.push([docIndex, field, n]);
                }
            }
        });
        return { docs, postings, keys: [...postings.keys()].sort() };
    }

    // All index keys a query key matches, with their strength.
    function expandKey(index, q) {
        const found = [];
        const keys = index.keys;
        let lo = 0, hi = keys.length;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (keys[mid] < q) lo = mid + 1; else hi = mid; }
        for (let i = lo; i < keys.length && keys[i].startsWith(q); i++) found.push([keys[i], keys[i] === q ? 3 : 2]);
        if (q.length >= 6) {
            for (const k of keys) {
                if (Math.abs(k.length - q.length) <= 1 && !k.startsWith(q) && withinOneEdit(q, k)) found.push([k, 1]);
            }
        }
        return found;
    }

    // Returns [{ docIndex, score, count, matchedKeys }], best first. Every query word must match.
    function search(index, query, limit = 60) {
        const qKeys = queryKeys(query);
        if (!qKeys.length) return [];
        let scores = null;
        const matched = new Map(); // docIndex -> Set of matched index keys
        const counts = new Map();
        for (const q of qKeys) {
            const perDoc = new Map();
            for (const [k, strength] of expandKey(index, q)) {
                for (const [docIndex, field, n] of index.postings.get(k)) {
                    const weight = field === 'title' ? 10 : 1;
                    perDoc.set(docIndex, (perDoc.get(docIndex) || 0) + strength * n * weight);
                    if (!matched.has(docIndex)) matched.set(docIndex, new Set());
                    matched.get(docIndex).add(k);
                    if (field !== 'title') counts.set(docIndex, (counts.get(docIndex) || 0) + n);
                }
            }
            if (scores === null) scores = perDoc;
            else {
                for (const docIndex of [...scores.keys()]) {
                    if (perDoc.has(docIndex)) scores.set(docIndex, scores.get(docIndex) + perDoc.get(docIndex));
                    else scores.delete(docIndex);
                }
            }
            if (!scores.size) return [];
        }
        return [...scores.entries()]
            .map(([docIndex, score]) => ({ docIndex, score, count: counts.get(docIndex) || 0, matchedKeys: [...matched.get(docIndex)] }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    // A short excerpt around the first hit: [{ text, hit }], with ellipsis flags.
    function snippet(text, matchedKeys, before = 6, after = 14) {
        const keySet = new Set(matchedKeys);
        const parts = (text || '').replace(/\s+/g, ' ').trim().split(' ');
        const isHit = w => keySet.has(soundKey(w.replace(/^[^\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}]+$/gu, '')));
        const first = parts.findIndex(isHit);
        if (first === -1) return null;
        const start = Math.max(0, first - before);
        const end = Math.min(parts.length, first + after);
        return {
            lead: start > 0,
            tail: end < parts.length,
            parts: parts.slice(start, end).map(w => ({ text: w, hit: isHit(w) })),
        };
    }

    root.SearchCore = { toLatin, soundKey, words, queryKeys, matchStrength, buildIndex, search, snippet, devanagariToGujarati };
})(typeof self !== 'undefined' ? self : window);
