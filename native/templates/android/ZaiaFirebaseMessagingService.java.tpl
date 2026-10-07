package {{PACKAGE_ID}};

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.net.HttpURLConnection;
import java.net.URL;
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
        String title = value(data, "title", "{{APP_NAME}}");
        String body = value(data, "body", "Você tem uma nova atualização.");
        String target = value(data, "url", "/loja?page=agenda");
        String brandName = value(data, "brand_name", "{{APP_NAME}}");
        String logoUrl = value(data, "icon", "");
        String notificationId = value(data, "notification_id", "");

        showNotification(title, body, target, brandName, logoUrl, notificationId);
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
                "{{CHANNEL_NAME}}",
                NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("{{CHANNEL_DESCRIPTION}}");
        manager.createNotificationChannel(channel);
    }

    private Bitmap loadLogo(String logoUrl) {
        if (logoUrl == null || !logoUrl.startsWith("https://")) return null;
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(logoUrl).openConnection();
            connection.setConnectTimeout(2500);
            connection.setReadTimeout(2500);
            connection.setDoInput(true);
            connection.connect();
            if (connection.getResponseCode() < 200 || connection.getResponseCode() >= 300) return null;
            return BitmapFactory.decodeStream(connection.getInputStream());
        } catch (Exception ignored) {
            return null;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private void showNotification(
            String title,
            String body,
            String targetUrl,
            String brandName,
            String logoUrl,
            String notificationId
    ) {
        ensureChannel();

        Intent intent = new Intent(this, LauncherActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("zaia_target_url", targetUrl);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        int requestCode = notificationId == null || notificationId.isEmpty() ? 0 : notificationId.hashCode();
        PendingIntent pendingIntent = PendingIntent.getActivity(this, requestCode, intent, flags);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_zaia)
                .setContentTitle(title)
                .setContentText(body)
                .setSubText(brandName)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent);

        Bitmap logo = loadLogo(logoUrl);
        if (logo != null) builder.setLargeIcon(logo);

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            int id = notificationId == null || notificationId.isEmpty()
                    ? (int) (System.currentTimeMillis() & 0x7fffffff)
                    : notificationId.hashCode();
            manager.notify(id, builder.build());
        }
    }
}
