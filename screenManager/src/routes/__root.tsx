import { createRootRoute, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { Sidebar } from '../components/Sidebar'
import { useAuthStore } from '../store/authStore'

export const Route = createRootRoute({
  component: RootLayout,
})

const PUBLIC_PATHS = ['/client', '/login']

function RootLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const token = useAuthStore(state => state.token)
  const refreshMe = useAuthStore(state => state.refreshMe)

  // Role or permissions may have changed since login; a 401 here sends back to /login.
  useEffect(() => {
    if (token) refreshMe()
  }, [token])

  const isPublic = PUBLIC_PATHS.some(p => location.pathname.startsWith(p))
  const isClient = location.pathname.startsWith('/client')
  const isLogin = location.pathname.startsWith('/login')
  const showSidebar = !isClient && !isLogin && !!token

  useEffect(() => {
    if (!isPublic && !token) {
      navigate({ to: '/login', replace: true })
    }
    if (isLogin && token) {
      navigate({ to: '/', replace: true })
    }
  }, [token, location.pathname])

  // Si no está autenticado y la ruta no es pública, no renderiza nada
  // (el useEffect ya redirige, esto evita un flash de contenido)
  if (!isPublic && !token) return null

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-primary/30 flex">
      {showSidebar && <Sidebar />}
      <main className="flex-1 overflow-x-hidden h-screen">
        <div className={showSidebar ? 'p-8 max-w-7xl mx-auto' : 'h-full w-full'}>
          <Outlet />
        </div>
      </main>
      {!isClient && <TanStackRouterDevtools />}
    </div>
  )
}
