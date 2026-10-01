import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'
import { Library, Play, Clock, Video as VideoIcon, ListMusic, ChevronRight, Monitor, Edit3 } from 'lucide-react'
import { totalDuration, formatDuration } from '../lib/media'
import { cn } from '../lib/utils'
import { API_URL } from '../lib/config'

export const Route = createFileRoute('/playlist-view/$id')({
  component: () => <PlaylistViewPage />,
})

function PlaylistViewPage() {
  const { id } = Route.useParams()
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const playerRef = useRef<HTMLVideoElement>(null)
  
  const servidor = API_URL

  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        const { data } = await api.get(`/playlists/${id}`)
        console.log('Playlist Data:', data)
        setData(data)
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchPlaylist()
  }, [id])

  if (isLoading) return <div className="animate-pulse glass h-96 rounded-3xl" />
  if (!data) return <div className="text-center py-20 text-slate-500">Playlist no encontrada.</div>

  const videoList = data.videosData || []
  const currentVideo = videoList[currentVideoIndex]

  const playNext = () => {
    setCurrentVideoIndex((prev) => (prev + 1) % videoList.length)
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <Library size={32} />
          </div>
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <span>Playlists</span>
              <ChevronRight size={14} />
              <span className="text-slate-300">Vista Previa</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white/90">{data.playlist.playlistname}</h1>
          </div>
        </div>
        <Link
          to="/playlist-edit/$id"
          params={{ id: String(data.playlist.id) }}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold transition-all shadow-xl shadow-primary/20 active:scale-95"
        >
          <Edit3 size={18} />
          Editar playlist
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="relative aspect-video rounded-[32px] overflow-hidden bg-slate-900 border border-white/5 shadow-2xl">
            {videoList.length > 0 ? (
              <video
                ref={playerRef}
                key={currentVideo?.id}
                src={`${servidor}${currentVideo?.path}`}
                className="w-full h-full object-cover"
                autoPlay
                muted
                controls
                onEnded={playNext}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-600">
                <VideoIcon size={64} />
                <p className="mt-4 font-medium">No hay videos en esta lista</p>
              </div>
            )}
            
            <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white uppercase tracking-widest">
              <Play size={10} fill="currentColor" className="text-primary" />
              Vista Previa en Vivo
            </div>
          </div>

          <div className="glass p-8 rounded-3xl space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Monitor size={20} className="text-primary" />
              Detalles de la Playlist
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-4">
               <div className="space-y-1">
                 <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Videos</p>
                 <p className="text-lg font-bold text-white">{videoList.length}</p>
               </div>
               <div className="space-y-1">
                 <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Duración</p>
                 <p className="text-lg font-bold text-white">{formatDuration(totalDuration(videoList))}</p>
               </div>
               <div className="space-y-1">
                 <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Estado</p>
                 <p className="text-lg font-bold text-emerald-400">Activa</p>
               </div>
               <div className="space-y-1">
                 <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Uso</p>
                 <p className="text-lg font-bold text-white">{data.screensCount} {data.screensCount === 1 ? 'Pantalla' : 'Pantallas'}</p>
               </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass p-8 rounded-3xl space-y-6 flex flex-col h-full max-h-[700px]">
            <h2 className="text-xl font-bold flex items-center gap-2 shrink-0">
              <ListMusic size={20} className="text-primary" />
              Contenido
            </h2>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {videoList.map((video: any, index: number) => (
                <button 
                  key={`${video.id}-${index}`}
                  onClick={() => setCurrentVideoIndex(index)}
                  className={cn(
                    "w-full flex items-center gap-4 p-3 rounded-2xl border transition-all text-left group",
                    currentVideoIndex === index 
                      ? "bg-primary/20 border-primary shadow-lg shadow-primary/10" 
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  )}
                >
                  <div className="size-16 rounded-xl overflow-hidden shrink-0 relative">
                    <img
                      src={`${servidor}/thumbs/${video.thumbnail}`}
                      className="w-full h-full object-cover"
                    />
                    {currentVideoIndex === index && (
                       <div className="absolute inset-0 bg-primary/40 flex items-center justify-center">
                         <Play size={20} fill="currentColor" className="text-white" />
                       </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-bold truncate",
                      currentVideoIndex === index ? "text-white" : "text-slate-300 group-hover:text-white"
                    )}>
                      {video.title}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase mt-1">
                      <Clock size={10} />
                      {video.duration}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
