import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'
import { Library, Trash2, Video, Search, CheckCircle2, ArrowLeft, Save, GripVertical } from 'lucide-react'
import { cn } from '../lib/utils'
import Swal from 'sweetalert2'
import { API_URL } from '../lib/config'
import { totalDuration, formatDuration } from '../lib/media'

export const Route = createFileRoute('/playlist-edit/$id')({
  component: PlaylistEditPage,
})

function PlaylistEditPage() {
  const { id } = Route.useParams()
  const [name, setName] = useState('')
  const [videoData, setVideoData] = useState<any[]>([])
  const [selectedVideos, setSelectedVideos] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Drag state
  const dragIndex = useRef<number | null>(null)
  const dragOverIndex = useRef<number | null>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [playlistRes, videosRes] = await Promise.all([
          api.get(`/playlists/${id}`),
          api.get('/storage'),
        ])
        setName(playlistRes.data.playlist.playlistname)
        setVideoData(videosRes.data)
        setSelectedVideos(playlistRes.data.videosData || [])
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [id])

  // Un mismo video puede ir varias veces en la secuencia (p. ej. una promo cada 3 videos).
  const addVideo = (video: any) => setSelectedVideos((prev) => [...prev, video])
  const removeAt = (index: number) => setSelectedVideos((prev) => prev.filter((_, i) => i !== index))
  const timesUsed = (id: number) => selectedVideos.filter((v) => v.id === id).length
  const total = totalDuration(selectedVideos)

  const handleDragStart = (index: number) => {
    dragIndex.current = index
    setDraggingIndex(index)
  }

  const handleDragEnter = (index: number) => {
    dragOverIndex.current = index
    setOverIndex(index)
  }

  const handleDragEnd = () => {
    const from = dragIndex.current
    const to = dragOverIndex.current

    if (from !== null && to !== null && from !== to) {
      setSelectedVideos(prev => {
        const next = [...prev]
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        return next
      })
    }

    dragIndex.current = null
    dragOverIndex.current = null
    setDraggingIndex(null)
    setOverIndex(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || selectedVideos.length === 0) {
      Swal.fire('Atención', 'Nombre y al menos un video son obligatorios', 'warning')
      return
    }

    setIsSaving(true)
    try {
      await api.patch(`/playlists/${id}`, {
        playlistname: name,
        videos: selectedVideos.map(v => v.id).join(', ')
      })

      Swal.fire({
        icon: 'success',
        title: 'Playlist actualizada',
        showConfirmButton: false,
        timer: 1500
      })

      setTimeout(() => navigate({ to: '/playlist' }), 1500)
    } catch (error) {
      console.error(error)
      Swal.fire('Error', 'No se pudo actualizar la playlist', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const filteredVideos = videoData.filter(v =>
    v.title.toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) return <div className="animate-pulse glass h-96 rounded-3xl" />

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <Library size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white/90">Editar Playlist</h1>
            <p className="text-slate-400 mt-1">Modifica el nombre y los videos de la lista.</p>
          </div>
        </div>
        <button
          onClick={() => navigate({ to: '/playlist' })}
          className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <ArrowLeft size={24} />
        </button>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass p-8 rounded-3xl space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 ml-1">Nombre de la Playlist</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Promo Mañana / Menú Digital"
                className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-lg font-bold"
                required
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-400 ml-1">Seleccionar Videos</label>
                <div className="relative group">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-4 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs focus:ring-1 focus:ring-primary/50 outline-none"
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
                          ? "bg-primary/20 border-primary text-white"
                          : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                      )}
                    >
                      <div className="relative size-16 rounded-xl overflow-hidden shrink-0">
                        <img
                          src={`${API_URL}/thumbs/${video.thumbnail}`}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/40 flex items-center justify-center">
                            {uses > 1 ? <span className="text-white font-black text-lg">×{uses}</span> : <CheckCircle2 size={24} className="text-white" />}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-bold truncate", isSelected ? "text-white" : "text-slate-200")}>{video.title}</p>
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
              Arrastra para reordenar · Duración total <span className="text-slate-300 font-bold">{formatDuration(total)}</span>
            </p>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              {selectedVideos.map((video, index) => (
                <div
                  key={`${video.id}-${index}`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all select-none",
                    draggingIndex === index
                      ? "opacity-40 scale-95 bg-primary/10 border-primary/30"
                      : overIndex === index && draggingIndex !== index
                      ? "bg-primary/10 border-primary/50 scale-[1.02] shadow-lg shadow-primary/10"
                      : "bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20"
                  )}
                >
                  <div className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 transition-colors touch-none shrink-0">
                    <GripVertical size={16} />
                  </div>
                  <div className="relative shrink-0">
                    <img
                      src={`${API_URL}/thumbs/${video.thumbnail}`}
                      className="size-10 rounded-lg object-cover"
                    />
                    <span className="absolute -top-1.5 -left-1.5 size-5 rounded-md bg-primary text-white flex items-center justify-center text-[9px] font-black shadow-lg">
                      {index + 1}
                    </span>
                  </div>
                  <span className="flex-1 text-sm font-medium truncate text-slate-200">{video.title}</span>
                  <button
                    type="button"
                    onClick={() => removeAt(index)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-600 hover:text-red-500 transition-colors shrink-0"
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

            <div className="pt-4 border-t border-white/10">
              <button
                type="submit"
                disabled={isSaving || selectedVideos.length === 0}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-3",
                  (isSaving || selectedVideos.length === 0)
                    ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                    : "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
                )}
              >
                <Save size={20} />
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
