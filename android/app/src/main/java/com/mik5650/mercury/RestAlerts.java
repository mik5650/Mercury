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
import android.os.Bundle;
import androidx.core.app.NotificationCompat;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Rest timer outside the app.
 *
 * The web app pushes a small snapshot (rest end time, what's next). While the app is in the
 * background a silent live notification counts the rest down (lock screen included) with
 * +30 s / Skip buttons, and an exact alarm pops the "Rest complete" alert when it ends.
 * Changes made from the notification are kept here until the web app takes them.
 */
public final class RestAlerts {

    static final String PREFS = "mercury_live";
    static final String CH_ALERT = "rest-alert";
    static final String CH_LIVE = "rest-live";
    static final int ID_ALERT = 4301;
    static final int ID_LIVE = 4302;
    static final String A_REST_END = "com.mik5650.mercury.live.REST_END";
    static final String A_ADD = "com.mik5650.mercury.live.REST_ADD";
    static final String A_SKIP = "com.mik5650.mercury.live.REST_SKIP";
    static final int ADD_SECONDS = 30;

    private static final int ACCENT_DEFAULT = 0xFFC6F432;

    /** True while the app is on screen: the rest timer is then shown in-app instead. */
    static volatile boolean appVisible = false;

    /** Set by the plugin while the app runs: tells the web app about changes made here. */
    interface Listener {
        void onRestChanged(long endAt, int total);
    }

    static volatile Listener listener;

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

        NotificationChannel live = new NotificationChannel(CH_LIVE, "Rest timer", NotificationManager.IMPORTANCE_DEFAULT);
        live.setDescription("Silent countdown while you rest, with +30 s and Skip");
        live.setSound(null, null);
        live.enableVibration(false);
        live.setShowBadge(false);
        live.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(live);

        // Channels and notifications from earlier versions
        nm.deleteNotificationChannel("rest-timer");
        nm.deleteNotificationChannel("workout-live");
        nm.cancel(4300);
    }

    // ---------- Updates from the web app ----------
    static void applyUpdate(Context c, JSONObject st) {
        JSONObject old = load(c);
        long now = System.currentTimeMillis();
        // A change made from the notification wins until the web app has taken it
        JSONObject pending = old.optJSONObject("pending");
        if (pending != null && now - pending.optLong("at") < 10 * 60 * 1000L) {
            try {
                st.put("pending", pending);
                st.put("restEndAt", pending.optLong("endAt"));
                st.put("restTotal", pending.optInt("total"));
            } catch (JSONException ignored) {}
        }
        save(c, st);
        long end = st.optLong("restEndAt");
        long oldEnd = old.optLong("restEndAt");
        if (end > now) {
            scheduleAlarm(c, end);
            if (!appVisible) postLive(c, st);
        } else {
            cancelAlarm(c);
            cancelLive(c);
            // The app's own countdown can reach zero a moment before the alarm fires:
            // a rest that just ran out still gets its alert.
            boolean justEnded = oldEnd > 0 && oldEnd <= now + 1500 && oldEnd > now - 30000;
            if (justEnded && !appVisible && st.optBoolean("restAlert", true)) postAlert(c, st);
        }
    }

    /** The rest change made from the notification, if the web app hasn't taken it yet (then cleared). */
    static synchronized JSONObject takePending(Context c) {
        JSONObject st = load(c);
        JSONObject pending = st.optJSONObject("pending");
        if (pending != null) {
            st.remove("pending");
            save(c, st);
        }
        return pending;
    }

    // ---------- App in the background / back on screen ----------
    static void onAppHidden(Context c) {
        appVisible = false;
        JSONObject st = load(c);
        if (st.optLong("restEndAt") > System.currentTimeMillis()) postLive(c, st);
    }

    static void onAppShown(Context c) {
        appVisible = true;
        cancelLive(c);
        cancelAlert(c);
    }

    // ---------- Buttons on the live notification ----------
    static void addTime(Context c) {
        JSONObject st = load(c);
        long now = System.currentTimeMillis();
        long end = st.optLong("restEndAt");
        if (end <= now) return;
        end += ADD_SECONDS * 1000L;
        int total = st.optInt("restTotal", 0) + ADD_SECONDS;
        setRest(c, st, end, total);
        scheduleAlarm(c, end);
        if (!appVisible) postLive(c, st);
    }

    static void skip(Context c) {
        JSONObject st = load(c);
        setRest(c, st, 0, 0);
        cancelAlarm(c);
        cancelLive(c);
    }

    private static void setRest(Context c, JSONObject st, long end, int total) {
        try {
            JSONObject pending = new JSONObject();
            pending.put("endAt", end);
            pending.put("total", total);
            pending.put("at", System.currentTimeMillis());
            st.put("restEndAt", end);
            st.put("restTotal", total);
            st.put("pending", pending);
        } catch (JSONException ignored) {}
        save(c, st);
        Listener l = listener;
        if (l != null) l.onRestChanged(end, total);
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
        cancelLive(c);
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

    // ---------- Live countdown ----------
    static void postLive(Context c, JSONObject st) {
        long end = st.optLong("restEndAt");
        if (end <= System.currentTimeMillis()) return;
        ensureChannels(c);
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;
        String next = st.optString("next");
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CH_LIVE)
            .setSmallIcon(R.drawable.ic_stat_mercury)
            .setColor(parseColor(st.optString("accent"), ACCENT_DEFAULT))
            .setContentTitle("Resting")
            .setContentText(next.isEmpty() ? "Next set coming up" : "Next: " + next)
            .setWhen(end)
            .setShowWhen(true)
            .setUsesChronometer(true)
            .setChronometerCountDown(true)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
            .setGroup("mercury.rest-live")
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setTimeoutAfter(end - System.currentTimeMillis() + 5000)
            .setContentIntent(openApp(c))
            .addAction(0, "+" + ADD_SECONDS + " s", action(c, A_ADD, 78))
            .addAction(0, "Skip", action(c, A_SKIP, 79));
        // Android 16 Live Updates: countdown chip in the status bar and on the lock screen
        Bundle extras = new Bundle();
        extras.putBoolean("android.requestPromotedOngoing", true);
        b.addExtras(extras);
        nm.notify(ID_LIVE, b.build());
    }

    static void cancelLive(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm != null) nm.cancel(ID_LIVE);
    }

    // ---------- Alarm ----------
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
        return action(c, A_REST_END, 77);
    }

    private static PendingIntent action(Context c, String act, int requestCode) {
        Intent i = new Intent(c, RestAlertReceiver.class).setAction(act);
        return PendingIntent.getBroadcast(c, requestCode, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent openApp(Context c) {
        Intent i = new Intent(c, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(c, 1, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
