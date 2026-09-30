/**
 * Runtime configuration.
 *
 * In production Caddy serves /config.js with the real API URL, so the same Docker image
 * works for any domain. In development the file in public/ is empty and the Vite env
 * variables (or localhost) are used instead.
 */
declare global {
  interface Window {
    __APP_CONFIG__?: { apiUrl?: string; socketUrl?: string; tvUrl?: string }
  }
}

const runtime = typeof window !== 'undefined' ? window.__APP_CONFIG__ || {} : {}

export const API_URL: string =
  runtime.apiUrl || import.meta.env.VITE_API_URL || 'http://localhost:4006'

export const SOCKET_URL: string =
  runtime.socketUrl || import.meta.env.VITE_SOCKET_URL || API_URL

/** Public URL of the TV web client (used for the APK download link). */
export const TV_URL: string =
  runtime.tvUrl || import.meta.env.VITE_TV_URL || 'http://localhost:3500'

/** Where the Android APK is served (Caddy, no login). Same-origin in production. */
export const APK_URL: string =
  runtime.apiUrl ? `${window.location.origin}/apk/screentv.apk` : `${API_URL}/apk/screentv.apk`
export const APK_VERSION_URL: string = APK_URL.replace(/screentv\.apk$/, 'version.json')
