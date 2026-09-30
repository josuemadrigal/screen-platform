import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../lib/api'
import { useScreen } from '../hooks/useScreen'
import { useSQLiteCache } from '../hooks/useSQLiteCache'
import { useVideoStore } from '../hooks/useVideoStore'
import { useLiveUpdate } from '../hooks/useLiveUpdate'
import { Monitor, Cast, AlertCircle, XCircle, Wifi, WifiOff, Tv2, Download, HardDrive } from 'lucide-react'
import { cn } from '../lib/utils'
import { API_URL } from '../lib/config'
import { Capacitor } from '@capacitor/core'

// ─── Types ────────────────────────────────────────────────────────────────────
interface VideoData {
  id: number
  path: string
  title?: string
  thumbnail?: string
  dateout?: string | null
}

// Short git sha stamped at build time (see useLiveUpdate); 'dev' when running locally.
const BUNDLE_VERSION = (import.meta.env.VITE_BUNDLE_VERSION || 'dev').slice(0, 7)

// ─── Caducidad ────────────────────────────────────────────────────────────────
// The server drops expired videos from the playlist every night, but the TV only refreshes
// on reload. Filter locally as well, by the device's date, so expiry also works offline.
const todayLocal = () => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const isVideoActive = (v: VideoData) => !v.dateout || v.dateout >= todayLocal()
const msUntilNextMidnight = () => {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5)
  return next.getTime() - now.getTime()
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ClientPage() {
  // Native app: fetch and apply web bundle updates published by the server.
  const updateStatus = useLiveUpdate()
  const [screenCode, setScreenCode] = useState('')
  const [linkedCode, setLinkedCode] = useState('')
  const [isRegistered, setIsRegistered] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [videoList, setVideoList] = useState<VideoData[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [showBanner, setShowBanner] = useState(false)
  const [bannerText, setBannerText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [loadingInit, setLoadingInit] = useState(true)

  // ─── Double buffering para transiciones sin cortes ─────────────────────────
  const [activePlayer, setActivePlayer] = useState(0)
  const videoRef0 = useRef<HTMLVideoElement>(null)
  const videoRef1 = useRef<HTMLVideoElement>(null)
  const refs = [videoRef0, videoRef1]

  // Android WebView pinta su propio "poster" (un ▶ enorme sobre blanco) en cualquier <video>
  // sin atributo poster que no esté reproduciendo. Un poster transparente lo anula y deja ver
  // la capa de espera con el logo.
  const TRANSPARENT_POSTER = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%229%22/%3E'

  // play() puede ser rechazado por el WebView (política de autoplay, decodificador ocupado).
  // Reintentar en silencio evita que el elemento quede en pausa mostrando un hueco.
  const safePlay = useCallback((el: HTMLVideoElement | null | undefined) => {
    if (!el) return
    el.play().catch(() => {
      el.muted = true
      el.play().catch(() => { })
    })
  }, [])

  // ─── Refs / Hooks ──────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const activeCode = linkedCode || 'GENERIC'
  const { socket, isConnected } = useScreen({ screenName: isRegistered ? activeCode : undefined })
  const cache = useSQLiteCache()
  // Native app: videos are downloaded once to the device and played from disk.
  const store = useVideoStore()
  const servidor = API_URL

  const currentVideo = videoList[currentIndex]
  const nextIndex = videoList.length > 0 ? (currentIndex + 1) % videoList.length : 0

  // Source of each player slot. Resolved when the slot is assigned a video (local file if
  // already downloaded, API otherwise) and kept until the slot changes, so a finished
  // download never interrupts the video that is playing.
  const [srcs, setSrcs] = useState<[string, string]>(['', ''])
  useEffect(() => {
    if (videoList.length === 0) {
      setSrcs(['', ''])
      return
    }
    const v0 = videoList[activePlayer === 0 ? currentIndex : nextIndex]
    const v1 = videoList[activePlayer === 1 ? currentIndex : nextIndex]
    const next: [string, string] = [
      v0 ? store.resolveSrc(v0.path, servidor) : '',
      v1 ? store.resolveSrc(v1.path, servidor) : '',
    ]
    // Only update when something actually changed, so React does not re-render in a loop.
    setSrcs((prev) => (prev[0] === next[0] && prev[1] === next[1] ? prev : next))
  }, [videoList, currentIndex, activePlayer, nextIndex, store.resolveSrc, servidor])

  // ─── Fetch desde API + cache offline ──────────────────────────────────────
  const fetchScreenData = useCallback(async (code: string): Promise<boolean> => {
    const codeToUse = code || 'GENERIC'
    setError(null)
    try {
      const { data } = await api.get(`/screens/code/${codeToUse}`)
      if (data?.videosData) {
        const active = (data.videosData as VideoData[]).filter(isVideoActive)
        setVideoList(active)
        setLinkedCode(codeToUse)
        setIsRegistered(true)
        setIsOffline(false)
        await cache.saveScreenCode(codeToUse)
        await cache.cacheVideos(codeToUse, data.videosData)
        // Fire and forget: downloads missing videos in the background, deletes unused ones.
        store.sync(active, servidor)
        return true
      }
      return false
    } catch (err) {
      console.warn('[TV] Sin conexión, intentando cache SQLite...')
      // Intentar cargar desde cache SQLite
      const cachedVideos = (await cache.getCachedVideos(codeToUse)).filter(isVideoActive)
      if (cachedVideos.length > 0) {
        setVideoList(cachedVideos)
        setLinkedCode(codeToUse)
        setIsRegistered(true)
        setIsOffline(true)
        return true
      }
      setError('Sin conexión y sin datos en caché.')
      return false
    }
  }, [cache, store, servidor])

  // En el navegador (no en la app) ofrecemos descargar el APK si el servidor lo publica.
  const [apkVersion, setApkVersion] = useState<string | null>(null)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return
    fetch('/apk/version.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((info) => setApkVersion(info?.version ?? null))
      .catch(() => {})
  }, [])

  // ─── Inicialización: leer código guardado ──────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setLoadingInit(true)
      const savedCode = await cache.loadScreenCode()
      if (savedCode) {
        const ok = await fetchScreenData(savedCode)
        if (ok) {
          // En TV: ir directo a fullscreen si ya estaba configurado
          setTimeout(() => enterFullscreen(), 500)
        }
      }
      setLoadingInit(false)
    }
    // Wait for the local video index too, so the first video already plays from disk when present.
    if (cache.isReady && store.isReady) init()
  }, [cache.isReady, store.isReady])

  // ─── Caducidad a medianoche: quitar de la lista los videos que vencen hoy ──────
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      timer = setTimeout(() => {
        setVideoList((prev) => {
          const next = prev.filter(isVideoActive)
          if (next.length !== prev.length) console.log(`[TV] ${prev.length - next.length} video(s) vencido(s) retirado(s)`)
          return next
        })
        schedule()
      }, msUntilNextMidnight())
    }
    schedule()
    return () => clearTimeout(timer)
  }, [])

  // Keep the index valid when the list shrinks.
  useEffect(() => {
    if (videoList.length > 0 && currentIndex >= videoList.length) setCurrentIndex(0)
  }, [videoList.length, currentIndex])

  // ─── Fullscreen helpers ────────────────────────────────────────────────────
  const enterFullscreen = useCallback(async () => {
    try {
      const elem = document.documentElement as any
      if (!document.fullscreenElement && !elem.webkitFullscreenElement) {
        if (elem.requestFullscreen) await elem.requestFullscreen()
        else if (elem.webkitRequestFullscreen) await elem.webkitRequestFullscreen()
      }
    } catch (err) {
      console.warn('[TV] Fullscreen no disponible:', err)
    }
  }, [])

  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || (document as any).webkitFullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFSChange)
    document.addEventListener('webkitfullscreenchange', handleFSChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFSChange)
      document.removeEventListener('webkitfullscreenchange', handleFSChange)
    }
  }, [])

  const toggleFullscreen = useCallback(async () => {
    setHasInteracted(true)
    try {
      const elem = document.documentElement as any
      if (!document.fullscreenElement && !elem.webkitFullscreenElement) {
        if (elem.requestFullscreen) await elem.requestFullscreen()
        else if (elem.webkitRequestFullscreen) await elem.webkitRequestFullscreen()
      } else {
        if (document.exitFullscreen) await document.exitFullscreen()
        else if ((document as any).webkitExitFullscreen) await (document as any).webkitExitFullscreen()
      }
    } catch (err) {
      console.warn('[TV] Fullscreen error:', err)
    }
  }, [])

  // ─── Formulario de vinculación ─────────────────────────────────────────────
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setHasInteracted(true)
    if (isRegistered && !screenCode) {
      toggleFullscreen()
      return
    }
    const success = await fetchScreenData(screenCode)
    // enterFullscreen is idempotent: a second call never exits fullscreen.
    if (success) enterFullscreen()
  }

  // ─── Desvincular ──────────────────────────────────────────────────────────
  const handleUnlink = async () => {
    await cache.clearScreenCode()
    setIsRegistered(false)
    setVideoList([])
    setLinkedCode('')
    setScreenCode('')
  }

  // ─── Navegación entre videos ───────────────────────────────────────────────
  const handleNext = useCallback(() => {
    if (videoList.length <= 1) {
      const activeRef = refs[activePlayer]
      if (activeRef.current) {
        activeRef.current.currentTime = 0
        safePlay(activeRef.current)
      }
      return
    }
    const nextPlayer = (activePlayer + 1) % 2
    setActivePlayer(nextPlayer)
    setCurrentIndex(nextIndex)
    setTimeout(() => safePlay(refs[nextPlayer].current), 10)
  }, [videoList, activePlayer, nextIndex, safePlay])

  // ─── Soporte Control Remoto / D-pad ───────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter inside the code field or on a button belongs to the form (it submits and goes
      // fullscreen itself). Handling it here too toggled fullscreen twice: on, then off.
      const tag = (e.target as HTMLElement | null)?.tagName
      const inFormField = tag === 'INPUT' || tag === 'BUTTON' || tag === 'TEXTAREA'
      switch (e.keyCode) {
        case 13:  // Enter / OK — entrar en fullscreen o confirmar
        case 179: // Play/Pause (Media key)
          if (e.keyCode === 13 && inFormField) break
          if (!isFullscreen && isRegistered) {
            toggleFullscreen()
          } else if (isFullscreen) {
            setIsPlaying(prev => !prev)
          }
          break
        case 37: // ← Anterior
          if (isFullscreen) {
            setCurrentIndex(prev => (prev - 1 + videoList.length) % videoList.length)
          }
          break
        case 39: // → Siguiente
          if (isFullscreen) handleNext()
          break
        case 27: // Escape — salir de fullscreen
          // Android TV gestiona el botón Back automáticamente
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen, isRegistered, videoList, handleNext, toggleFullscreen, enterFullscreen])

  // ─── Auto-enfocar input en formulario ─────────────────────────────────────
  useEffect(() => {
    if (!isFullscreen && !loadingInit) {
      inputRef.current?.focus()
    }
  }, [isFullscreen, loadingInit])

  // ─── Desbloquear audio en primera interacción ──────────────────────────────
  useEffect(() => {
    if (hasInteracted) {
      refs[activePlayer].current?.play().catch(() => { })
    }
  }, [hasInteracted, activePlayer])

  // ─── Emitir estado de reproducción al manager ──────────────────────────────
  useEffect(() => {
    if (socket && videoList.length > 0) {
      socket.emit('update-screen-status', {
        playbackStatus: isPlaying ? 'playing' : 'paused',
        currentVideo: currentVideo
          ? { id: currentVideo.id, title: currentVideo.title, thumbnail: currentVideo.thumbnail }
          : null,
      })
    }
  }, [isPlaying, currentIndex, socket, videoList.length])

  // ─── Comandos remotos desde el panel admin ────────────────────────────────
  useEffect(() => {
    if (!socket) return

    socket.on('control-screen', (data: { action: string; data?: any }) => {
      const { action, data: actionData } = data
      const activeRef = refs[activePlayer]
      switch (action) {
        case 'play':
          setIsPlaying(true)
          activeRef.current?.play()
          break
        case 'pause':
          setIsPlaying(false)
          activeRef.current?.pause()
          break
        case 'stop':
          setIsPlaying(false)
          if (activeRef.current) {
            activeRef.current.pause()
            activeRef.current.currentTime = 0
          }
          break
        case 'reload-screen':
          window.location.reload()
          break
        case 'toggle-fullscreen':
          toggleFullscreen()
          // Browsers only allow fullscreen from a user gesture on the device itself, so a remote
          // command may be refused. If it was, ask the person at the TV to press OK once.
          setTimeout(() => {
            const active = !!(document.fullscreenElement || (document as any).webkitFullscreenElement)
            if (!active) {
              setBannerText('Pulsa OK en el control para pantalla completa')
              setShowBanner(true)
              setTimeout(() => setShowBanner(false), 15000)
            }
          }, 400)
          break
        case 'change-video':
          if (actionData?.direction === 'next') handleNext()
          else setCurrentIndex(prev => (prev - 1 + videoList.length) % videoList.length)
          break
        case 'show-banner':
          setBannerText(actionData?.text || '')
          setShowBanner(!!actionData?.text)
          break
      }
    })

    return () => {
      socket.off('control-screen')
    }
  }, [socket, videoList, activePlayer, handleNext, toggleFullscreen])

  // ─── Reanudar reproducción ────────────────────────────────────────────────
  // Android pauses the video when the app goes to the background or the screen turns off,
  // and does not resume it. Resume when we come back, and keep a watchdog for any other
  // silent pause (decoder hiccup, blocked play() promise, etc.).
  useEffect(() => {
    const resume = () => {
      if (document.visibilityState !== 'visible' || !isPlaying) return
      refs[activePlayer].current?.play().catch(() => { })
    }
    document.addEventListener('visibilitychange', resume)
    window.addEventListener('focus', resume)
    return () => {
      document.removeEventListener('visibilitychange', resume)
      window.removeEventListener('focus', resume)
    }
  }, [isPlaying, activePlayer])

  const stalledSince = useRef<number | null>(null)
  useEffect(() => {
    if (!isRegistered || videoList.length === 0) return
    const tick = setInterval(() => {
      const el = refs[activePlayer].current
      if (!el || !isPlaying || document.visibilityState !== 'visible') return
      if (el.readyState >= 2) {
        stalledSince.current = null
        if (el.paused && !el.ended) el.play().catch(() => { })
        return
      }
      // No data for this source: give it 20 s, then move on so the screen never freezes.
      stalledSince.current ??= Date.now()
      if (Date.now() - stalledSince.current > 20000) {
        console.warn('[TV] Video sin datos durante 20 s, saltando al siguiente')
        stalledSince.current = null
        handleNext()
      }
    }, 3000)
    return () => clearInterval(tick)
  }, [isRegistered, videoList.length, activePlayer, isPlaying, handleNext])

  // A source that fails to load: if it was the local copy, drop it and fall back to the API.
  const handleVideoError = useCallback((slot: 0 | 1) => {
    const video = videoList[slot === activePlayer ? currentIndex : nextIndex]
    const el = refs[slot].current
    console.warn('[TV] Error de reproducción en', el?.currentSrc, el?.error?.code)
    if (video && store.isLocal(video.path)) {
      store.discard(video.path)
      setSrcs((prev) => {
        const next: [string, string] = [...prev] as [string, string]
        next[slot] = `${servidor}${video.path}`
        return next
      })
      return
    }
    if (slot === activePlayer) setTimeout(() => handleNext(), 3000)
  }, [videoList, activePlayer, currentIndex, nextIndex, store, servidor, handleNext])

  // ─── Screenshot periódico ──────────────────────────────────────────────────
  const takeScreenshot = () => {
    const activeRef = refs[activePlayer]
    if (activeRef.current && activeRef.current.readyState >= 2) {
      const canvas = document.createElement('canvas')
      const ratio = activeRef.current.videoWidth / activeRef.current.videoHeight || 16 / 9
      canvas.width = 320
      canvas.height = Math.round(320 / ratio)
      try {
        canvas.getContext('2d')?.drawImage(activeRef.current, 0, 0, canvas.width, canvas.height)
        return canvas.toDataURL('image/jpeg', 0.4)
      } catch { return null }
    }
    return null
  }

  useEffect(() => {
    if (!socket || !isRegistered || videoList.length === 0) return
    const interval = setInterval(() => {
      const shot = takeScreenshot()
      if (shot) socket.emit('update-screen-status', { screenshot: shot })
    }, 30000)
    return () => clearInterval(interval)
  }, [socket, isRegistered, videoList.length, activePlayer])

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loadingInit) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <Tv2 size={72} className="text-indigo-400 animate-pulse" />
          </div>
          <div className="flex gap-2">
            <span className="size-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
            <span className="size-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:150ms]" />
            <span className="size-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:300ms]" />
          </div>
          <p className="text-slate-500 text-sm tracking-widest uppercase">Iniciando Screen TV…</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      onClick={() => setHasInteracted(true)}
      className="min-h-screen bg-[#020617] text-white font-sans flex flex-col items-center justify-center relative overflow-hidden"
    >
      {/* ── CAPA DE VIDEO (doble buffer, nunca se destruye) ── */}
      <div className={cn(
        'transition-all duration-700 ease-in-out bg-black overflow-hidden shadow-2xl',
        isFullscreen
          ? 'fixed inset-0 z-100'
          : 'relative w-full max-w-3xl aspect-video rounded-[32px] border-4 border-white/5 z-0'
      )}>
        {/* Capa de espera: se ve cuando el video activo aún no tiene imagen (carga, cambio, error). */}
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center gap-6 bg-[#020617]">
          <img src="/icon-512.png" alt="" className="w-40 h-40 rounded-[28px] opacity-90 drop-shadow-2xl" draggable={false} />
          <span className="text-2xl font-black tracking-[0.35em] text-white/40 uppercase">Screen TV</span>
        </div>

        {videoList.length > 0 ? (
          <>
            <video
              ref={videoRef0}
              src={srcs[0]}
              className={cn(
                'absolute inset-0 w-full h-full object-cover transition-opacity duration-700',
                activePlayer === 0 ? 'opacity-100 z-10' : 'opacity-0 -z-10'
              )}
              autoPlay={activePlayer === 0 && isPlaying}
              muted={activePlayer !== 0 || !hasInteracted}
              onEnded={() => activePlayer === 0 && handleNext()}
              onError={() => handleVideoError(0)}
              preload="auto"
              poster={TRANSPARENT_POSTER}
              playsInline
            />
            <video
              ref={videoRef1}
              src={srcs[1]}
              className={cn(
                'absolute inset-0 w-full h-full object-cover transition-opacity duration-700',
                activePlayer === 1 ? 'opacity-100 z-10' : 'opacity-0 -z-10'
              )}
              autoPlay={activePlayer === 1 && isPlaying}
              muted={activePlayer !== 1 || !hasInteracted}
              onEnded={() => activePlayer === 1 && handleNext()}
              onError={() => handleVideoError(1)}
              preload="auto"
              poster={TRANSPARENT_POSTER}
              playsInline
            />
          </>
        ) : (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/95">
            <img src="/icon-512.png" alt="" className="w-40 h-40 rounded-[28px] opacity-90 mb-6" draggable={false} />
            <span className="text-sm font-black uppercase tracking-[0.4em] text-slate-500">Esperando contenido</span>
          </div>
        )}

        {/* Badge estado en modo preview */}
        {!isFullscreen && (
          <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
            {/* Live badge */}
            <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 shadow-xl">
              <div className="size-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
                LIVE: <span className="text-indigo-400">{activeCode}</span>
              </span>
            </div>
            {/* Estado de conexión */}
            <div className={cn(
              'bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border flex items-center gap-2 shadow-xl text-[10px] font-black uppercase tracking-widest',
              isConnected ? 'border-emerald-500/30 text-emerald-400' : 'border-red-500/30 text-red-400'
            )}>
              {isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
              {isConnected ? 'Conectado' : 'Sin conexión'}
            </div>
            {/* Descarga de videos al dispositivo (solo app nativa) */}
            {store.progress && (
              <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-indigo-500/30 text-indigo-300 flex items-center gap-2 shadow-xl text-[10px] font-black uppercase tracking-widest">
                <Download size={10} className="animate-bounce" />
                Descargando {Math.min(store.progress.done + 1, store.progress.total)}/{store.progress.total}
              </div>
            )}
            {/* Reproduciendo desde el almacenamiento de la TV */}
            {store.isNative && !store.progress && currentVideo && store.isLocal(currentVideo.path) && (
              <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-slate-400 flex items-center gap-2 shadow-xl text-[10px] font-black uppercase tracking-widest">
                <HardDrive size={10} />
                Local
              </div>
            )}
            {/* Badge offline cache */}
            {isOffline && (
              <div className="bg-amber-500/20 backdrop-blur-md px-4 py-2 rounded-full border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest">
                ⚡ Modo Offline
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── FORMULARIO (solo visible fuera de fullscreen) ── */}
      {!isFullscreen && (
        <div className="z-10 w-full max-w-xl px-6 py-10 space-y-8 animate-[fadeSlideUp_0.6s_ease_forwards]">
          <div className="text-center space-y-3">
            <div className="inline-flex p-4 rounded-2xl bg-indigo-500/10 text-indigo-400 mb-2 ring-1 ring-indigo-500/20">
              <Monitor size={36} />
            </div>
            <h1 className="text-5xl font-black tracking-tight text-white uppercase italic leading-none">
              Screen <span className="text-indigo-400 not-italic">TV</span>
            </h1>
            <p className="text-slate-400 text-base font-medium">
              {isRegistered
                ? `Vinculado como ${linkedCode}.`
                : 'Ingresa el código para comenzar.'}
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <input
              ref={inputRef}
              type="text"
              value={screenCode}
              onChange={(e) => setScreenCode(e.target.value.toUpperCase())}
              placeholder="CÓDIGO DE PANTALLA"
              autoComplete="off"
              className="w-full bg-white/5 border-2 border-white/10 rounded-3xl py-6 px-8
                         text-2xl font-black tracking-[0.25em] text-center
                         focus:outline-none focus:border-indigo-500 transition-all
                         shadow-2xl placeholder:text-white/20"
            />

            {error && (
              <div className="text-red-400 bg-red-400/10 p-4 rounded-2xl border border-red-400/20 text-sm flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-3xl
                           flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl
                           uppercase tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <Cast size={24} />
                {isRegistered ? 'Pantalla Completa' : 'Vincular'}
              </button>
              {isRegistered && (
                <button
                  type="button"
                  onClick={handleUnlink}
                  className="p-5 rounded-3xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all
                             border border-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-400"
                  title="Desvincular pantalla"
                >
                  <XCircle size={24} />
                </button>
              )}
            </div>
          </form>

          {apkVersion && (
            <a
              href="/apk"
              className="flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <Download size={16} />
              Descargar la app para Android TV (v{apkVersion})
            </a>
          )}

          <p className="text-center text-slate-600 text-xs tracking-widest uppercase">
            Usa el control remoto · Presiona <kbd className="bg-white/10 px-2 py-0.5 rounded">OK</kbd> para pantalla completa
          </p>
          {/* Version of the web bundle in use: changes by itself after a live update. */}
          <p className="text-center text-slate-700 text-[10px] tracking-[0.3em] uppercase">
            Interfaz {BUNDLE_VERSION}{updateStatus ? ` · ${updateStatus}` : ''}
          </p>
        </div>
      )}

      {/* ── BANNER DE MENSAJE ── */}
      {showBanner && bannerText && (
        <div className={cn(
          'fixed bottom-0 left-0 right-0 bg-black/85 backdrop-blur-xl border-t border-white/10 text-center z-110',
          'animate-[slideUp_0.5s_ease_forwards]',
          isFullscreen ? 'p-12' : 'p-6'
        )}>
          <h2 className={cn(
            'font-black text-white uppercase tracking-tight italic',
            isFullscreen ? 'text-5xl md:text-8xl' : 'text-xl md:text-2xl'
          )}>
            {bannerText}
          </h2>
        </div>
      )}
    </div>
  )
}
