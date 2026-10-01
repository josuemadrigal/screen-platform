import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { UserCog, KeyRound, Save, Eye, EyeOff } from 'lucide-react'
import Swal from 'sweetalert2'
import { cn } from '../lib/utils'
import { useAuthStore } from '../store/authStore'
import { useUser, useRoles, useUpdateUser, useChangePassword, apiError, formatDateTime } from '../services/userService'

export const Route = createFileRoute('/user-edit/$id')({
  component: UserEditPage,
})

const inputCls =
  'w-full px-5 py-3.5 rounded-2xl bg-slate-900/5 border border-slate-900/10 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all'
const labelCls = 'text-xs font-bold text-slate-500 uppercase tracking-widest ml-1'

function UserEditPage() {
  const { id } = Route.useParams()
  const userId = Number(id)
  const navigate = useNavigate()
  const me = useAuthStore((s) => s.user)
  const refreshMe = useAuthStore((s) => s.refreshMe)
  const isSelf = me?.id === userId

  const { data: user, isLoading } = useUser(userId)
  const { data: roles = [] } = useRoles()
  const updateUser = useUpdateUser()
  const changePassword = useChangePassword()

  const [form, setForm] = useState({ name: '', email: '', roleId: '' as string, status: '1' as '0' | '1' })
  const [pw, setPw] = useState({ newPassword: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)

  useEffect(() => {
    if (user) {
      setForm({ name: user.name, email: user.email, roleId: user.roleId ? String(user.roleId) : '', status: user.status })
    }
  }, [user])

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateUser.mutateAsync({
        id: userId,
        name: form.name,
        email: form.email,
        roleId: form.roleId ? Number(form.roleId) : null,
        status: form.status,
      })
      if (isSelf) await refreshMe()
      await Swal.fire({ icon: 'success', title: 'Usuario actualizado', timer: 1400, showConfirmButton: false, background: '#ffffff', color: '#0f172a' })
      navigate({ to: '/users' })
    } catch (error) {
      Swal.fire('Error', apiError(error, 'No se pudo actualizar el usuario'), 'error')
    }
  }

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pw.newPassword.length < 6) return Swal.fire('Atención', 'La contraseña debe tener al menos 6 caracteres', 'warning')
    if (pw.newPassword !== pw.confirm) return Swal.fire('Atención', 'Las contraseñas no coinciden', 'warning')
    try {
      // Someone else's password: users.manage lets us reset it without knowing the current one.
      await changePassword.mutateAsync({ id: userId, newPassword: pw.newPassword })
      setPw({ newPassword: '', confirm: '' })
      Swal.fire({ icon: 'success', title: 'Contraseña actualizada', timer: 1400, showConfirmButton: false, background: '#ffffff', color: '#0f172a' })
    } catch (error) {
      Swal.fire('Error', apiError(error, 'No se pudo cambiar la contraseña'), 'error')
    }
  }

  if (isLoading || !user) {
    return <div className="glass h-64 rounded-[32px] animate-pulse" />
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
          <UserCog size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">{user.name}</h1>
          <p className="text-slate-600 mt-1">
            @{user.user} · última conexión {formatDateTime(user.lastLoginAt)}
          </p>
        </div>
      </header>

      <form onSubmit={saveProfile} className="glass rounded-[32px] p-8 space-y-6">
        <h2 className="text-xl font-bold">Datos y acceso</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className={labelCls}>Nombre completo</label>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Correo electrónico</label>
            <input className={inputCls} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Rol</label>
            <select className={cn(inputCls, 'appearance-none')} value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
              <option value="">Sin rol (solo lectura)</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}{r.description ? ` — ${r.description}` : ''}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Estado</label>
            <select
              className={cn(inputCls, 'appearance-none')}
              value={form.status}
              disabled={isSelf}
              title={isSelf ? 'No puedes desactivar tu propio usuario' : undefined}
              onChange={(e) => setForm({ ...form, status: e.target.value as '0' | '1' })}
            >
              <option value="1">Activo</option>
              <option value="0">Desactivado (no puede iniciar sesión)</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updateUser.isPending}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold transition-all shadow-xl shadow-primary/20 active:scale-95 disabled:opacity-50"
          >
            <Save size={18} />
            Guardar cambios
          </button>
        </div>
      </form>

      <form id="password" onSubmit={savePassword} className="glass rounded-[32px] p-8 space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <KeyRound size={20} className="text-amber-600" />
          {isSelf ? 'Cambiar mi contraseña' : 'Restablecer contraseña'}
        </h2>
        {isSelf && (
          <p className="text-sm text-slate-600">Para cambiar tu propia contraseña usa la sección "Mi cuenta" en Ajustes, donde se pide la contraseña actual.</p>
        )}
        {!isSelf && (
          <>
            <p className="text-sm text-slate-600">Asigna una contraseña nueva a este usuario. No hace falta conocer la actual.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={labelCls}>Nueva contraseña</label>
                <div className="relative">
                  <input
                    className={cn(inputCls, 'pr-12')}
                    type={showPw ? 'text' : 'password'}
                    value={pw.newPassword}
                    onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
                    minLength={6}
                    required
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900">
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Confirmar</label>
                <input className={inputCls} type={showPw ? 'text' : 'password'} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={changePassword.isPending}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all active:scale-95 disabled:opacity-50"
              >
                <KeyRound size={18} />
                Restablecer contraseña
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
