import React, { useEffect, useState } from 'react'
import api from '../api.js'
import { Card, CardBody, CardHeader } from './ui/Card.jsx'

export default function UsersPanel(){
  const [users, setUsers] = useState([])
  // borrador local por fila: { [userId]: { username?, role? } }
  const [pending, setPending] = useState({})
  const [form, setForm] = useState({ username:'', password:'', role:'EMPLOYEE' })

  const load = async ()=>{
    const { data } = await api.get('/users')
    setUsers(data)
    setPending({}) // limpiar cambios pendientes al recargar
  }
  useEffect(()=>{ load() },[])

  // --- Crear usuario ---
  const createUser = async ()=>{
    if(!form.username || !form.password) return
    await api.post('/users', form)
    setForm({ username:'', password:'', role:'EMPLOYEE' })
    load()
  }

  // --- Activar/Desactivar ---
  const toggleActive = async (u)=>{
    await api.patch(`/users/${u.id}`, { isActive: !u.isActive })
    load()
  }

  // --- Borrador por celda (nombre/rol) ---
  const onDraftChange = (user, field, value) => {
    setPending(prev => {
      const nextDraft = { ...(prev[user.id] || {}), [field]: value }
      const username = (nextDraft.username ?? user.username)
      const role = (nextDraft.role ?? user.role)
      // si quedó igual al original, borro el borrador para esa fila
      if (username === user.username && role === user.role) {
        const { [user.id]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [user.id]: nextDraft }
    })
  }

  const getDraftValue = (u, field) =>
    pending[u.id]?.[field] ?? u[field]

  const hasChanges = (u) => Boolean(pending[u.id])

  // --- Guardar/Revertir por fila ---
  const saveRow = async (u) => {
    const d = pending[u.id]
    if (!d) return
    const changes = {}
    if (typeof d.username === 'string' && d.username.trim() && d.username !== u.username) changes.username = d.username.trim()
    if (typeof d.role === 'string' && d.role !== u.role) changes.role = d.role
    if (Object.keys(changes).length === 0) return
    await api.patch(`/users/${u.id}`, changes)
    await load()
  }

  const revertRow = (u) => {
    setPending(prev => {
      const { [u.id]: _, ...rest } = prev
      return rest
    })
  }

  // --- Reset de contraseña ---
  const resetPassword = async (u)=>{
    const pwd = prompt(`Nueva contraseña para ${u.username}:`)
    if(!pwd) return
    await api.patch(`/users/${u.id}`, { password: pwd })
    load()
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader title="Crear usuario" />
        <CardBody>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-[1fr_1fr_160px_auto]">
            <input
              className="px-3 py-2 rounded-xl border border-slate-300"
              placeholder="usuario"
              value={form.username}
              onChange={e=>setForm(s=>({...s, username:e.target.value}))}
            />
            <input
              className="px-3 py-2 rounded-xl border border-slate-300"
              placeholder="contraseña"
              type="password"
              value={form.password}
              onChange={e=>setForm(s=>({...s, password:e.target.value}))}
            />
            <select
              className="px-3 py-2 rounded-xl border border-slate-300"
              value={form.role}
              onChange={e=>setForm(s=>({...s, role:e.target.value}))}
            >
              <option value="EMPLOYEE">EMPLEADO</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <button
              onClick={createUser}
              className="px-4 py-2 rounded-xl font-bold bg-neutral-100  hover:bg-neutral-200"
            >
              Crear
            </button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Usuarios" />
        <CardBody>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="py-2 pr-4">Usuario</th>
                  <th className="py-2 pr-4">Rol</th>
                  <th className="py-2 pr-4">Activo</th>
                  <th className="py-2 pr-4">Creado</th>
                  <th className="py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const changed = hasChanges(u)
                  const usernameVal = getDraftValue(u, 'username')
                  const roleVal = getDraftValue(u, 'role')
                  return (
                    <tr key={u.id} className={`border-t border-slate-200 ${changed ? 'bg-amber-50' : ''}`}>
                      <td className="py-2 pr-4">
                        <input
                          className="px-2 py-1 rounded-lg border border-slate-300 w-full"
                          value={usernameVal}
                          onChange={e=>onDraftChange(u, 'username', e.target.value)}
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <select
                          className="px-2 py-1 rounded-lg border border-slate-300"
                          value={roleVal}
                          onChange={e=>onDraftChange(u, 'role', e.target.value)}
                        >
                          <option value="EMPLOYEE">EMPLEADO</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                      <td className="py-2 pr-4">
                        <button
                          onClick={()=>toggleActive(u)}
                          className={`px-3 py-1 rounded-lg border ${u.isActive?'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100':'border-slate-300 text-slate-600 bg-slate-50 hover:bg-slate-100'}`}
                        >
                          {u.isActive ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="py-2 pr-4 text-slate-500">{new Date(u.createdAt).toLocaleString()}</td>
                      <td className="py-2 flex flex-wrap gap-2">
                        {/* Guardar/Revertir solo si hay cambios en la fila */}
                        {changed && (
                          <>
                            <button
                              onClick={()=>saveRow(u)}
                              disabled={!usernameVal?.trim()}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={()=>revertRow(u)}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50"
                            >
                              Revertir
                            </button>
                          </>
                        )}

                        <button
                          onClick={()=>resetPassword(u)}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-700"
                        >
                          Cambiar Clave
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
