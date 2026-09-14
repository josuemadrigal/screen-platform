import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { LogIn, Mail, Lock, Eye, EyeOff, Cast, ArrowRight } from 'lucide-react'
import Swal from 'sweetalert2'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const login = useAuthStore(state => state.login)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const success = await login(email, password)
      if (success) {
        Swal.fire({
          icon: 'success',
          title: 'Bienvenido',
          showConfirmButton: false,
          timer: 1000
        })
        setTimeout(() => navigate({ to: '/' }), 1000)
      } else {
        Swal.fire('Error', 'Credenciales inválidas', 'error')
      }
    } catch (error) {
      Swal.fire('Error', 'No se pudo conectar con el servidor', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden p-6">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-white/5 border border-white/10 shadow-2xl animate-in zoom-in duration-700">
             <span className="text-3xl font-black tracking-tighter text-white">
               SCREEN<span className="text-primary">MANAGER</span>
             </span>
          </div>
          <h1 className="text-2xl font-bold text-white/90">Bienvenido de nuevo</h1>
          <p className="text-slate-500">Ingresa tus credenciales para administrar tus pantallas.</p>
        </div>

        <div className="glass p-8 rounded-[40px] border border-white/10 shadow-2xl space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Usuario o Email</label>
              <div className="relative group">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin o tu@email.com"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Contraseña</label>
              <div className="relative group">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-14 py-4 rounded-2xl bg-white/5 border border-white/10 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-sm"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 group active:scale-[0.98]"
            >
              {isLoading ? (
                <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={20} />
                  Iniciar Sesión
                </>
              )}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-900/50 backdrop-blur-md px-2 text-slate-600 font-bold tracking-tighter">O accede como</span></div>
          </div>

          <Link 
            to="/client"
            className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 font-bold transition-all flex items-center justify-center gap-3 group"
          >
            <Cast size={20} className="text-slate-500 group-hover:text-primary transition-colors" />
            Modo Pantalla (Cliente)
            <ArrowRight size={16} className="text-slate-600 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <p className="text-center text-xs text-slate-600">
          ScreenManager v2.0 • Producido por Antigravity
        </p>
      </div>
    </div>
  )
}
