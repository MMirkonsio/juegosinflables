import React, { useState } from 'react'
import Badge from './ui/Badge.jsx'
import Swal from 'sweetalert2'
import { toast } from 'sonner'
import { LuCalendarCheck, LuCalendarX } from 'react-icons/lu'

export default function SessionCard({ session, onEdit, onDelete, isAdmin }){
  const [editing, setEditing] = useState(false)
  const [childName, setChildName] = useState(session.childName)
  const [durationMinutes, setDurationMinutes] = useState(session.durationMinutes)
  const [deleting, setDeleting] = useState(false)

  const label = (status) => {
    if (status === 'CONFIRMED_EXIT') return 'TERMINADO'
    if (status === 'CANCELLED') return 'CANCELADO'
    return status
  }

  const confirmAndDelete = async () => {
    if (!onDelete || deleting) return
    const result = await Swal.fire({
      title: '¿Eliminar registro?',
      text: `Se eliminará "${session.childName}" de forma permanente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      confirmButtonColor: '#e11d48', // rose-600
      cancelButtonColor: '#0f172a',  // slate-900
      focusCancel: true,
    })
    if (!result.isConfirmed) return

    try {
      setDeleting(true)
      await onDelete(session.id)
      toast.success('Registro eliminado')
    } catch (e) {
      toast.error('No se pudo eliminar. Intenta otra vez.')
    } finally {
      setDeleting(false)
    }
  }

  // Fechas/hora de entrada y salida
  const start = new Date(session.startTime)
  const end   = new Date(session.endTime)
  const timeOpts = { hour: '2-digit', minute: '2-digit', hour12: false }

  return (
    <div className="card p-4 sm:p-5 space-y-3">
      {!editing ? (
        <>
          <div className="flex items-center justify-between">
            <div className="font-semibold text-lg capitalize">{session.childName}</div>
            <Badge color={session.status === 'CANCELLED' ? 'slate' : 'green'}>
              {label(session.status)}
            </Badge>
          </div>

        {(session?.createdBy?.username || session?.createdById) && (
          <div className="text-sm text-slate-600">
            Registrado por: <span className="font-medium">
              {session.createdBy?.username ?? session.createdById}
            </span>
          </div>
        )}



          {/* Fila de horas (entrada/salida) */}
          <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
            <div className="flex items-center gap-1">
              <LuCalendarCheck className="h-4 w-4 shrink-0" />
              <span className="font-medium tabular-nums">
                {start.toLocaleTimeString([], timeOpts)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <LuCalendarX className="h-4 w-4 shrink-0" />
              <span className="font-medium tabular-nums">
                {end.toLocaleTimeString([], timeOpts)}
              </span>
            </div>
          </div>

          {/* Duración y notas */}
          <div className="text-sm text-slate-500">
            Duración: {session.durationMinutes} min
            {session.notes ? <> · <span className="italic">{session.notes}</span></> : null}
          </div>

          {isAdmin && (
            <div className="flex gap-2">
              {/* Si quieres permitir edición, agrega algún botón para setEditing(true) */}
              {/* <button onClick={()=>setEditing(true)} className="px-3 py-2 rounded-xl border hover:bg-slate-50">Editar</button> */}
              <button
                onClick={confirmAndDelete}
                disabled={deleting}
                className="px-3 py-2 rounded-xl border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-50"
              >
                {deleting ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <input
            className="w-full px-3 py-2 rounded-xl border border-slate-300"
            value={childName}
            onChange={e => setChildName(e.target.value)}
          />
          <input
            type="number"
            min="1"
            className="w-full px-3 py-2 rounded-xl border border-slate-300"
            value={durationMinutes}
            onChange={e => setDurationMinutes(parseInt(e.target.value || '0', 10))}
          />
          <div className="flex gap-2">
            <button
              onClick={() => { onEdit(session.id, { childName, durationMinutes }); setEditing(false) }}
              className="px-3 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700"
            >
              Guardar
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
