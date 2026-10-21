// Light / dark appearance. Loaded first in <head> so the page never flashes the wrong colours.
// Setting 'appearance' in localStorage: 'system' (default, follows the phone), 'light' or 'dark'.
// Sets html.dark and html[data-appearance], the browser theme colour and the Android status bar icons.
(function () {
    const KEY = 'appearance';
    const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const get = () => {
        try { return localStorage.getItem(KEY) || 'system'; } catch (e) { return 'system'; }
    };
    const isDark = () => get() === 'dark' || (get() === 'system' && !!(media && media.matches));

    function apply() {
        const dark = isDark();
        const root = document.documentElement;
        root.classList.toggle('dark', dark);
        root.dataset.appearance = get();
        root.style.colorScheme = dark ? 'dark' : 'light';
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', dark ? '#1C1512' : '#E6A623');
        const bars = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.SystemBars;
        if (bars && bars.setStyle) bars.setStyle({ style: dark ? 'DARK' : 'LIGHT' }).catch(() => {});
        window.dispatchEvent(new CustomEvent('appearance-change', { detail: { dark } }));
    }

    function set(value) {
        try { localStorage.setItem(KEY, value); } catch (e) { /* private mode */ }
        apply();
    }

    if (media) {
        const onChange = () => { if (get() === 'system') apply(); };
        if (media.addEventListener) media.addEventListener('change', onChange);
        else if (media.addListener) media.addListener(onChange);
    }
    apply();
    document.addEventListener('DOMContentLoaded', apply);

    window.Appearance = { get, set, isDark };
})();
