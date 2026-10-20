// Shikshapatri inside the main app (was www/shikshapatri/js/app.js as a separate page).
// Wrapped so its names don't clash with app.js; app.js drives screens through window.Shikshapatri.
(function () {
    const BASE = 'shikshapatri/assets/';
    let slokas = [];
    let spDb = null;
    let loadPromise = null;
    let currentSloka = null;
    let lastViewedId = null;
    let currentLang = 'gujarati'; // translation shown: follows the app's ગુજ / EN switch

    const $ = id => document.getElementById(id);
    const isDetailActive = () => $('shikshapatri-detail-screen').classList.contains('active');
    const isListActive = () => $('shikshapatri-list-screen').classList.contains('active');

    // ---- Data -----------------------------------------------------------------
    function ensureLoaded() {
        if (loadPromise) return loadPromise;
        loadPromise = (async () => {
            try {
                await initSql(); // app.js: sets up sql.js (SQL)
                const response = await fetch(`${BASE}data/shikshapatri.db`);
                if (!response.ok) throw new Error(`Failed to load shikshapatri.db: ${response.statusText}`);
                spDb = new SQL.Database(new Uint8Array(await response.arrayBuffer()));
                const stmt = spDb.prepare('SELECT id, sanskrit, gujarati, english, bhashya_id FROM slokas ORDER BY id ASC');
                slokas = [];
                while (stmt.step()) slokas.push(stmt.getAsObject());
                stmt.free();
            } catch (err) {
                console.warn('Shikshapatri SQLite load failed, falling back to data.json:', err);
                slokas = await (await fetch(`${BASE}data.json`)).json();
            }
            $('sloka-slider').max = slokas.length;
            syncLanguageWithApp();
            setupControls();
        })();
        return loadPromise;
    }

    function getBhashya(bhashyaId) {
        if (!spDb || !bhashyaId) return null;
        try {
            const stmt = spDb.prepare('SELECT * FROM bhashya WHERE id = :id');
            stmt.bind({ ':id': bhashyaId });
            let result = null;
            if (stmt.step()) {
                result = stmt.getAsObject();
                if (typeof result.content === 'string') result.content = JSON.parse(result.content);
                if (typeof result.verses === 'string') result.verses = JSON.parse(result.verses);
            }
            stmt.free();
            return result;
        } catch (err) {
            console.error('Error querying bhashya:', err);
            return null;
        }
    }

    // Plain text of every shloka for the search index (js/search.js)
    async function getSearchDocs() {
        await ensureLoaded();
        return slokas.map(s => {
            const bhashya = getBhashya(s.bhashya_id);
            const commentary = bhashya && Array.isArray(bhashya.content) ? bhashya.content.map(item => item.text || '').join(' ') : '';
            return { id: s.id, fields: { sa: s.sanskrit || '', gu: s.gujarati || '', en: s.english || '', bhashya: commentary } };
        });
    }

    // ---- Language ---------------------------------------------------------------
    // The translation follows the app's ગુજ / EN switch (Hindi was dropped in 1.3).
    function syncLanguageWithApp() {
        currentLang = localStorage.getItem('appLanguage') === 'english' ? 'english' : 'gujarati';
        // Clear settings from the old standalone page's own language picker
        localStorage.removeItem('shikshapatri-lang-override');
        localStorage.removeItem('shikshapatri-synced-system-lang');
    }

    function onAppLanguageChange() {
        if (!loadPromise) return;
        syncLanguageWithApp();
        if (isDetailActive() && currentSloka) renderSloka(currentSloka.id);
        else if (isListActive()) renderList();
    }

    // ---- Formatting helpers -----------------------------------------------------
    // Drop trailing verse numbers from a Sanskrit verse ('।।१૬૧।।' -> '।।')
    function cleanSanskritVerse(text) {
        if (!text) return '';
        return text.replace(/(\s*(?:।।|॥|\|\||।|\|)\s*[०-९0-9]+\s*(?:।।|॥|\|\||।|\|)?\s*)$/, ' ।।').trim();
    }

    // Line breaks inside a bhashya Sanskrit verse
    function formatBhashyaShlok(text) {
        if (!text) return '';
        text = text.trim();
        if (text.includes('\n')) return text.replace(/\n\n+/g, '<br><br>').replace(/\n/g, '<br>');
        text = text.replace(/((?:॥|[।|]{2})\s*[०-९૦-૯0-9\s\-–—]*(?:॥|[।|]{2}))\s+(?=[ऀ-ॿ])/g, '$1<br><br>');
        text = text.replace(/(?<![।|॥])(?:\s+[।|]\s*|\s*[।|]\s+)(?=[ऀ-ॿ])(?![।|॥])/g, ' ।<br>');
        return text;
    }

    const toDevanagari = num => String(num).replace(/[0-9]/g, d => '०१२३४५६७८९'[d]);

    function translationOf(sloka) {
        return currentLang === 'english' ? (sloka.english || '') : (sloka.gujarati || '');
    }

    const bookmarkedId = () => parseInt(localStorage.getItem('shikshapatri-bookmark')) || null;

    // ---- List screen ------------------------------------------------------------
    function renderList() {
        const list = $('slokas-list');
        list.innerHTML = '';
        const bookmarked = bookmarkedId();
        updateBookmarkChip();

        slokas.forEach(sloka => {
            const card = document.createElement('div');
            card.className = 'sloka-card' + (bookmarked === sloka.id ? ' bookmarked' : '');
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.dataset.slokaId = sloka.id;
            const translation = translationOf(sloka);
            card.setAttribute('aria-label', `Sloka ${sloka.id}${bookmarked === sloka.id ? ' (bookmarked)' : ''}: ${translation.substring(0, 60)}...`);
            card.onclick = () => showSloka(sloka.id);
            card.onkeydown = e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showSloka(sloka.id); }
            };
            card.innerHTML = `
                <div class="sloka-header">
                    <div class="sloka-number-bubble" aria-hidden="true">${sloka.id}</div>
                    <div class="sloka-content-preview">
                        <div class="sloka-sanskrit-preview">${cleanSanskritVerse(sloka.sanskrit).replace(/\n/g, '<br>')}</div>
                        <div class="sloka-translation-preview"></div>
                    </div>
                    ${bookmarked === sloka.id ? '<div class="sloka-card-bookmark" title="Bookmarked Sloka"><i class="fas fa-bookmark" aria-hidden="true"></i></div>' : ''}
                </div>`;
            card.querySelector('.sloka-translation-preview').textContent = translation;
            list.appendChild(card);
        });
    }

    function updateBookmarkChip() {
        const chip = $('sp-bookmark-chip');
        const id = bookmarkedId();
        chip.style.display = id ? 'inline-flex' : 'none';
        if (id) $('sp-bookmark-chip-num').textContent = currentLang === 'english' ? id : toGujaratiDigitsSafe(id);
    }

    const toGujaratiDigitsSafe = n => (typeof toGujaratiDigits === 'function' ? toGujaratiDigits(n) : String(n));

    function scrollToSloka(id, smooth = true) {
        const el = document.querySelector(`#slokas-list [data-sloka-id="${id}"]`);
        if (!el) return;
        el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' });
        el.classList.add('bookmark-highlight');
        setTimeout(() => el.classList.remove('bookmark-highlight'), 1600);
    }

    async function showList(pushState = true) {
        await ensureLoaded();
        currentSloka = null;
        renderList();
        showScreen('shikshapatri-list-screen', false);
        document.title = 'શિક્ષાપત્રી | Shikshapatri — vachanamrut.in';
        if (pushState) window.history.pushState({ shikshapatri: true }, '', `${window.location.pathname}?s=shikshapatri`);
        const target = lastViewedId || bookmarkedId();
        if (target) setTimeout(() => scrollToSloka(target, false), 60);
    }

    // ---- Detail screen ----------------------------------------------------------
    function renderSloka(id) {
        currentSloka = slokas.find(s => s.id === id);
        if (!currentSloka) return false;
        lastViewedId = id;

        $('sloka-title-badge').textContent = `श्लोक ${toDevanagari(id)}`;
        const img = $('sloka-image');
        img.src = `${BASE}pictorial/${id}.png`;
        img.alt = `Pictorial illustration for Sloka ${id}`;

        $('sloka-sanskrit').innerHTML = cleanSanskritVerse(currentSloka.sanskrit).replace(/\n/g, '<br>');
        const text = $('sloka-text');
        text.textContent = translationOf(currentSloka);
        text.classList.toggle('gujarati', currentLang === 'gujarati');

        const slider = $('sloka-slider');
        slider.value = id;
        slider.setAttribute('aria-valuenow', id);
        slider.setAttribute('aria-valuetext', `Sloka ${id} of ${slokas.length}`);
        $('sloka-counter').textContent = `${id} / ${slokas.length}`;
        $('prev-sloka-btn').disabled = id === 1;
        $('next-sloka-btn').disabled = id === slokas.length;
        updateBookmarkPill();
        renderBhashya();
        return true;
    }

    // Shatanand Muni's Arthadeepika bhashya — Gujarati only, collapsed by default
    function renderBhashya() {
        const card = $('bhashya-card'), body = $('bhashya-body'), header = $('bhashya-header'), icon = $('bhashya-toggle-icon');
        const bhashya = currentLang === 'gujarati' && currentSloka.bhashya_id ? getBhashya(currentSloka.bhashya_id) : null;
        if (!bhashya || !bhashya.content || !bhashya.content.length) {
            card.style.display = 'none';
            return;
        }
        let html = '';
        bhashya.content.forEach(item => {
            const text = (item.text || '').trim();
            if (item.type === 'shlok') {
                html += `<div class="bhashya-shlok">${formatBhashyaShlok(text)}</div>`;
                return;
            }
            const devChars = (text.match(/[ऀ-ॿ]/g) || []).length;
            const gujChars = (text.match(/[઀-૿]/g) || []).length;
            if (devChars > 15 && gujChars === 0) {
                html += `<div class="bhashya-shlok">${formatBhashyaShlok(text)}</div>`;
                return;
            }
            // A Sanskrit verse at the start of a Gujarati paragraph
            const match = text.match(/^([ऀ-ॿ\s।॥।,।\.\-\'\"]{15,}[॥।|]{1,2}\s*[०-९૦-૯0-9\s\-–—]+[॥।|]{1,2})\s*(.*)$/s);
            if (match && match[1] && match[2] && /[઀-૿]/.test(match[2])) {
                html += `<div class="bhashya-shlok">${formatBhashyaShlok(match[1].trim())}</div>`;
                html += `<p class="bhashya-paragraph">${match[2].trim()}</p>`;
            } else {
                html += `<p class="bhashya-paragraph">${text}</p>`;
            }
        });
        body.innerHTML = html;
        card.style.display = 'block';
        setBhashyaOpen(false);
        header.onclick = () => setBhashyaOpen(body.style.display === 'none');
    }

    function setBhashyaOpen(open) {
        $('bhashya-body').style.display = open ? 'block' : 'none';
        $('bhashya-header').setAttribute('aria-expanded', open ? 'true' : 'false');
        $('bhashya-toggle-icon').style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
    }

    async function showSloka(id, pushState = true) {
        await ensureLoaded();
        if (!renderSloka(id)) return;
        showScreen('shikshapatri-detail-screen', false);
        document.title = `શ્લોક ${id} | શિક્ષાપત્રી — vachanamrut.in`;
        if (pushState) window.history.pushState({ slokaId: id }, '', `${window.location.pathname}?s=shikshapatri&id=${id}`);
    }

    // ---- Bookmark ---------------------------------------------------------------
    function toggleBookmark() {
        if (!currentSloka) return;
        if (bookmarkedId() === currentSloka.id) localStorage.removeItem('shikshapatri-bookmark');
        else localStorage.setItem('shikshapatri-bookmark', currentSloka.id);
        updateBookmarkPill();
    }

    function updateBookmarkPill() {
        const on = currentSloka && bookmarkedId() === currentSloka.id;
        const btn = $('sp-bookmark-btn');
        btn.classList.toggle('bookmarked', !!on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.querySelector('i').className = on ? 'fas fa-bookmark' : 'far fa-bookmark';
    }

    // ---- Controls ---------------------------------------------------------------
    let controlsReady = false;
    function setupControls() {
        if (controlsReady) return;
        controlsReady = true;
        $('prev-sloka-btn').onclick = () => currentSloka && currentSloka.id > 1 && showSloka(currentSloka.id - 1);
        $('next-sloka-btn').onclick = () => currentSloka && currentSloka.id < slokas.length && showSloka(currentSloka.id + 1);
        $('sloka-slider').oninput = e => showSloka(parseInt(e.target.value));
        $('sp-bookmark-btn').onclick = toggleBookmark;
        $('sp-bookmark-chip').onclick = () => {
            const id = bookmarkedId();
            if (id) showSloka(id);
        };

        document.addEventListener('keydown', e => {
            if (!isDetailActive() || e.target.closest('input, textarea, select')) return;
            if (e.key === 'ArrowLeft' && currentSloka && currentSloka.id > 1) { e.preventDefault(); showSloka(currentSloka.id - 1); }
            if (e.key === 'ArrowRight' && currentSloka && currentSloka.id < slokas.length) { e.preventDefault(); showSloka(currentSloka.id + 1); }
            if ((e.key === 'b' || e.key === 'B') && !e.ctrlKey && !e.metaKey) { e.preventDefault(); toggleBookmark(); }
        });

        // Swipe left/right on a shloka for next/previous
        let startX = 0, startY = 0;
        document.addEventListener('touchstart', e => { startX = e.changedTouches[0].screenX; startY = e.changedTouches[0].screenY; }, { passive: true });
        document.addEventListener('touchend', e => {
            if (!isDetailActive() || !currentSloka) return;
            const dx = e.changedTouches[0].screenX - startX, dy = e.changedTouches[0].screenY - startY;
            if (Math.abs(dx) <= Math.abs(dy) || Math.abs(dx) < 50) return;
            if (dx > 0 && currentSloka.id > 1) showSloka(currentSloka.id - 1);
            if (dx < 0 && currentSloka.id < slokas.length) showSloka(currentSloka.id + 1);
        }, { passive: true });
    }

    // Coming back from Vachanamrut or Settings: reopen the shloka if that's where the reader was
    function resume(toDetail) {
        if (toDetail && lastViewedId) return showSloka(lastViewedId);
        return showList();
    }

    // Back from a shloka goes to the list; returns false when there's nothing to go back to here.
    function back() {
        if (isDetailActive()) {
            showList();
            return true;
        }
        return false;
    }

    window.Shikshapatri = {
        ensureLoaded, getSearchDocs, showList, showSloka, resume, back, onAppLanguageChange, setBhashyaOpen,
        get count() { return slokas.length; },
        bookmarkedId,
        getSloka: id => slokas.find(s => s.id === id),
    };
})();
