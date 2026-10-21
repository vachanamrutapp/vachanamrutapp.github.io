package com.vachanamrut.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.SystemClock;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;

/**
 * Keeps audio playing when the screen locks or the app is closed: a foreground service with a
 * media notification and lock-screen controls. The audio itself still plays in the WebView; this
 * service keeps the process alive and relays the notification buttons back to the page
 * (see MediaPlaybackPlugin). While audio plays it holds a partial wake lock so streaming
 * continues with the screen off.
 */
public class MediaPlaybackService extends Service {
    static final String ACTION_UPDATE = "com.vachanamrut.app.MEDIA_UPDATE";
    static final String ACTION_STOP = "com.vachanamrut.app.MEDIA_STOP";
    static final String ACTION_PLAY = "com.vachanamrut.app.MEDIA_PLAY";
    static final String ACTION_PAUSE = "com.vachanamrut.app.MEDIA_PAUSE";
    static final String ACTION_NEXT = "com.vachanamrut.app.MEDIA_NEXT";
    static final String ACTION_PREV = "com.vachanamrut.app.MEDIA_PREV";
    private static final String CHANNEL_ID = "audio_playback";
    private static final int NOTIFICATION_ID = 2001;

    private MediaSessionCompat session;
    private PowerManager.WakeLock wakeLock;
    private Bitmap largeIcon;
    private boolean foreground = false;
    private boolean playing = false;

    // What the page last told us, so playback can be handed over if the app is swiped away
    private String[] urls = new String[0];
    private String title = "", artist = "";
    private double posSeconds = 0, durSeconds = 0, rate = 1;
    private long posStamp = 0;
    private int trackId = -1;
    private String source = "";
    private final List<String[]> queueUrls = new ArrayList<>();
    private final List<String> queueTitles = new ArrayList<>();
    private final List<Integer> queueIds = new ArrayList<>();

    // Native playback (after the app is closed)
    private MediaPlayer mp;
    private boolean nativeMode = false;
    private int urlIndex = 0;
    private static MediaPlaybackService live;
    private static String handback = null; // JSON of the native state, for the page to pick up

    @Override
    public void onCreate() {
        super.onCreate();
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Audio playback", NotificationManager.IMPORTANCE_LOW);
            channel.setShowBadge(false);
            nm.createNotificationChannel(channel);
        }
        largeIcon = BitmapFactory.decodeResource(getResources(), R.drawable.ic_notification_logo);
        session = new MediaSessionCompat(this, "VachanamrutAudio");
        session.setCallback(new MediaSessionCompat.Callback() {
            @Override public void onPlay() { dispatch("play", 0); }
            @Override public void onPause() { dispatch("pause", 0); }
            @Override public void onSkipToNext() { dispatch("next", 0); }
            @Override public void onSkipToPrevious() { dispatch("previous", 0); }
            @Override public void onSeekTo(long pos) { dispatch("seek", pos / 1000.0); }
            @Override public void onStop() { dispatch("stop", 0); }
        });
        session.setActive(true);
        live = this;
    }

    /** Notification / lock-screen buttons: to the page normally, to the native player once the app is closed. */
    private void dispatch(String action, double position) {
        if (nativeMode) nativeAction(action, position);
        else MediaPlaybackPlugin.emit(action, position);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? null : intent.getAction();
        if (ACTION_STOP.equals(action)) {
            shutDown();
            return START_NOT_STICKY;
        }
        if (ACTION_PLAY.equals(action)) { dispatch("play", 0); return START_NOT_STICKY; }
        if (ACTION_PAUSE.equals(action)) { dispatch("pause", 0); return START_NOT_STICKY; }
        if (ACTION_NEXT.equals(action)) { dispatch("next", 0); return START_NOT_STICKY; }
        if (ACTION_PREV.equals(action)) { dispatch("previous", 0); return START_NOT_STICKY; }
        if (intent == null || !ACTION_UPDATE.equals(action)) return START_NOT_STICKY;

        stopNative(); // the page is alive again and in charge
        title = intent.getStringExtra("title");
        artist = intent.getStringExtra("artist");
        playing = intent.getBooleanExtra("playing", false);
        posSeconds = intent.getDoubleExtra("position", 0);
        durSeconds = intent.getDoubleExtra("duration", 0);
        rate = intent.getDoubleExtra("rate", 1);
        posStamp = SystemClock.elapsedRealtime();
        trackId = intent.getIntExtra("trackId", -1);
        source = intent.getStringExtra("source") == null ? "" : intent.getStringExtra("source");
        String[] u = intent.getStringArrayExtra("urls");
        urls = u == null ? new String[0] : u;
        parseQueue(intent.getStringExtra("queue"));
        long positionMs = (long) (posSeconds * 1000);
        long durationMs = (long) (durSeconds * 1000);
        boolean skip = intent.getBooleanExtra("skip", true);

        MediaMetadataCompat.Builder meta = new MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, "Vachanamrut")
            .putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, largeIcon);
        if (durationMs > 0) meta.putLong(MediaMetadataCompat.METADATA_KEY_DURATION, durationMs);
        session.setMetadata(meta.build());

        long actions = PlaybackStateCompat.ACTION_PLAY | PlaybackStateCompat.ACTION_PAUSE
            | PlaybackStateCompat.ACTION_PLAY_PAUSE | PlaybackStateCompat.ACTION_SEEK_TO | PlaybackStateCompat.ACTION_STOP;
        if (skip) actions |= PlaybackStateCompat.ACTION_SKIP_TO_NEXT | PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS;
        session.setPlaybackState(new PlaybackStateCompat.Builder()
            .setActions(actions)
            .setState(playing ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED, positionMs, playing ? 1f : 0f)
            .build());

        Notification n = buildNotification(title, artist, skip);
        if (playing) {
            acquireWakeLock();
            startAsForeground(n);
        } else {
            releaseWakeLock();
            if (foreground) {
                // Paused: keep the notification (so it can be resumed) but let the system manage the service
                stopForeground(false);
                foreground = false;
            }
            ((NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE)).notify(NOTIFICATION_ID, n);
        }
        return START_NOT_STICKY;
    }

    private PendingIntent action(String action, int code) {
        Intent i = new Intent(this, MediaPlaybackService.class).setAction(action);
        return PendingIntent.getService(this, code, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private Notification buildNotification(String title, String artist, boolean skip) {
        Intent open = new Intent(this, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent content = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_reminder)
            .setLargeIcon(largeIcon)
            .setContentTitle(title)
            .setContentText(artist)
            .setContentIntent(content)
            .setDeleteIntent(action(ACTION_STOP, 5))
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOnlyAlertOnce(true)
            .setShowWhen(false)
            .setOngoing(playing);
        int idx = 0;
        int[] compact;
        if (skip) {
            b.addAction(android.R.drawable.ic_media_previous, "Previous", action(ACTION_PREV, 1));
            idx++;
        }
        b.addAction(playing ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
            playing ? "Pause" : "Play", action(playing ? ACTION_PAUSE : ACTION_PLAY, 2));
        int playIdx = idx++;
        if (skip) {
            b.addAction(android.R.drawable.ic_media_next, "Next", action(ACTION_NEXT, 3));
            compact = new int[] { playIdx - 1, playIdx, playIdx + 1 };
        } else {
            compact = new int[] { playIdx };
        }
        b.setStyle(new MediaStyle().setMediaSession(session.getSessionToken()).setShowActionsInCompactView(compact));
        return b.build();
    }

    private void startAsForeground(Notification n) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, n);
        }
        foreground = true;
    }

    private void acquireWakeLock() {
        if (wakeLock == null) {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "vachanamrut:audio");
            wakeLock.setReferenceCounted(false);
        }
        if (!wakeLock.isHeld()) wakeLock.acquire(6 * 60 * 60 * 1000L); // refreshed on every update
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
    }

    private void shutDown() {
        nativeMode = false;
        releasePlayer();
        releaseWakeLock();
        stopForeground(true);
        foreground = false;
        stopSelf();
    }

    /** The app was swiped away: keep playing, but if nothing is playing there is nothing to keep. */
    @Override
    public void onTaskRemoved(Intent rootIntent) {
        if (!playing || urls.length == 0) {
            shutDown();
        } else {
            // The WebView is going away with the app: carry on from where it was, natively
            double estimate = posSeconds + (SystemClock.elapsedRealtime() - posStamp) / 1000.0 * rate;
            startNative(estimate);
        }
        super.onTaskRemoved(rootIntent);
    }

    // ---- Native playback (app closed) ------------------------------------------------------------
    private void parseQueue(String json) {
        queueUrls.clear();
        queueTitles.clear();
        queueIds.clear();
        if (json == null || json.isEmpty()) return;
        try {
            JSONArray arr = new JSONArray(json);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.getJSONObject(i);
                JSONArray us = o.getJSONArray("urls");
                String[] list = new String[us.length()];
                for (int k = 0; k < us.length(); k++) list[k] = us.getString(k);
                queueUrls.add(list);
                queueTitles.add(o.optString("title", ""));
                queueIds.add(o.optInt("id", -1));
            }
        } catch (Exception ignored) { /* no queue */ }
    }

    private void startNative(double fromSeconds) {
        nativeMode = true;
        urlIndex = 0;
        posSeconds = fromSeconds;
        loadNative(urls, fromSeconds);
    }

    private void loadNative(String[] list, double fromSeconds) {
        releasePlayer();
        if (list == null || list.length == 0) { shutDown(); return; }
        final String[] candidates = list;
        try {
            mp = new MediaPlayer();
            mp.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
            mp.setWakeMode(this, PowerManager.PARTIAL_WAKE_LOCK);
            mp.setDataSource(candidates[Math.min(urlIndex, candidates.length - 1)]);
            mp.setOnPreparedListener(p -> {
                durSeconds = p.getDuration() / 1000.0;
                if (fromSeconds > 1) p.seekTo((int) (fromSeconds * 1000));
                try { p.setPlaybackParams(p.getPlaybackParams().setSpeed((float) Math.max(0.5, rate))); } catch (Exception ignored) { }
                p.start();
                publishNative(true);
            });
            mp.setOnCompletionListener(p -> nativeNext());
            mp.setOnErrorListener((p, what, extra) -> {
                if (urlIndex < candidates.length - 1) { urlIndex++; loadNative(candidates, fromSeconds); }
                else { nativeNext(); }
                return true;
            });
            mp.prepareAsync();
        } catch (Exception e) {
            nativeNext();
        }
    }

    private void nativeNext() {
        if (queueUrls.isEmpty()) { shutDown(); return; }
        String[] next = queueUrls.remove(0);
        title = queueTitles.remove(0);
        trackId = queueIds.remove(0);
        urls = next;
        urlIndex = 0;
        posSeconds = 0;
        loadNative(next, 0);
    }

    private void nativeAction(String action, double position) {
        if (mp == null && !"stop".equals(action)) return;
        try {
            switch (action) {
                case "play": mp.start(); publishNative(true); break;
                case "pause": mp.pause(); publishNative(false); break;
                case "next": nativeNext(); break;
                case "previous": mp.seekTo(0); publishNative(mp.isPlaying()); break;
                case "seek": mp.seekTo((int) (position * 1000)); publishNative(mp.isPlaying()); break;
                case "stop": shutDown(); break;
            }
        } catch (Exception ignored) { /* player released */ }
    }

    private void publishNative(boolean isPlaying) {
        playing = isPlaying;
        long pos = mp == null ? 0 : mp.getCurrentPosition();
        MediaMetadataCompat.Builder meta = new MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, "Vachanamrut")
            .putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, largeIcon);
        if (durSeconds > 0) meta.putLong(MediaMetadataCompat.METADATA_KEY_DURATION, (long) (durSeconds * 1000));
        session.setMetadata(meta.build());
        boolean skip = !queueUrls.isEmpty();
        long actions = PlaybackStateCompat.ACTION_PLAY | PlaybackStateCompat.ACTION_PAUSE | PlaybackStateCompat.ACTION_PLAY_PAUSE
            | PlaybackStateCompat.ACTION_SEEK_TO | PlaybackStateCompat.ACTION_STOP;
        if (skip) actions |= PlaybackStateCompat.ACTION_SKIP_TO_NEXT;
        session.setPlaybackState(new PlaybackStateCompat.Builder().setActions(actions)
            .setState(isPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED, pos, isPlaying ? 1f : 0f).build());
        Notification n = buildNotification(title, artist, skip);
        if (isPlaying) startAsForeground(n);
        else {
            if (foreground) { stopForeground(false); foreground = false; }
            ((NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE)).notify(NOTIFICATION_ID, n);
        }
    }

    private void releasePlayer() {
        if (mp != null) {
            try { mp.stop(); } catch (Exception ignored) { }
            mp.release();
            mp = null;
        }
    }

    /** The page is back (or a new update arrived): drop the native player. */
    private void stopNative() {
        if (!nativeMode) return;
        nativeMode = false;
        releasePlayer();
    }

    /** Called by the plugin when the page starts up: what was playing while the app was closed. */
    static String takeBack() {
        MediaPlaybackService s = live;
        if (s == null || !s.nativeMode) return null;
        try {
            JSONObject o = new JSONObject();
            o.put("trackId", s.trackId);
            o.put("source", s.source);
            o.put("title", s.title);
            o.put("position", s.mp == null ? s.posSeconds : s.mp.getCurrentPosition() / 1000.0);
            o.put("playing", s.mp != null && s.mp.isPlaying());
            s.stopNative();
            return o.toString();
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public void onDestroy() {
        if (live == this) live = null;
        releasePlayer();
        releaseWakeLock();
        if (session != null) {
            session.setActive(false);
            session.release();
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
