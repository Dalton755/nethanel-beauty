package {{PACKAGE_ID}};

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;

import com.google.firebase.messaging.FirebaseMessaging;

import java.util.concurrent.atomic.AtomicBoolean;

public class LauncherActivity extends com.google.androidbrowserhelper.trusted.LauncherActivity {
    private static final String PREFS = "zaia_native_push";
    private static final String TOKEN_KEY = "fcm_token";
    private static final String CHANNEL_ID = "zaia_store_notifications";
    private static final int NOTIFICATION_PERMISSION_REQUEST = 4107;
    private static final String WEB_ORIGIN = "https://{{HOST}}";

    private final AtomicBoolean launchStarted = new AtomicBoolean(false);
    private String nativePushToken = "";

    @Override
    protected boolean shouldLaunchImmediately() {
        return false;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        createNotificationChannel();
        requestNotificationPermissionIfNeeded();

        SharedPreferences prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        nativePushToken = prefs.getString(TOKEN_KEY, "");

        FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
            if (task.isSuccessful() && task.getResult() != null && !task.getResult().isEmpty()) {
                nativePushToken = task.getResult();
                prefs.edit().putString(TOKEN_KEY, nativePushToken).apply();
            }
            launchOnce();
        });

        new Handler(Looper.getMainLooper()).postDelayed(this::launchOnce, 3500);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;

        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "{{CHANNEL_NAME}}",
                NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("{{CHANNEL_DESCRIPTION}}");
        manager.createNotificationChannel(channel);
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT < 33) return;
        if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) return;
        requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_REQUEST);
    }

    private void launchOnce() {
        if (launchStarted.compareAndSet(false, true)) launchTwa();
    }

    private String appVersion() {
        try {
            return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
        } catch (Exception ignored) {
            return "";
        }
    }

    private Uri notificationTarget(Uri fallback) {
        String target = getIntent() == null ? null : getIntent().getStringExtra("zaia_target_url");
        if (target == null || target.trim().isEmpty() || !target.startsWith("/")) return fallback;
        try {
            return Uri.parse(WEB_ORIGIN + target);
        } catch (Exception ignored) {
            return fallback;
        }
    }

    @Override
    protected Uri getLaunchingUrl() {
        Uri uri = notificationTarget(super.getLaunchingUrl());
        if (nativePushToken == null || nativePushToken.isEmpty()) return uri;

        return uri.buildUpon()
                .appendQueryParameter("nativePush", "1")
                .appendQueryParameter("nativePlatform", "ANDROID")
                .appendQueryParameter("nativeToken", nativePushToken)
                .appendQueryParameter("nativeAppId", getPackageName())
                .appendQueryParameter("nativeAppVersion", appVersion())
                .build();
    }
}
