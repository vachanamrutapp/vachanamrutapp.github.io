package com.vachanamrut.app;

import android.content.pm.ActivityInfo;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LaunchSplashPlugin.class);
        registerPlugin(NotificationSettingsPlugin.class);
        registerPlugin(MediaPlaybackPlugin.class);
        // Handsets stay portrait; tablets (smallest width >= 600dp) may rotate
        if (getResources().getConfiguration().smallestScreenWidthDp < 600) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        }
        super.onCreate(savedInstanceState);
        // Illustrated splash over the app until the page is ready (see LaunchSplashPlugin)
        LaunchSplashPlugin.show(this);
    }
}
