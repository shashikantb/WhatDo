package co.in.whatdo.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Custom native plugins must be registered before super.onCreate(),
        // which is what boots the Capacitor bridge.
        registerPlugin(SecureStorePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
