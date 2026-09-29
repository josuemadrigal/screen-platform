import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'

/**
 * Local copy of the playlist videos (native app only).
 *
 * On Android/iOS the videos are downloaded once into the app's private storage and played
 * from there, so playback keeps working with no Internet and never re-downloads a file.
 * In a browser this hook is inert and the <video> tags stream from the API as before.
 *
 * Files are named after the API's unique file names, so a changed video is a new file.
 * Files no longer in the playlist are deleted to free space.
 */

const DIR = 'videos'
const PART_SUFFIX = '.part'

export interface DownloadProgress {
  done: number
  total: number
  current?: string
}

const fileNameOf = (path: string) => path.split('/').pop() || path

export function useVideoStore() {
  // Only when the installed APK ships the Filesystem plugin (older builds may receive this code via live update).
  const isNative = Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Filesystem')
  const [isReady, setIsReady] = useState(!isNative)
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  // fileName -> URL the WebView can play (capacitor://localhost/_capacitor_file_/...)
  const localRef = useRef<Record<string, string>>({})
  const [, bump] = useState(0)
  const syncing = useRef(false)

  const listLocal = useCallback(async () => {
    try {
      await Filesystem.mkdir({ path: DIR, directory: Directory.Data, recursive: true })
    } catch {
      /* already exists */
    }
    const { files } = await Filesystem.readdir({ path: DIR, directory: Directory.Data })
    return files.filter((f) => f.type === 'file')
  }, [])

  // Index what is already on disk at startup, before the first video is chosen.
  useEffect(() => {
    if (!isNative) return
    let cancelled = false
    ;(async () => {
      try {
        const files = await listLocal()
        const map: Record<string, string> = {}
        for (const f of files) {
          if (f.name.endsWith(PART_SUFFIX)) {
            // Interrupted download: discard, it will be fetched again.
            await Filesystem.deleteFile({ path: `${DIR}/${f.name}`, directory: Directory.Data }).catch(() => {})
            continue
          }
          map[f.name] = Capacitor.convertFileSrc(f.uri)
        }
        if (!cancelled) {
          localRef.current = map
          bump((n) => n + 1)
        }
      } catch (err) {
        console.warn('[TV] No se pudo leer el almacenamiento local:', err)
      } finally {
        if (!cancelled) setIsReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isNative, listLocal])

  /**
   * Bring local storage in line with the playlist: download missing videos one by one,
   * delete the ones no longer used. Safe to call repeatedly; overlapping calls are ignored.
   */
  const sync = useCallback(
    async (videos: { path: string }[], baseUrl: string) => {
      if (!isNative || syncing.current) return
      syncing.current = true
      try {
        const wanted = new Map(videos.map((v) => [fileNameOf(v.path), v.path]))
        const onDisk = await listLocal()

        for (const f of onDisk) {
          if (!wanted.has(f.name)) {
            await Filesystem.deleteFile({ path: `${DIR}/${f.name}`, directory: Directory.Data }).catch(() => {})
            delete localRef.current[f.name]
          }
        }

        const have = new Set(onDisk.map((f) => f.name))
        const missing = [...wanted.entries()].filter(([name]) => !have.has(name))
        if (missing.length === 0) return

        let done = 0
        setProgress({ done, total: missing.length, current: missing[0][0] })
        for (const [name, path] of missing) {
          const partPath = `${DIR}/${name}${PART_SUFFIX}`
          const finalPath = `${DIR}/${name}`
          try {
            await Filesystem.downloadFile({
              url: `${baseUrl}${path}`,
              path: partPath,
              directory: Directory.Data,
              recursive: true,
            })
            await Filesystem.rename({ from: partPath, to: finalPath, directory: Directory.Data })
            const { uri } = await Filesystem.getUri({ path: finalPath, directory: Directory.Data })
            localRef.current[name] = Capacitor.convertFileSrc(uri)
            bump((n) => n + 1)
            console.log(`[TV] Video guardado localmente: ${name}`)
          } catch (err) {
            // Out of space, network drop, etc.: keep streaming this one from the API.
            console.warn(`[TV] No se pudo descargar ${name}:`, err)
            await Filesystem.deleteFile({ path: partPath, directory: Directory.Data }).catch(() => {})
          }
          done += 1
          setProgress({ done, total: missing.length, current: missing[done]?.[0] })
        }
      } catch (err) {
        console.warn('[TV] Error sincronizando videos locales:', err)
      } finally {
        syncing.current = false
        setProgress(null)
      }
    },
    [isNative, listLocal],
  )

  /** Playable URL for a video: the local copy when present, the API otherwise. */
  const resolveSrc = useCallback(
    (path: string, baseUrl: string) => localRef.current[fileNameOf(path)] ?? `${baseUrl}${path}`,
    [],
  )

  const isLocal = useCallback((path: string) => fileNameOf(path) in localRef.current, [])

  /** Drop a local copy that failed to play; the next sync downloads it again. */
  const discard = useCallback(async (path: string) => {
    const name = fileNameOf(path)
    if (!(name in localRef.current)) return
    delete localRef.current[name]
    bump((n) => n + 1)
    await Filesystem.deleteFile({ path: `${DIR}/${name}`, directory: Directory.Data }).catch(() => {})
    console.warn(`[TV] Copia local descartada: ${name}`)
  }, [])

  // Stable object: consumers can list it in effect dependencies without re-running every render.
  return useMemo(
    () => ({ isNative, isReady, progress, sync, resolveSrc, isLocal, discard }),
    [isNative, isReady, progress, sync, resolveSrc, isLocal, discard],
  )
}
