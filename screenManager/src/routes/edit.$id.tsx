import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Monitor, MapPin, Hash, Library, Save, ArrowLeft } from 'lucide-react'
import { cn } from '../lib/utils'
import Swal from 'sweetalert2'

export const Route = createFileRoute('/edit/$id')({
  component: ScreenEditPage,
})

function ScreenEditPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const [playlists, setPlaylists] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    location: '',
    playlist: 'none',
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [screenRes, playlistRes] = await Promise.all([
          api.get(`/screens/${id}`),
          api.get('/playlists')
        ])
        setFormData({
          name: screenRes.data.name,
          code: screenRes.data.code,
          location: screenRes.data.location,
          playlist: screenRes.data.playlist || 'none'
        })
        setPlaylists(playlistRes.data)
      } catch (error) {
        console.error(error)
      }
    }
    fetchData()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await api.patch(`/screens/${id}`, formData)
      Swal.fire({
        icon: 'success',
        title: 'Cambios guardados',
        showConfirmButton: false,
        timer: 1500
      })
      setTimeout(() => navigate({ to: '/pantallas' }), 1500)
    } catch (error) {
      console.error(error)
      Swal.fire('Error', 'No se pudieron guardar los cambios', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <Monitor size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white/90">Editar Pantalla</h1>
            <p className="text-slate-400 mt-1">ID: #{id} • {formData.name}</p>
          </div>
        </div>
        <button 
          onClick={() => navigate({ to: '/pantallas' })}
          className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <ArrowLeft size={24} />
        </button>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="glass p-8 rounded-3xl space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 ml-1 flex items-center gap-2">
                  <Monitor size={14} /> Nombre
                </label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 ml-1 flex items-center gap-2">
                  <Hash size={14} /> Código
                </label>
                <input 
                  type="text" 
                  value={formData.code}
                  readOnly
                  className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed uppercase font-mono tracking-wider"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 ml-1 flex items-center gap-2">
                  <MapPin size={14} /> Ubicación
                </label>
                <input 
                  type="text" 
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass p-8 rounded-3xl space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 ml-1 flex items-center gap-2">
                <Library size={14} /> Playlist Asignada
              </label>
              <select 
                value={formData.playlist}
                onChange={(e) => setFormData({ ...formData, playlist: e.target.value })}
                className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="none">Sin Playlist (Manual)</option>
                {playlists.map(p => (
                  <option key={p.id} value={p.id}>{p.playlistname}</option>
                ))}
              </select>
            </div>

            <div className="p-6 bg-primary/5 border border-primary/10 rounded-2xl">
              <p className="text-xs text-slate-400 leading-relaxed italic">
                Nota: Cambiar la playlist afectará lo que se muestra en la pantalla de inmediato si esta se encuentra conectada.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className={cn(
                "w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-3",
                isSaving 
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed" 
                  : "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
              )}
            >
              <Save size={20} />
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
