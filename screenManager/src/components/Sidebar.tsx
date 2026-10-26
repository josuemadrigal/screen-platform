import { Link, useNavigate, useLocation } from '@tanstack/react-router'
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
  Settings,
  Menu,
  X
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuthStore, PERM } from '../store/authStore'
import { cn } from '../lib/utils'

// `permission`: shown only when the current user's role grants it.
const navLinks = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "Pantallas", path: "/screens", icon: Monitor },
  { title: "Circuitos", path: "/playlist", icon: Library },
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
  const location = useLocation()
  // Small screens: top bar + slide-in drawer instead of the fixed side column.
  const [mobileOpen, setMobileOpen] = useState(false)
  useEffect(() => { setMobileOpen(false) }, [location.pathname])
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [mobileOpen])

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
  }

  const activeTitle = visibleLinks.find((l) => l.path === '/' ? location.pathname === '/' : location.pathname.startsWith(l.path))?.title

  return (
    <>
    {/* ── Móvil / pantalla reducida: barra superior ── */}
    <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between gap-3 px-4 h-16 bg-white/90 backdrop-blur-md border-b border-slate-900/10">
      <img src="/logo.png" alt="2B Screen" className="h-9 w-auto object-contain" draggable={false} />
      {activeTitle && <span className="flex-1 text-center text-sm font-bold text-slate-700 truncate">{activeTitle}</span>}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
        className="p-2.5 rounded-xl bg-slate-900/5 hover:bg-slate-900/10 text-slate-700 transition-colors"
      >
        <Menu size={22} />
      </button>
    </header>

    {/* ── Móvil: panel deslizante ── */}
    <div className={cn('lg:hidden fixed inset-0 z-[60] transition-opacity', mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      <aside className={cn(
        'absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="px-5 h-16 flex items-center justify-between border-b border-slate-900/10">
          <img src="/logo.png" alt="2B Screen" className="h-9 w-auto object-contain" draggable={false} />
          <button onClick={() => setMobileOpen(false)} aria-label="Cerrar menú" className="p-2 rounded-xl hover:bg-slate-900/5 text-slate-600">
            <X size={22} />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              activeProps={{ className: 'bg-primary text-white' }}
              inactiveProps={{ className: 'text-slate-700 hover:bg-slate-900/5' }}
              activeOptions={{ exact: link.path === '/' }}
              className="flex items-center gap-4 px-4 py-3 rounded-2xl font-medium transition-all"
            >
              <link.icon size={20} className="shrink-0" />
              {link.title}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-900/10 space-y-1">
          {user && (
            <div className="px-4 py-2 text-xs text-slate-500 truncate">
              <span className="text-slate-700 font-bold">{user.name}</span>
              {user.role && <span className="ml-2 uppercase tracking-widest text-[10px] text-primary">{user.role.name}</span>}
            </div>
          )}
          <button onClick={handleLogout} className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-700 hover:text-red-600 hover:bg-red-500/10 transition-all font-medium">
            <LogOut size={20} className="shrink-0" /> Salir
          </button>
        </div>
      </aside>
    </div>

    {/* ── Escritorio: columna lateral ── */}
    <aside 
      className={cn(
        "glass sticky top-0 h-screen transition-all duration-300 hidden lg:flex flex-col z-50",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <div className="p-6 flex items-center justify-between">
        {!isCollapsed && (
          <img src="/logo.png" alt="2B Screen" className="h-12 w-auto object-contain" draggable={false} />
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-slate-900/5 rounded-xl transition-colors text-slate-600 hover:text-slate-900"
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
            inactiveProps={{ className: "text-slate-600 hover:text-slate-900 hover:bg-slate-900/5" }}
            className="flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group relative"
          >
            <link.icon size={22} className="shrink-0" />
            {!isCollapsed && <span className="font-medium">{link.title}</span>}
            {isCollapsed && (
              <div className="absolute left-16 bg-white text-slate-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100]">
                {link.title}
              </div>
            )}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-900/10 space-y-2">
        {!isCollapsed && user && (
          <div className="px-4 py-2 text-xs text-slate-500 truncate" title={user.email}>
            <span className="text-slate-700 font-bold">{user.name}</span>
            {user.role && <span className="ml-2 uppercase tracking-widest text-[10px] text-primary">{user.role.name}</span>}
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-600 hover:text-red-500 hover:bg-red-500/10 transition-all group relative"
        >
          <LogOut size={22} className="shrink-0" />
          {!isCollapsed && <span className="font-medium">Salir</span>}
          {isCollapsed && (
            <div className="absolute left-16 bg-red-900 text-slate-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100]">
              Salir
            </div>
          )}
        </button>
      </div>
    </aside>
    </>
  )
}
