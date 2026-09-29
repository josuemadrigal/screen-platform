import { Link, useNavigate } from '@tanstack/react-router'
import { 
  LayoutDashboard, 
  Monitor, 
  Library, 
  Film, 
  Activity, 
  Users,
  ShieldCheck,
  Eye, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings
} from 'lucide-react'
import { useState } from 'react'
import { useAuthStore, PERM } from '../store/authStore'
import { cn } from '../lib/utils'

// `permission`: shown only when the current user's role grants it.
const navLinks = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "Pantallas", path: "/screens", icon: Monitor },
  { title: "Playlist", path: "/playlist", icon: Library },
  { title: "Videos", path: "/videos", icon: Film },
  { title: "Estado", path: "/estado", icon: Activity },
  { title: "Historial", path: "/history", icon: Activity, permission: PERM.HISTORY_VIEW },
  { title: "Usuarios", path: "/users", icon: Users, permission: PERM.USERS_VIEW },
  { title: "Roles", path: "/roles", icon: ShieldCheck, permission: PERM.USERS_VIEW },
  { title: "Vista Cliente", path: "/client", icon: Eye },
  { title: "Ajustes", path: "/ajustes", icon: Settings },
]

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const logout = useAuthStore(state => state.logout)
  const hasPermission = useAuthStore(state => state.hasPermission)
  const user = useAuthStore(state => state.user)
  const visibleLinks = navLinks.filter(link => !link.permission || hasPermission(link.permission))
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
  }

  return (
    <aside 
      className={cn(
        "glass sticky top-0 h-screen transition-all duration-300 flex flex-col z-50",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <div className="p-6 flex items-center justify-between">
        {!isCollapsed && (
          <span className="text-xl font-bold tracking-tight text-white">
            Screen<span className="text-primary">Manager</span>
          </span>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-white"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        {visibleLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            activeProps={{ className: "bg-primary text-white" }}
            inactiveProps={{ className: "text-slate-400 hover:text-white hover:bg-white/5" }}
            className="flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group relative"
          >
            <link.icon size={22} className="shrink-0" />
            {!isCollapsed && <span className="font-medium">{link.title}</span>}
            {isCollapsed && (
              <div className="absolute left-16 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100]">
                {link.title}
              </div>
            )}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-2">
        {!isCollapsed && user && (
          <div className="px-4 py-2 text-xs text-slate-500 truncate" title={user.email}>
            <span className="text-slate-300 font-bold">{user.name}</span>
            {user.role && <span className="ml-2 uppercase tracking-widest text-[10px] text-primary">{user.role.name}</span>}
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all group relative"
        >
          <LogOut size={22} className="shrink-0" />
          {!isCollapsed && <span className="font-medium">Salir</span>}
          {isCollapsed && (
            <div className="absolute left-16 bg-red-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100]">
              Salir
            </div>
          )}
        </button>
      </div>
    </aside>
  )
}
