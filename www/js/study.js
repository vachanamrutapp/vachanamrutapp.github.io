// Study Time: pick a section (pills), pick a Vachanamrut (dropdown), then read its summary.
// The summary flips to a 10-question quiz (shuffled each time, progress saved) and back.
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
    // sec: index into studySections(); vid: Vachanamrut number; quiz: { id, order[], i, answers[], items[] }
    const saved = (() => { try { return JSON.parse(localStorage.getItem('studySel')) || {}; } catch (e) { return {}; } })();
    const st = { scripture: 'vachanamrut', mode: 'summary', sec: null, vid: saved.vid || null, open: false, aa: false, quiz: null, prompt: null, ready: false };
    const persist = () => { try { localStorage.setItem('studySel', JSON.stringify({ vid: st.vid })); } catch (e) { /* ignore */ } };

    // Quiz progress is kept per Vachanamrut: the shuffled order, the question reached and the answers.
    // Questions are stored by their position in the authored list, so progress survives a language switch.
    const progressAll = () => { try { return JSON.parse(localStorage.getItem('quizProgress')) || {}; } catch (e) { return {}; } };
    function saveProgress() {
        const all = progressAll();
        if (st.quiz && st.quiz.i < st.quiz.order.length) all[st.quiz.id] = { order: st.quiz.order, i: st.quiz.i, answers: st.quiz.answers };
        else if (st.quiz) delete all[st.quiz.id];
        try { localStorage.setItem('quizProgress', JSON.stringify(all)); } catch (e) { /* ignore */ }
    }
    const shuffled = n => {
        const a = Array.from({ length: n }, (_, i) => i);
        for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
        return a;
    };

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
    // Opening the page always starts on the summary
    function open() {
        st.mode = 'summary';
        st.aa = false;
        st.prompt = null;
        return render();
    }

    async function render() {
        const host = $('study-host');
        if (!host) return;
        document.querySelectorAll('[data-study-scripture]').forEach(b => {
            const on = b.dataset.studyScripture === st.scripture;
            b.classList.toggle('active', on);
            b.setAttribute('aria-selected', String(on));
        });
        const showPickers = st.scripture === 'vachanamrut';
        $('study-sections').hidden = !showPickers;
        if (!showPickers) {
            $('study-picker').hidden = true;
            host.innerHTML = `<div class="study-soon"><i class="fas fa-hourglass-half"></i><p>${t('શિક્ષાપત્રીનો સારાંશ અને ક્વિઝ ટૂંક સમયમાં આવશે.', 'Summaries and quizzes for the Shikshapatri are coming soon.')}</p></div>`;
            return;
        }
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

        $('study-sections').innerHTML = secs.map((s, i) =>
            `<button type="button" class="search-chip${i === st.sec ? ' active' : ''}" data-study-sec="${i}" role="tab" aria-selected="${i === st.sec}">${esc(sectionName(s))}</button>`).join('');
        const row = $('study-sections');
        const chip = row.querySelector('.active');
        if (chip) row.scrollLeft = chip.offsetLeft - row.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2;
        renderPicker(secs, summaries, quizzes);
        renderHost(summaries, quizzes);
        pinSticky();
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
        const progress = progressAll();
        list.innerHTML = sec.vachanamruts.map(v => {
            const ready = summaries[v.id] || (quizzes[v.id] || []).length;
            const total = (quizzes[v.id] || []).length || 10;
            const badge = best[v.id] !== undefined ? `<small class="study-pick-best">${num(best[v.id])}/${num(total)}</small>`
                : progress[v.id] ? `<small class="study-pick-best going">${num(progress[v.id].i)}/${num(total)}</small>` : '';
            return `<button type="button" class="study-pick${v.id === st.vid ? ' active' : ''}${ready ? '' : ' soon'}" data-study-vid="${v.id}">
                <span class="study-pick-num">${esc(label(v))}</span><span class="study-pick-title">${esc(heading(v))}</span>${badge}</button>`;
        }).join('');
        const active = list.querySelector('.active');
        list.scrollTop = active ? Math.max(0, active.offsetTop - list.offsetTop - list.clientHeight / 2 + active.clientHeight / 2) : 0;
    }

    // Pin the pills and the chosen Vachanamrut just under the fixed header. Sticky offsets are
    // measured from the scroll area's padding edge, so subtract the page's top padding.
    function pinSticky() {
        const sticky = document.querySelector('.study-sticky');
        const main = $('main-content');
        const header = document.querySelector('header');
        if (!sticky || !main || !header) return;
        const pad = parseFloat(getComputedStyle(main).paddingTop) || 0;
        sticky.style.top = `${Math.round(header.getBoundingClientRect().bottom - pad)}px`;
        // Reach the card's edges exactly (its padding changes with screen size) so nothing spills sideways
        const card = sticky.closest('.glass-card');
        const inset = card ? parseFloat(getComputedStyle(card).paddingLeft) || 0 : 0;
        sticky.style.marginLeft = sticky.style.marginRight = `${-inset}px`;
        sticky.style.paddingLeft = sticky.style.paddingRight = `${inset}px`;
    }
    window.addEventListener('resize', pinSticky);

    // Point the pop-up's little arrow at the centre of the Aa button, whatever the Quiz button's width
    function aimCaret() {
        const pop = document.querySelector('.study-pop');
        const aa = document.querySelector('.study-aa');
        if (!pop || !aa) return;
        const box = pop.parentElement.getBoundingClientRect();
        const a = aa.getBoundingClientRect();
        const popLeft = box.width - pop.offsetWidth;
        pop.style.setProperty('--caret-x', `${a.left + a.width / 2 - box.left - popLeft}px`);
    }

    const readButton = v => `<button type="button" class="quiz-secondary study-read" data-study-act="read" data-vid="${v.id}"><i class="fas fa-book-open"></i> ${t('આ વચનામૃત વાંચો', 'Read this Vachanamrut')}</button>`;

    function soonHtml(v) {
        return `<div class="study-soon"><i class="fas fa-hourglass-half"></i>
            <p>${t('આ વચનામૃતનો સારાંશ અને ક્વિઝ ટૂંક સમયમાં આવશે.', 'The summary and quiz for this Vachanamrut are coming soon.')}</p>
            ${readButton(v)}</div>`;
    }

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
            const resume = !!progressAll()[v.id];
            // Text size and reading theme are the same two settings as on the reading page
            const effective = appTheme === 'default' && window.Appearance && Appearance.isDark() ? 'dark' : appTheme;
            const swatch = (name, gu, e) => `<button type="button" class="theme-btn theme-${name}${appTheme === name ? ' active' : ''}" data-study-theme="${name}" data-label="${t(gu, e)}" title="${t(gu, e)}"></button>`;
            const pop = st.aa ? `
                <div class="theme-popover reader-pop study-pop open" style="--caret-x: calc(100% - 88px)" role="menu">
                    <div class="reader-sizes">
                        <button type="button" class="reader-size-btn" data-study-size="-1" aria-label="${t('નાના અક્ષર', 'Smaller text')}"><i class="fas fa-minus"></i></button>
                        <span class="font-size-display">${appFontSizePercent}%</span>
                        <button type="button" class="reader-size-btn" data-study-size="1" aria-label="${t('મોટા અક્ષર', 'Larger text')}"><i class="fas fa-plus"></i></button>
                    </div>
                    <div class="reader-swatches">${swatch('default', 'સોનેરી', 'Golden')}${swatch('sepia', 'સેપિયા', 'Sepia')}${swatch('dark', 'ડાર્ક', 'Dark')}</div>
                </div>` : '';
            host.innerHTML = `
                <section class="study-summary study-t-${effective}" style="--study-scale:${appFontSizePercent / 100}">
                    <div class="study-head">
                        <div class="study-head-title"><i class="fas fa-sun"></i><span>${t('સારાંશ', 'Summary')}</span></div>
                        <div class="study-head-actions">
                            <button type="button" class="study-aa" data-study-act="aa" aria-label="${t('અક્ષરનું કદ અને થીમ', 'Text size and theme')}" aria-haspopup="true"><span class="aa-glyph">Aa</span></button>
                            ${items.length ? `<button type="button" class="study-quiz-chip" data-study-act="quiz">${resume ? t('ક્વિઝ ચાલુ', 'Resume quiz') : t('ક્વિઝ', 'Quiz')}</button>` : ''}
                            ${pop}
                        </div>
                    </div>
                    <p class="study-key">${esc(item.key)}</p>
                    ${[].concat(item.summary).map(p => `<p class="study-text">${esc(p)}</p>`).join('')}
                    ${themes ? `<div class="study-themes">${themes}</div>` : ''}
                </section>
                <div class="study-actions two">
                    ${items.length ? `<button type="button" class="quiz-next study-begin" data-study-act="quiz"><i class="fas fa-play"></i> ${resume ? t('ક્વિઝ ચાલુ રાખો', 'Resume quiz') : t('ક્વિઝ શરૂ કરો', 'Begin quiz')}</button>` : ''}
                    ${readButton(v)}
                </div>`;
            aimCaret();
            return;
        }
        if (!items.length) { host.innerHTML = soonHtml(v); return; }
        host.innerHTML = quizHtml(v, items);
    }

    // ---- Quiz ---------------------------------------------------------------------------------
    const letters = () => ['A', 'B', 'C', 'D'];
    const backButton = () => `<button type="button" class="study-back" data-study-act="summary"><i class="fas fa-arrow-left"></i> ${t('સારાંશ', 'Summary')}</button>`;

    // Offer to resume when this quiz was left part-way; otherwise start a freshly shuffled one
    function openQuiz(total) {
        const p = progressAll()[st.vid];
        if (p && p.answers && p.answers.length && p.order.length === total && p.i < total) { st.prompt = p; st.quiz = null; }
        else startFresh(total);
    }
    function startFresh(total) {
        st.prompt = null;
        st.quiz = { id: st.vid, order: shuffled(total), i: 0, answers: [] };
        saveProgress();
    }

    function quizHtml(v, items) {
        const total = items.length;
        if (st.prompt) {
            const p = st.prompt;
            return `<div class="quiz-top">${backButton()}</div>
                <div class="quiz-result">
                    <div class="quiz-resume-icon"><i class="fas fa-bookmark"></i></div>
                    <p class="quiz-message">${t('તમારી ક્વિઝ અધૂરી છે', 'You have a quiz in progress')}</p>
                    <p class="quiz-best">${t('પ્રશ્ન', 'Question')} ${num(p.i + 1)} / ${num(total)}</p>
                    <div class="quiz-actions">
                        <button type="button" class="quiz-next" data-study-act="continue"><i class="fas fa-play"></i> ${t('આગળ ચાલુ રાખો', 'Continue')}</button>
                        <button type="button" class="quiz-secondary" data-study-act="restart"><i class="fas fa-rotate-right"></i> ${t('ફરી શરૂ કરો', 'Start again')}</button>
                    </div>
                </div>`;
        }
        if (!st.quiz || st.quiz.id !== v.id || st.quiz.order.length !== total) startFresh(total);
        const q = st.quiz, finished = q.i >= total;
        q.items = q.order.map(k => items[k]);
        return `
            <div class="quiz-top">${backButton()}<div class="quiz-progress">${finished ? '' : `${t('પ્રશ્ન', 'Question')} ${num(q.i + 1)} / ${num(total)}`}</div></div>
            <div class="quiz-bar"><i style="width:${(Math.min(q.i, total) / total) * 100}%"></i></div>
            ${finished ? resultHtml() : questionHtml()}`;
    }

    function questionHtml() {
        const q = st.quiz, item = q.items[q.i], chosen = q.answers[q.i], answered = chosen !== undefined;
        const last = q.i === q.items.length - 1;
        const opts = item.o.map((text, k) => {
            const cls = !answered ? '' : k === item.a ? ' correct' : k === chosen ? ' wrong' : ' dim';
            // The explanation lives inside the correct option, so nothing is shown twice
            const why = answered && k === item.a ? `<span class="quiz-opt-why">${esc(item.why)}</span>` : '';
            return `<button type="button" class="quiz-opt${cls}" data-k="${k}"${answered ? ' disabled' : ''}><span class="quiz-letter">${letters()[k]}</span><span class="quiz-opt-text">${esc(text)}${why}</span></button>`;
        }).join('');
        const prev = q.i > 0 ? `<button type="button" class="quiz-secondary quiz-prev" data-study-act="prev"><i class="fas fa-arrow-left"></i> ${t('પાછળ', 'Back')}</button>` : '';
        const forward = answered ? `<button type="button" class="quiz-next" data-study-act="next">${last ? t('પરિણામ જુઓ', 'See result') : t('આગળ', 'Next')} <i class="fas fa-arrow-right"></i></button>` : '';
        const next = prev || forward ? `<div class="quiz-next-row${prev && forward ? ' two' : ''}">${prev}${forward}</div>` : '';
        return `<h3 class="quiz-q">${esc(item.q)}</h3><div class="quiz-options">${opts}</div>${next}`;
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
                <div class="study-actions two">
                    <button type="button" class="quiz-next" data-study-act="restart"><i class="fas fa-rotate-right"></i> ${t('ફરી ક્વિઝ આપો', 'Quiz again')}</button>
                    ${readButton({ id: q.id })}
                </div>
            </div>${review}`;
    }

    // ---- Events -------------------------------------------------------------------------------
    function setup() {
        const studyBtn = $('study-open-btn');
        if (studyBtn) studyBtn.addEventListener('click', () => openFor(activeVachanamrutId));
        const page = $('notes-screen');
        if (!page) return;
        page.addEventListener('click', async e => {
            const size = e.target.closest('[data-study-size]');
            if (size) {
                const next = appFontSizePercent + Number(size.dataset.studySize) * 10;
                if (next >= 80 && next <= 180) {
                    appFontSizePercent = next;
                    localStorage.setItem('appFontSizePercent', appFontSizePercent);
                    applyFontSize();
                    render();
                }
                return;
            }
            const themeBtn = e.target.closest('[data-study-theme]');
            if (themeBtn) {
                appTheme = themeBtn.dataset.studyTheme;
                localStorage.setItem('appTheme', appTheme);
                applyTheme();
                st.aa = false;
                render();
                return;
            }
            if (st.aa && !e.target.closest('.study-pop') && !e.target.closest('[data-study-act="aa"]')) { st.aa = false; render(); }
            const scripture = e.target.closest('[data-study-scripture]');
            if (scripture) { st.scripture = scripture.dataset.studyScripture; render(); return; }

            const sec = e.target.closest('[data-study-sec]');
            if (sec) {
                const i = Number(sec.dataset.studySec);
                if (i === st.sec) st.open = !st.open;
                else { st.sec = i; st.open = true; st.vid = null; st.quiz = null; st.prompt = null; st.mode = 'summary'; }
                render();
                return;
            }
            if (e.target.closest('#study-picker-head')) { st.open = !st.open; render(); return; }
            const pick = e.target.closest('[data-study-vid]');
            if (pick) { st.vid = Number(pick.dataset.studyVid); st.open = false; st.quiz = null; st.prompt = null; st.mode = 'summary'; persist(); render(); return; }

            const opt = e.target.closest('.quiz-opt');
            if (opt && st.quiz && st.quiz.answers[st.quiz.i] === undefined) {
                st.quiz.answers[st.quiz.i] = Number(opt.dataset.k);
                saveProgress();
                await render();
                const fb = document.querySelector('#study-host .quiz-next-row');
                if (fb) fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                return;
            }
            const act = e.target.closest('[data-study-act]');
            if (!act) return;
            const what = act.dataset.studyAct;
            if (what === 'read') { openVachanamrutById(Number(act.dataset.vid)); return; }
            if (what === 'aa') { st.aa = !st.aa; render(); return; }
            const total = (((await loadStudyData(dataLang())).quizzes)[st.vid] || []).length;
            if (what === 'quiz') { st.mode = 'quiz'; openQuiz(total); }
            else if (what === 'summary') { st.mode = 'summary'; } // progress is already saved
            else if (what === 'continue') { const p = st.prompt; st.quiz = { id: st.vid, order: p.order, i: p.i, answers: p.answers }; st.prompt = null; }
            else if (what === 'restart') { startFresh(total); }
            else if (what === 'next') { st.quiz.i += 1; saveProgress(); }
            else if (what === 'prev') { st.quiz.i = Math.max(0, st.quiz.i - 1); saveProgress(); }
            await render();
            if (what !== 'continue') document.getElementById('main-content').scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // From a reading: jump straight to this Vachanamrut's study page (summary first)
    function openFor(id) {
        st.scripture = 'vachanamrut';
        st.vid = id;
        st.sec = sectionOf(id);
        st.open = false;
        st.aa = false;
        st.quiz = null;
        st.prompt = null;
        st.mode = 'summary';
        st.ready = true;
        persist();
        showScreen('notes-screen');
    }

    window.Study = { render, open, openFor };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
    else setup();
})();
