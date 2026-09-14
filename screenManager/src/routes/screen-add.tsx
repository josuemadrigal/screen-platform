import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Monitor, Save, ArrowLeft, Layout, MapPin, Hash } from 'lucide-react'
import Swal from 'sweetalert2'

export const Route = createFileRoute('/screen-add')({
  component: ScreenAddPage,
})

function ScreenAddPage() {
  const navigate = useNavigate()
  const [playlists, setPlaylists] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    location: '',
    playlist: '',
    status: 1
  })

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
    try {
      await api.post('/screens', formData)
      await Swal.fire({
        title: '¡Pantalla Creada!',
        text: 'El nuevo monitor ha sido registrado correctamente.',
        icon: 'success',
        background: '#0f172a',
        color: '#f8fafc',
        confirmButtonColor: '#f7931e',
      })
      navigate({ to: '/screens' })
    } catch (error) {
      Swal.fire('Error', 'No se pudo crear la pantalla. Verifica que el código no esté duplicado.', 'error')
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex items-center gap-4">
        <button 
          onClick={() => navigate({ to: '/screens' })}
          className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white/90">Nueva Pantalla</h1>
          <p className="text-slate-500 font-medium">Registra un nuevo monitor en el sistema</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="glass p-8 rounded-[32px] space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Monitor size={14} /> Nombre de la Pantalla
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white focus:outline-none focus:border-primary transition-all"
              placeholder="Ej: Monitor Pasillo Principal"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Hash size={14} /> Código Identificador
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white font-mono tracking-wider focus:outline-none focus:border-primary transition-all"
              placeholder="Ej: PANT-05"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <MapPin size={14} /> Ubicación Física
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white focus:outline-none focus:border-primary transition-all"
              placeholder="Ej: Planta Baja, Comedor"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Layout size={14} /> Playlist Inicial
            </label>
            <select
              value={formData.playlist}
              onChange={(e) => setFormData({ ...formData, playlist: e.target.value })}
              className="w-full bg-[#1e293b] border border-white/10 rounded-2xl py-4 px-5 text-white focus:outline-none focus:border-primary transition-all appearance-none"
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

        <div className="pt-4 border-t border-white/5 flex justify-end">
          <button
            type="submit"
            className="px-12 bg-primary hover:bg-primary/90 text-white font-black py-4 rounded-2xl flex items-center gap-3 transition-all shadow-xl shadow-primary/20 active:scale-95 uppercase tracking-widest"
          >
            <Save size={20} />
            Crear Pantalla
          </button>
        </div>
      </form>
    </div>
  )
}
