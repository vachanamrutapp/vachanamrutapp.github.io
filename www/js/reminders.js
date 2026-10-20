// Daily reading reminders (Android app only; @capacitor/local-notifications, all on the device).
//  - Morning (default 7:00): the next Vachanamrut to read + the next Shikshapatri shloka.
//    Tapping opens the Vachanamrut; the "Shloka" button opens the shloka.
//  - Evening (default 20:00): the next Vachanamrut only.
// Every app open (and every settings change or finished reading) re-schedules the next 14 days, so the
// content follows where the reader left off, and reminders quietly stop if the app goes unused for 2 weeks.
(function () {
    const P = window.Capacitor && window.Capacitor.Plugins;
    const LN = isNativeApp && P && P.LocalNotifications;
    const DAYS = 14;
    const MORNING_BASE = 1000, EVENING_BASE = 2000, TEST_ID = 999;
    const CHANNEL = 'reading';

    const get = (k, d) => (localStorage.getItem(k) === null ? d : localStorage.getItem(k));
    const prefs = () => ({
        morning: get('reminderMorning', 'false') === 'true',
        morningTime: get('reminderMorningTime', '07:00'),
        evening: get('reminderEvening', 'false') === 'true',
        eveningTime: get('reminderEveningTime', '20:00'),
    });
    const t = (en, gu) => (uiEnglish() ? en : gu);
    const num = n => (uiEnglish() ? String(n) : toGujaratiDigits(n));

    // ---- What to read next ----------------------------------------------------------------
    // Vachanamruts in reading order (Gadhada I … Gadhada III)
    function readingOrder() {
        const order = [];
        sections.forEach(s => { if (s.id >= 2 && s.id <= 10) s.vachanamruts.forEach(v => order.push(v)); });
        return order;
    }

    // The next Vachanamrut after the last one finished. Every scheduled day shows the same "where you left
    // off" target; finishing a reading (or opening the app) re-schedules, so it moves on as they read.
    function nextVachanamrut() {
        const order = readingOrder();
        if (!order.length) return null;
        const last = getLastRead();
        const at = last ? order.findIndex(v => v.id === last.id) : -1;
        return order[(at + 1) % order.length];
    }

    function nextShloka() {
        const last = getShlokaLastRead();
        const from = last && last.id ? last.id : 0;
        return (from % TOTAL_SHLOKAS) + 1;
    }

    // Name in the menu language (e.g. "Gadhada I-1" with English menus even while reading Gujarati),
    // so a notification is all one language
    function vachName(v) {
        const lang = uiEnglish() ? 'english' : 'gujarati';
        let name = v.vachanamrut;
        if (lang !== currentLanguage && db) {
            try {
                const res = db.exec('SELECT vachanamrut FROM scriptures WHERE id = ? AND language = ?', [v.id, lang]);
                if (res.length && res[0].values.length) name = res[0].values[0][0];
            } catch (e) { /* fall back to the reading-language name */ }
        }
        return name.replace(/\n/g, ' ').trim();
    }

    // ---- Building notifications ------------------------------------------------------------
    function at(time, daysAhead) {
        const [h, m] = time.split(':').map(Number);
        const d = new Date();
        d.setDate(d.getDate() + daysAhead);
        d.setHours(h, m, 0, 0);
        return d;
    }

    function streakPrefix(daysAhead) {
        if (daysAhead !== 0) return '';
        const streak = computeStreak(getActivityDates());
        return streak >= 3 ? `🔥 ${t(`${streak}-day streak`, `${num(streak)} દિવસની સ્ટ્રીક`)} · ` : '';
    }

    function morningNotification(daysAhead, when) {
        const v = nextVachanamrut();
        const shloka = nextShloka();
        if (!v) return null;
        const vLine = `${vachName(v)} · ~${num(readingMinutes(v))} ${t('min', 'મિનિટ')}`;
        const sLine = `${t('Shikshapatri', 'શિક્ષાપત્રી')}: ${t(`Shloka ${shloka}`, `શ્લોક ${num(shloka)}`)}`;
        return {
            id: MORNING_BASE + daysAhead,
            channelId: CHANNEL,
            title: streakPrefix(daysAhead) + t('Good morning · Today\'s reading', 'સુપ્રભાત · આજનું વાંચન'),
            body: `${vLine}\n${sLine}`,
            largeBody: `${vLine}\n${sLine}`,
            actionTypeId: 'MORNING',
            extra: { vachId: v.id, shlokaId: shloka },
            schedule: { at: when, allowWhileIdle: true },
            isExactNotification: false, // a few minutes late is fine; no exact-alarm permission screen
            largeIcon: 'ic_notification_logo', // the app logo in colour (the status-bar icon must be a plain silhouette)
        };
    }

    function eveningNotification(daysAhead, when) {
        const v = nextVachanamrut();
        if (!v) return null;
        return {
            id: EVENING_BASE + daysAhead,
            channelId: CHANNEL,
            title: streakPrefix(daysAhead) + t('Evening reading', 'સાંજનું વાંચન'),
            body: `${vachName(v)} · ~${num(readingMinutes(v))} ${t('min', 'મિનિટ')}`,
            actionTypeId: 'EVENING',
            extra: { vachId: v.id },
            schedule: { at: when, allowWhileIdle: true },
            isExactNotification: false, // a few minutes late is fine; no exact-alarm permission screen
            largeIcon: 'ic_notification_logo', // the app logo in colour (the status-bar icon must be a plain silhouette)
        };
    }

    // ---- Permission & scheduling ----------------------------------------------------------------
    let setupDone = false;
    async function setup() {
        if (setupDone || !LN) return;
        setupDone = true;
        try {
            await LN.createChannel({ id: CHANNEL, name: 'Daily reading / દૈનિક વાંચન', description: 'Morning and evening reading reminders', importance: 3, visibility: 1 });
        } catch (e) {
            console.warn('Reminder setup failed:', e);
        }
    }

    // Reminder buttons, in the menu language (re-registered whenever we schedule).
    // Morning: Vachanamrut + shloka; evening: Vachanamrut. Tapping the text also opens the Vachanamrut.
    async function registerActions() {
        const readVachanamrut = { id: 'vach', title: t('Read Vachanamrut', 'વચનામૃત વાંચો') };
        try {
            await LN.registerActionTypes({ types: [
                { id: 'MORNING', actions: [readVachanamrut, { id: 'shloka', title: t('Read the shloka', 'શ્લોક વાંચો') }] },
                { id: 'EVENING', actions: [readVachanamrut] },
            ] });
        } catch (e) { /* older devices: the button just keeps its previous label */ }
    }

    async function permission() {
        if (!LN) return 'unavailable';
        try { return (await LN.checkPermissions()).display; } catch (e) { return 'denied'; }
    }

    // Asks Android for permission if needed; true when reminders can be shown
    async function ensurePermission() {
        if (!LN) return false;
        let state = await permission();
        if (state === 'granted') return true;
        if (state === 'denied') return false;
        try { state = (await LN.requestPermissions()).display; } catch (e) { state = 'denied'; }
        return state === 'granted';
    }

    async function reschedule() {
        if (!LN || !window.appReady) return;
        await setup();
        const ids = [];
        for (let k = 0; k < DAYS; k++) ids.push({ id: MORNING_BASE + k }, { id: EVENING_BASE + k });
        try { await LN.cancel({ notifications: ids }); } catch (e) { /* nothing scheduled yet */ }
        const p = prefs();
        if ((!p.morning && !p.evening) || (await permission()) !== 'granted') return;
        await registerActions();
        const now = Date.now();
        const list = [];
        for (let k = 0; k < DAYS; k++) {
            if (p.morning) { const w = at(p.morningTime, k); if (w > now) list.push(morningNotification(k, w)); }
            if (p.evening) { const w = at(p.eveningTime, k); if (w > now) list.push(eveningNotification(k, w)); }
        }
        const notifications = list.filter(Boolean);
        if (!notifications.length) return;
        try {
            await LN.schedule({ notifications });
        } catch (e) {
            console.error('Scheduling reminders failed:', e);
        }
    }

    let refreshTimer = null;
    function refreshSoon() {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(reschedule, 2000);
    }

    async function sendTest() {
        if (!(await ensurePermission())) return false;
        await setup();
        await registerActions();
        const n = morningNotification(0, new Date(Date.now() + 5000));
        n.id = TEST_ID;
        await LN.schedule({ notifications: [n] });
        return true;
    }

    // Turn a reminder on/off ('morning' | 'evening'); returns false if permission was refused
    async function setEnabled(which, on) {
        if (on && !(await ensurePermission())) {
            localStorage.setItem(`reminder${which === 'morning' ? 'Morning' : 'Evening'}`, 'false');
            return false;
        }
        localStorage.setItem(`reminder${which === 'morning' ? 'Morning' : 'Evening'}`, String(on));
        await reschedule();
        return true;
    }

    async function setTime(which, time) {
        localStorage.setItem(`reminder${which === 'morning' ? 'Morning' : 'Evening'}Time`, time);
        await reschedule();
    }

    // ---- Tapping a reminder ------------------------------------------------------------------
    let pendingOpen = null;
    function openTarget(target) {
        if (!window.appReady) { pendingOpen = target; return; }
        if (target.shlokaId) Shikshapatri.showSloka(target.shlokaId);
        else if (target.vachId) openVachanamrutById(target.vachId);
    }

    if (LN) {
        LN.addListener('localNotificationActionPerformed', ({ actionId, notification }) => {
            const extra = notification.extra || {};
            openTarget(actionId === 'shloka' ? { shlokaId: extra.shlokaId } : { vachId: extra.vachId });
        });
        if (P.App) P.App.addListener('appStateChange', ({ isActive }) => { if (isActive) reschedule(); });
    }

    window.addEventListener('app-ready', () => {
        reschedule();
        if (pendingOpen) { const target = pendingOpen; pendingOpen = null; setTimeout(() => openTarget(target), 300); }
    });

    window.Reminders = { available: !!LN, prefs, permission, ensurePermission, reschedule, refreshSoon, sendTest, setEnabled, setTime };
})();
