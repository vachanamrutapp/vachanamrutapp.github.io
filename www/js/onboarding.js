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
    const ACTIVITY_KEYS = ['vach_read_ids', 'vach_activity_dates', 'favourites', 'shikshapatriFavourites', 'bookmarkedVachanamrutId', 'sp_read_ids', 'annotations', 'appTheme', 'vach_scroll'];
    const isExistingUser = () => ACTIVITY_KEYS.some(k => localStorage.getItem(k) !== null);

    // Every card is a question with its reason: a heading, then one line on why we ask
    const head = (icon, q, why) => `
            <div class="setup-qhead"><span class="setup-qicon"><i class="fas ${icon}"></i></span><h2 class="setup-q">${q}</h2></div>
            <p class="setup-why">${why}</p>`;
    // Before a language is chosen both languages are shown (g() would show only the current one)
    const both = (en, gu) => `<span class="setup-bi-en">${en}</span><span class="setup-bi-gu">${gu}</span>`;

    const reminderCard = isNew => `
        <div class="setup-card" data-step="reminders">
            ${head('fa-bell',
                isNew ? g('નવું: દૈનિક રિમાઇન્ડર', 'New: daily reminders') : g('શું રોજ યાદ અપાવીએ?', 'Would you like a daily reminder?'),
                g('દરરોજ થોડી મિનિટ વાંચવાની ટેવ પડે છે. જ્યાંથી છોડ્યું ત્યાંથી આગળ શું વાંચવું તે અમે જણાવીશું.', 'A few minutes every day builds the habit. We\'ll tell you what to read next, from where you left off.'))}
            <label class="setup-option">
                <input type="checkbox" id="setup-morning" checked>
                <span class="setup-option-icon icon-orange"><i class="fas fa-sun"></i></span>
                <span class="setup-option-text">
                    <b>${g('સવારે', 'Morning')}</b>
                </span>
                <input type="time" id="setup-morning-time" class="reminder-time" value="07:00">
            </label>
            <label class="setup-option">
                <input type="checkbox" id="setup-evening">
                <span class="setup-option-icon icon-indigo"><i class="fas fa-moon"></i></span>
                <span class="setup-option-text">
                    <b>${g('સાંજે', 'Evening')}</b>
                </span>
                <input type="time" id="setup-evening-time" class="reminder-time" value="20:00">
            </label>
            <p class="setup-fine">${g('ન જોઈએ તો બંને અનટિક કરો. સેટિંગ્સમાં ક્યારેય બદલી શકો.', 'Untick both if you don\'t want reminders. You can change this anytime in Settings.')}</p>
        </div>`;

    const STEPS = {
        about: () => `
            <div class="setup-card" data-step="about">
                <div class="setup-about-q">${both('What is the Vachanamrut?', 'વચનામૃત શું છે?')}</div>
                <p class="setup-about">The Vachanamrut is the sacred collection of 262 discourses of Bhagwan Swaminarayan, spoken between 1819 and 1829 and recorded by his saints. In them he explains devotion, dharma, knowledge and detachment, in simple, lived examples.</p>
                <p class="setup-about setup-about-gu">વચનામૃત એ ભગવાન સ્વામિનારાયણના ૨૬૨ ઉપદેશોનો પવિત્ર સંગ્રહ છે, જે ઈ.સ. ૧૮૧૯ થી ૧૮૨૯ દરમિયાન કહેવાયા અને તેમના સંતોએ નોંધ્યા. તેમાં ભક્તિ, ધર્મ, જ્ઞાન અને વૈરાગ્ય સરળ ઉદાહરણોથી સમજાવ્યા છે.</p>
            </div>`,
        welcome: () => `
            <div class="setup-card" data-step="welcome">
                ${head('fa-language',
                    both('Which language do you read in?', 'તમે કઈ ભાષામાં વાંચો છો?'),
                    both('The Vachanamrut will appear in this language. You can switch anytime at the top.', 'વચનામૃત આ ભાષામાં દેખાશે. ઉપરથી ક્યારેય બદલી શકો.'))}
                <div class="setup-choice">
                    <button type="button" class="setup-choice-btn" data-readlang="gujarati">ગુજરાતી</button>
                    <button type="button" class="setup-choice-btn" data-readlang="english">English</button>
                </div>
            </div>`,
        menus: () => `
            <div class="setup-card" data-step="menus">
                ${head('fa-sliders-h', g('એપના બટન કઈ ભાષામાં?', 'Which language for the app\'s buttons?'),
                    g('તમે ગુજરાતી વાંચો છો. બટન અને મેનુ અંગ્રેજીમાં રાખવા હોય તો રાખી શકો.', 'You\'re reading Gujarati. Buttons and menus can stay in English if you prefer.'))}
                <div class="setup-choice">
                    <button type="button" class="setup-choice-btn" data-menus="auto">ગુજરાતી</button>
                    <button type="button" class="setup-choice-btn" data-menus="english">English</button>
                </div>
            </div>`,
        reminders: () => reminderCard(false),
        textsize: () => `
            <div class="setup-card" data-step="textsize">
                ${head('fa-text-height', g('અક્ષર કેટલા મોટા જોઈએ?', 'How large should the text be?'),
                    g('લાંબા ઉપદેશો આરામથી વંચાય તે માટે. મોટા અક્ષર આખી એપમાં લાગુ પડશે.', 'Comfortable reading matters for long discourses. Large makes the whole app bigger.'))}
                <div class="setup-choice">
                    <button type="button" class="setup-choice-btn" data-size="default">${g('સામાન્ય', 'Default')}</button>
                    <button type="button" class="setup-choice-btn" data-size="large">${g('મોટા', 'Large')}</button>
                </div>
                <p class="setup-preview">${g('પછી શ્રીજીમહારાજ બોલ્યા જે, “એક વાત કહું તે સાંભળો.”', 'Then Shriji Maharaj said, “Listen, I wish to tell you something.”')}</p>
            </div>`,
        appearance: () => `
            <div class="setup-card" data-step="appearance">
                ${head('fa-circle-half-stroke', g('લાઇટ કે ડાર્ક?', 'Light or dark?'),
                    g('રાત્રે ડાર્ક આંખોને આરામ આપે છે. ઓટો તમારા ફોનના સેટિંગને અનુસરે છે.', 'Dark is easier on the eyes at night. Auto follows your phone\'s setting.'))}
                <div class="setup-choice setup-choice-3">
                    <button type="button" class="setup-choice-btn" data-appearance="system"><i class="fas fa-circle-half-stroke"></i> ${g('ઓટો', 'Auto')}</button>
                    <button type="button" class="setup-choice-btn" data-appearance="light"><i class="fas fa-sun"></i> ${g('લાઇટ', 'Light')}</button>
                    <button type="button" class="setup-choice-btn" data-appearance="dark"><i class="fas fa-moon"></i> ${g('ડાર્ક', 'Dark')}</button>
                </div>
            </div>`,
        done: () => `
            <div class="setup-card" data-step="done">
                ${head('fa-check', g('બધું તૈયાર છે', 'You\'re all set'),
                    g('નીચેના મેનુથી વચનામૃત અને શિક્ષાપત્રી વચ્ચે બદલી શકો છો, અને ઓડિયો, સાચવેલું તથા સેટિંગ્સ ખોલી શકો છો.', 'Use the menu at the bottom to switch between Vachanamrut and Shikshapatri, and to open Audio, Saved and Settings.'))}
                <button type="button" class="setup-primary" data-start="home"><i class="fas fa-home"></i> ${g('હોમ પર જાઓ', 'Go to home')}</button>
            </div>`,
    };

    // The logo stays on top (no housing); what the Vachanamrut is lives on the first card
    const LOGO = '<img class="setup-intro-logo" src="images/logo-vachanamrut.png" alt="Vachanamrut">';

    let overlay = null;
    let steps = [];
    let index = 0;
    let readLang = 'gujarati';
    let updateFlow = false;
    // The "menus" question only makes sense when reading Gujarati
    const stepList = () => updateFlow ? ['reminders'] : ['about', 'welcome', ...(readLang === 'gujarati' ? ['menus'] : []), 'reminders', 'textsize', 'appearance', 'done'];
    let menusEnglish = false;

    // Reading language decides the text; menus follow it, except Gujarati text can keep English menus
    function applyLanguage() {
        localStorage.setItem('uiLanguage', readLang === 'gujarati' && menusEnglish ? 'english' : 'auto');
        if (currentLanguage !== readLang) $(readLang === 'english' ? 'lang-btn-eng' : 'lang-btn-guj').click();
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
        steps = stepList();
        const step = steps[index];
        const prev = window.Reminders ? Reminders.prefs() : null;
        const last = index === steps.length - 1;
        overlay.querySelector('.setup-body').innerHTML = STEPS[step]();
        // The card's icon sits in the top row, opposite the back button
        const corner = overlay.querySelector('.setup-back-spacer');
        corner.innerHTML = '';
        const qicon = overlay.querySelector('.setup-body .setup-qicon');
        if (qicon) corner.appendChild(qicon);
        overlay.querySelector('.setup-dots').innerHTML = steps.length > 1
            ? steps.map((_, i) => `<span class="${i === index ? 'active' : ''}"></span>`).join('') : '';
        const next = overlay.querySelector('.setup-next');
        next.style.display = step === 'done' ? 'none' : '';
        next.innerHTML = last ? g('પૂરું', 'Done') : (step === 'about' ? 'Begin · શરૂ કરો' : (step === 'welcome' ? 'Next · આગળ' : g('આગળ', 'Next')));
        overlay.querySelector('.setup-back').style.visibility = index > 0 ? 'visible' : 'hidden';
        const intro = overlay.querySelector('.setup-intro');
        if (intro && !overlay.querySelector('.setup-intro-logo')) intro.innerHTML = LOGO;
        // Coming back to a card shows what was chosen there
        if (step === 'reminders' && prev && localStorage.getItem('reminderMorning') !== null) {
            $('setup-morning').checked = prev.morning;
            $('setup-evening').checked = prev.evening;
            $('setup-morning-time').value = prev.morningTime;
            $('setup-evening-time').value = prev.eveningTime;
        }
        markChoices();
    }

    function markChoices() {
        overlay.querySelectorAll('[data-readlang]').forEach(b => b.classList.toggle('active', b.dataset.readlang === readLang));
        overlay.querySelectorAll('[data-menus]').forEach(b => b.classList.toggle('active', (b.dataset.menus === 'english') === menusEnglish));
        const large = document.documentElement.classList.contains('text-large');
        overlay.querySelectorAll('[data-size]').forEach(b => b.classList.toggle('active', (b.dataset.size === 'large') === large));
        const look = window.Appearance ? Appearance.get() : 'light';
        overlay.querySelectorAll('.setup-choice-btn[data-appearance]').forEach(b => b.classList.toggle('active', b.dataset.appearance === look));
    }

    async function next() {
        steps = stepList();
        if (steps[index] === 'reminders') await saveReminderChoices();
        if (index < steps.length - 1) { index++; render(); }
        else finish();
    }

    function show(isUpdate) {
        updateFlow = isUpdate;
        steps = stepList();
        index = 0;
        overlay = document.createElement('div');
        overlay.className = 'setup-overlay setup-fullscreen' + (isUpdate ? ' setup-update' : '');
        readLang = currentLanguage === 'english' ? 'english' : 'gujarati';
        menusEnglish = localStorage.getItem('uiLanguage') === 'english';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.innerHTML = `
            <div class="setup-art" aria-hidden="true"></div>
            <div class="setup-intro"></div>
            <div class="setup-sheet">
                <div class="setup-top"><button type="button" class="setup-back" aria-label="Back"><i class="fas fa-arrow-left"></i></button><div class="setup-dots"></div><span class="setup-back-spacer"></span></div>
                <div class="setup-body"></div>
                <button type="button" class="setup-next"></button>
            </div>`;
        document.body.appendChild(overlay);
        window.addEventListener('appearance-change', () => { if (overlay.isConnected) markChoices(); });
        if (isUpdate) STEPS.reminders = () => reminderCard(true);
        render();

        overlay.querySelector('.setup-next').addEventListener('click', next);
        overlay.querySelector('.setup-back').addEventListener('click', back);
        overlay.addEventListener('click', e => {
            const lang = e.target.closest('[data-readlang]');
            if (lang) {
                readLang = lang.dataset.readlang;
                applyLanguage();
                return;
            }
            const menus = e.target.closest('[data-menus]');
            if (menus) {
                menusEnglish = menus.dataset.menus === 'english';
                applyLanguage();
                return;
            }
            const size = e.target.closest('[data-size]');
            if (size) {
                $(size.dataset.size === 'large' ? 'settings-text-large' : 'settings-text-default').click();
                markChoices();
                return;
            }
            const look = e.target.closest('.setup-choice-btn[data-appearance]'); // not <html data-appearance>
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
