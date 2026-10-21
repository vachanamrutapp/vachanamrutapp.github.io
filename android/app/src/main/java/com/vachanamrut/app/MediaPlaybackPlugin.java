package com.vachanamrut.app;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * JS ↔ MediaPlaybackService. update() shows/refreshes the media notification and keeps the app
 * alive for background playback; the notification's buttons come back as "action" events.
 */
@CapacitorPlugin(name = "MediaPlayback")
public class MediaPlaybackPlugin extends Plugin {
    private static MediaPlaybackPlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    static void emit(String action, double position) {
        if (instance == null) return;
        JSObject data = new JSObject();
        data.put("action", action);
        data.put("position", position);
        instance.notifyListeners("action", data);
    }

    @PluginMethod
    public void update(PluginCall call) {
        Context ctx = getContext();
        Intent i = new Intent(ctx, MediaPlaybackService.class).setAction(MediaPlaybackService.ACTION_UPDATE);
        i.putExtra("title", call.getString("title", ""));
        i.putExtra("artist", call.getString("artist", ""));
        i.putExtra("playing", call.getBoolean("playing", false));
        i.putExtra("position", call.getDouble("position", 0.0));
        i.putExtra("duration", call.getDouble("duration", 0.0));
        i.putExtra("skip", call.getBoolean("skip", true));
        i.putExtra("rate", call.getDouble("rate", 1.0));
        i.putExtra("trackId", call.getInt("trackId", -1));
        i.putExtra("source", call.getString("source", ""));
        i.putExtra("queue", call.getString("queue", ""));
        JSArray urlArr = call.getArray("urls");
        if (urlArr != null) {
            try {
                String[] list = new String[urlArr.length()];
                for (int k = 0; k < list.length; k++) list[k] = urlArr.getString(k);
                i.putExtra("urls", list);
            } catch (Exception ignored) { /* no hand-over source */ }
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && call.getBoolean("playing", false)) ctx.startForegroundService(i);
            else ctx.startService(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not start background playback", e);
        }
    }

    /** Page start-up: if audio carried on natively while the app was closed, hand it back to the page. */
    @PluginMethod
    public void takeBack(PluginCall call) {
        JSObject res = new JSObject();
        String json = MediaPlaybackService.takeBack();
        res.put("state", json == null ? "" : json);
        call.resolve(res);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Context ctx = getContext();
        try {
            ctx.startService(new Intent(ctx, MediaPlaybackService.class).setAction(MediaPlaybackService.ACTION_STOP));
        } catch (Exception e) { /* not running */ }
        call.resolve();
    }
}
