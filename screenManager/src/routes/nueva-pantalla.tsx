import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Monitor, MapPin, Hash, Library, CheckCircle2 } from 'lucide-react'
import { cn } from '../lib/utils'
import Swal from 'sweetalert2'

export const Route = createFileRoute('/nueva-pantalla')({
  component: PantallaAddPage,
})

function PantallaAddPage() {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    location: '',
    playlist: 'none',
    status: 1
  })
  const [playlists, setPlaylists] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)
  
  const navigate = useNavigate()

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const { data } = await api.get('/playlists')
        setPlaylists(data)
      } catch (error) {
        console.error(error)
      }
    }
    fetchPlaylists()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.code || !formData.location) {
      Swal.fire('Atención', 'Todos los campos son obligatorios', 'warning')
      return
    }

    setIsSaving(true)
    try {
      await api.post('/screens', formData)
      
      Swal.fire({
        icon: 'success',
        title: 'Pantalla registrada',
        showConfirmButton: false,
        timer: 1500
      })
      
      setTimeout(() => navigate({ to: '/pantallas' }), 1500)
    } catch (error) {
      console.error(error)
      Swal.fire('Error', 'No se pudo registrar la pantalla', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
          <Monitor size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Nueva Pantalla</h1>
          <p className="text-slate-600 mt-1">Registra un nuevo dispositivo en tu red.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="glass p-8 rounded-3xl space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 ml-1 flex items-center gap-2">
                  <Monitor size={14} /> Nombre del Dispositivo
                </label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej. Pantalla Recepción Principal"
                  className="w-full px-6 py-4 rounded-2xl bg-slate-900/5 border border-slate-900/10 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 ml-1 flex items-center gap-2">
                  <Hash size={14} /> Código Identificador
                </label>
                <input 
                  type="text" 
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="Ej. REC-01"
                  className="w-full px-6 py-4 rounded-2xl bg-slate-900/5 border border-slate-900/10 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all uppercase font-mono tracking-wider"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 ml-1 flex items-center gap-2">
                  <MapPin size={14} /> Ubicación Física
                </label>
                <input 
                  type="text" 
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Ej. Hall Principal, Piso 1"
                  className="w-full px-6 py-4 rounded-2xl bg-slate-900/5 border border-slate-900/10 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass p-8 rounded-3xl space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 ml-1 flex items-center gap-2">
                <Library size={14} /> Asignar Playlist Inicial
              </label>
              <select 
                value={formData.playlist}
                onChange={(e) => setFormData({ ...formData, playlist: e.target.value })}
                className="w-full px-6 py-4 rounded-2xl bg-slate-900/5 border border-slate-900/10 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="none">Sin Playlist (Manual)</option>
                {playlists.map(p => (
                  <option key={p.id} value={p.id}>{p.playlistname}</option>
                ))}
              </select>
            </div>

            <div className="p-6 bg-primary/5 border border-primary/10 rounded-2xl space-y-4">
              <h3 className="font-bold text-primary flex items-center gap-2">
                <CheckCircle2 size={16} /> Información
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Una vez registrada, podrás controlar la pantalla desde el monitor en tiempo real usando el código asignado.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className={cn(
                "w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-xl active:scale-[0.98]",
                isSaving 
                  ? "bg-slate-200 text-slate-600 cursor-not-allowed" 
                  : "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
              )}
            >
              {isSaving ? 'Guardando...' : 'Registrar Pantalla'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
