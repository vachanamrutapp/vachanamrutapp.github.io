package com.vachanamrut.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LaunchSplashPlugin.class);
        registerPlugin(NotificationSettingsPlugin.class);
        super.onCreate(savedInstanceState);
        // Illustrated splash over the app until the page is ready (see LaunchSplashPlugin)
        LaunchSplashPlugin.show(this);
    }
}
