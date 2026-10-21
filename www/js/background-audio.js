// Background audio (Android app): while audio plays, a native foreground service (MediaPlaybackService)
// keeps the app alive with a media notification and lock-screen controls, so playback continues
// when the screen locks or the app is closed. Any <audio> element can bind itself here; whichever
// one is playing is "active", and the notification's buttons go back to it.
(function () {
    const P = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.MediaPlayback;
    const native = typeof isNativeApp !== 'undefined' && isNativeApp && !!P;
    const ARTIST = 'Sadguru Shree Gyanjivandasji Swami · Kundaldham';
    let active = null;
    let keepAlive = null;

    function push() {
        if (!native || !active) return;
        const el = active.el;
        const meta = active.meta();
        P.update({
            title: meta.title || 'Vachanamrut',
            artist: meta.artist || ARTIST,
            playing: !el.paused && !el.ended,
            position: el.currentTime || 0,
            duration: isFinite(el.duration) ? el.duration : 0,
            skip: active.skip !== false,
            rate: el.playbackRate || 1,
            // Everything the service needs to carry on by itself if the app is swiped away
            source: active.source || '',
            trackId: active.trackId ? active.trackId() : -1,
            urls: active.urls ? active.urls() : [],
            queue: active.queue ? JSON.stringify(active.queue()) : '',
        }).catch(() => {});
    }

    function bind(el, opts) {
        if (!native) return;
        const binding = { el, meta: opts.meta, onAction: opts.onAction, skip: opts.skip, source: opts.source, trackId: opts.trackId, urls: opts.urls, queue: opts.queue };
        ['play', 'seeked', 'loadedmetadata', 'ratechange'].forEach(type => el.addEventListener(type, () => {
            if (type === 'play') active = binding;
            if (active === binding) push();
        }));
        ['pause', 'ended'].forEach(type => el.addEventListener(type, () => { if (active === binding) push(); }));
    }

    if (native) {
        P.addListener('action', e => {
            if (!active) return;
            try { active.onAction(e.action, e.position || 0); } catch (err) { console.error(err); }
        });
        // Refresh the position, and keep the service's wake lock fresh, while playing
        // If audio carried on natively while the app was closed, take it back now
        window.addEventListener('app-ready', () => {
            P.takeBack().then(res => {
                if (!res || !res.state) return;
                let st = null;
                try { st = JSON.parse(res.state); } catch (e) { return; }
                if (st.source === 'page' && window.AudioPage) AudioPage.resume(st);
                else P.stop().catch(() => {});
            }).catch(() => {});
        });
        keepAlive = setInterval(() => { if (active && !active.el.paused) push(); }, 30000);
    }

    window.BackgroundAudio = {
        bind,
        refresh: push,
        stop() {
            if (!native) return;
            active = null;
            P.stop().catch(() => {});
        },
        artist: ARTIST,
    };

    // The reading page's own player (app.js)
    window.addEventListener('load', () => {
        if (!native || typeof audioPlayer === 'undefined') return;
        bind(audioPlayer, {
            source: 'reading',
            urls: () => (typeof audioSourceList !== 'undefined' ? audioSourceList.filter(u => u.startsWith('http')) : []),
            meta: () => ({ title: (typeof audioBarTitle !== 'undefined' && audioBarTitle && audioBarTitle.textContent) || 'Vachanamrut' }),
            onAction(action, pos) {
                if (action === 'play' && !isPlaying) toggleAudio();
                else if ((action === 'pause' || action === 'stop') && isPlaying) toggleAudio();
                else if (action === 'next') audioPlayer.currentTime = Math.min(audioPlayer.duration || 1e9, audioPlayer.currentTime + 15);
                else if (action === 'previous') audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 15);
                else if (action === 'seek') audioPlayer.currentTime = pos;
            },
        });
    });
})();
