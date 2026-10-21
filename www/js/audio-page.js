// Audio page: every Vachanamrut (plus Partharo and Khagol Bhugol) as audio.
// The full list scrolls on the page; tapping a row plays it. While something plays, a glass player
// with an animated waveform docks above the bottom bar. "Play in a row" continues down
// the filtered list. Download-all shares its code with Settings (renderOfflineAudio in app.js).
(function () {
    const $ = id => document.getElementById(id);
    const audio = new Audio();
    audio.preload = 'metadata';

    const PARTHARO_ID = 10000;
    const en = () => uiEnglish();
    const num = n => (en() ? String(n) : toGujaratiDigits(n));
    const clean = t => (t || '').replace(/\n/g, ' ').trim();
    const t = (e, g) => (en() ? e : g);

    let tracks = [];        // every playable item, in reading order
    let shown = [];         // tracks after the filters
    let current = null;     // the track loaded in the player
    let playing = false;
    let filterKey = 'all';  // 'all' | section key | 'downloaded'
    let query = '';
    let autoNext = localStorage.getItem('apAutoNext') !== 'false';
    let downloaded = new Set();
    let sources = [], sourceIndex = 0, blobUrl = null, loadToken = 0;
    let seeking = false;
    let screenId = '';
    let onReadingScreen = false;

    // ---- Data -------------------------------------------------------------------------------
    function buildTracks() {
        const out = [];
        const partharo = sections.find(s => s.vachanamruts.some(v => v.id >= 10001 && v.id <= 10005));
        const sectionName = s => (currentLanguage === 'english' ? (s.name_en || s.name_gu) : s.name_gu);
        if (partharo) {
            out.push({ id: PARTHARO_ID, key: 'sec-partharo', name: sectionName(partharo), title: '', file: audioFileName(PARTHARO_ID), section: partharo });
        }
        sections.forEach((s, si) => {
            s.vachanamruts.forEach(v => {
                if (v.id >= 10001 && v.id <= 10005) return; // Partharo chapters are covered by the whole
                out.push({ id: v.id, key: `sec-${si}`, name: clean(v.vachanamrut), title: clean(v.title), file: audioFileName(v.id), section: s });
            });
        });
        return out;
    }

    function chipList() {
        const chips = [{ key: 'all', label: t('All', 'બધા') }];
        const seen = new Set();
        tracks.forEach(tr => {
            if (seen.has(tr.key)) return;
            seen.add(tr.key);
            const s = tr.section;
            chips.push({ key: tr.key, label: currentLanguage === 'english' ? (s.name_en || s.name_gu) : s.name_gu });
        });
        if (canDownloadAudio) chips.push({ key: 'downloaded', label: t('Downloaded', 'ડાઉનલોડ થયેલા') });
        return chips;
    }

    const urlFor = file => new URL(`${AUDIO_BASE}${file}`, document.baseURI).href;
    const isDownloaded = tr => downloaded.has(urlFor(tr.file));
    const byId = id => tracks.find(x => x.id === id);

    async function refreshDownloaded() {
        if (!canDownloadAudio) return;
        try {
            const cache = await caches.open(OFFLINE_AUDIO_CACHE);
            downloaded = new Set((await cache.keys()).map(r => r.url));
        } catch (e) { downloaded = new Set(); }
        if ($('audio-screen').classList.contains('active')) renderList();
    }

    // ---- Rendering --------------------------------------------------------------------------
    function applyFilters() {
        const q = query.trim().toLowerCase();
        shown = tracks.filter(tr => {
            if (filterKey === 'downloaded') { if (!isDownloaded(tr)) return false; }
            else if (filterKey !== 'all' && tr.key !== filterKey) return false;
            return !q || (tr.name + ' ' + tr.title).toLowerCase().includes(q);
        });
    }

    function renderChips() {
        $('ap-chips').innerHTML = chipList().map(c =>
            `<button type="button" class="search-chip${c.key === filterKey ? ' active' : ''}" data-key="${c.key}" role="tab" aria-selected="${c.key === filterKey}">${c.label}</button>`
        ).join('');
    }

    // A stable pseudo-waveform per track: the same shape every time, with a gentle envelope
    const WAVE_BARS = 52;
    function waveHtml(id, count = WAVE_BARS) {
        let seed = (id * 2654435761) >>> 0;
        const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x ^= x + Math.imul(x ^ (x >>> 7), 61 | x); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
        let bars = '';
        for (let k = 0; k < count; k++) {
            const envelope = 0.55 + 0.45 * Math.sin((k / (count - 1)) * Math.PI);
            const h = Math.max(0.16, Math.min(1, (0.25 + rnd() * 0.75) * envelope + 0.1));
            bars += `<i style="--h:${h.toFixed(2)};--k:${k}"></i>`;
        }
        return `<div class="ap-wave" role="slider" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0">
            <div class="ap-wave-bars ap-wave-base">${bars}</div>
            <div class="ap-wave-bars ap-wave-fill">${bars}</div>
        </div>`;
    }

    const RATES = [1, 1.25, 1.5, 0.75];
    let rate = parseFloat(localStorage.getItem('apRate')) || 1;
    audio.defaultPlaybackRate = rate;
    audio.playbackRate = rate;
    const rateLabel = r => `${r}×`;


    function renderList() {
        applyFilters();
        $('ap-count').textContent = num(shown.length);
        const list = $('ap-list');
        if (!shown.length) {
            list.innerHTML = `<div class="my-notes-empty">${filterKey === 'downloaded'
                ? t('Nothing downloaded yet.', 'હજુ કંઈ ડાઉનલોડ થયું નથી.')
                : t('No match.', 'કંઈ મળ્યું નથી.')}</div>`;
            return;
        }
        list.innerHTML = shown.map(tr => `
            <div class="ap-row" data-id="${tr.id}">
                <button type="button" class="ap-row-main" data-act="row" aria-expanded="false">
                    <span class="ap-row-icon"><i class="fas fa-play"></i></span>
                    <span class="ap-row-text">
                        <span class="ap-row-name">${tr.name}</span>
                        ${tr.title ? `<span class="ap-row-title">${tr.title}</span>` : ''}
                    </span>
                    <span class="ap-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
                    ${isDownloaded(tr) ? '<i class="fas fa-check-circle ap-row-dl" aria-label="Downloaded"></i>' : ''}
                </button>
                <button type="button" class="ap-row-read" data-act="read" aria-label="${t('Read', 'વાંચો')}"><i class="fas fa-book-open"></i></button>
            </div>`).join('');
        syncRows();
    }

    // Update classes and icons without rebuilding the list
    function syncRows() {
        document.querySelectorAll('#ap-list .ap-row').forEach(row => {
            const id = parseInt(row.dataset.id);
            const on = current && current.id === id;
            row.classList.toggle('current', !!on);
            row.classList.toggle('playing', !!on && playing);
            row.querySelector('.ap-row-icon i').className = `fas ${on && playing ? 'fa-pause' : 'fa-play'}`;
        });
        $('ap-dock-play').querySelector('i').className = `fas ${playing ? 'fa-pause' : 'fa-play'}`;
        syncTimes();
        renderDock();
    }

    function syncTimes() {
        const dur = audio.duration;
        const pct = dur ? (audio.currentTime / dur) * 100 : 0;
        const cur = formatTime(audio.currentTime || 0), total = formatTime(dur);
        if (seeking) return;
        const dockWave = $('ap-dock-wave').firstElementChild;
        if (dockWave) {
            dockWave.style.setProperty('--p', `${pct}%`);
            dockWave.setAttribute('aria-valuenow', String(Math.round(pct)));
        }
        setDockTime(cur, total);
    }

    function setDockTime(cur, total) {
        $('ap-dock-time').textContent = `${cur} / ${total}`;
    }

    let dockTrackId = null;
    function renderDock() {
        const dock = $('ap-dock');
        const visible = !!current && !onReadingScreen && (screenId === 'audio-screen' || playing);
        const appearing = visible && dock.hidden;
        dock.hidden = !visible;
        if (appearing) {
            // swap the glass filter for plain blur while the entrance animation runs (see styles.css)
            dock.classList.add('enter');
            clearTimeout(dock._enterTimer);
            dock._enterTimer = setTimeout(() => dock.classList.remove('enter'), 420);
        }
        document.body.classList.toggle('ap-dock-on', visible);
        dock.classList.toggle('playing', playing);
        if (!current) return;
        $('ap-dock-name').textContent = current.name;
        if (dockTrackId !== current.id) {
            dockTrackId = current.id;
            $('ap-dock-wave').innerHTML = waveHtml(current.id, 40);
            syncTimes();
        }
    }

    function render() {
        tracks = buildTracks();
        if (current) current = byId(current.id) || current; // names follow the language
        $('ap-filter').placeholder = t('Filter by name or title', 'નામ કે શીર્ષક શોધો');
        renderChips();
        renderList();
        $('ap-auto').setAttribute('aria-pressed', String(autoNext));
        $('ap-auto').classList.toggle('on', autoNext);
        const offline = $('ap-offline');
        if (offline) offline.hidden = !canDownloadAudio;
    }

    // ---- Playback ---------------------------------------------------------------------------
    async function setSource(file) {
        const token = ++loadToken;
        sources = audioSources(file);
        sourceIndex = 0;
        if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
        let src = sources[0];
        if (blobOfflineAudio) {
            try {
                const res = await (await caches.open(OFFLINE_AUDIO_CACHE)).match(sources[0]);
                if (res && token === loadToken) { blobUrl = URL.createObjectURL(await res.blob()); src = blobUrl; }
            } catch (e) { /* stream instead */ }
        }
        if (token !== loadToken) return false;
        audio.src = src;
        audio.load();
        return true;
    }

    async function playTrack(tr) {
        if (!tr) return;
        if (current && current.id === tr.id) {
            playing ? audio.pause() : audio.play().catch(() => {});
            return;
        }
        const dockWasHidden = $('ap-dock').hidden;
        // The reading page's own player must not play at the same time
        if (typeof audioPlayer !== 'undefined') { audioPlayer.pause(); isPlaying = false; updateAudioBarUI(); }
        current = tr;
        localStorage.setItem('apLast', String(tr.id));
        syncRows();
        updateMediaSession();
        // let the dock finish sliding in before the audio starts (see the reading page's player)
        if (await setSource(tr.file)) setTimeout(() => { if (current === tr) audio.play().catch(() => {}); }, dockWasHidden ? 240 : 0);
    }

    function togglePlay() {
        if (!current) return;
        playing ? audio.pause() : audio.play().catch(() => {});
    }

    function step(delta) {
        if (!current) return;
        let list = shown, i = list.findIndex(x => x.id === current.id);
        if (i === -1) { list = tracks; i = list.findIndex(x => x.id === current.id); }
        const next = list[i + delta];
        if (next) {
            playTrack(next);
        } else if (delta > 0) { audio.pause(); audio.currentTime = 0; }
    }

    audio.addEventListener('play', () => { playing = true; syncRows(); });
    audio.addEventListener('pause', () => { playing = false; syncRows(); });
    audio.addEventListener('ended', () => { playing = false; if (autoNext) step(1); else syncRows(); });
    audio.addEventListener('loadedmetadata', syncTimes);
    audio.addEventListener('timeupdate', () => { if (audio.duration) syncTimes(); });
    audio.addEventListener('error', () => {
        if (!current || audio.src.startsWith('blob:') || sourceIndex >= sources.length - 1) return;
        const resumeAt = audio.currentTime || 0;
        sourceIndex++;
        audio.src = sources[sourceIndex];
        audio.load();
        if (resumeAt) audio.addEventListener('loadedmetadata', () => { audio.currentTime = resumeAt; }, { once: true });
        audio.play().catch(() => {});
    });

    // Lock-screen / notification controls where the WebView supports them
    function updateMediaSession() {
        if (!('mediaSession' in navigator) || !current) return;
        try {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: current.name + (current.title ? ` · ${current.title}` : ''),
                artist: 'Sadguru Shree Gyanjivandasji Swami · Kundaldham',
                album: 'Vachanamrut',
            });
            navigator.mediaSession.setActionHandler('play', () => audio.play().catch(() => {}));
            navigator.mediaSession.setActionHandler('pause', () => audio.pause());
            navigator.mediaSession.setActionHandler('previoustrack', () => step(-1));
            navigator.mediaSession.setActionHandler('nexttrack', () => step(1));
            navigator.mediaSession.setActionHandler('seekbackward', () => { audio.currentTime = Math.max(0, audio.currentTime - 15); });
            navigator.mediaSession.setActionHandler('seekforward', () => { audio.currentTime = Math.min(audio.duration || 1e9, audio.currentTime + 15); });
        } catch (e) { /* unsupported */ }
    }

    function readTrack(tr) {
        if (!tr) return;
        if (tr.id === PARTHARO_ID) {
            const i = sections.indexOf(tr.section);
            if (i >= 0) showSectionDetail(i);
        } else {
            openVachanamrutById(tr.id);
        }
    }

    function setRate(r) {
        rate = r;
        localStorage.setItem('apRate', String(r));
        audio.defaultPlaybackRate = r;
        audio.playbackRate = r;
        $('ap-dock-rate').textContent = rateLabel(r);
    }
    audio.addEventListener('loadedmetadata', () => { audio.playbackRate = rate; });
    $('ap-dock-rate').textContent = rateLabel(rate);

    function seekBy(seconds) {
        if (!audio.duration) return;
        audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds));
    }

    // ---- Events -----------------------------------------------------------------------------
    function wire() {
        $('ap-list').addEventListener('click', e => {
            const row = e.target.closest('.ap-row');
            const act = e.target.closest('[data-act]');
            if (!row || !act) return;
            const tr = byId(parseInt(row.dataset.id));
            if (act.dataset.act === 'read') readTrack(tr);
            else playTrack(tr);
        });
        $('ap-chips').addEventListener('click', e => {
            const chip = e.target.closest('[data-key]');
            if (!chip) return;
            filterKey = chip.dataset.key;
            if (filterKey === 'downloaded') refreshDownloaded();
            renderChips();
            renderList();
        });
        $('ap-filter').addEventListener('input', e => { query = e.target.value; renderList(); });
        $('ap-play-all').addEventListener('click', () => {
            applyFilters();
            if (!shown.length) return;
            current = null; // force a fresh start even if the first one is already loaded
            playTrack(shown[0]);
            syncRows();
        });
        $('ap-auto').addEventListener('click', () => {
            autoNext = !autoNext;
            localStorage.setItem('apAutoNext', String(autoNext));
            $('ap-auto').setAttribute('aria-pressed', String(autoNext));
            $('ap-auto').classList.toggle('on', autoNext);
        });

        // Waveform seeking (in the open row and in the dock): tap or drag across the wave
        let waveDrag = null;
        const waveFraction = (w, e) => {
            const r = w.getBoundingClientRect();
            return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        };
        const waveMove = (w, e) => {
            const f = waveFraction(w, e);
            w.style.setProperty('--p', `${f * 100}%`);
            if (audio.duration) {
                const label = formatTime(f * audio.duration);
                setDockTime(label, formatTime(audio.duration));
            }
            return f;
        };
        const attachWave = container => {
            container.addEventListener('pointerdown', e => {
                const w = e.target.closest('.ap-wave');
                if (!w) return;
                waveDrag = w;
                seeking = true;
                try { w.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
                waveMove(w, e);
            });
            container.addEventListener('pointermove', e => { if (waveDrag) waveMove(waveDrag, e); });
            container.addEventListener('pointerup', e => {
                if (!waveDrag) return;
                const w = waveDrag;
                waveDrag = null;
                const f = waveMove(w, e);
                if (audio.duration) audio.currentTime = f * audio.duration;
                seeking = false;
                syncTimes();
            });
            container.addEventListener('pointercancel', () => { waveDrag = null; seeking = false; syncTimes(); });
            container.addEventListener('keydown', e => {
                if (!e.target.closest('.ap-wave')) return;
                if (e.key === 'ArrowRight') { seekBy(10); e.preventDefault(); }
                if (e.key === 'ArrowLeft') { seekBy(-10); e.preventDefault(); }
            });
        };
        attachWave($('ap-dock'));

        // Dock
        $('ap-dock-rate').addEventListener('click', () => setRate(RATES[(RATES.indexOf(rate) + 1) % RATES.length]));
        $('ap-dock-play').addEventListener('click', togglePlay);
        $('ap-dock-prev').addEventListener('click', () => { if (audio.currentTime > 4) audio.currentTime = 0; else step(-1); });
        $('ap-dock-next').addEventListener('click', () => step(1));
        $('ap-dock-close').addEventListener('click', () => {
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
            current = null;
            playing = false;
            dockTrackId = null;
            $('ap-dock-wave').innerHTML = '';
            if (window.BackgroundAudio) BackgroundAudio.stop();
            syncRows();
        });
        $('ap-dock-info').addEventListener('click', () => {
            if (!current) return;
            if (screenId !== 'audio-screen') { showScreen('audio-screen'); return; }
            const row = document.querySelector(`.ap-row[data-id="${current.id}"]`);
            if (row) row.scrollIntoView({ block: 'center', behavior: 'smooth' });
        });
    }

    let wired = false;
    function ensureWired() {
        if (wired) return;
        wire();
        wired = true;
        if (window.BackgroundAudio) {
            BackgroundAudio.bind(audio, {
                source: 'page',
                trackId: () => (current ? current.id : -1),
                urls: () => sources.filter(u => u.startsWith('http')),
                queue: () => {
                    if (!autoNext || !current) return [];
                    let list = shown, i = list.findIndex(x => x.id === current.id);
                    if (i === -1) { list = tracks; i = list.findIndex(x => x.id === current.id); }
                    return list.slice(i + 1, i + 41).map(tr => ({
                        id: tr.id,
                        title: tr.name + (tr.title ? ` · ${tr.title}` : ''),
                        urls: audioSources(tr.file).filter(u => u.startsWith('http')),
                    }));
                },
                meta: () => ({ title: current ? current.name + (current.title ? ` · ${current.title}` : '') : 'Vachanamrut' }),
                onAction(action, pos) {
                    if (action === 'play') audio.play().catch(() => {});
                    else if (action === 'pause' || action === 'stop') audio.pause();
                    else if (action === 'next') step(1);
                    else if (action === 'previous') { if (audio.currentTime > 4) audio.currentTime = 0; else step(-1); }
                    else if (action === 'seek') audio.currentTime = pos;
                },
            });
        }
    }

    function show() {
        ensureWired();
        render();
        refreshDownloaded();
        if (typeof refreshOfflineAudio === 'function' && canDownloadAudio && !offlineAudioDownloading) refreshOfflineAudio();
    }

    // Called by showScreen: the dock follows the audio around, except over the reading page's own player
    function onScreen(id, readingScreen) {
        ensureWired();
        screenId = id;
        onReadingScreen = !!readingScreen;
        if (onReadingScreen && playing) audio.pause(); // the reading page has its own player
        renderDock();
    }

    // The app was closed while a track played natively and has just been reopened: carry on from there
    async function resume(state) {
        ensureWired();
        if (!tracks.length) tracks = buildTracks();
        const tr = byId(state.trackId);
        if (!tr) return;
        current = tr;
        render();
        updateMediaSession();
        if (await setSource(tr.file)) {
            audio.addEventListener('loadedmetadata', () => {
                if (state.position > 1) audio.currentTime = state.position;
                if (state.playing) audio.play().catch(() => {});
            }, { once: true });
        }
    }

    // Waveform helpers shared with the reading page's audio bar (app.js)
    function bindSeek(container, audioEl, h = {}) {
        let drag = null;
        const frac = (w, e) => {
            const r = w.getBoundingClientRect();
            return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        };
        const move = (w, e) => {
            const f = frac(w, e);
            w.style.setProperty('--p', `${f * 100}%`);
            if (h.move) h.move(f);
            return f;
        };
        container.addEventListener('pointerdown', e => {
            const w = e.target.closest('.ap-wave');
            if (!w) return;
            drag = w;
            try { w.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
            if (h.start) h.start();
            move(w, e);
        });
        container.addEventListener('pointermove', e => { if (drag) move(drag, e); });
        container.addEventListener('pointerup', e => {
            if (!drag) return;
            const f = move(drag, e);
            drag = null;
            if (audioEl.duration) audioEl.currentTime = f * audioEl.duration;
            if (h.end) h.end();
        });
        container.addEventListener('pointercancel', () => { drag = null; if (h.end) h.end(); });
    }
    window.AudioWave = { html: waveHtml, bindSeek };

    window.AudioPage = {
        resume,
        show,
        render,
        onScreen,
        refreshDownloaded,
        pause: () => { if (!audio.paused) audio.pause(); },
        isPlaying: () => playing,
    };
})();
