package com.nethanel.zaia.vezell.dev;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class ZaiaFirebaseMessagingService extends FirebaseMessagingService {
    private static final String PREFS = "zaia_native_push";
    private static final String TOKEN_KEY = "fcm_token";
    private static final String CHANNEL_ID = "zaia_store_notifications";

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        if (token == null || token.isEmpty()) return;

        SharedPreferences prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit().putString(TOKEN_KEY, token).apply();
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        Map<String, String> data = remoteMessage.getData();
        String title = value(data, "title", "Vezell Barber Studio");
        String body = value(data, "body", "Você tem uma nova atualização.");

        if (remoteMessage.getNotification() != null) {
            if (remoteMessage.getNotification().getTitle() != null && !remoteMessage.getNotification().getTitle().isEmpty()) {
                title = remoteMessage.getNotification().getTitle();
            }
            if (remoteMessage.getNotification().getBody() != null && !remoteMessage.getNotification().getBody().isEmpty()) {
                body = remoteMessage.getNotification().getBody();
            }
        }

        showNotification(title, body, value(data, "url", "/loja?page=agenda"));
    }

    private String value(Map<String, String> data, String key, String fallback) {
        if (data == null) return fallback;
        String value = data.get(key);
        return value == null || value.trim().isEmpty() ? fallback : value;
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;

        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Avisos da Vezell",
                NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Agendamentos, clientes e avisos importantes da Vezell Barber Studio.");
        manager.createNotificationChannel(channel);
    }

    private void showNotification(String title, String body, String targetUrl) {
        ensureChannel();

        Intent intent = new Intent(this, LauncherActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("zaia_target_url", targetUrl);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent, flags);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification_icon)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent);

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            int id = (int) (System.currentTimeMillis() & 0x7fffffff);
            manager.notify(id, builder.build());
        }
    }
}
