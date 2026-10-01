package com.screenmanager.tvclient;

import android.os.Bundle;
import android.util.Log;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * Serves the locally downloaded videos (https://localhost/_capacitor_file_/...) with HTTP range
 * semantics the Android WebView accepts. The WebView does the byte skipping itself on
 * intercepted responses (it reads the request's Range header, skips the InputStream and sizes
 * the body), so the stream must start at byte 0; what it needs from us are the 206 status and a
 * Content-Range header consistent with the real file size. Capacitor's default handler computes
 * that header from InputStream.available() on a lazy stream, which goes wrong on large files:
 * the video shows one frame and freezes. Everything that is not a local video stays with Capacitor.
 */
public class MainActivity extends BridgeActivity {

    private static final String TAG = "ScreenTV";
    private static final String FILE_PREFIX = "/_capacitor_file_";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        final Bridge bridge = getBridge();
        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse video = serveLocalVideo(request);
                return video != null ? video : super.shouldInterceptRequest(view, request);
            }
        });
    }

    private static WebResourceResponse serveLocalVideo(WebResourceRequest request) {
        String path = request.getUrl().getPath();
        if (path == null || !path.startsWith(FILE_PREFIX + "/")) return null;
        String mime = mimeOf(path);
        if (!mime.startsWith("video/")) return null;
        File file = new File(path.substring(FILE_PREFIX.length()));
        if (!file.isFile()) return null;
        long size = file.length();

        String range = null;
        for (Map.Entry<String, String> h : request.getRequestHeaders().entrySet()) {
            if ("range".equalsIgnoreCase(h.getKey())) range = h.getValue();
        }

        Map<String, String> headers = new HashMap<>();
        headers.put("Accept-Ranges", "bytes");
        headers.put("Cache-Control", "no-store");
        try {
            // Always the whole file from byte 0: the WebView skips to the requested offset itself.
            FileInputStream stream = new FileInputStream(file);
            if (range == null || !range.startsWith("bytes=")) {
                return new WebResourceResponse(mime, null, 200, "OK", headers, stream);
            }
            String[] parts = range.substring("bytes=".length()).trim().split("-", -1);
            long start;
            long end;
            try {
                if (parts[0].isEmpty()) {
                    long n = Long.parseLong(parts[1]);
                    start = Math.max(0, size - n);
                    end = size - 1;
                } else {
                    start = Long.parseLong(parts[0]);
                    end = (parts.length > 1 && !parts[1].isEmpty()) ? Math.min(Long.parseLong(parts[1]), size - 1) : size - 1;
                }
            } catch (NumberFormatException e) {
                return new WebResourceResponse(mime, null, 200, "OK", headers, stream);
            }
            if (start < 0 || start >= size || end < start) {
                stream.close();
                headers.put("Content-Range", "bytes */" + size);
                return new WebResourceResponse(mime, null, 416, "Range Not Satisfiable", headers, null);
            }
            headers.put("Content-Range", "bytes " + start + "-" + end + "/" + size);
            return new WebResourceResponse(mime, null, 206, "Partial Content", headers, stream);
        } catch (IOException e) {
            Log.w(TAG, "Cannot open local video " + file.getName(), e);
            return null;
        }
    }

    private static String mimeOf(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".mp4") || p.endsWith(".m4v")) return "video/mp4";
        if (p.endsWith(".webm")) return "video/webm";
        if (p.endsWith(".mkv")) return "video/x-matroska";
        if (p.endsWith(".mov")) return "video/quicktime";
        return "application/octet-stream";
    }
}
