import { useEffect, useState, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite'

const DB_NAME = 'screen_tv_cache'
const DB_VERSION = 1

let dbInstance: SQLiteDBConnection | null = null

const SQL_CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS screen_config (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS video_cache (
    id INTEGER PRIMARY KEY NOT NULL,
    screen_code TEXT NOT NULL,
    path TEXT NOT NULL,
    title TEXT,
    thumbnail TEXT,
    duration INTEGER,
    cached_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_video_screen ON video_cache(screen_code);
`

async function getDB(): Promise<SQLiteDBConnection | null> {
  // En navegador web (dev) no hay SQLite nativo
  if (!Capacitor.isNativePlatform()) {
    return null
  }

  if (dbInstance) return dbInstance

  try {
    const sqlite = new SQLiteConnection(CapacitorSQLite)
    const db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false)
    await db.open()
    await db.execute(SQL_CREATE_TABLES)
    dbInstance = db
    return db
  } catch (err) {
    console.error('[SQLite] Error al inicializar DB:', err)
    return null
  }
}

export interface VideoData {
  id: number
  path: string
  title?: string
  thumbnail?: string
  duration?: number
}

export function useSQLiteCache() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    getDB().then((db) => {
      setIsReady(!!db || !Capacitor.isNativePlatform())
    })
  }, [])

  /** Guarda el código de pantalla activo */
  const saveScreenCode = useCallback(async (code: string) => {
    // Siempre guardar en localStorage como fallback
    localStorage.setItem('screenName', code)
    
    const db = await getDB()
    if (!db) return

    await db.run(
      `INSERT OR REPLACE INTO screen_config (key, value, updated_at) VALUES (?, ?, ?)`,
      ['screenName', code, Date.now()]
    )
  }, [])

  /** Lee el código de pantalla guardado */
  const loadScreenCode = useCallback(async (): Promise<string | null> => {
    const db = await getDB()
    if (!db) {
      return localStorage.getItem('screenName')
    }

    try {
      const result = await db.query(
        `SELECT value FROM screen_config WHERE key = ? LIMIT 1`,
        ['screenName']
      )
      if (result.values && result.values.length > 0) {
        return result.values[0].value
      }
    } catch {
      /* fallback */
    }
    return localStorage.getItem('screenName')
  }, [])

  /** Cachea los videos de una pantalla para uso offline */
  const cacheVideos = useCallback(async (screenCode: string, videos: VideoData[]) => {
    const db = await getDB()
    if (!db) return

    // Eliminar cache anterior de esta pantalla
    await db.run(`DELETE FROM video_cache WHERE screen_code = ?`, [screenCode])

    for (const v of videos) {
      await db.run(
        `INSERT OR REPLACE INTO video_cache (id, screen_code, path, title, thumbnail, duration, cached_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [v.id, screenCode, v.path, v.title ?? null, v.thumbnail ?? null, v.duration ?? null, Date.now()]
      )
    }
  }, [])

  /** Recupera videos cacheados para reproducción offline */
  const getCachedVideos = useCallback(async (screenCode: string): Promise<VideoData[]> => {
    const db = await getDB()
    if (!db) return []

    try {
      const result = await db.query(
        `SELECT id, path, title, thumbnail, duration FROM video_cache WHERE screen_code = ? ORDER BY id`,
        [screenCode]
      )
      return result.values ?? []
    } catch {
      return []
    }
  }, [])

  /** Elimina código guardado (desvincular) */
  const clearScreenCode = useCallback(async () => {
    localStorage.removeItem('screenName')
    const db = await getDB()
    if (!db) return
    await db.run(`DELETE FROM screen_config WHERE key = ?`, ['screenName'])
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
