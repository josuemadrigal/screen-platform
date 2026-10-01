import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useRoles } from '../services/userService'
import { api } from '../lib/api'
import { UserPlus, Mail, Lock, User, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { cn } from '../lib/utils'
import Swal from 'sweetalert2'

export const Route = createFileRoute('/user-new')({
  component: UserAddPage,
})

function UserAddPage() {
  const [formData, setFormData] = useState({
    name: '',
    user: '',
    email: '',
    password: '',
    password2: '',
    roleId: '' as string,
  })
  const [showPassword, setShowPassword] = useState(false)
  const { data: roles = [] } = useRoles()
  const [isSaving, setIsSaving] = useState(false)
  
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password !== formData.password2) {
      Swal.fire('Error', 'Las contraseñas no coinciden', 'error')
      return
    }

    setIsSaving(true)
    try {
      // The API rejects unknown fields: send only what it expects (the confirmation stays local).
      const { name, user, email, password, roleId } = formData
      await api.post('/auth/register', { name, user, email, password, ...(roleId ? { roleId: Number(roleId) } : {}) })
      
      Swal.fire({
        icon: 'success',
        title: 'Usuario creado',
        showConfirmButton: false,
        timer: 1500
      })
      
      setTimeout(() => navigate({ to: '/users' }), 1500)
    } catch (error: any) {
      console.error(error)
      // Show the API's reason when it gives one (e.g. "Email or username already exists").
      const apiMessage = error?.response?.data?.message
      const detail = Array.isArray(apiMessage) ? apiMessage.join('. ') : apiMessage
      Swal.fire('Error', detail || 'No se pudo crear el usuario', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
          <UserPlus size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Nuevo Usuario</h1>
          <p className="text-slate-600 mt-1">Otorga acceso al panel de administración.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="glass p-8 rounded-3xl space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 ml-1 flex items-center gap-2">
                  <User size={14} /> Nombre Completo
                </label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej. Juan Pérez"
                  className="w-full px-6 py-4 rounded-2xl bg-slate-900/5 border border-slate-900/10 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 ml-1 flex items-center gap-2">
                  <User size={14} /> Nombre de Usuario
                </label>
                <input
                  type="text"
                  value={formData.user}
                  onChange={(e) => setFormData({ ...formData, user: e.target.value.toLowerCase().replace(/\s/g, '') })}
                  placeholder="Ej. jperez"
                  className="w-full px-6 py-4 rounded-2xl bg-slate-900/5 border border-slate-900/10 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all font-mono"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 ml-1 flex items-center gap-2">
                  <Mail size={14} /> Correo Electrónico
                </label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ejemplo@correo.com"
                  className="w-full px-6 py-4 rounded-2xl bg-slate-900/5 border border-slate-900/10 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 ml-1 flex items-center gap-2">
                  <ShieldCheck size={14} /> Rol
                </label>
                <select
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-900/5 border border-slate-900/10 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all appearance-none"
                >
                  <option value="">Por defecto (viewer, solo lectura)</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}{r.description ? ` — ${r.description}` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass p-8 rounded-3xl space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 ml-1 flex items-center gap-2">
                  <Lock size={14} /> Contraseña
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-900/5 border border-slate-900/10 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all pr-14"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 ml-1 flex items-center gap-2">
                  <ShieldCheck size={14} /> Confirmar Contraseña
                </label>
                <input 
                  type="password" 
                  value={formData.password2}
                  onChange={(e) => setFormData({ ...formData, password2: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-900/5 border border-slate-900/10 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className={cn(
                "w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-xl active:scale-[0.98]",
                isSaving 
                  ? "bg-slate-200 text-slate-600 cursor-not-allowed" 
                  : "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
              )}
            >
              {isSaving ? 'Creando...' : 'Crear Usuario'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
