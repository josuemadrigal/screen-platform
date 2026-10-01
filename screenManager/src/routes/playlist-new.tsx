import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Library, Trash2, Video, Search, CheckCircle2 } from 'lucide-react'
import { cn } from '../lib/utils'
import Swal from 'sweetalert2'
import { API_URL } from '../lib/config'
import { totalDuration, formatDuration } from '../lib/media'

export const Route = createFileRoute('/playlist-new')({
  component: PlaylistAddPage,
})

function PlaylistAddPage() {
  const [name, setName] = useState('')
  const [videoData, setVideoData] = useState<any[]>([])
  const [selectedVideos, setSelectedVideos] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  
  const navigate = useNavigate()

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const { data } = await api.get('/storage')
        setVideoData(data)
      } catch (error) {
        console.error(error)
      }
    }
    fetchVideos()
  }, [])

  // Un mismo video puede ir varias veces en la secuencia.
  const addVideo = (video: any) => setSelectedVideos((prev) => [...prev, video])
  const removeAt = (index: number) => setSelectedVideos((prev) => prev.filter((_, i) => i !== index))
  const timesUsed = (id: number) => selectedVideos.filter((v) => v.id === id).length
  const total = totalDuration(selectedVideos)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || selectedVideos.length === 0) {
      Swal.fire('Atención', 'Nombre y al menos un video son obligatorios', 'warning')
      return
    }

    setIsSaving(true)
    try {
      await api.post('/playlists', {
        playlistname: name,
        videos: selectedVideos.map(v => v.id).join(', ')
      })
      
      Swal.fire({
        icon: 'success',
        title: 'Playlist creada',
        showConfirmButton: false,
        timer: 1500
      })
      
      setTimeout(() => navigate({ to: '/playlist' }), 1500)
    } catch (error) {
      console.error(error)
      Swal.fire('Error', 'No se pudo crear la playlist', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const filteredVideos = videoData.filter(v => 
    v.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
          <Library size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Nueva Playlist</h1>
          <p className="text-slate-600 mt-1">Crea una secuencia de videos para tus pantallas.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass p-8 rounded-3xl space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 ml-1">Nombre de la Playlist</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Promo Mañana / Menú Digital"
                className="w-full px-6 py-4 rounded-2xl bg-slate-900/5 border border-slate-900/10 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-lg font-bold"
                required
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-600 ml-1">Seleccionar Videos</label>
                <div className="relative group">
                   <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                   <input 
                     type="text" 
                     placeholder="Buscar..."
                     value={search}
                     onChange={(e) => setSearch(e.target.value)}
                     className="pl-9 pr-4 py-1.5 rounded-xl bg-slate-900/5 border border-slate-900/10 text-xs focus:ring-1 focus:ring-primary/50 outline-none"
                   />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredVideos.map(video => {
                  const uses = timesUsed(video.id)
                  const isSelected = uses > 0
                  return (
                    <div 
                      key={video.id}
                      onClick={() => addVideo(video)}
                      title="Clic para añadir a la secuencia (puede repetirse)"
                      className={cn(
                        "p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 group",
                        isSelected 
                          ? "bg-primary/20 border-primary text-slate-900" 
                          : "bg-slate-900/5 border-slate-900/10 text-slate-600 hover:bg-slate-900/10"
                      )}
                    >
                      <div className="relative size-16 rounded-xl overflow-hidden shrink-0">
                        <img 
                          src={`${API_URL}/thumbs/${video.thumbnail}`}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/40 flex items-center justify-center">
                            {uses > 1 ? <span className="text-slate-900 font-black text-lg">×{uses}</span> : <CheckCircle2 size={24} className="text-slate-900" />}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-bold truncate", isSelected ? "text-slate-900" : "text-slate-800")}>{video.title}</p>
                        <p className="text-[10px] opacity-60 uppercase font-bold tracking-widest">{video.duration}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass p-8 rounded-3xl space-y-6 sticky top-8">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Video size={20} className="text-primary" />
              Secuencia ({selectedVideos.length})
            </h2>
            <p className="text-[11px] text-slate-500 -mt-2">
              Duración total <span className="text-slate-700 font-bold">{formatDuration(total)}</span>
            </p>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {selectedVideos.map((video, index) => (
                <div key={`${video.id}-${index}`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/5 border border-slate-900/10">
                  <span className="size-6 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                    {index + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium truncate">{video.title}</span>
                  <button 
                    type="button"
                    onClick={() => removeAt(index)}
                    className="p-1.5 hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {selectedVideos.length === 0 && (
                <div className="py-10 text-center text-slate-500 text-sm">
                  No hay videos seleccionados.
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-slate-900/10 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Duración total estimada:</span>
                <span className="font-bold text-primary">--:--</span>
              </div>
              
              <button
                onClick={handleSubmit}
                disabled={isSaving || selectedVideos.length === 0}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-xl active:scale-[0.98]",
                  (isSaving || selectedVideos.length === 0)
                    ? "bg-slate-200 text-slate-600 cursor-not-allowed" 
                    : "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
                )}
              >
                {isSaving ? 'Guardando...' : 'Crear Playlist'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
