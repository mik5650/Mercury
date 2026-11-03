package com.mik5650.mercury;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Receives the rest-end alarm and the buttons of the live rest notification. */
public class RestAlertReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        Context c = context.getApplicationContext();
        switch (intent.getAction()) {
            case RestAlerts.A_REST_END:
                RestAlerts.restEnded(c);
                break;
            case RestAlerts.A_ADD:
                RestAlerts.addTime(c);
                break;
            case RestAlerts.A_SKIP:
                RestAlerts.skip(c);
                break;
            default:
                break;
        }
    }
}
