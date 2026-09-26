import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Film, Calendar, Save, ArrowLeft, Circle } from 'lucide-react'
import Swal from 'sweetalert2'
import { API_URL } from '../lib/config'

export const Route = createFileRoute('/video-edit/$id')({
  component: VideoEditPage,
})

function VideoEditPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [dateout, setDateout] = useState('')
  const [status, setStatus] = useState('1')

  const servidor = API_URL

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const { data } = await api.get(`/storage/${id}`)
        setData(data)
        setTitle(data.title)
        setDateout(data.dateout)
        setStatus(data.status.toString())
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchVideo()
  }, [id])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await api.patch(`/storage/${id}`, {
        title,
        dateout,
        status: parseInt(status),
      })
      
      await Swal.fire({
        icon: 'success',
        title: 'Video actualizado',
        timer: 1500,
        showConfirmButton: false,
        background: '#0f172a',
        color: '#f8fafc'
      })
      navigate({ to: '/videos' })
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo actualizar el video',
        background: '#0f172a',
        color: '#f8fafc'
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <div className="animate-pulse glass h-96 rounded-3xl" />
  if (!data) return <div className="text-center py-20 text-slate-500">Video no encontrado.</div>

  const videoUrl = `${servidor}${data.path}`

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate({ to: '/videos' })}
            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 transition-all active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-white/90">Editar Video</h1>
            <p className="text-slate-400 text-sm">Actualiza la información del contenido multimedia.</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="glass p-8 rounded-[32px] space-y-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-400 ml-1">Título del Video</label>
                <div className="relative group">
                  <Film className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={18} />
                  <input 
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                    placeholder="Ej: Promo Verano 2024"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-400 ml-1">Fecha de Expiración</label>
                  <div className="relative group">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={18} />
                    <input 
                      type="date"
                      value={dateout}
                      onChange={(e) => setDateout(e.target.value)}
                      required
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all color-scheme-dark"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-400 ml-1">Estado</label>
                  <select 
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all appearance-none"
                  >
                    <option value="1">Activo</option>
                    <option value="0">Inactivo</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit"
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-primary hover:bg-primary/90 font-bold transition-all shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                <Save size={20} />
                {isSaving ? 'Guardando cambios...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="glass p-6 rounded-[32px] space-y-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2">Vista Previa</h2>
            <div className="aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-white/5 shadow-2xl relative group">
              <video 
                src={videoUrl}
                controls
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
                <Circle size={6} fill={status === '1' ? "#10b981" : "#ef4444"} className={status === '1' ? "text-emerald-500" : "text-red-500"} />
                <span className="text-[10px] font-bold text-white uppercase tracking-tighter">
                  {status === '1' ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
            <div className="p-2 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">ID del Video</span>
                <span className="text-xs font-mono text-slate-300">#{id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Duración</span>
                <span className="text-xs font-bold text-white">{data.duration}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Formato</span>
                <span className="text-xs font-bold text-white uppercase">{data.path.split('.').pop()}</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-[32px] bg-amber-500/10 border border-amber-500/20 space-y-2">
            <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">Aviso</p>
            <p className="text-xs text-amber-200/60 leading-relaxed">
              Los cambios en el estado afectarán la visibilidad del video en todas las playlists donde esté asignado.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
