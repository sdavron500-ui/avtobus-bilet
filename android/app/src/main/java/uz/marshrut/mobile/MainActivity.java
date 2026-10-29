package uz.marshrut.mobile;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.net.wifi.WifiManager;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

public final class MainActivity extends Activity {
    private static final int CAMERA_PERMISSION_REQUEST = 41;
    private static final String PREFERENCES = "marshrut_mobile";
    private static final String SERVER_KEY = "server";

    private WebView webView;
    private String serverUrl;
    private PermissionRequest pendingCameraRequest;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        serverUrl = getPreferences(Context.MODE_PRIVATE).getString(SERVER_KEY, defaultServerUrl());
        showApp();
        if (getPreferences(Context.MODE_PRIVATE).getString(SERVER_KEY, null) == null) {
            showServerDialog();
        }
    }

    private String defaultServerUrl() {
        if ("admin".equals(BuildConfig.APP_ROLE)) {
            return "http://127.0.0.1:3000";
        }
        String gateway = hotspotGateway();
        return "http://" + (gateway == null ? "192.168.43.1" : gateway) + ":3000";
    }

    private String hotspotGateway() {
        try {
            WifiManager wifi = (WifiManager) getApplicationContext().getSystemService(WIFI_SERVICE);
            int gateway = wifi.getDhcpInfo().gateway;
            if (gateway == 0) return null;
            return (gateway & 0xff) + "." + ((gateway >> 8) & 0xff) + "."
                    + ((gateway >> 16) & 0xff) + "." + ((gateway >> 24) & 0xff);
        } catch (RuntimeException error) {
            return null;
        }
    }

    private void showApp() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.WHITE);

        LinearLayout toolbar = new LinearLayout(this);
        toolbar.setGravity(Gravity.CENTER_VERTICAL);
        toolbar.setPadding(16, 8, 12, 8);
        toolbar.setBackgroundColor(Color.rgb(248, 250, 252));

        TextView title = new TextView(this);
        title.setText("admin".equals(BuildConfig.APP_ROLE) ? "Marshrut Admin" : "Marshrut");
        title.setTextColor(Color.rgb(20, 35, 55));
        title.setTextSize(18);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        toolbar.addView(title, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));

        Button settings = new Button(this);
        settings.setText("Server");
        settings.setOnClickListener(view -> showServerDialog());
        toolbar.addView(settings, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        root.addView(toolbar);

        webView = new WebView(this);
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setMediaPlaybackRequiresUserGesture(false);
        webSettings.setAllowFileAccess(false);
        webSettings.setAllowContentAccess(false);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri target = request.getUrl();
                Uri base = Uri.parse(serverUrl);
                return !target.getScheme().equals(base.getScheme())
                        || !target.getHost().equalsIgnoreCase(base.getHost())
                        || target.getPort() != base.getPort();
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> requestCamera(request));
            }
        });
        root.addView(webView, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        setContentView(root);
        loadWebApp();
    }

    private void loadWebApp() {
        String page = "admin".equals(BuildConfig.APP_ROLE) ? "/admin.html" : "/";
        webView.loadUrl(serverUrl + page);
    }

    private void showServerDialog() {
        EditText input = new EditText(this);
        input.setSingleLine(true);
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        input.setHint("http://192.168.43.1:3000");
        input.setText(serverUrl);

        new AlertDialog.Builder(this)
                .setTitle("Server manzili")
                .setMessage("Admin ilovasida server telefonning o'zida ishlaydi. Mijoz ilovasida admin telefonining hotspot manzili bo'lishi kerak.")
                .setView(input)
                .setNegativeButton("Bekor qilish", (dialog, which) -> {
                    if (webView == null || webView.getUrl() == null) {
                        Toast.makeText(this, "Server manzilini kiriting", Toast.LENGTH_LONG).show();
                    }
                })
                .setPositiveButton("Ulanish", (dialog, which) -> {
                    String entered = input.getText().toString().trim().replaceAll("/+$", "");
                    Uri uri = Uri.parse(entered);
                    if (!("http".equals(uri.getScheme()) || "https".equals(uri.getScheme()))
                            || uri.getHost() == null || uri.getPort() == 0 || uri.getPort() > 65535) {
                        Toast.makeText(this, "Manzilni http://IP:3000 ko'rinishida kiriting", Toast.LENGTH_LONG).show();
                        showServerDialog();
                        return;
                    }
                    serverUrl = entered;
                    getPreferences(Context.MODE_PRIVATE).edit().putString(SERVER_KEY, serverUrl).apply();
                    if (webView == null) {
                        showApp();
                    } else {
                        loadWebApp();
                    }
                })
                .setCancelable(false)
                .show();
    }

    private void requestCamera(PermissionRequest request) {
        boolean requestsCamera = false;
        for (String resource : request.getResources()) {
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                requestsCamera = true;
                break;
            }
        }
        if (!requestsCamera) {
            request.deny();
            return;
        }
        if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            return;
        }
        pendingCameraRequest = request;
        requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION_REQUEST);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode != CAMERA_PERMISSION_REQUEST || pendingCameraRequest == null) return;
        if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) {
            pendingCameraRequest.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
        } else {
            pendingCameraRequest.deny();
        }
        pendingCameraRequest = null;
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
