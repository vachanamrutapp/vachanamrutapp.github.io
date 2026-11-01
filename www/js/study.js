// Study Time: pick a section (pills), pick a Vachanamrut (dropdown), then read its summary or
// take its 10-question quiz.
// Data: stored in assets/data/vachanamrut.db (tables study_summaries and study_quizzes). A Vachanamrut
// without data shows "coming soon" instead.
(function () {
    const $ = id => document.getElementById(id);
    const en = () => uiEnglish();                                         // language of buttons and labels
    const dataLang = () => (currentLanguage === 'english' ? 'en' : 'gu'); // language of the content
    const num = n => (en() ? String(n) : toGujaratiDigits(n));
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const t = (gu, e) => (en() ? e : gu);

    // ---- Data ---------------------------------------------------------------------------------
    const cache = {};
    async function loadStudyData(lang) {
        if (cache[lang]) return cache[lang];
        const summaries = {};
        const quizzes = {};
        try {
            if (typeof initSql === 'function') await initSql();
            if (db) {
                const sStmt = db.prepare("SELECT vachanamrut_id, key_line, summary, themes FROM study_summaries WHERE language = :lang");
                sStmt.bind({ ":lang": lang });
                while (sStmt.step()) {
                    const row = sStmt.getAsObject();
                    summaries[row.vachanamrut_id] = {
                        key: row.key_line,
                        summary: JSON.parse(row.summary),
                        themes: JSON.parse(row.themes)
                    };
                }
                sStmt.free();

                const qStmt = db.prepare("SELECT vachanamrut_id, question, options, answer_index, why FROM study_quizzes WHERE language = :lang ORDER BY vachanamrut_id, question_order");
                qStmt.bind({ ":lang": lang });
                while (qStmt.step()) {
                    const row = qStmt.getAsObject();
                    if (!quizzes[row.vachanamrut_id]) quizzes[row.vachanamrut_id] = [];
                    quizzes[row.vachanamrut_id].push({
                        q: row.question,
                        o: JSON.parse(row.options),
                        a: row.answer_index,
                        why: row.why
                    });
                }
                qStmt.free();
            }
        } catch (e) {
            console.error('Loading study data from SQLite failed:', e);
        }

        cache[lang] = { summaries, quizzes };
        return cache[lang];
    }
    const bestAll = () => { try { return JSON.parse(localStorage.getItem('quizBest')) || {}; } catch (e) { return {}; } };
    function saveBest(id, score) {
        const all = bestAll();
        all[id] = Math.max(score, all[id] || 0);
        try { localStorage.setItem('quizBest', JSON.stringify(all)); } catch (e) { /* storage blocked */ }
        return all[id];
    }

    // ---- State --------------------------------------------------------------------------------
    // sec: index into studySections(); vid: Vachanamrut number; quiz: the quiz in progress
    const saved = (() => { try { return JSON.parse(localStorage.getItem('studySel')) || {}; } catch (e) { return {}; } })();
    const st = { mode: saved.mode === 'quiz' ? 'quiz' : 'summary', sec: null, vid: saved.vid || null, open: false, quiz: null, ready: false };
    const persist = () => { try { localStorage.setItem('studySel', JSON.stringify({ mode: st.mode, vid: st.vid })); } catch (e) { /* ignore */ } };

    // The 262 Vachanamruts only (Partharo and Khagol Bhugol have no study data yet)
    const studySections = () => (typeof sections === 'undefined' ? [] : sections).filter(s =>
        Array.isArray(s.vachanamruts) && s.vachanamruts.length && s.vachanamruts.every(v => v && v.id <= 262));
    const sectionName = s => (currentLanguage === 'english' ? s.name_en : s.name_gu) || s.name_en || s.name_gu;
    const findVachanamrut = id => {
        for (const s of studySections()) { const v = s.vachanamruts.find(x => x.id === id); if (v) return v; }
        return null;
    };
    const sectionOf = id => studySections().findIndex(s => s.vachanamruts.some(v => v.id === id));
    const label = v => String(v.vachanamrut || '').replace(/\n/g, ' ').trim();
    const heading = v => String(v.title || '').replace(/\n/g, ' ').trim();

    // ---- Render -------------------------------------------------------------------------------
    async function render() {
        const host = $('study-host');
        if (!host) return;
        const secs = studySections();
        if (!secs.length) { host.innerHTML = ''; return; }
        const lang = dataLang();
        const { summaries, quizzes } = await loadStudyData(lang);
        if (dataLang() !== lang) return;

        // First visit: open the first Vachanamrut that has study data
        if (!st.ready) {
            st.ready = true;
            if (!st.vid || sectionOf(st.vid) < 0) {
                const first = secs.flatMap(s => s.vachanamruts).find(v => summaries[v.id]);
                st.vid = first ? first.id : secs[0].vachanamruts[0].id;
            }
            st.sec = sectionOf(st.vid);
        }
        if (st.sec === null || st.sec >= secs.length) st.sec = Math.max(0, sectionOf(st.vid));

        document.querySelectorAll('[data-study-mode]').forEach(b => {
            const on = b.dataset.studyMode === st.mode;
            b.classList.toggle('active', on);
            b.setAttribute('aria-selected', String(on));
        });
        $('study-sections').innerHTML = secs.map((s, i) =>
            `<button type="button" class="search-chip${i === st.sec ? ' active' : ''}" data-study-sec="${i}" role="tab" aria-selected="${i === st.sec}">${esc(sectionName(s))}</button>`).join('');
        const row = $('study-sections');
        const chip = row.querySelector('.active');
        if (chip) row.scrollLeft = chip.offsetLeft - row.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2;
        renderPicker(secs, summaries, quizzes);
        renderHost(summaries, quizzes);
    }

    function renderPicker(secs, summaries, quizzes) {
        const picker = $('study-picker');
        const sec = secs[st.sec];
        picker.hidden = !sec;
        if (!sec) return;
        const current = st.vid ? findVachanamrut(st.vid) : null;
        const head = $('study-picker-head');
        head.hidden = !current;
        head.setAttribute('aria-expanded', String(st.open));
        head.innerHTML = current ? `<span class="study-pick-num">${esc(label(current))}</span><span class="study-pick-title">${esc(heading(current))}</span><i class="fas fa-chevron-down"></i>` : '';
        head.classList.toggle('open', st.open);
        const list = $('study-picker-list');
        list.hidden = !st.open;
        if (!st.open) return;
        const best = bestAll();
        list.innerHTML = sec.vachanamruts.map(v => {
            const ready = summaries[v.id] || (quizzes[v.id] || []).length;
            const score = best[v.id] !== undefined ? `<small class="study-pick-best">${num(best[v.id])}/${num((quizzes[v.id] || []).length || 10)}</small>` : '';
            return `<button type="button" class="study-pick${v.id === st.vid ? ' active' : ''}${ready ? '' : ' soon'}" data-study-vid="${v.id}">
                <span class="study-pick-num">${esc(label(v))}</span><span class="study-pick-title">${esc(heading(v))}</span>${score}</button>`;
        }).join('');
        const active = list.querySelector('.active');
        list.scrollTop = active ? Math.max(0, active.offsetTop - list.offsetTop - list.clientHeight / 2 + active.clientHeight / 2) : 0;
    }

    function soonHtml(v) {
        return `<div class="study-soon"><i class="fas fa-hourglass-half"></i>
            <p>${t('આ વચનામૃતનો સારાંશ અને ક્વિઝ ટૂંક સમયમાં આવશે.', 'The summary and quiz for this Vachanamrut are coming soon.')}</p>
            ${readButton(v)}</div>`;
    }
    const readButton = v => `<button type="button" class="quiz-secondary" data-study-act="read" data-vid="${v.id}"><i class="fas fa-book-open"></i> ${t('આ વચનામૃત વાંચો', 'Read this Vachanamrut')}</button>`;

    function renderHost(summaries, quizzes) {
        const host = $('study-host');
        const v = st.vid ? findVachanamrut(st.vid) : null;
        if (!v) { host.innerHTML = `<p class="study-hint">${t('ઉપરથી વચનામૃત પસંદ કરો.', 'Choose a Vachanamrut above.')}</p>`; return; }
        const item = summaries[v.id];
        const items = quizzes[v.id] || [];
        if (st.mode === 'summary') {
            if (!item) { host.innerHTML = soonHtml(v); return; }
            const themes = (item.themes || []).map(id => NIDIDHYAS_THEMES.find(th => th.id === id)).filter(Boolean)
                .map(th => `<span class="study-theme">${esc(nididhyasName(th))}</span>`).join('');
            host.innerHTML = `
                <section class="study-summary">
                    <div class="study-head"><i class="fas fa-sun"></i><span>${t('સારાંશ', 'Summary')}</span></div>
                    <p class="study-key">${esc(item.key)}</p>
                    ${[].concat(item.summary).map(p => `<p class="study-text">${esc(p)}</p>`).join('')}
                    ${themes ? `<div class="study-themes">${themes}</div>` : ''}
                </section>
                <div class="study-actions">
                    ${items.length ? `<button type="button" class="study-quiz-btn" data-study-act="quiz"><i class="fas fa-circle-question"></i><span>${t('પોતાને ચકાસો', 'Test yourself')} · ${num(items.length)} ${t('પ્રશ્નો', 'questions')}</span></button>` : ''}
                    ${readButton(v)}
                </div>`;
            return;
        }
        if (!items.length) { host.innerHTML = soonHtml(v); return; }
        if (!st.quiz || st.quiz.id !== v.id) st.quiz = { id: v.id, i: 0, answers: [] };
        st.quiz.items = items; // content follows the reading language; answers and position are kept
        host.innerHTML = quizHtml(v);
    }

    // ---- Quiz ---------------------------------------------------------------------------------
    const letters = () => (dataLang() === 'en' ? ['A', 'B', 'C', 'D'] : ['અ', 'બ', 'ક', 'ડ']);

    function quizHtml(v) {
        const q = st.quiz, total = q.items.length, finished = q.i >= total;
        const head = `
            <div class="quiz-head"><div class="quiz-title">${esc(label(v))}</div>
            <div class="quiz-progress">${finished ? '' : `${t('પ્રશ્ન', 'Question')} ${num(q.i + 1)} / ${num(total)}`}</div></div>
            <div class="quiz-bar"><i style="width:${(Math.min(q.i, total) / total) * 100}%"></i></div>`;
        return head + (finished ? resultHtml() : questionHtml());
    }

    function questionHtml() {
        const q = st.quiz, item = q.items[q.i], chosen = q.answers[q.i], answered = chosen !== undefined;
        const last = q.i === q.items.length - 1;
        const opts = item.o.map((text, k) => {
            const cls = !answered ? '' : k === item.a ? ' correct' : k === chosen ? ' wrong' : ' dim';
            return `<button type="button" class="quiz-opt${cls}" data-k="${k}"${answered ? ' disabled' : ''}><span class="quiz-letter">${letters()[k]}</span><span class="quiz-opt-text">${esc(text)}</span></button>`;
        }).join('');
        const feedback = answered ? `
            <div class="quiz-feedback ${chosen === item.a ? 'ok' : 'no'}">
                <div class="quiz-verdict">${chosen === item.a ? t('સાચો જવાબ!', 'Correct!') : `${t('સાચો જવાબ', 'Correct answer')}: ${esc(item.o[item.a])}`}</div>
                <p class="quiz-why">${esc(item.why)}</p>
                <button type="button" class="quiz-next" data-study-act="next">${last ? t('પરિણામ જુઓ', 'See result') : t('આગળ', 'Next')} <i class="fas fa-arrow-right"></i></button>
            </div>` : '';
        return `<h3 class="quiz-q">${esc(item.q)}</h3><div class="quiz-options">${opts}</div>${feedback}`;
    }

    function resultHtml() {
        const q = st.quiz, total = q.items.length;
        const score = q.items.reduce((n, item, i) => n + (q.answers[i] === item.a ? 1 : 0), 0);
        const best = saveBest(q.id, score);
        const message = score === total ? t('પૂરેપૂરા ગુણ! જય સ્વામિનારાયણ!', 'Perfect score. Jay Swaminarayan!')
            : score >= 8 ? t('ઉત્તમ! તમે શ્રીજીમહારાજનો સંદેશ સારી રીતે સમજ્યા છો.', "Excellent. You have understood Maharaj's message well.")
            : score >= 6 ? t('સારું. એકવાર ફરી વાંચી ફરી પ્રયત્ન કરો.', 'Good. Read it once more and try again.')
            : t('આ વચનામૃત ફરી ધ્યાનથી વાંચી ફરી પ્રયત્ન કરો.', 'Read this Vachanamrut again with attention, then try once more.');
        const missed = q.items.filter((item, i) => q.answers[i] !== item.a);
        const review = missed.length ? `<div class="quiz-review"><h4>${t('ફરી જુઓ', 'Review')}</h4>${missed.map(item =>
            `<div class="quiz-review-item"><div class="quiz-review-q">${esc(item.q)}</div><div class="quiz-review-a"><i class="fas fa-check"></i> ${esc(item.o[item.a])}</div></div>`).join('')}</div>` : '';
        return `
            <div class="quiz-result">
                <div class="quiz-score"><b>${num(score)}</b><span>/ ${num(total)}</span></div>
                <p class="quiz-message">${message}</p>
                <p class="quiz-best">${t('શ્રેષ્ઠ', 'Best')}: ${num(best)} / ${num(total)}</p>
                <div class="quiz-actions">
                    <button type="button" class="quiz-next" data-study-act="retry"><i class="fas fa-rotate-right"></i> ${t('ફરી પ્રયત્ન કરો', 'Try again')}</button>
                    ${readButton({ id: q.id })}
                </div>
            </div>${review}`;
    }

    // ---- Events -------------------------------------------------------------------------------
    function redraw() { render(); }

    function setup() {
        const panel = $('notes-screen');
        if (!panel) return;
        panel.addEventListener('click', e => {
            const mode = e.target.closest('[data-study-mode]');
            if (mode) { st.mode = mode.dataset.studyMode; st.quiz = null; persist(); redraw(); return; }

            const sec = e.target.closest('[data-study-sec]');
            if (sec) {
                const i = Number(sec.dataset.studySec);
                if (i === st.sec) st.open = !st.open;
                else { st.sec = i; st.open = true; st.vid = null; st.quiz = null; }
                redraw();
                return;
            }
            if (e.target.closest('#study-picker-head')) { st.open = !st.open; redraw(); return; }
            const pick = e.target.closest('[data-study-vid]');
            if (pick) { st.vid = Number(pick.dataset.studyVid); st.open = false; st.quiz = null; persist(); redraw(); return; }

            const opt = e.target.closest('.quiz-opt');
            if (opt && st.quiz && st.quiz.answers[st.quiz.i] === undefined) {
                st.quiz.answers[st.quiz.i] = Number(opt.dataset.k);
                redraw();
                setTimeout(() => { const fb = document.querySelector('#study-host .quiz-feedback'); if (fb) fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 60);
                return;
            }
            const act = e.target.closest('[data-study-act]');
            if (!act) return;
            const what = act.dataset.studyAct;
            if (what === 'quiz') { st.mode = 'quiz'; st.quiz = null; persist(); redraw(); }
            else if (what === 'next') { st.quiz.i += 1; redraw(); }
            else if (what === 'retry') { st.quiz = { id: st.vid, i: 0, answers: [] }; redraw(); }
            else if (what === 'read') openVachanamrutById(Number(act.dataset.vid));
        });
    }

    window.Study = { render };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
    else setup();
})();
