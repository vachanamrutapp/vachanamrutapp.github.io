// Highlights and notes on Vachanamrut text, "My Notes" in Your Journey, and backup / restore.
// Everything stays on the device (localStorage key 'annotations'); Settings → Your Data exports it to a file.
//
// A highlight is anchored by character offsets into the Vachanamrut's text (paragraphs joined by "\n"),
// plus the quoted words and a little text either side. If the text ever changes, the quote is used
// to find the highlight again; if it can't be found it's kept and listed as "not placed".
(function () {
    const STORE = 'annotations';
    const COLORS = ['yellow', 'saffron', 'green', 'blue'];
    const CONTEXT = 24;
    const $ = id => document.getElementById(id);
    const isEn = () => uiEnglish();
    const t = (en, gu) => (isEn() ? en : gu);
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // ---- Storage --------------------------------------------------------------------
    function load() {
        try {
            const list = JSON.parse(localStorage.getItem(STORE));
            return Array.isArray(list) ? list : [];
        } catch (e) {
            return [];
        }
    }
    function save(list) {
        localStorage.setItem(STORE, JSON.stringify(list));
    }
    function upsert(ann) {
        const list = load().filter(a => a.id !== ann.id);
        ann.updated = Date.now();
        list.push(ann);
        save(list);
    }
    function remove(id) {
        save(load().filter(a => a.id !== id));
    }
    const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

    // ---- Text geometry ----------------------------------------------------------------
    const container = () => $('vachanamrut-text');
    const paragraphs = () => [...container().querySelectorAll(':scope > p')];
    const fullText = () => paragraphs().map(p => p.textContent).join('\n');

    // Global offset of a DOM point inside the reading text
    function globalOffset(node, offset) {
        const paras = paragraphs();
        const para = (node.nodeType === 1 ? node : node.parentElement).closest('#vachanamrut-text > p');
        if (!para) return null;
        const range = document.createRange();
        range.setStart(para, 0);
        range.setEnd(node, offset);
        let base = 0;
        for (const p of paras) {
            if (p === para) break;
            base += p.textContent.length + 1;
        }
        return base + range.toString().length;
    }

    // Wrap global range [start, end) in <mark class="hl ..."> pieces (one per text node it covers)
    function wrap(start, end, ann) {
        const marks = [];
        let base = 0;
        for (const para of paragraphs()) {
            const len = para.textContent.length;
            const s = Math.max(start, base), e = Math.min(end, base + len);
            if (s < e) {
                const walker = document.createTreeWalker(para, NodeFilter.SHOW_TEXT);
                const nodes = [];
                while (walker.nextNode()) nodes.push(walker.currentNode);
                let pos = base;
                for (const node of nodes) {
                    const nStart = pos, nEnd = pos + node.nodeValue.length;
                    pos = nEnd;
                    const a = Math.max(s, nStart), b = Math.min(e, nEnd);
                    if (a >= b) continue;
                    let target = node;
                    if (a > nStart) target = target.splitText(a - nStart);
                    if (b < nEnd) target.splitText(b - a);
                    const mark = document.createElement('mark');
                    mark.className = `hl hl-${ann.color || 'yellow'}`;
                    mark.dataset.ann = ann.id;
                    target.parentNode.replaceChild(mark, target);
                    mark.appendChild(target);
                    marks.push(mark);
                }
            }
            base += len + 1;
        }
        if (ann.note && marks.length) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-sticky-note hl-note-icon';
            icon.dataset.ann = ann.id;
            marks[marks.length - 1].after(icon);
        }
        return marks;
    }

    // Find where an annotation sits in the current text (re-anchoring by its quote if needed)
    function locate(ann, text) {
        if (text.slice(ann.start, ann.end) === ann.quote) return [ann.start, ann.end];
        const withContext = (ann.prefix || '') + ann.quote + (ann.suffix || '');
        let i = text.indexOf(withContext);
        if (i !== -1) return [i + (ann.prefix || '').length, i + (ann.prefix || '').length + ann.quote.length];
        i = text.indexOf(ann.quote);
        if (i !== -1 && text.indexOf(ann.quote, i + 1) === -1) return [i, i + ann.quote.length];
        return null;
    }

    // ---- Rendering on the reading screen ---------------------------------------------------
    let docId = null;
    let focusId = null;

    function render(id) {
        docId = id;
        const text = fullText();
        const mine = load().filter(a => a.docId === id && a.scripture === 'vachanamrut');
        let changed = false;
        for (const ann of mine.filter(a => a.kind === 'highlight' && a.lang === currentLanguage).sort((a, b) => a.created - b.created)) {
            const at = locate(ann, text);
            if (!at) {
                if (!ann.unplaced) { ann.unplaced = true; changed = true; }
                continue;
            }
            if (at[0] !== ann.start || ann.unplaced) {
                [ann.start, ann.end] = at;
                ann.unplaced = false;
                changed = true;
            }
            wrap(ann.start, ann.end, ann);
        }
        if (changed) {
            const others = load().filter(a => !mine.some(m => m.id === a.id));
            save([...others, ...mine]);
        }
        renderDocNote(mine.find(a => a.kind === 'docnote'));
        const otherLang = mine.filter(a => a.kind === 'highlight' && a.lang !== currentLanguage).length;
        const hint = $('hl-other-lang');
        hint.style.display = otherLang ? '' : 'none';
        const otherName = currentLanguage === 'english' ? t('Gujarati', 'ગુજરાતી') : t('English', 'અંગ્રેજી');
        hint.textContent = isEn()
            ? `${otherLang} highlight${otherLang === 1 ? '' : 's'} in the ${otherName} text`
            : `${otherName} લખાણમાં ${toGujaratiDigits(otherLang)} હાઇલાઇટ`;

        if (focusId) {
            const mark = container().querySelector(`mark.hl[data-ann="${focusId}"]`);
            focusId = null;
            if (mark) setTimeout(() => {
                mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
                mark.classList.add('hl-flash');
                setTimeout(() => mark.classList.remove('hl-flash'), 1800);
            }, 250);
        }
    }

    function renderDocNote(note) {
        const card = $('doc-note-card');
        card.style.display = note && note.note ? '' : 'none';
        $('doc-note-text').textContent = note ? note.note : '';
        document.querySelector('.note-open-btn').classList.toggle('has-note', !!(note && note.note));
    }

    // ---- Selection toolbar --------------------------------------------------------------
    const toolbar = $('hl-toolbar');
    let pending = null; // { start, end, quote } of the current selection
    let hideTimer = null;
    let toolbarPressed = false;

    function readSelection() {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
        const range = sel.getRangeAt(0);
        const box = container();
        if (!box.contains(range.startContainer) || !box.contains(range.endContainer)) return null;
        let start = globalOffset(range.startContainer, range.startOffset);
        let end = globalOffset(range.endContainer, range.endOffset);
        if (start === null || end === null) return null;
        const text = fullText();
        while (start < end && /\s/.test(text[start])) start++;
        while (end > start && /\s/.test(text[end - 1])) end--;
        // Snap to whole words (Gujarati vowel signs are marks, so \p{M} keeps syllables intact)
        const inWord = ch => ch && /[\p{L}\p{M}\p{N}]/u.test(ch);
        while (start > 0 && inWord(text[start - 1]) && inWord(text[start])) start--;
        while (end < text.length && inWord(text[end]) && inWord(text[end - 1])) end++;
        if (end - start < 2) return null;
        return { start, end, quote: text.slice(start, end) };
    }

    function showToolbar() {
        clearTimeout(hideTimer);
        toolbar.classList.add('visible');
    }
    function hideToolbar(now = false) {
        clearTimeout(hideTimer);
        const go = () => { if (!toolbarPressed) { toolbar.classList.remove('visible'); pending = null; } };
        if (now) go(); else hideTimer = setTimeout(go, 350);
    }

    document.addEventListener('selectionchange', () => {
        if (!$('vachanamrut-detail-screen').classList.contains('active')) { toolbarPressed = false; hideToolbar(true); return; }
        const sel = readSelection();
        if (sel) { pending = sel; showToolbar(); }
        else hideToolbar();
    });
    toolbar.addEventListener('pointerdown', () => { toolbarPressed = true; });
    document.addEventListener('pointerup', () => setTimeout(() => { toolbarPressed = false; }, 400));

    function createHighlight(color, withNote) {
        if (!pending) return;
        const text = fullText();
        const ann = {
            id: newId(),
            scripture: 'vachanamrut',
            docId,
            lang: currentLanguage,
            kind: 'highlight',
            start: pending.start,
            end: pending.end,
            quote: pending.quote,
            prefix: text.slice(Math.max(0, pending.start - CONTEXT), pending.start),
            suffix: text.slice(pending.end, pending.end + CONTEXT),
            color,
            note: '',
            created: Date.now(),
        };
        upsert(ann);
        window.getSelection().removeAllRanges();
        toolbarPressed = false;
        hideToolbar(true);
        wrap(ann.start, ann.end, ann);
        if (withNote) openSheet(ann);
    }

    toolbar.addEventListener('click', e => {
        const btn = e.target.closest('button');
        if (!btn || !pending) return;
        if (btn.dataset.color) createHighlight(btn.dataset.color, false);
        else if (btn.dataset.action === 'note') createHighlight('yellow', true);
        else if (btn.dataset.action === 'copy') {
            const v = vachanamrutData.find(x => x.id === docId);
            const name = v ? v.vachanamrut.replace(/\n/g, ' ').trim() : '';
            navigator.clipboard.writeText(`“${pending.quote}”\n— ${name} · ${SITE_URL}?id=${docId}&lang=${currentLanguage}`)
                .then(() => showToast(t('Copied with source', 'સ્રોત સાથે કોપી કર્યું'), 'fas fa-check'))
                .catch(() => {});
            window.getSelection().removeAllRanges();
            toolbarPressed = false;
            hideToolbar(true);
        }
    });

    // ---- Tapping a highlight or note icon ------------------------------------------------
    $('vachanamrut-card').addEventListener('click', e => {
        if (e.target.closest('.glossary-word-link')) return; // the glossary popup wins
        const hit = e.target.closest('mark.hl, .hl-note-icon');
        if (!hit || !window.getSelection().isCollapsed) return;
        const ann = load().find(a => a.id === hit.dataset.ann);
        if (ann) openSheet(ann);
    });
    $('doc-note-card').addEventListener('click', () => openDocNote());
    document.querySelector('.note-open-btn').addEventListener('click', () => openDocNote());

    function openDocNote() {
        const existing = load().find(a => a.docId === docId && a.scripture === 'vachanamrut' && a.kind === 'docnote');
        openSheet(existing || { id: newId(), scripture: 'vachanamrut', docId, kind: 'docnote', note: '', created: Date.now(), isNew: true });
    }

    // ---- Sheet: edit colour / note, or delete ----------------------------------------------
    const overlay = $('note-sheet-overlay');
    let editing = null;

    function openSheet(ann) {
        editing = { ...ann };
        const isDocNote = ann.kind === 'docnote';
        const v = vachanamrutData.find(x => x.id === ann.docId);
        $('note-sheet-title').textContent = isDocNote ? t('My note', 'મારી નોંધ') : t('Highlight', 'હાઇલાઇટ');
        $('note-sheet-sub').textContent = v ? v.vachanamrut.replace(/\n/g, ' ').trim() : '';
        $('note-sheet-quote').style.display = isDocNote ? 'none' : '';
        $('note-sheet-quote').textContent = ann.quote || '';
        $('note-sheet-colors').style.display = isDocNote ? 'none' : '';
        overlay.querySelectorAll('[data-sheet-color]').forEach(b => b.classList.toggle('active', b.dataset.sheetColor === (ann.color || 'yellow')));
        const area = $('note-sheet-text');
        area.value = ann.note || '';
        area.placeholder = isDocNote
            ? t('Your thoughts on this Vachanamrut…', 'આ વચનામૃત વિશે તમારા વિચારો…')
            : t('Add a note (optional)', 'નોંધ ઉમેરો (વૈકલ્પિક)');
        $('note-sheet-delete').style.display = ann.isNew ? 'none' : '';
        overlay.style.display = 'flex';
        document.body.classList.add('sheet-open');
        if (isDocNote || ann.isNew || !ann.note) setTimeout(() => area.focus(), 150);
    }

    function closeSheet() {
        overlay.style.display = 'none';
        document.body.classList.remove('sheet-open');
        $('note-sheet-text').blur();
        editing = null;
    }

    function rerender() {
        if (currentReadingVachanamrutId === docId) {
            const v = vachanamrutData.find(x => x.id === docId);
            const top = $('main-content').scrollTop;
            window.skipResumeOnce = true;
            if (v) showVachanamrut(v, false);
            $('main-content').scrollTo(0, top);
        }
    }

    overlay.querySelectorAll('[data-sheet-color]').forEach(btn => btn.addEventListener('click', () => {
        editing.color = btn.dataset.sheetColor;
        overlay.querySelectorAll('[data-sheet-color]').forEach(b => b.classList.toggle('active', b === btn));
    }));
    $('note-sheet-save').addEventListener('click', () => {
        const note = $('note-sheet-text').value.trim();
        const ann = editing;
        delete ann.isNew;
        ann.note = note;
        if (ann.kind === 'docnote' && !note) remove(ann.id);
        else upsert(ann);
        closeSheet();
        rerender();
        if ($('notes-screen').classList.contains('active')) renderMyNotes();
    });
    $('note-sheet-delete').addEventListener('click', () => {
        if (!editing) return;
        remove(editing.id);
        closeSheet();
        rerender();
        if ($('notes-screen').classList.contains('active')) renderMyNotes();
    });
    $('note-sheet-cancel').addEventListener('click', closeSheet);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeSheet(); });

    function handleBack() {
        if (overlay.style.display !== 'none') { closeSheet(); return true; }
        if (toolbar.classList.contains('visible')) {
            window.getSelection().removeAllRanges();
            toolbarPressed = false;
            hideToolbar(true);
            return true;
        }
        return false;
    }

    // ---- My Notes (Your Journey) ----------------------------------------------------------
    let filter = 'all';

    function renderMyNotes() {
        const list = $('my-notes-list');
        const all = load().filter(a => a.scripture === 'vachanamrut').sort((a, b) => (b.updated || b.created) - (a.updated || a.created));
        const shown = filter === 'notes' ? all.filter(a => a.note) : all;
        $('my-notes-count').textContent = isEn() ? all.length : toGujaratiDigits(all.length);
        document.querySelectorAll('[data-notes-filter]').forEach(b => b.classList.toggle('active', b.dataset.notesFilter === filter));

        const lastBackup = parseInt(localStorage.getItem('lastBackupAt')) || 0;
        $('notes-backup-nudge').style.display = all.length >= 5 && Date.now() - lastBackup > 30 * 864e5 ? '' : 'none';

        if (!shown.length) {
            list.innerHTML = `<div class="my-notes-empty">${filter === 'notes'
                ? t('No notes yet.', 'હજુ કોઈ નોંધ નથી.')
                : t('Select words while reading to highlight them or add a note.', 'વાંચતી વખતે શબ્દો પસંદ કરીને હાઇલાઇટ કરો કે નોંધ ઉમેરો.')}</div>`;
            return;
        }
        list.innerHTML = shown.map(a => {
            const v = vachanamrutData.find(x => x.id === a.docId);
            const name = v ? v.vachanamrut.replace(/\n/g, ' ').trim() : a.docId;
            const quote = a.kind === 'docnote' ? '' : `<div class="my-note-quote">“${esc(a.quote)}”</div>`;
            const lang = a.lang && a.lang !== currentLanguage ? `<span class="my-note-lang">${a.lang === 'english' ? 'EN' : 'ગુજ'}</span>` : '';
            return `<button type="button" class="my-note hl-edge-${a.color || 'note'}" data-ann="${a.id}">
                <div class="my-note-head"><span>${a.kind === 'docnote' ? '<i class="fas fa-sticky-note"></i> ' : ''}${esc(name)}</span>${lang}${a.unplaced ? `<span class="my-note-lang">${t('not placed', 'સ્થાન મળ્યું નહીં')}</span>` : ''}</div>
                ${quote}
                ${a.note ? `<div class="my-note-text">${esc(a.note)}</div>` : ''}
            </button>`;
        }).join('');
    }

    $('my-notes-list').addEventListener('click', e => {
        const row = e.target.closest('.my-note');
        if (!row) return;
        const ann = load().find(a => a.id === row.dataset.ann);
        if (!ann) return;
        if (ann.lang && ann.lang !== currentLanguage) {
            showToast(ann.lang === 'english' ? 'This highlight is in the English text — switch to EN' : 'આ હાઇલાઇટ ગુજરાતી લખાણમાં છે — ગુજ પસંદ કરો', 'fas fa-language');
        }
        focusId = ann.kind === 'highlight' ? ann.id : null;
        window.skipResumeOnce = !!focusId;
        openVachanamrutById(ann.docId);
    });
    document.querySelectorAll('[data-notes-filter]').forEach(b => b.addEventListener('click', () => {
        filter = b.dataset.notesFilter;
        renderMyNotes();
    }));
    $('notes-backup-nudge').addEventListener('click', () => exportBackup());

    // ---- Backup & restore -------------------------------------------------------------------
    const LIST_KEYS = ['vach_read_ids', 'sp_read_ids', 'vach_activity_dates', 'favourites', 'shikshapatriFavourites', 'searchRecent'];
    const LATEST_KEYS = ['vach_last_read', 'sp_last_read'];
    const PLAIN_KEYS = ['bookmarkedVachanamrutId', 'shikshapatri-bookmark', 'vach_scroll', 'appLanguage', 'appTheme',
        'appFontSizePercent', 'appTextSize', 'glossaryHighlightEnabled', 'showProgressTracking', 'audioEnabled', 'uiLanguage',
        'reminderMorning', 'reminderMorningTime', 'reminderEvening', 'reminderEveningTime', 'onboardingDone'];

    async function exportBackup() {
        const data = {};
        for (const k of [STORE, 'vach_read_counts', 'nididhyasGroups', 'favouriteGroups', 'shikshapatriNididhyasGroups', 'shikshapatriFavouriteGroups', ...LIST_KEYS, ...LATEST_KEYS, ...PLAIN_KEYS]) {
            const v = localStorage.getItem(k);
            if (v !== null) data[k] = v;
        }
        const json = JSON.stringify({ app: 'vachanamrut', version: 1, exportedAt: new Date().toISOString(), data }, null, 1);
        const name = `vachanamrut-backup-${new Date().toISOString().slice(0, 10)}.json`;
        const P = window.Capacitor && window.Capacitor.Plugins;
        try {
            if (isNativeApp && P && P.Filesystem && P.Share) {
                const file = await P.Filesystem.writeFile({ path: name, data: json, directory: 'CACHE', encoding: 'utf8' });
                await P.Share.share({ title: name, files: [file.uri], dialogTitle: t('Save your backup', 'બેકઅપ સાચવો') });
            } else {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
                a.download = name;
                a.click();
                setTimeout(() => URL.revokeObjectURL(a.href), 2000);
            }
            localStorage.setItem('lastBackupAt', Date.now());
            if ($('notes-screen').classList.contains('active')) renderMyNotes();
        } catch (err) {
            if (!/cancel/i.test(String(err && err.message))) {
                console.error('Backup export failed:', err);
                showToast(t('Could not create the backup', 'બેકઅપ બની શક્યો નહીં'), 'fas fa-exclamation-triangle');
            }
        }
    }

    const parse = (v, fallback) => { try { return JSON.parse(v); } catch (e) { return fallback; } };

    function importBackup(text) {
        const backup = parse(text, null);
        if (!backup || backup.app !== 'vachanamrut' || !backup.data) {
            showToast(t('That file is not a Vachanamrut backup', 'આ વચનામૃત બેકઅપ ફાઈલ નથી'), 'fas fa-exclamation-triangle');
            return;
        }
        const d = backup.data;
        // Notes and highlights: keep whichever copy was edited last
        const mine = new Map(load().map(a => [a.id, a]));
        let added = 0;
        for (const a of parse(d[STORE], []) || []) {
            const cur = mine.get(a.id);
            if (!cur) added++;
            if (!cur || (a.updated || a.created) > (cur.updated || cur.created)) mine.set(a.id, a);
        }
        save([...mine.values()]);
        // Lists: combine
        for (const k of LIST_KEYS) {
            if (d[k] === undefined) continue;
            const merged = [...new Set([...(parse(localStorage.getItem(k), []) || []), ...(parse(d[k], []) || [])])];
            localStorage.setItem(k, JSON.stringify(merged));
        }
        for (const [groupKey, assignmentKey] of [['nididhyasGroups', 'favouriteGroups'], ['shikshapatriNididhyasGroups', 'shikshapatriFavouriteGroups']]) {
            const groups = new Map((parse(localStorage.getItem(groupKey), []) || []).map(g => [g.id, g]));
            for (const g of parse(d[groupKey], []) || []) if (g && g.id && g.name) groups.set(g.id, g);
            localStorage.setItem(groupKey, JSON.stringify([...groups.values()]));
            const assignments = parse(localStorage.getItem(assignmentKey), {}) || {};
            for (const [id, groupIds] of Object.entries(parse(d[assignmentKey], {}) || {})) {
                if (Array.isArray(groupIds)) assignments[id] = [...new Set([...(assignments[id] || []), ...groupIds])];
            }
            localStorage.setItem(assignmentKey, JSON.stringify(assignments));
        }
        const counts = parse(localStorage.getItem('vach_read_counts'), {}) || {};
        for (const [id, n] of Object.entries(parse(d.vach_read_counts, {}) || {})) counts[id] = Math.max(counts[id] || 0, n);
        localStorage.setItem('vach_read_counts', JSON.stringify(counts));
        // Last read: the more recent
        for (const k of LATEST_KEYS) {
            const a = parse(localStorage.getItem(k), null), b = parse(d[k], null);
            if (b && (!a || (b.date || '') > (a.date || ''))) localStorage.setItem(k, d[k]);
        }
        // Settings and bookmarks: only where this device has none
        for (const k of PLAIN_KEYS) {
            if (d[k] !== undefined && localStorage.getItem(k) === null) localStorage.setItem(k, d[k]);
        }
        sessionStorage.setItem('restoredNotes', String(added));
        location.reload();
    }

    $('settings-export-row').addEventListener('click', exportBackup);
    $('settings-import-row').addEventListener('click', () => $('backup-file-input').click());
    $('backup-file-input').addEventListener('change', async e => {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (file) importBackup(await file.text());
    });

    // After a restore reloads the page
    const restored = sessionStorage.getItem('restoredNotes');
    if (restored !== null) {
        sessionStorage.removeItem('restoredNotes');
        window.addEventListener('load', () => setTimeout(() => showToast(
            uiEnglish() ? `Backup restored · ${restored} new notes and highlights` : `બેકઅપ પાછો લાવ્યા · ${toGujaratiDigits(restored)} નવી નોંધ અને હાઇલાઇટ`,
            'fas fa-check'), 1500));
    }

    // Leaving the reading screen: drop the toolbar
    function onScreenChange() {
        toolbarPressed = false;
        hideToolbar(true);
    }

    window.Annotations = { render, renderMyNotes, handleBack, exportBackup, onScreenChange, count: () => load().length };
})();
