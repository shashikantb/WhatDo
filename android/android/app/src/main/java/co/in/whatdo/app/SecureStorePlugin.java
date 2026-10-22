package co.in.whatdo.app;

import android.content.SharedPreferences;
import android.util.Log;

import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKeys;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Map;

/**
 * SecureStore — native key/value storage backed by Android Keystore.
 *
 * Values are encrypted with a hardware-backed AES-256-GCM master key from the
 * Android Keystore and written to an EncryptedSharedPreferences file. This is
 * used for device credentials and tokens that must NOT live in plain
 * localStorage inside the WebView (which is what the website uses on the web).
 *
 * It intentionally mirrors the small subset of the
 * `@capacitor/preferences` API that the app needs, so web code can call
 * `Capacitor.Plugins.SecureStore.get/set/remove/clear/keys` and fall back to
 * `@capacitor/preferences` (or localStorage on the plain website) when this
 * plugin is unavailable.
 *
 * IMPORTANT: this plugin only exists inside the Android app. The website never
 * loads it and must keep working without it.
 */
@CapacitorPlugin(name = "SecureStore")
public class SecureStorePlugin extends Plugin {

    private static final String TAG = "SecureStore";
    private static final String FILE_NAME = "whatdo_secure_store";

    private SharedPreferences prefs;

    private SharedPreferences prefs() throws Exception {
        if (prefs == null) {
            String masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC);
            prefs = EncryptedSharedPreferences.create(
                    FILE_NAME,
                    masterKeyAlias,
                    getContext(),
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM);
        }
        return prefs;
    }

    /**
     * The Keystore key can be invalidated (for example when the user changes
     * their screen lock). In that case the existing file is unreadable, so we
     * wipe it and start a fresh one rather than crashing the app.
     */
    private SharedPreferences prefsWithRecovery() throws Exception {
        try {
            return prefs();
        } catch (Exception first) {
            Log.w(TAG, "Encrypted store unreadable, recreating", first);
            prefs = null;
            getContext().deleteSharedPreferences(FILE_NAME);
            return prefs();
        }
    }

    @PluginMethod
    public void get(PluginCall call) {
        String key = call.getString("key");
        if (key == null) {
            call.reject("SecureStore.get requires a 'key'");
            return;
        }
        try {
            JSObject ret = new JSObject();
            ret.put("value", prefsWithRecovery().getString(key, null));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("SecureStore.get failed", e);
        }
    }

    @PluginMethod
    public void set(PluginCall call) {
        String key = call.getString("key");
        String value = call.getString("value");
        if (key == null) {
            call.reject("SecureStore.set requires a 'key'");
            return;
        }
        try {
            prefsWithRecovery().edit().putString(key, value).apply();
            call.resolve();
        } catch (Exception e) {
            call.reject("SecureStore.set failed", e);
        }
    }

    @PluginMethod
    public void remove(PluginCall call) {
        String key = call.getString("key");
        if (key == null) {
            call.reject("SecureStore.remove requires a 'key'");
            return;
        }
        try {
            prefsWithRecovery().edit().remove(key).apply();
            call.resolve();
        } catch (Exception e) {
            call.reject("SecureStore.remove failed", e);
        }
    }

    @PluginMethod
    public void clear(PluginCall call) {
        try {
            prefsWithRecovery().edit().clear().apply();
            call.resolve();
        } catch (Exception e) {
            call.reject("SecureStore.clear failed", e);
        }
    }

    @PluginMethod
    public void keys(PluginCall call) {
        try {
            JSArray keys = new JSArray();
            for (Map.Entry<String, ?> entry : prefsWithRecovery().getAll().entrySet()) {
                keys.put(entry.getKey());
            }
            JSObject ret = new JSObject();
            ret.put("keys", keys);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("SecureStore.keys failed", e);
        }
    }
}
