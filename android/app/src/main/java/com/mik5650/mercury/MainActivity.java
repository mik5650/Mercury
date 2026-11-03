package com.mik5650.mercury;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RestAlertsPlugin.class);
        registerPlugin(HealthSyncPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
