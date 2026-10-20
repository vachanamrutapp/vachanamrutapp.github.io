// Search screen (bottom-bar button) and find-in-page (header 🔍 on reading screens).
// Matching lives in js/search-core.js; indexes are built in js/search-worker.js after launch.
(function () {
    const $ = id => document.getElementById(id);
    const overlay = $('search-overlay');
    const input = $('search-input');
    const body = $('search-body');
    const isEnglish = () => uiEnglish(); // interface wording; reading content uses currentLanguage
    const gu = n => (isEnglish() ? String(n) : toGujaratiDigits(n));
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    let scope = 'vachanamrut';
    let lastQuery = '';
    let requestId = 0;
    const ready = { vachanamrut: false, shikshapatri: false };
    const vachMeta = new Map(); // id -> { name_gu, name_en, title_gu, title_en }
    let glossary = [];          // [{ word_gu, word_en, meaning_gu, meaning_en, keys: [...], count }]

    // ---- Worker (falls back to the page thread if workers aren't available) -------------
    let worker = null;
    const localIndexes = {};
    const pending = new Map();
    try {
        worker = new Worker('js/search-worker.js?v=1');
        worker.onmessage = ({ data }) => {
            if (data.type === 'ready') onReady(data.scope);
            if (data.type === 'results' && pending.has(data.id)) {
                pending.get(data.id)(data);
                pending.delete(data.id);
            }
        };
        worker.onerror = () => { worker = null; };
    } catch (e) {
        worker = null;
    }

    function buildIndex(scopeName, docs) {
        if (worker) worker.postMessage({ type: 'build', scope: scopeName, docs });
        else setTimeout(() => { localIndexes[scopeName] = SearchCore.buildIndex(docs); onReady(scopeName); }, 0);
    }

    function query(scopeName, q, snippetFields) {
        const id = ++requestId;
        return new Promise(resolve => {
            if (worker) {
                pending.set(id, resolve);
                worker.postMessage({ type: 'search', id, scope: scopeName, query: q, snippetFields });
                return;
            }
            const index = localIndexes[scopeName];
            if (!index) return resolve({ id, pending: true, results: [] });
            const results = SearchCore.search(index, q).map(r => {
                const doc = index.docs[r.docIndex];
                let snippet = null, field = null;
                for (const f of snippetFields) {
                    snippet = SearchCore.snippet(doc.fields[f], r.matchedKeys);
                    if (snippet) { field = f; break; }
                }
                return { id: doc.id, score: r.score, count: r.count, matchedKeys: r.matchedKeys, snippet, field };
            });
            resolve({ id, results });
        });
    }

    function onReady(scopeName) {
        ready[scopeName] = true;
        if (scopeName === 'vachanamrut') buildShikshapatriIndex();
        if (isOpen() && scope === scopeName) run(input.value);
    }

    // ---- Building the indexes -------------------------------------------------
    let buildStarted = false;
    async function startBuilding() {
        if (buildStarted) return;
        buildStarted = true;
        try {
            await initSql(); // app.js: the Vachanamrut database
            const docs = new Map();
            const rows = db.exec('SELECT id, language, vachanamrut, title, text FROM scriptures')[0].values;
            for (const [id, language, name, title, text] of rows) {
                const doc = docs.get(id) || { id, fields: { title: '', gu: '', en: '' } };
                doc.fields.title += ` ${name || ''} ${title || ''}`;
                doc.fields[language === 'gujarati' ? 'gu' : 'en'] = text || '';
                docs.set(id, doc);
                const meta = vachMeta.get(id) || {};
                meta[language === 'gujarati' ? 'name_gu' : 'name_en'] = (name || '').replace(/\s+/g, ' ').trim();
                meta[language === 'gujarati' ? 'title_gu' : 'title_en'] = (title || '').replace(/\s+/g, ' ').trim();
                vachMeta.set(id, meta);
            }
            buildIndex('vachanamrut', [...docs.values()]);
            loadGlossary();
        } catch (err) {
            console.error('Search index build failed:', err);
        }
    }

    let shikshapatriStarted = false;
    async function buildShikshapatriIndex() {
        if (shikshapatriStarted) return;
        shikshapatriStarted = true;
        try {
            buildIndex('shikshapatri', await Shikshapatri.getSearchDocs());
        } catch (err) {
            console.error('Shikshapatri index build failed:', err);
        }
    }

    function loadGlossary() {
        const res = db.exec('SELECT word_gu, word_en, meaning_gu, meaning_en, vachanamrut_id FROM vachanamrut_glossary');
        if (!res.length) return;
        const byWord = new Map();
        for (const [wordGu, wordEn, meaningGu, meaningEn, vid] of res[0].values) {
            const entry = byWord.get(wordGu) || { word_gu: wordGu, word_en: wordEn, meaning_gu: meaningGu, meaning_en: meaningEn, ids: new Set() };
            entry.ids.add(vid);
            byWord.set(wordGu, entry);
        }
        const phraseKey = text => SearchCore.words(text).map(SearchCore.soundKey).filter(Boolean).join(' ');
        glossary = [...byWord.values()].map(e => ({
            ...e,
            count: e.ids.size,
            keys: [phraseKey(e.word_gu), ...String(e.word_en || '').split('/').map(phraseKey)].filter(k => k.length >= 2),
        }));
    }

    function glossaryMatches(q) {
        const qk = SearchCore.words(q).map(SearchCore.soundKey).filter(Boolean).join(' ');
        if (qk.length < 3) return [];
        const exact = glossary.filter(e => e.keys.includes(qk));
        const prefix = exact.length ? [] : glossary.filter(e => e.keys.some(k => k.startsWith(qk)));
        return [...exact, ...prefix].slice(0, 2);
    }

    // ---- "Go to" jumps: "gadhada 1 18", "g1-18", "loya 8", "18", "શ્લોક ૩૭" ---------------------
    const SECTION_ALIASES = [
        ['Gadhada I', ['gadhada 1', 'gadhada pratham', 'gadhada first', 'g1', 'gp', 'ગઢડા પ્રથમ', 'pratham']],
        ['Gadhada II', ['gadhada 2', 'gadhada madhya', 'gadhada middle', 'g2', 'gm', 'ગઢડા મધ્ય', 'madhya']],
        ['Gadhada III', ['gadhada 3', 'gadhada antya', 'gadhada last', 'g3', 'ga', 'ગઢડા અંત્ય', 'antya']],
        ['Sarangpur', ['sarangpur', 's', 'સારંગપુર']],
        ['Kariyani', ['kariyani', 'k', 'કારિયાણી']],
        ['Loya', ['loya', 'l', 'લોયા']],
        ['Panchala', ['panchala', 'p', 'પંચાળા']],
        ['Vartal', ['vartal', 'vadtal', 'v', 'વરતાલ', 'વડતાલ']],
        ['Amdavad', ['amdavad', 'ahmedabad', 'a', 'અમદાવાદ']],
        ['Partharo', ['partharo', 'પરથારો']],
    ];
    // Spaces dropped so "g 1", "g1" and "gadhada 1" compare cleanly
    const phrase = t => SearchCore.words(t.replace(/[-_.]/g, ' ')).map(SearchCore.soundKey).join('');
    const ALIAS_KEYS = SECTION_ALIASES.map(([label, aliases]) => [label, aliases.map(phrase)]);
    const toAsciiDigits = t => t.replace(/[૦-૯]/g, d => d.charCodeAt(0) - 0x0AE6).replace(/[०-९]/g, d => d.charCodeAt(0) - 0x0966);

    function idForName(label, n) {
        for (const [id, meta] of vachMeta) {
            if (meta.name_en === `${label}-${n}` || (label === 'Partharo' && meta.name_en === `Partharo ${n}`)) return id;
        }
        return null;
    }

    function parseJumps(q) {
        // "g1-18" -> ["g", "1", "18"]: split letters from digits and on separators
        const tokens = toAsciiDigits(q.trim().toLowerCase())
            .replace(/([a-z\u0A80-\u0AFF])(\d)/g, '$1 $2')
            .replace(/[-_.,/]+/g, ' ')
            .split(/\s+/).filter(Boolean)
            // Roman numerals → digits ("Gadhada II 8"); the loose matching would otherwise read ii/iii as i
            .map(tok => ({ i: '1', ii: '2', iii: '3' }[tok] || tok));
        const numbers = tokens.filter(t => /^\d+$/.test(t));
        if (!numbers.length) {
            const k = phrase(q);
            if (k && ['khagol', 'khagol bhugol', 'ખગોળ'].map(phrase).some(a => a.startsWith(k) && k.length >= 4)) return [{ kind: 'vachanamrut', id: 10006 }];
            return [];
        }
        const n = parseInt(numbers[numbers.length - 1]);
        const rest = tokens.slice(0, tokens.lastIndexOf(numbers[numbers.length - 1])).join(' ');

        if (scope === 'shikshapatri') {
            const words = phrase(rest);
            const ok = !words || ['shlok', 'slok', 'sloka', 'shloka', 'શ્લોક', 'श्लोक'].map(phrase).some(a => a.startsWith(words) || words.startsWith(a));
            return ok && n >= 1 && n <= (Shikshapatri.count || 212) ? [{ kind: 'shloka', id: n }] : [];
        }

        if (!rest) return n >= 1 && n <= 262 ? [{ kind: 'vachanamrut', id: n, global: true }] : [];
        const key = phrase(rest);
        // Exact section name wins ("gadhada i" is Gadhada I, not also II/III); otherwise a prefix ("gadhada" → all three)
        let labels = ALIAS_KEYS.filter(([, keys]) => keys.includes(key)).map(([label]) => label);
        if (!labels.length && key.length >= 3) labels = ALIAS_KEYS.filter(([, keys]) => keys.some(a => a.startsWith(key))).map(([label]) => label);
        return [...new Set(labels)].map(label => ({ kind: 'vachanamrut', id: idForName(label, n) })).filter(j => j.id);
    }

    // ---- Rendering --------------------------------------------------------------
    function vachName(id) {
        const m = vachMeta.get(id) || {};
        return currentLanguage === 'english' ? (m.name_en || m.name_gu || '') : (m.name_gu || m.name_en || '');
    }
    function vachTitle(id) {
        const m = vachMeta.get(id) || {};
        return currentLanguage === 'english' ? (m.title_en || m.title_gu || '') : (m.title_gu || m.title_en || '');
    }
    const shlokaName = id => (isEnglish() ? `Shloka ${id}` : `શ્લોક ${gu(id)}`);
    const t = (en, guText) => (isEnglish() ? en : guText);

    function snippetHtml(snippet) {
        if (!snippet) return '';
        return (snippet.lead ? '… ' : '') +
            snippet.parts.map(p => (p.hit ? `<mark>${esc(p.text)}</mark>` : esc(p.text))).join(' ') +
            (snippet.tail ? ' …' : '');
    }

    function renderEmpty() {
        const recent = getRecent();
        const examples = scope === 'shikshapatri'
            ? ['dharma', 'ekadashi', 'tilak', '37']
            : ['ahar', 'ekantik dharm', 'vairagya', 'Gadhada 1 18'];
        const title = scope === 'shikshapatri' ? t('Search the Shikshapatri', 'શિક્ષાપત્રીમાં શોધો') : t('Search the Vachanamrut', 'વચનામૃતમાં શોધો');
        body.innerHTML = `
            <div class="search-empty-hero">
                <div class="search-empty-icon"><i class="fas ${scope === 'shikshapatri' ? 'fa-scroll' : 'fa-book-open'}"></i></div>
                <div class="search-empty-title">${title}</div>
                <p class="search-hint">${t('Type in English letters or Gujarati — <b>ahar</b>, <b>aahar</b> and <b>આહાર</b> all match.',
                    'અંગ્રેજી અક્ષરોમાં કે ગુજરાતીમાં લખો — <b>ahar</b>, <b>aahar</b> અને <b>આહાર</b> બધું મળશે.')}</p>
            </div>
            ${recent.length ? `<div class="journey-section-title"><i class="fas fa-history"></i> ${t('Recent', 'તાજેતરની શોધ')}
                <button type="button" class="search-clear-recent" data-clear-recent>${t('Clear', 'સાફ કરો')}</button></div>
                <div class="search-chips">${recent.map(r => `<button type="button" class="search-chip" data-q="${esc(r)}"><i class="fas fa-history"></i>${esc(r)}</button>`).join('')}</div>` : ''}
            <div class="journey-section-title"><i class="fas fa-lightbulb"></i> ${t('Try', 'આ શોધી જુઓ')}</div>
            <div class="search-chips">${examples.map(e => `<button type="button" class="search-chip" data-q="${esc(e)}">${esc(e)}</button>`).join('')}</div>`;
    }

    function renderResults(q, jumps, glossaryHits, results, isPending) {
        let html = '';
        if (jumps.length) {
            html += `<div class="journey-section-title"><i class="fas fa-location-arrow"></i> ${t('Go to', 'સીધું ખોલો')}</div><div class="settings-group search-group">`;
            html += jumps.map(j => j.kind === 'shloka'
                ? resultRow({ kind: 'shloka', id: j.id, name: shlokaName(j.id), sub: '' })
                : resultRow({ kind: 'vachanamrut', id: j.id, name: vachName(j.id), sub: vachTitle(j.id) })).join('');
            html += '</div>';
        }
        if (glossaryHits.length) html += `<div class="journey-section-title"><i class="fas fa-spell-check"></i> ${t('Glossary', 'શબ્દાર્થ')}</div>`;
        for (const g of glossaryHits) {
            html += `
                <div class="search-glossary-card">
                    <div class="search-glossary-word">${esc(g.word_gu)} <span>${esc(g.word_en || '')}</span></div>
                    <div class="search-glossary-meaning">${esc(currentLanguage === 'english' ? (g.meaning_en || g.meaning_gu) : (g.meaning_gu || g.meaning_en))}</div>
                    <div class="search-glossary-count">${t(`Explained in ${g.count} Vachanamrut${g.count === 1 ? '' : 's'}`, `${gu(g.count)} વચનામૃતમાં સમજાવેલ`)}</div>
                </div>`;
        }
        if (isPending) {
            html += `<div class="search-status"><i class="fas fa-circle-notch fa-spin"></i> ${t('Preparing search…', 'શોધ તૈયાર થાય છે…')}</div>`;
        } else if (results.length) {
            const label = scope === 'shikshapatri'
                ? t(`${results.length} shloka${results.length === 1 ? '' : 's'}`, `${gu(results.length)} શ્લોક`)
                : t(`${results.length} Vachanamrut${results.length === 1 ? '' : 's'}`, `${gu(results.length)} વચનામૃત`);
            html += `<div class="journey-section-title"><i class="fas fa-search"></i> ${label}</div><div class="settings-group search-group">`;
            html += results.map(r => scope === 'shikshapatri'
                ? resultRow({ kind: 'shloka', id: r.id, name: shlokaName(r.id), sub: '', snippet: r.snippet, keys: r.matchedKeys })
                : resultRow({ kind: 'vachanamrut', id: r.id, name: vachName(r.id), sub: vachTitle(r.id), snippet: r.snippet, count: r.count, keys: r.matchedKeys })).join('');
            html += '</div>';
        } else if (!jumps.length && !glossaryHits.length) {
            html += `<div class="search-status">${t(`No matches for “${esc(q)}”. Try a shorter word or a different spelling.`, `“${esc(q)}” માટે કંઈ મળ્યું નહીં. ટૂંકો શબ્દ કે બીજી જોડણી અજમાવો.`)}</div>`;
        }
        body.innerHTML = html;
    }

    function resultRow(item) {
        const keys = item.keys ? ` data-keys="${esc(item.keys.join(' '))}"` : '';
        return `<button type="button" class="search-result" data-kind="${item.kind}" data-id="${item.id}"${keys}>
            <span class="search-result-head">
                <span class="search-result-name">${esc(item.name)}</span>
                ${item.count ? `<span class="search-count">${t(`${item.count}×`, `${gu(item.count)} વાર`)}</span>` : ''}
            </span>
            ${item.sub ? `<span class="search-result-title">${esc(item.sub)}</span>` : ''}
            ${item.snippet ? `<span class="search-snippet">${snippetHtml(item.snippet)}</span>` : ''}
        </button>`;
    }

    // Excerpts come from the reader's language first
    function snippetFields() {
        if (scope === 'shikshapatri') {
            return currentLanguage === 'english' ? ['en', 'gu', 'sa', 'bhashya'] : ['gu', 'en', 'sa', 'bhashya'];
        }
        return currentLanguage === 'english' ? ['en', 'gu', 'title'] : ['gu', 'en', 'title'];
    }

    let debounce = null;
    async function run(q) {
        q = q.trim();
        lastQuery = q;
        $('search-clear-btn').hidden = !q;
        if (!q) return renderEmpty();
        const jumps = parseJumps(q);
        const glossaryHits = scope === 'vachanamrut' ? glossaryMatches(q) : [];
        const hasWords = SearchCore.queryKeys(q).length > 0;
        if (!hasWords) return renderResults(q, jumps, glossaryHits, [], false);
        if (!ready[scope]) {
            startBuilding();
            return renderResults(q, jumps, glossaryHits, [], true);
        }
        const res = await query(scope, q, snippetFields());
        if (q !== lastQuery) return; // a newer search has started
        renderResults(q, jumps, glossaryHits, res.results, !!res.pending);
    }

    // ---- Recent searches --------------------------------------------------------
    function getRecent() {
        try { return JSON.parse(localStorage.getItem('searchRecent')) || []; } catch (e) { return []; }
    }
    function addRecent(q) {
        if (!q) return;
        const list = [q, ...getRecent().filter(r => r.toLowerCase() !== q.toLowerCase())].slice(0, 10);
        localStorage.setItem('searchRecent', JSON.stringify(list));
    }

    // ---- Open / close -------------------------------------------------------------
    const isOpen = () => overlay.style.display !== 'none';

    function setScope(next) {
        scope = next;
        overlay.querySelectorAll('.search-scope-btn').forEach(b => b.classList.toggle('active', b.dataset.scope === scope));
        input.placeholder = scope === 'shikshapatri'
            ? t('Search Shikshapatri: dharma, ધર્મ, 37…', 'શિક્ષાપત્રીમાં શોધો: dharma, ધર્મ, 37…')
            : t('Search: ahar, આહાર, Gadhada 1 18…', 'શોધો: ahar, આહાર, ગઢડા પ્રથમ ૧૮…');
        run(input.value);
    }

    function open(startScope = currentScripture) {
        closeFind();
        startBuilding();
        overlay.style.display = 'flex';
        document.body.classList.add('search-open');
        setScope(startScope);
        setTimeout(() => input.focus(), 50);
    }

    function close() {
        overlay.style.display = 'none';
        document.body.classList.remove('search-open');
        input.blur();
    }

    function openResult(kind, id, keys) {
        addRecent(lastQuery);
        close();
        // Land on the matched words (not for "Go to" jumps, which have no matched keys)
        const after = () => keys.length && setTimeout(() => openFind(lastQuery, keys), 350);
        if (kind === 'shloka') {
            Shikshapatri.showSloka(id).then(after);
        } else if ((window.skipResumeOnce = keys.length > 0, openVachanamrutById(id))) {
            after();
        }
    }

    input.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => run(input.value), 150);
    });
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            addRecent(input.value.trim());
            input.blur();
        }
    });
    $('search-clear-btn').addEventListener('click', () => { input.value = ''; run(''); input.focus(); });
    $('search-close-btn').addEventListener('click', close);
    overlay.querySelectorAll('.search-scope-btn').forEach(b => b.addEventListener('click', () => setScope(b.dataset.scope)));
    body.addEventListener('click', e => {
        const chip = e.target.closest('[data-q]');
        if (chip) { input.value = chip.dataset.q; run(input.value); return; }
        if (e.target.closest('[data-clear-recent]')) { localStorage.removeItem('searchRecent'); renderEmpty(); return; }
        const row = e.target.closest('.search-result');
        if (row) openResult(row.dataset.kind, parseInt(row.dataset.id), (row.dataset.keys || '').split(' ').filter(Boolean));
    });
    $('footer-search-btn').addEventListener('click', () => open());

    // ---- Find in page -------------------------------------------------------------
    const findBar = $('find-bar');
    const findInput = $('find-input');
    let hits = [];
    let current = -1;

    function findContainer() {
        if ($('shikshapatri-detail-screen').classList.contains('active')) return $('sloka-content');
        if ($('vachanamrut-detail-screen').classList.contains('active')) return $('vachanamrut-card');
        return null;
    }

    function clearMarks() {
        document.querySelectorAll('mark.find-hit').forEach(m => {
            const parent = m.parentNode;
            parent.replaceChild(document.createTextNode(m.textContent), m);
            parent.normalize();
        });
        hits = [];
        current = -1;
    }

    // Wrap every word in the reading area that matches the query (any spelling) in <mark>.
    // extraKeys: exact index keys from a search result, so the words that matched there light up here too.
    function markMatches(container, q, extraKeys = []) {
        clearMarks();
        const qKeys = SearchCore.queryKeys(q);
        const exact = new Set(extraKeys);
        if (!qKeys.length && !exact.size) return;
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
            acceptNode: node => (node.nodeValue.trim() && !node.parentElement.closest('select, option, button, mark.find-hit')
                ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
        });
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        const wordRe = /[\p{L}\p{M}\p{N}]+/gu;
        for (const node of nodes) {
            const text = node.nodeValue;
            const ranges = [];
            let m;
            while ((m = wordRe.exec(text))) {
                const k = SearchCore.soundKey(m[0]);
                if (k.length >= 2 && (exact.has(k) || qKeys.some(q => SearchCore.matchStrength(q, k) > 0))) {
                    ranges.push([m.index, m.index + m[0].length]);
                }
            }
            if (!ranges.length) continue;
            const frag = document.createDocumentFragment();
            let pos = 0;
            for (const [a, b] of ranges) {
                if (a > pos) frag.appendChild(document.createTextNode(text.slice(pos, a)));
                const mark = document.createElement('mark');
                mark.className = 'find-hit';
                mark.textContent = text.slice(a, b);
                frag.appendChild(mark);
                pos = b;
            }
            if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
            node.parentNode.replaceChild(frag, node);
        }
        hits = [...container.querySelectorAll('mark.find-hit')];
        // Matches only in the collapsed bhashya: open it so they're visible
        if (hits.some(h => h.closest('#bhashya-body')) && !hits.some(h => !h.closest('#bhashya-body'))) Shikshapatri.setBhashyaOpen(true);
    }

    function updateCount() {
        $('find-count').textContent = hits.length ? `${gu(current + 1)} / ${gu(hits.length)}` : (findInput.value.trim() ? gu(0) : '');
    }

    function goTo(i) {
        if (!hits.length) return updateCount();
        hits.forEach(h => h.classList.remove('current'));
        current = (i + hits.length) % hits.length;
        const hit = hits[current];
        if (hit.closest('#bhashya-body')) Shikshapatri.setBhashyaOpen(true);
        hit.classList.add('current');
        hit.scrollIntoView({ behavior: 'smooth', block: 'center' });
        updateCount();
    }

    function runFind(extraKeys = []) {
        const container = findContainer();
        if (!container) return;
        markMatches(container, findInput.value, extraKeys);
        goTo(0);
    }

    function openFind(prefill = '', extraKeys = []) {
        if (!findContainer()) return;
        findBar.style.display = 'flex';
        findInput.placeholder = t('Find in this page', 'આ પાનામાં શોધો');
        findInput.value = prefill;
        if (prefill) runFind(extraKeys);
        else { clearMarks(); updateCount(); setTimeout(() => findInput.focus(), 50); }
    }

    function closeFind() {
        if (findBar.style.display === 'none') return;
        findBar.style.display = 'none';
        findInput.blur();
        clearMarks();
    }

    let findDebounce = null;
    findInput.addEventListener('input', () => {
        clearTimeout(findDebounce);
        findDebounce = setTimeout(() => runFind(), 200);
    });
    findInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); goTo(current + (e.shiftKey ? -1 : 1)); }
        if (e.key === 'Escape') closeFind();
    });
    $('find-next-btn').addEventListener('click', () => goTo(current + 1));
    $('find-prev-btn').addEventListener('click', () => goTo(current - 1));
    $('find-close-btn').addEventListener('click', closeFind);
    // 🔍 on each reading screen (Vachanamrut toolbar, shloka card)
    document.querySelectorAll('.find-open-btn').forEach(btn =>
        btn.addEventListener('click', () => (findBar.style.display === 'none' ? openFind() : closeFind())));

    // Android back: close search / find first
    function handleBack() {
        if (isOpen()) { close(); return true; }
        if (findBar.style.display !== 'none') { closeFind(); return true; }
        return false;
    }

    // Build the indexes quietly a few seconds after launch, so search opens instantly
    window.addEventListener('load', () => setTimeout(startBuilding, 3000));

    window.SearchUI = { open, close, openFind, closeFind, handleBack };
})();
