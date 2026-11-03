package com.mik5650.mercury;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Receives the rest-end alarm. */
public class RestAlertReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent != null && RestAlerts.A_REST_END.equals(intent.getAction())) {
            RestAlerts.restEnded(context.getApplicationContext());
        }
    }
}
