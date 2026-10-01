import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Monitor, Save, ArrowLeft, Layout, MapPin, Hash, Trash2 } from 'lucide-react'
import { cn } from '../lib/utils'
import Swal from 'sweetalert2'

export const Route = createFileRoute('/screen-edit/$id')({
  component: ScreenEditPage,
})

function ScreenEditPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [playlists, setPlaylists] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    location: '',
    playlist: '',
    status: 1
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [screenRes, playlistsRes] = await Promise.all([
          api.get(`/screens/${id}`),
          api.get('/playlists')
        ])
        
        const screen = screenRes.data
        setFormData({
          name: screen.name || '',
          code: screen.code || '',
          location: screen.location || '',
          playlist: screen.playlist || '',
          status: screen.status || 1
        })
        setPlaylists(playlistsRes.data)
        setIsLoading(false)
      } catch (error) {
        console.error(error)
        Swal.fire('Error', 'No se pudo cargar la información de la pantalla', 'error')
        navigate({ to: '/screens' })
      }
    }
    fetchData()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.patch(`/screens/${id}`, formData)
      await Swal.fire({
        title: '¡Guardado!',
        text: 'La configuración de la pantalla se ha actualizado correctamente.',
        icon: 'success',
        background: '#ffffff',
        color: '#0f172a',
        confirmButtonColor: '#f7931e',
      })
      navigate({ to: '/screens' })
    } catch (error) {
      Swal.fire('Error', 'No se pudo guardar la configuración', 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate({ to: '/screens' })}
            className="p-3 rounded-2xl bg-slate-900/5 hover:bg-slate-900/10 text-slate-600 hover:text-slate-900 transition-all"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">Editar Pantalla</h1>
            <p className="text-slate-500 font-medium">Configura el hardware y asigna contenido</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="glass p-8 rounded-[32px] space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                  <Monitor size={14} /> Nombre de la Pantalla
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-900/5 border border-slate-900/10 rounded-2xl py-4 px-5 text-slate-900 focus:outline-none focus:border-primary transition-all"
                  placeholder="Ej: Monitor Entrada"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                  <Hash size={14} /> Código Identificador
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-900/5 border border-slate-900/10 rounded-2xl py-4 px-5 text-slate-900 font-mono tracking-wider focus:outline-none focus:border-primary transition-all"
                  placeholder="PANT-01"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                <MapPin size={14} /> Ubicación Física
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full bg-slate-900/5 border border-slate-900/10 rounded-2xl py-4 px-5 text-slate-900 focus:outline-none focus:border-primary transition-all"
                placeholder="Ej: Recepción, Piso 1"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                <Layout size={14} /> Playlist Asignada
              </label>
              <select
                value={formData.playlist}
                onChange={(e) => setFormData({ ...formData, playlist: e.target.value })}
                className="w-full bg-slate-900/5 border border-slate-900/10 rounded-2xl py-4 px-5 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all appearance-none"
                required
              >
                <option value="">Selecciona una playlist</option>
                {playlists.map((pl) => (
                  <option key={pl.id} value={pl.playlistname}>
                    {pl.playlistname}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass p-8 rounded-[32px] space-y-6">
            <h3 className="font-bold text-slate-900 uppercase tracking-widest text-sm">Estado del Monitor</h3>
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: 1 })}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border transition-all",
                  formData.status === 1 ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-600" : "bg-slate-900/5 border-slate-900/10 text-slate-500"
                )}
              >
                <span className="font-bold">Activo</span>
                <div className={cn("size-3 rounded-full", formData.status === 1 ? "bg-emerald-500 animate-pulse" : "bg-slate-200")}></div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: 0 })}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border transition-all",
                  formData.status === 0 ? "bg-red-500/10 border-red-500/50 text-red-600" : "bg-slate-900/5 border-slate-900/10 text-slate-500"
                )}
              >
                <span className="font-bold">Inactivo</span>
                <div className={cn("size-3 rounded-full", formData.status === 0 ? "bg-red-500" : "bg-slate-200")}></div>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-primary/20"
            >
              <Save size={20} />
              Guardar Cambios
            </button>
            <button
              type="button"
              onClick={async () => {
                const result = await Swal.fire({
                  title: '¿Eliminar pantalla?',
                  text: 'Esta acción no se puede deshacer.',
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonColor: '#ef4444',
                  cancelButtonColor: '#64748b',
                  confirmButtonText: 'Sí, eliminar',
                  background: '#ffffff',
                  color: '#0f172a',
                })
                if (result.isConfirmed) {
                  await api.delete(`/screens/${id}`)
                  navigate({ to: '/screens' })
                }
              }}
              className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all border border-red-500/20"
            >
              <Trash2 size={20} />
              Eliminar Monitor
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
