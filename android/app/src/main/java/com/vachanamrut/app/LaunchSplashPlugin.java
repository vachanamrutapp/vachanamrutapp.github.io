package com.vachanamrut.app;

import android.app.Activity;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Shader;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.ViewGroup;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The illustrated launch splash: drawn natively over the app as soon as the window exists,
 * so it shows while the web view loads. The page calls LaunchSplash.hide() once its first
 * screen is ready (www/index.html), and it fades out. Hides itself after 8s regardless.
 */
@CapacitorPlugin(name = "LaunchSplash")
public class LaunchSplashPlugin extends Plugin {

    private static final int GOLD = 0xFFE6A623;
    private static View overlay;

    static void show(Activity activity) {
        ViewGroup root = activity.findViewById(android.R.id.content);
        overlay = new SplashView(activity);
        root.addView(overlay, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        new Handler(Looper.getMainLooper()).postDelayed(LaunchSplashPlugin::fadeOut, 8000);
    }

    private static void fadeOut() {
        final View view = overlay;
        if (view == null) return;
        overlay = null;
        view.animate().alpha(0f).setDuration(450).withEndAction(() -> {
            if (view.getParent() instanceof ViewGroup) ((ViewGroup) view.getParent()).removeView(view);
        });
    }

    @PluginMethod
    public void hide(PluginCall call) {
        getActivity().runOnUiThread(LaunchSplashPlugin::fadeOut);
        call.resolve();
    }

    /** Gold background, the whole picture fitted to the screen, and soft gold fades at its top and bottom edges. */
    private static class SplashView extends View {

        private final Bitmap art;
        private final Paint paint = new Paint(Paint.FILTER_BITMAP_FLAG | Paint.ANTI_ALIAS_FLAG);
        private final Paint fadePaint = new Paint();
        private final RectF dest = new RectF();

        SplashView(Context context) {
            super(context);
            art = BitmapFactory.decodeResource(context.getResources(), R.drawable.splash_art);
            setClickable(true); // nothing underneath reacts to taps while it's showing
        }

        @Override
        protected void onDraw(Canvas canvas) {
            canvas.drawColor(GOLD);
            if (art == null) return;
            float scale = Math.min((float) getWidth() / art.getWidth(), (float) getHeight() / art.getHeight());
            float w = art.getWidth() * scale, h = art.getHeight() * scale;
            float left = (getWidth() - w) / 2f, top = (getHeight() - h) / 2f;
            dest.set(left, top, left + w, top + h);
            canvas.drawBitmap(art, new Rect(0, 0, art.getWidth(), art.getHeight()), dest, paint);

            float fade = h * 0.08f;
            fadePaint.setShader(new LinearGradient(0, top, 0, top + fade, GOLD, GOLD & 0x00FFFFFF, Shader.TileMode.CLAMP));
            canvas.drawRect(0, top, getWidth(), top + fade, fadePaint);
            fadePaint.setShader(new LinearGradient(0, top + h - fade, 0, top + h, GOLD & 0x00FFFFFF, GOLD, Shader.TileMode.CLAMP));
            canvas.drawRect(0, top + h - fade, getWidth(), top + h, fadePaint);
        }
    }
}
