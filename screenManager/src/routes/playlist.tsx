import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Library, Plus, Eye, Edit2, Trash2, Search, Clock, Film } from 'lucide-react'
import Swal from 'sweetalert2'
import { formatDuration } from '../lib/media'

export const Route = createFileRoute('/playlist')({
  component: PlaylistsPage,
})

interface PlaylistRow {
  id: number
  playlistname: string
  videosCount: number
  durationSeconds: number
}

function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<PlaylistRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const load = async () => {
    try {
      const { data } = await api.get<PlaylistRow[]>('/playlists')
      setPlaylists(data)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const filtered = playlists
    .filter((p) => p.playlistname.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.playlistname.localeCompare(b.playlistname, 'es', { sensitivity: 'base' }))

  const remove = async (playlist: PlaylistRow) => {
    const result = await Swal.fire({
      title: `¿Eliminar "${playlist.playlistname}"?`,
      text: 'Las pantallas que la usan se quedarán sin contenido.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d01f27',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    })
    if (!result.isConfirmed) return
    try {
      await api.delete(`/playlists/${playlist.id}`)
      setPlaylists((prev) => prev.filter((p) => p.id !== playlist.id))
    } catch {
      Swal.fire('Error', 'No se pudo eliminar la playlist', 'error')
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-primary">
            <Library size={24} />
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">Playlists</h1>
          </div>
          <p className="text-slate-600 text-lg">Gestiona las listas de reproducción para tus pantallas.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group flex-1 md:w-64">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar playlists..."
              className="w-full pl-12 pr-4 py-3 bg-slate-900/5 border border-slate-900/10 rounded-2xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-sm"
            />
          </div>
          <button
            onClick={() => navigate({ to: '/playlist-new' })}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold transition-all shadow-lg shadow-primary/20 active:scale-95"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Nueva Playlist</span>
          </button>
        </div>
      </header>

      <div className="glass rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-900/5 bg-slate-900/[0.03]">
                <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Videos</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Duración</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/5">
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={4} className="px-8 py-10"><div className="h-4 bg-slate-900/5 rounded w-full" /></td>
                  </tr>
                ))
              ) : (
                filtered.map((playlist) => (
                  <tr
                    key={playlist.id}
                    onClick={() => navigate({ to: `/playlist-view/${playlist.id}` })}
                    className="group hover:bg-slate-900/[0.03] transition-colors cursor-pointer"
                  >
                    <td className="px-8 py-6 font-bold text-slate-900 group-hover:text-primary transition-colors">{playlist.playlistname}</td>
                    <td className="px-8 py-6">
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900/5 border border-slate-900/10 text-xs text-slate-700 font-bold">
                        <Film size={12} />
                        {playlist.videosCount} {playlist.videosCount === 1 ? 'video' : 'videos'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="inline-flex items-center gap-2 text-sm text-slate-700 font-semibold tabular-nums">
                        <Clock size={14} className="text-slate-500" />
                        {formatDuration(playlist.durationSeconds)}
                      </span>
                    </td>
                    <td className="px-8 py-6" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate({ to: `/playlist-view/${playlist.id}` })}
                          title="Vista previa"
                          className="p-2.5 rounded-xl hover:bg-primary/10 text-slate-500 hover:text-primary transition-all"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => navigate({ to: `/playlist-edit/${playlist.id}` })}
                          title="Editar"
                          className="p-2.5 rounded-xl hover:bg-amber-500/10 text-slate-500 hover:text-amber-600 transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => remove(playlist)}
                          title="Eliminar"
                          className="p-2.5 rounded-xl hover:bg-red-500/10 text-slate-500 hover:text-red-600 transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {!isLoading && filtered.length === 0 && (
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
