package com.nethanel.zaia.vezell.dev;

import android.content.Context;
import android.content.SharedPreferences;

import com.google.firebase.messaging.FirebaseMessagingService;

public class ZaiaFirebaseMessagingService extends FirebaseMessagingService {
    private static final String PREFS = "zaia_native_push";
    private static final String TOKEN_KEY = "fcm_token";

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        if (token == null || token.isEmpty()) return;

        SharedPreferences prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit().putString(TOKEN_KEY, token).apply();
    }
}
