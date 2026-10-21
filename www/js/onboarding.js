// First-run setup (Android app) and the Settings → Reminders rows.
// New users: Welcome + language → Reminders (morning / evening / both, with times) → Text size → Appearance → All set.
// Existing users updating: a single "New: daily reminders" card. Shown once; Skip counts as done.
(function () {
    const $ = id => document.getElementById(id);
    const g = (gu, en) => `<span class="lang-guj">${gu}</span><span class="lang-eng">${en}</span>`;

    // ---- Settings → Reminders ------------------------------------------------------------
    async function syncSettings() {
        if (!window.Reminders || !Reminders.available) return;
        $('settings-reminders').style.display = '';
        const p = Reminders.prefs();
        for (const which of ['morning', 'evening']) {
            $(`reminder-${which}-toggle`).checked = p[which];
            $(`reminder-${which}-time`).value = p[`${which}Time`];
            $(`reminder-${which}-time`).disabled = !p[which];
        }
        const denied = (await Reminders.permission()) === 'denied';
        $('reminder-denied-note').style.display = denied ? '' : 'none';
    }

    function wireSettings() {
        if (!window.Reminders || !Reminders.available) return;
        for (const which of ['morning', 'evening']) {
            $(`reminder-${which}-toggle`).addEventListener('change', async e => {
                const ok = await Reminders.setEnabled(which, e.target.checked);
                if (!ok) showToast(uiEnglish() ? 'Allow notifications for Vachanamrut, then come back' : 'વચનામૃત માટે નોટિફિકેશન ચાલુ કરી પાછા આવો', 'fas fa-bell');
                syncSettings();
            });
            $(`reminder-${which}-time`).addEventListener('change', e => {
                if (e.target.value) Reminders.setTime(which, e.target.value);
            });
        }
        $('reminder-test-row').addEventListener('click', async () => {
            const ok = await Reminders.sendTest();
            showToast(ok
                ? (uiEnglish() ? 'Test reminder in 5 seconds' : '૫ સેકન્ડમાં ટેસ્ટ રિમાઇન્ડર')
                : (uiEnglish() ? 'Notifications are off for this app' : 'આ એપ માટે નોટિફિકેશન બંધ છે'), ok ? 'fas fa-paper-plane' : 'fas fa-bell-slash');
            syncSettings();
        });
    }

    // ---- First-run setup -------------------------------------------------------------------
    const ACTIVITY_KEYS = ['vach_read_ids', 'vach_activity_dates', 'favourites', 'bookmarkedVachanamrutId', 'sp_read_ids', 'annotations', 'appTheme', 'vach_scroll'];
    const isExistingUser = () => ACTIVITY_KEYS.some(k => localStorage.getItem(k) !== null);

    const reminderCard = isNew => `
        <div class="setup-card" data-step="reminders">
            <div class="setup-icon"><i class="fas fa-bell"></i></div>
            <h2 class="setup-title">${isNew ? g('નવું: દૈનિક રિમાઇન્ડર', 'New: daily reminders') : g('હળવું દૈનિક રિમાઇન્ડર', 'A gentle daily reminder')}</h2>
            <p class="setup-text">${g('ક્યારે યાદ અપાવીએ? જ્યાંથી છોડ્યું ત્યાંથી આગળનું વાંચન બતાવીશું.', 'When should we remind you? We\'ll suggest what to read next, from where you left off.')}</p>
            <label class="setup-option">
                <input type="checkbox" id="setup-morning" checked>
                <span class="setup-option-icon icon-orange"><i class="fas fa-sun"></i></span>
                <span class="setup-option-text">
                    <b>${g('સવારે', 'Morning')}</b>
                    <small>${g('આગળનું વચનામૃત + શિક્ષાપત્રી શ્લોક', 'Next Vachanamrut + a Shikshapatri shloka')}</small>
                </span>
                <input type="time" id="setup-morning-time" class="reminder-time" value="07:00">
            </label>
            <label class="setup-option">
                <input type="checkbox" id="setup-evening">
                <span class="setup-option-icon icon-indigo"><i class="fas fa-moon"></i></span>
                <span class="setup-option-text">
                    <b>${g('સાંજે', 'Evening')}</b>
                    <small>${g('આગળનું વચનામૃત', 'Next Vachanamrut')}</small>
                </span>
                <input type="time" id="setup-evening-time" class="reminder-time" value="20:00">
            </label>
            <p class="setup-fine">${g('ન જોઈએ તો બંને અનટિક કરો. સેટિંગ્સમાં ક્યારેય બદલી શકો.', 'Untick both if you don\'t want reminders. You can change this anytime in Settings.')}</p>
        </div>`;

    const STEPS = {
        welcome: () => `
            <div class="setup-card" data-step="welcome">
                <img class="setup-logo" src="images/app-logo.png" alt="">
                <h2 class="setup-title">${g('જય સ્વામિનારાયણ', 'Jay Swaminarayan')}</h2>
                <p class="setup-text">${g('વચનામૃત અને શિક્ષાપત્રી, એક જ એપમાં — વાંચો, સાંભળો, શોધો અને નોંધ કરો.', 'The Vachanamrut and the Shikshapatri in one app: read, listen, search and take notes.')}</p>
                <div class="setup-label">App language · એપની ભાષા</div>
                <div class="setup-choice">
                    <button type="button" class="setup-choice-btn" data-applang="english">English</button>
                    <button type="button" class="setup-choice-btn" data-applang="gujarati">ગુજરાતી</button>
                </div>
                <label class="setup-check" id="setup-read-english-row" hidden>
                    <input type="checkbox" id="setup-read-english" checked>
                    <span>
                        <b>Also read the scriptures in English</b>
                        <small>Untick to read the original Gujarati text with English menus.</small>
                    </span>
                </label>
            </div>`,
        reminders: () => reminderCard(false),
        textsize: () => `
            <div class="setup-card" data-step="textsize">
                <div class="setup-icon"><i class="fas fa-text-height"></i></div>
                <h2 class="setup-title">${g('આરામથી વાંચો', 'Read comfortably')}</h2>
                <p class="setup-text">${g('અક્ષરનું કદ પસંદ કરો. મોટા અક્ષર આખી એપમાં લાગુ પડશે.', 'Choose a text size. Large makes everything in the app bigger.')}</p>
                <div class="setup-choice">
                    <button type="button" class="setup-choice-btn" data-size="default">${g('સામાન્ય', 'Default')}</button>
                    <button type="button" class="setup-choice-btn" data-size="large">${g('મોટા', 'Large')}</button>
                </div>
                <p class="setup-preview">${g('પછી શ્રીજીમહારાજ બોલ્યા જે, “એક વાત કહું તે સાંભળો.”', 'Then Shriji Maharaj said, “Listen, I wish to tell you something.”')}</p>
            </div>`,
        appearance: () => `
            <div class="setup-card" data-step="appearance">
                <div class="setup-icon"><i class="fas fa-circle-half-stroke"></i></div>
                <h2 class="setup-title">${g('દેખાવ', 'Appearance')}</h2>
                <p class="setup-text">${g('ઓટો તમારા ફોનના લાઇટ કે ડાર્ક મોડને અનુસરે છે. સેટિંગ્સમાં ક્યારેય બદલી શકો.', 'Auto follows your phone\'s light or dark mode. You can change this anytime in Settings.')}</p>
                <div class="setup-choice setup-choice-3">
                    <button type="button" class="setup-choice-btn" data-appearance="system"><i class="fas fa-circle-half-stroke"></i> ${g('ઓટો', 'Auto')}</button>
                    <button type="button" class="setup-choice-btn" data-appearance="light"><i class="fas fa-sun"></i> ${g('લાઇટ', 'Light')}</button>
                    <button type="button" class="setup-choice-btn" data-appearance="dark"><i class="fas fa-moon"></i> ${g('ડાર્ક', 'Dark')}</button>
                </div>
            </div>`,
        done: () => `
            <div class="setup-card" data-step="done">
                <div class="setup-icon"><i class="fas fa-check"></i></div>
                <h2 class="setup-title">${g('બધું તૈયાર છે', 'You\'re all set')}</h2>
                <p class="setup-text">${g('ક્યાંથી શરૂ કરવું છે?', 'Where would you like to begin?')}</p>
                <button type="button" class="setup-primary" data-start="vachanamrut"><i class="fas fa-book-open"></i> ${g('વચનામૃત: ગઢડા પ્રથમ ૧', 'Vachanamrut: Gadhada I-1')}</button>
                <button type="button" class="setup-secondary" data-start="shikshapatri"><i class="fas fa-scroll"></i> ${g('શિક્ષાપત્રી ખોલો', 'Open the Shikshapatri')}</button>
                <button type="button" class="setup-link" data-start="home">${g('હોમ પર જાઓ', 'Go to home')}</button>
            </div>`,
    };

    let overlay = null;
    let steps = [];
    let index = 0;
    let appLang = 'gujarati';

    // App language English + "read in English" ticked → everything English.
    // App language English, unticked → Gujarati text with English menus. Gujarati → all Gujarati.
    function applyLanguage() {
        const readEnglish = appLang === 'english' && $('setup-read-english').checked;
        localStorage.setItem('uiLanguage', appLang === 'english' && !readEnglish ? 'english' : 'auto');
        const reading = readEnglish ? 'english' : 'gujarati';
        if (currentLanguage !== reading) $(reading === 'english' ? 'lang-btn-eng' : 'lang-btn-guj').click();
        else applyUiLanguage();
        setTimeout(() => { applyUiLanguage(); markChoices(); }, 60);
    }

    function finish() {
        localStorage.setItem('onboardingDone', 'true');
        overlay.classList.add('closing');
        setTimeout(() => overlay.remove(), 300);
        if (window.Reminders) Reminders.reschedule();
    }

    async function saveReminderChoices() {
        const morning = $('setup-morning').checked, evening = $('setup-evening').checked;
        localStorage.setItem('reminderMorningTime', $('setup-morning-time').value || '07:00');
        localStorage.setItem('reminderEveningTime', $('setup-evening-time').value || '20:00');
        let allowed = false;
        if (morning || evening) allowed = await Reminders.ensurePermission();
        localStorage.setItem('reminderMorning', String(morning && allowed));
        localStorage.setItem('reminderEvening', String(evening && allowed));
        if ((morning || evening) && !allowed) {
            showToast(uiEnglish() ? 'No problem — turn reminders on later in Settings' : 'વાંધો નહીં — પછી સેટિંગ્સમાંથી ચાલુ કરી શકો', 'fas fa-bell-slash');
        }
        await Reminders.reschedule();
    }

    function render() {
        const step = steps[index];
        const prev = window.Reminders ? Reminders.prefs() : null;
        const last = index === steps.length - 1;
        overlay.querySelector('.setup-body').innerHTML = STEPS[step]();
        overlay.querySelector('.setup-dots').innerHTML = steps.length > 1
            ? steps.map((_, i) => `<span class="${i === index ? 'active' : ''}"></span>`).join('') : '';
        const next = overlay.querySelector('.setup-next');
        next.style.display = step === 'done' ? 'none' : '';
        next.innerHTML = last ? g('પૂરું', 'Done') : g('આગળ', 'Next');
        overlay.querySelector('.setup-back').style.visibility = index > 0 ? 'visible' : 'hidden';
        // Coming back to a card shows what was chosen there
        if (step === 'welcome' && appLang === 'english') $('setup-read-english').checked = currentLanguage === 'english';
        if (step === 'reminders' && prev && localStorage.getItem('reminderMorning') !== null) {
            $('setup-morning').checked = prev.morning;
            $('setup-evening').checked = prev.evening;
            $('setup-morning-time').value = prev.morningTime;
            $('setup-evening-time').value = prev.eveningTime;
        }
        markChoices();
    }

    function markChoices() {
        overlay.querySelectorAll('[data-applang]').forEach(b => b.classList.toggle('active', b.dataset.applang === appLang));
        const row = $('setup-read-english-row');
        if (row) row.hidden = appLang !== 'english';
        const large = document.documentElement.classList.contains('text-large');
        overlay.querySelectorAll('[data-size]').forEach(b => b.classList.toggle('active', (b.dataset.size === 'large') === large));
        const look = window.Appearance ? Appearance.get() : 'light';
        overlay.querySelectorAll('[data-appearance]').forEach(b => b.classList.toggle('active', b.dataset.appearance === look));
    }

    async function next() {
        if (steps[index] === 'reminders') await saveReminderChoices();
        if (index < steps.length - 1) { index++; render(); }
        else finish();
    }

    function show(isUpdate) {
        steps = isUpdate ? ['reminders'] : ['welcome', 'reminders', 'textsize', 'appearance', 'done'];
        index = 0;
        overlay = document.createElement('div');
        overlay.className = 'setup-overlay setup-fullscreen';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.innerHTML = `
            <div class="setup-sheet">
                <div class="setup-top"><button type="button" class="setup-back" aria-label="Back"><i class="fas fa-arrow-left"></i></button><div class="setup-dots"></div><span class="setup-back-spacer"></span></div>
                <div class="setup-body"></div>
                <button type="button" class="setup-next"></button>
            </div>`;
        document.body.appendChild(overlay);
        if (isUpdate) STEPS.reminders = () => reminderCard(true);
        render();

        overlay.querySelector('.setup-next').addEventListener('click', next);
        overlay.querySelector('.setup-back').addEventListener('click', back);
        overlay.addEventListener('change', e => {
            if (e.target.id === 'setup-read-english') applyLanguage();
        });
        overlay.addEventListener('click', e => {
            const lang = e.target.closest('[data-applang]');
            if (lang) {
                appLang = lang.dataset.applang;
                applyLanguage();
                return;
            }
            const size = e.target.closest('[data-size]');
            if (size) {
                $(size.dataset.size === 'large' ? 'settings-text-large' : 'settings-text-default').click();
                markChoices();
                return;
            }
            const look = e.target.closest('[data-appearance]');
            if (look) {
                if (window.Appearance) Appearance.set(look.dataset.appearance);
                markChoices();
                return;
            }
            const start = e.target.closest('[data-start]');
            if (start) {
                finish();
                if (start.dataset.start === 'vachanamrut') openVachanamrutById(1);
                else if (start.dataset.start === 'shikshapatri') returnToScripture('shikshapatri');
            }
        });
    }

    function back() {
        if (index > 0) { index--; render(); }
    }

    // Setup is required: the back gesture steps back a card, and does nothing on the first one
    function handleBack() {
        if (!overlay || !overlay.isConnected) return false;
        back();
        return true;
    }

    window.addEventListener('app-ready', () => {
        wireSettings();
        syncSettings();
        if (!isNativeApp || localStorage.getItem('onboardingDone') === 'true') return;
        // Right away, under the fading splash, so the first thing people see is setup
        show(isExistingUser());
    });

    window.Onboarding = { show, handleBack, syncSettings };
})();
