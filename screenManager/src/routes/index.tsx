import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Upload, Monitor, ListPlus, UserPlus,
  Database, Zap, ShieldCheck,
  ArrowUpRight, PlayCircle, Radio,
  Clock
} from 'lucide-react'
import { useScreen } from '../hooks/useScreen'
import { api } from '../lib/api'
import { useAuthStore, PERM } from '../store/authStore'
import { cn } from '../lib/utils'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

import { useQuery } from '@tanstack/react-query'

function Dashboard() {
  const navigate = useNavigate()
  const { connectedScreens, isConnected } = useScreen()

  // OPTIMIZACIÓN: Caching y Polling con React Query
  const { data: videos = [], isLoading: loadingVideos } = useQuery({
    queryKey: ['videos'],
    queryFn: () => api.get('/storage').then(res => res.data),
    refetchInterval: 15000 // Actualizar cada 15s
  })

  const { data: playlists = [], isLoading: loadingPlaylists } = useQuery({
    queryKey: ['playlists'],
    queryFn: () => api.get('/playlists').then(res => res.data),
    refetchInterval: 15000
  })

  const canViewUsers = useAuthStore(s => s.hasPermission(PERM.USERS_VIEW))
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(res => res.data),
    refetchInterval: 15000,
    enabled: canViewUsers,
  })

  // Derivar videos por caducar (próximos 30 días)
  const expiringVideos = [...videos].filter(v => {
    if (!v.dateout) return false
    const expiryDate = new Date(v.dateout)
    const now = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(now.getDate() + 30)
    return expiryDate > now && expiryDate <= thirtyDaysFromNow
  }).sort((a, b) => new Date(a.dateout).getTime() - new Date(b.dateout).getTime())

  const actions = [
    { title: "Subir videos", icon: Upload, color: "bg-primary/10 text-primary", path: "/upload", desc: "Añade contenido a la biblioteca" },
    { title: "Pantallas", icon: Monitor, color: "bg-secondary/10 text-secondary", path: "/status", desc: "Monitor en tiempo real" },
    { title: "Nueva playlist", icon: ListPlus, color: "bg-primary/10 text-primary", path: "/playlist-new", desc: "Organiza tus videos" },
    { title: "Usuarios", icon: UserPlus, color: "bg-secondary/10 text-secondary", path: "/users", desc: "Gestiona el acceso" }
  ]

  const kpis = [
    { label: "Videos", value: videos.length, icon: PlayCircle, color: "bg-primary/10 text-primary", loading: loadingVideos },
    { label: "Playlists", value: playlists.length, icon: Database, color: "bg-primary/10 text-primary", loading: loadingPlaylists },
    { label: "Pantallas en línea", value: connectedScreens.length, icon: Radio, color: "bg-secondary/10 text-secondary", loading: false },
    { label: "Usuarios", value: users.length, icon: ShieldCheck, color: "bg-secondary/10 text-secondary", loading: loadingUsers }
  ]

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-12">


      {/* KPI GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <div key={i} className="glass p-6 rounded-[32px] border border-slate-900/5 group hover:border-slate-900/10 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-3 rounded-xl", kpi.color)}>
                <kpi.icon size={20} />
              </div>
              {isConnected && i === 2 && (
                <div className="size-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              )}
            </div>
            {kpi.loading ? (
              <div className="h-9 w-12 bg-slate-900/5 animate-pulse rounded-lg" />
            ) : (
              <h3 className="text-3xl font-black text-slate-900">{kpi.value}</h3>
            )}
            <p className="text-xs font-semibold text-slate-500 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3 px-2">
            <Zap size={20} className="text-primary" />
            Acceso rápido
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {actions.map((action) => (
              <button
                key={action.title}
                onClick={() => navigate({ to: action.path })}
                className="glass relative group p-7 rounded-[32px] text-left transition-all hover:border-primary/30 hover:-translate-y-0.5 active:scale-[0.98] flex items-center gap-5"
              >
                <div className={cn("inline-flex p-4 rounded-2xl shrink-0", action.color)}>
                  <action.icon size={28} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors">{action.title}</h3>
                  <p className="text-slate-500 text-sm">{action.desc}</p>
                </div>
                <ArrowUpRight className="absolute top-6 right-6 text-slate-300 group-hover:text-primary transition-colors" size={20} />
              </button>
            ))}
          </div>
        </div>

        {/* VIDEOS PRÓXIMOS A CADUCAR */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3 px-2">
            <Clock size={20} className="text-amber-500" />
            Próximos a vencer
          </h2>
          <div className="glass rounded-[32px] p-6 min-h-[300px]">
            {loadingVideos ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-16 w-full bg-slate-900/5 animate-pulse rounded-2xl" />)}
              </div>
            ) : expiringVideos.length > 0 ? (
              <div className="space-y-4">
                {expiringVideos.map((video) => (
                  <div key={video.id} className="flex items-center gap-4 p-3 rounded-2xl bg-slate-900/5 border border-slate-900/5 hover:bg-slate-900/10 transition-colors">
                    <div className="size-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                      <PlayCircle size={24} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{video.title}</h4>
                      <p className="text-xs font-semibold text-amber-600 mt-0.5">
                        Vence: {new Date(video.dateout).toLocaleDateString('es-ES', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                <div className="p-4 rounded-full bg-secondary/10 text-secondary">
                  <ShieldCheck size={40} />
                </div>
                <p className="text-slate-500 text-sm font-medium px-6">Todo bajo control. No hay videos venciendo próximamente.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
