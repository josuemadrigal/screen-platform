import { useEffect, useState, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

/**
 * Small persistent cache for the TV client: the linked screen code and the last playlist
 * received, so the app can start and play without the server (the video files themselves
 * live in useVideoStore).
 *
 * Backed by Capacitor Preferences (Android SharedPreferences) in the app and by localStorage
 * in a browser. It replaced an SQLite plugin that shipped 12 MB of native libraries to store
 * these two values.
 */

const KEY_SCREEN = 'screenName'
const keyVideos = (screenCode: string) => `videos:${screenCode}`

export interface VideoData {
  id: number
  path: string
  title?: string
  thumbnail?: string
  duration?: number
  /** Expiry date as YYYY-MM-DD; the video must not play after this day. */
  dateout?: string | null
}

// Use the native store only when the installed app actually ships the plugin. A live update
// can deliver this code to an older APK built without it; localStorage then keeps working.
const isNative = Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Preferences')

async function read(key: string): Promise<string | null> {
  if (!isNative) return localStorage.getItem(key)
  const { value } = await Preferences.get({ key })
  return value ?? null
}

async function write(key: string, value: string): Promise<void> {
  localStorage.setItem(key, value)
  if (isNative) await Preferences.set({ key, value })
}

async function erase(key: string): Promise<void> {
  localStorage.removeItem(key)
  if (isNative) await Preferences.remove({ key })
}

export function useSQLiteCache() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Nothing to open; kept for API compatibility with the previous SQLite implementation.
    setIsReady(true)
  }, [])

  /** Guarda el código de pantalla activo */
  const saveScreenCode = useCallback(async (code: string) => {
    await write(KEY_SCREEN, code)
  }, [])

  /** Lee el código de pantalla guardado */
  const loadScreenCode = useCallback(async (): Promise<string | null> => {
    return read(KEY_SCREEN)
  }, [])

  /** Guarda la playlist de una pantalla para uso sin conexión */
  const cacheVideos = useCallback(async (screenCode: string, videos: VideoData[]) => {
    const slim = videos.map(({ id, path, title, thumbnail, duration, dateout }) => ({
      id, path, title, thumbnail, duration, dateout: dateout ?? null,
    }))
    await write(keyVideos(screenCode), JSON.stringify({ savedAt: Date.now(), videos: slim }))
  }, [])

  /** Recupera la playlist guardada para reproducción sin conexión */
  const getCachedVideos = useCallback(async (screenCode: string): Promise<VideoData[]> => {
    try {
      const raw = await read(keyVideos(screenCode))
      if (!raw) return []
      const parsed = JSON.parse(raw) as { videos?: VideoData[] }
      return Array.isArray(parsed.videos) ? parsed.videos : []
    } catch {
      return []
    }
  }, [])

  /** Elimina código guardado (desvincular) */
  const clearScreenCode = useCallback(async () => {
    await erase(KEY_SCREEN)
  }, [])

  return {
    isReady,
    saveScreenCode,
    loadScreenCode,
    cacheVideos,
    getCachedVideos,
    clearScreenCode,
  }
}
