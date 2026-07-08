package runner;

import android.content.Context;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import org.json.JSONArray;
import org.json.JSONException;

import java.util.HashMap;

import runner.lib.Device;
import runner.lib.Dialog;
import runner.lib.Encryption;
import runner.lib.FileHandler;
import runner.lib.Native;
import runner.lib.Notification;

public class Bridge {
    private final Context context;
    private final WebView webview;
    private final HashMap<String, Service> services = new HashMap<>();

    Bridge(Context context, WebView webview){
        this.context = context;
        this.webview = webview;
    }

    public HashMap<String, Service> getServices(){
        return services;
    }

    @JavascriptInterface
    public boolean exec(@NonNull String service, String action, String args, long id){
        Service module;

        if(!services.containsKey(service)){
            module = getService(service);
            if(module != null) {
                services.put(service, module);
            }
        }else{
            module = services.get(service);
        }

        if(module == null){
            Log.e("Bridge", "Service not found: " + service);
            return false;
        }

        Callback callback = new Callback(id, webview);
        try{
            return module.exec(action, new JSONArray(args), callback);
        } catch (JSONException e){
            callback.error(e.toString());
            return false;
        }
    }

    @Nullable
    private Service getService(@NonNull String service){
        switch (service){
            case "Native":
                return new Native(context, webview);
            case "Dialog":
                return new Dialog(context, webview);
            case "Device":
                return new Device(context, webview);
            case "Encryption":
                return new Encryption(context, webview);
            case "FileHandler":
                return new FileHandler(context, webview);
            case "Notification":
                return new Notification(context, webview);
            default:
                return null;
        }
    }

    public void destroy() {
        for (Service service : services.values()) {
            if (service != null) {
                service.destroy();
            }
        }
        services.clear();
    }
}
