package com.mik5650.mercury;

import android.Manifest;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import org.json.JSONException;
import org.json.JSONObject;

/** Bridge between the web app and the native rest-end alarm / alert. */
@CapacitorPlugin(
    name = "RestAlerts",
    permissions = { @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS }) }
)
public class RestAlertsPlugin extends Plugin {

    @Override
    public void load() {
        RestAlerts.appVisible = true;
        RestAlerts.ensureChannels(getContext());
    }

    /** Snapshot from the web app: rest end time, whether to alert, what's next. */
    @PluginMethod
    public void update(PluginCall call) {
        JSObject state = call.getObject("state");
        if (state == null) {
            call.reject("Missing state");
            return;
        }
        try {
            RestAlerts.applyUpdate(getContext(), new JSONObject(state.toString()));
            call.resolve();
        } catch (JSONException e) {
            call.reject("Bad state", e);
        }
    }

    @Override
    protected void handleOnResume() {
        RestAlerts.appVisible = true;
        RestAlerts.cancelAlert(getContext());
        notifyListeners("resume", new JSObject());
    }

    @Override
    protected void handleOnPause() {
        RestAlerts.appVisible = false;
        notifyListeners("pause", new JSObject());
    }
}
