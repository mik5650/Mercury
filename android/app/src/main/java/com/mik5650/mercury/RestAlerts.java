package com.mik5650.mercury;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Rest-end alerts.
 *
 * The web app pushes a small snapshot (rest end time, what's next). The alarm and its alert are
 * native so they fire on time with the app in the background or the screen off, and so the alert
 * is never removed or silenced by the app's own countdown.
 */
public final class RestAlerts {

    static final String PREFS = "mercury_live";
    static final String CH_ALERT = "rest-alert";
    static final int ID_ALERT = 4301;
    static final String A_REST_END = "com.mik5650.mercury.live.REST_END";

    private static final int ACCENT_DEFAULT = 0xFFC6F432;

    /** True while the app is on screen: rest alerts are then handled in-app instead. */
    static volatile boolean appVisible = false;

    private RestAlerts() {}

    // ---------- Storage ----------
    static synchronized JSONObject load(Context c) {
        String s = prefs(c).getString("state", null);
        if (s == null) return new JSONObject();
        try {
            return new JSONObject(s);
        } catch (JSONException e) {
            return new JSONObject();
        }
    }

    static synchronized void save(Context c, JSONObject st) {
        prefs(c).edit().putString("state", st.toString()).commit();
    }

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    // ---------- Channels ----------
    static void ensureChannels(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;

        NotificationChannel alert = new NotificationChannel(CH_ALERT, "Rest complete", NotificationManager.IMPORTANCE_HIGH);
        alert.setDescription("Pops up when your rest is over");
        alert.enableVibration(true);
        alert.setVibrationPattern(new long[] { 0, 260, 140, 260 });
        alert.setSound(
            RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
            new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()
        );
        alert.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(alert);

        // Channels and notifications from earlier versions
        nm.deleteNotificationChannel("rest-timer");
        nm.deleteNotificationChannel("workout-live");
        nm.cancel(4300);
    }

    // ---------- Updates from the web app ----------
    static void applyUpdate(Context c, JSONObject st) {
        JSONObject old = load(c);
        long now = System.currentTimeMillis();
        save(c, st);
        long end = st.optLong("restEndAt");
        long oldEnd = old.optLong("restEndAt");
        if (end > now) {
            scheduleAlarm(c, end);
        } else {
            cancelAlarm(c);
            // The app's own countdown can reach zero a moment before the alarm fires:
            // a rest that just ran out still gets its alert.
            boolean justEnded = oldEnd > 0 && oldEnd <= now + 1500 && oldEnd > now - 30000;
            if (justEnded && !appVisible && st.optBoolean("restAlert", true)) postAlert(c, st);
        }
    }

    // ---------- Rest end ----------
    static void restEnded(Context c) {
        JSONObject st = load(c);
        long end = st.optLong("restEndAt");
        if (end == 0 || end > System.currentTimeMillis() + 1500) return;
        try {
            st.put("restEndAt", 0);
        } catch (JSONException ignored) {}
        save(c, st);
        if (!appVisible && st.optBoolean("restAlert", true)) postAlert(c, st);
    }

    static void postAlert(Context c, JSONObject st) {
        ensureChannels(c);
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;
        // Remove any previous alert so this one pops up again instead of updating silently
        nm.cancel(ID_ALERT);
        String next = st.optString("next");
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CH_ALERT)
            .setSmallIcon(R.drawable.ic_stat_mercury)
            .setColor(parseColor(st.optString("accent"), ACCENT_DEFAULT))
            .setContentTitle("Rest complete")
            .setContentText(next.isEmpty() ? "Time for your next set." : "Next: " + next)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            // Timer alarm in its own group: Android's automatic bundling would silence it
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setGroup("mercury.rest-alert")
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setAutoCancel(true)
            .setTimeoutAfter(10 * 60 * 1000L)
            .setContentIntent(openApp(c));
        nm.notify(ID_ALERT, b.build());
    }

    static void cancelAlert(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm != null) nm.cancel(ID_ALERT);
    }

    static void scheduleAlarm(Context c, long at) {
        AlarmManager am = c.getSystemService(AlarmManager.class);
        if (am == null) return;
        PendingIntent pi = restEndIntent(c);
        if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        } else {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        }
    }

    static void cancelAlarm(Context c) {
        AlarmManager am = c.getSystemService(AlarmManager.class);
        if (am != null) am.cancel(restEndIntent(c));
    }

    // ---------- Helpers ----------
    private static int parseColor(String s, int fallback) {
        try {
            return s == null || s.isEmpty() ? fallback : Color.parseColor(s);
        } catch (IllegalArgumentException e) {
            return fallback;
        }
    }

    private static PendingIntent restEndIntent(Context c) {
        Intent i = new Intent(c, RestAlertReceiver.class).setAction(A_REST_END);
        return PendingIntent.getBroadcast(c, 77, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent openApp(Context c) {
        Intent i = new Intent(c, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(c, 1, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
