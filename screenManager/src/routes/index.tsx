import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Upload, Monitor, ListPlus, UserPlus,
  Database, Activity, Zap, ShieldCheck,
  ArrowUpRight, PlayCircle, Radio,
  Clock
} from 'lucide-react'
import { useScreen } from '../hooks/useScreen'
import { api } from '../lib/api'
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

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(res => res.data),
    refetchInterval: 15000
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
    { title: "Subir video", icon: Upload, color: "from-emerald-500 to-teal-600", path: "/upload", desc: "Sube contenido MP4" },
    { title: "Gestionar Pantallas", icon: Monitor, color: "from-orange-500 to-amber-600", path: "/status", desc: "Monitor en tiempo real" },
    { title: "Crear Playlist", icon: ListPlus, color: "from-indigo-500 to-blue-600", path: "/playlist-new", desc: "Organiza tus videos" },
    { title: "Usuarios", icon: UserPlus, color: "from-purple-500 to-pink-600", path: "/user-new", desc: "Gestiona el acceso" }
  ]

  const kpis = [
    { label: "Videos", value: videos.length, icon: PlayCircle, color: "text-emerald-400", loading: loadingVideos },
    { label: "Playlists", value: playlists.length, icon: Database, color: "text-indigo-400", loading: loadingPlaylists },
    { label: "Pantallas Online", value: connectedScreens.length, icon: Radio, color: "text-orange-400", loading: false },
    { label: "Usuarios", value: users.length, icon: ShieldCheck, color: "text-purple-400", loading: loadingUsers }
  ]

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-12">

      {/* SECCIÓN HERO / BIENVENIDA */}
      <section className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-slate-900 to-black border border-white/5 p-8 md:p-12 shadow-2xl">
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em]">
            <Zap size={12} className="fill-current" />
            Sistema Activo
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-white uppercase italic leading-none">
            Screen <span className="text-primary not-italic">Manager</span>
          </h1>
          <p className="text-slate-400 text-lg font-medium leading-relaxed">
            Plataforma centralizada de señalización digital. Supervisa, gestiona y transmite contenido a tus dispositivos en tiempo real.
          </p>
          <div className="flex items-center gap-4 pt-4">
            <button
              onClick={() => navigate({ to: '/status' })}
              className="px-8 py-4 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl transition-all active:scale-95 flex items-center gap-2 shadow-xl shadow-primary/30 uppercase tracking-widest text-xs"
            >
              Ver Monitor <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(circle_at_70%_30%,rgba(247,147,30,0.15),transparent_70%)] pointer-events-none" />
        <Activity className="absolute -bottom-10 -right-10 size-64 text-white/[0.02] -rotate-12 pointer-events-none" />
      </section>

      {/* KPI GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <div key={i} className="glass p-6 rounded-[32px] border border-white/5 group hover:border-white/10 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-3 rounded-xl bg-white/5", kpi.color)}>
                <kpi.icon size={20} />
              </div>
              {isConnected && i === 2 && (
                <div className="size-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              )}
            </div>
            {kpi.loading ? (
              <div className="h-9 w-12 bg-white/5 animate-pulse rounded-lg" />
            ) : (
              <h3 className="text-3xl font-black text-white">{kpi.value}</h3>
            )}
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-3 px-2">
            <Zap size={20} className="text-primary" />
            Acceso Rápido
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {actions.map((action) => (
              <button
                key={action.title}
                onClick={() => navigate({ to: action.path })}
                className="relative group overflow-hidden p-8 rounded-[40px] bg-white/[0.02] border border-white/5 text-left transition-all hover:bg-white/[0.05] hover:border-white/10 hover:-translate-y-1 active:scale-95 shadow-xl"
              >
                <div className={cn("inline-flex p-4 rounded-2xl bg-gradient-to-br mb-6 text-white shadow-lg", action.color)}>
                  <action.icon size={32} strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight italic">{action.title}</h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{action.desc}</p>
                <ArrowUpRight className="absolute top-8 right-8 text-white/10 group-hover:text-primary transition-colors" size={24} />
              </button>
            ))}
          </div>
        </div>

        {/* VIDEOS PRÓXIMOS A CADUCAR */}
        <div className="space-y-6">
          <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-3 px-2">
            <Clock size={20} className="text-orange-400" />
            Próximos a Vencer
          </h2>
          <div className="glass rounded-[40px] border border-white/5 p-6 min-h-[300px]">
            {loadingVideos ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-16 w-full bg-white/5 animate-pulse rounded-2xl" />)}
              </div>
            ) : expiringVideos.length > 0 ? (
              <div className="space-y-4">
                {expiringVideos.map((video) => (
                  <div key={video.id} className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="size-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 shrink-0">
                      <PlayCircle size={24} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-white truncate uppercase italic">{video.title}</h4>
                      <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mt-0.5">
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
                <div className="p-4 rounded-full bg-white/5 text-slate-700">
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
