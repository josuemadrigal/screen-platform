import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Library, Plus, Eye, Edit2, Trash2, Search } from 'lucide-react'
import Swal from 'sweetalert2'

export const Route = createFileRoute('/playlist')({
  component: PlaylistsPage,
})

function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const { data } = await api.get('/playlists')
        setPlaylists(data)
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchPlaylists()
  }, [])

  const filteredPlaylists = playlists.filter(p => 
    p.playlistname.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-primary">
            <Library size={24} />
            <h1 className="text-4xl font-bold tracking-tight text-white/90">Playlists</h1>
          </div>
          <p className="text-slate-400 text-lg">Gestiona las listas de reproducción para tus pantallas.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group flex-1 md:w-64">
             <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
             <input 
               type="text"
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               placeholder="Buscar playlists..."
               className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-sm"
             />
          </div>
          <button 
            onClick={() => navigate({ to: '/playlist-new' })}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:bg-primary/90 font-bold transition-all shadow-lg shadow-primary/20 active:scale-95"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Nueva Playlist</span>
          </button>
        </div>
      </header>

      <div className="glass rounded-3xl overflow-hidden border border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider">ID</th>
                <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider">Nombre</th>
                <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider">Videos</th>
                <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={4} className="px-8 py-10"><div className="h-4 bg-white/5 rounded w-full" /></td>
                  </tr>
                ))
              ) : (
                filteredPlaylists.map((playlist) => (
                  <tr key={playlist.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-8 py-6 text-slate-400 font-mono text-sm">#{playlist.id}</td>
                    <td className="px-8 py-6 font-bold text-white group-hover:text-primary transition-colors">{playlist.playlistname}</td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 font-medium">
                        {playlist.videos} videos
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => navigate({ to: `/playlist-view/${playlist.id}` })}
                          className="p-2.5 rounded-xl hover:bg-blue-500/10 text-slate-400 hover:text-blue-400 transition-all"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => navigate({ to: `/playlist-edit/${playlist.id}` })}
                          className="p-2.5 rounded-xl hover:bg-amber-500/10 text-slate-400 hover:text-amber-400 transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={async () => {
                            const result = await Swal.fire({
                              title: '¿Eliminar playlist?',
                              text: "Esta acción no se puede deshacer",
                              icon: 'warning',
                              showCancelButton: true,
                              confirmButtonColor: '#ef4444',
                              cancelButtonColor: '#334155',
                              confirmButtonText: 'Sí, eliminar',
                              cancelButtonText: 'Cancelar',
                              background: '#0f172a',
                              color: '#f8fafc'
                            })

                            if (result.isConfirmed) {
                              try {
                                await api.delete(`/playlists/${playlist.id}`)
                                Swal.fire('Eliminado', 'La playlist ha sido eliminada', 'success')
                                window.location.reload()
                              } catch (error) {
                                Swal.fire('Error', 'No se pudo eliminar la playlist', 'error')
                              }
                            }
                          }}
                          className="p-2.5 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {!isLoading && filteredPlaylists.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-slate-500">
                    No se encontraron listas de reproducción.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
