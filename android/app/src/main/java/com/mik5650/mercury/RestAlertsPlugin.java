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

/** Bridge between the web app and the native rest timer (live notification, alarm, alert). */
@CapacitorPlugin(
    name = "RestAlerts",
    permissions = { @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS }) }
)
public class RestAlertsPlugin extends Plugin {

    @Override
    public void load() {
        RestAlerts.appVisible = true;
        RestAlerts.ensureChannels(getContext());
        RestAlerts.listener = (endAt, total) -> {
            JSObject data = new JSObject();
            data.put("endAt", endAt);
            data.put("total", total);
            notifyListeners("rest", data);
        };
    }

    @Override
    protected void handleOnDestroy() {
        RestAlerts.listener = null;
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

    /** Rest change made from the notification (+30 s / Skip) since the last call: { endAt, total } or {}. */
    @PluginMethod
    public void take(PluginCall call) {
        JSONObject pending = RestAlerts.takePending(getContext());
        JSObject res = new JSObject();
        if (pending != null) {
            res.put("endAt", pending.optLong("endAt"));
            res.put("total", pending.optInt("total"));
        }
        call.resolve(res);
    }

    @Override
    protected void handleOnResume() {
        RestAlerts.onAppShown(getContext());
        notifyListeners("resume", new JSObject());
    }

    @Override
    protected void handleOnPause() {
        RestAlerts.onAppHidden(getContext());
        notifyListeners("pause", new JSObject());
    }
}
