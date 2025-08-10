import { useEffect, useMemo, useState } from 'react'
import Badge from './ui/Badge.jsx'
import { LuCalendarCheck, LuCalendarX } from 'react-icons/lu'
import { IoMdMore } from "react-icons/io";
import Swal from 'sweetalert2'
import { toast } from 'sonner'

function format(ms){
  const t = Math.max(0, Math.floor(ms/1000))
  const m = String(Math.floor(t/60)).padStart(2,'0')
  const s = String(t%60).padStart(2,'0')
  return `${m}:${s}`
}

export default function TimerCard({
  session,
  serverOffset = 0,
  onConfirm,
  onPause,
  onResume,
  onDelete
}){
  const startDate = new Date(session.startTime)
  const endDate   = new Date(session.endTime)

  // ⏱️ reloj base (referencia de tiempo del servidor)
  const [now, setNow] = useState(() => Date.now() + serverOffset)

  // 🧊 restante congelado mientras está en pausa
  const [pausedRemainingMs, setPausedRemainingMs] = useState(null)

  // Cuando entra a PAUSED, congelo el restante. Cuando sale de PAUSED, limpio.
  useEffect(() => {
    if (session.status === 'PAUSED') {
      if (typeof session.remainingSeconds === 'number') {
        setPausedRemainingMs(Math.max(0, session.remainingSeconds * 1000))
      } else {
        // fallback si backend aún no envía remainingSeconds
        const ms = Math.max(0, endDate.getTime() - (Date.now() + serverOffset))
        setPausedRemainingMs(ms)
      }
    } else {
      setPausedRemainingMs(null)
    }
    // evitar salto en el primer frame tras reanudar
    setNow(Date.now() + serverOffset)
  }, [session.status, session.remainingSeconds, endDate, serverOffset])

  // Tick periódico solo si NO está en pausa
  useEffect(() => {
    if (session.status === 'PAUSED') return
    const id = setInterval(() => setNow(Date.now() + serverOffset), 300)
    return () => clearInterval(id)
  }, [serverOffset, session.status])

  // usar congelado SOLO en PAUSED
  const remaining = useMemo(() => {
    if (session.status === 'PAUSED') {
      return pausedRemainingMs ?? Math.max(0, endDate.getTime() - (Date.now() + serverOffset))
    }
    return endDate.getTime() - now
  }, [pausedRemainingMs, endDate, now, session.status, serverOffset])

  const isExpired = (session.status !== 'RUNNING' && session.status !== 'PAUSED') ||
                    (session.status !== 'PAUSED' && remaining <= 0)

  const stateBadge =
    session.status === 'CONFIRMED_EXIT' ? <Badge color="green">TERMINADO</Badge> :
    session.status === 'CANCELLED'      ? <Badge color="slate">CANCELADO</Badge> :
    isExpired                            ? <Badge color="amber">Tiempo cumplido</Badge> :
                                           <Badge color="blue">En curso</Badge>

  const timeOpts = { hour: "2-digit", minute: "2-digit", hour12: false };

  // --- Menú opciones (⋮) ---
  const [openMenu, setOpenMenu] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!openMenu) return
    const close = () => setOpenMenu(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [openMenu])

  const handlePauseResume = () => {
    if (session.status === 'PAUSED') onResume?.(session.id)
    else onPause?.(session.id)
    setOpenMenu(false)
  }

  // ✅ Confirmación con SweetAlert2 + toast sonner
  const handleDelete = async () => {
    if (!onDelete || deleting) return
    const result = await Swal.fire({
      title: '¿Eliminar sesión?',
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
      toast.success('Sesión eliminada')
    } catch (e) {
      toast.error('No se pudo eliminar. Intenta nuevamente.')
    } finally {
      setDeleting(false)
      setOpenMenu(false)
    }
  }

  return (
    <div className={`card p-4 sm:p-5 ${isExpired && session.status==='EXPIRED_WAITING_CONFIRM' ? 'ring-2 ring-amber-300' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="shrink-0 whitespace-nowrap">{stateBadge}</div>
          <div className="text-lg mt-2 font-semibold capitalize">{session.childName}</div>
          <div className="text-sm text-slate-500">{session.notes || 'Sin notas'}</div>
          {/* Fila de tiempos */}
          <div className="mt-1 flex items-center gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-1">
              <LuCalendarCheck className="h-4 w-4 shrink-0" />
              <span className="font-medium tabular-nums">{startDate.toLocaleTimeString([], timeOpts)}</span>
            </div>
            <div className="flex items-center gap-1">
              <LuCalendarX className="h-4 w-4 shrink-0" />
              <span className="font-medium tabular-nums">{endDate.toLocaleTimeString([], timeOpts)}</span>
            </div>
          </div>
        </div>

        {(onPause || onResume || onDelete) && (
          <div className="relative shrink-0">
            <button
              onClick={(e)=>{ e.stopPropagation(); setOpenMenu(v=>!v) }}
              className="p-2 rounded-full hover:bg-slate-100"
              aria-haspopup="menu"
              aria-expanded={openMenu}
              aria-label="Opciones"
            >
              <IoMdMore className="h-5 w-5" />
            </button>
            {openMenu && (
              <div
                className="absolute right-0 z-10 mt-2 w-40 rounded-xl border border-slate-200 bg-white shadow-soft"
                onClick={(e)=>e.stopPropagation()}
                role="menu"
              >
                {(onPause || onResume) && (
                  <button
                    onClick={handlePauseResume}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                    role="menuitem"
                  >
                    {session.status === 'PAUSED' ? 'Reanudar' : 'Pausar'}
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="w-full text-left px-3 py-2 text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    role="menuitem"
                  >
                    {deleting ? 'Eliminando…' : 'Eliminar'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contador */}
      <div className={`mt-3 text-4xl font-bold tracking-tight ${isExpired ? 'text-rose-600' : 'text-slate-900'}`}>
        {format(remaining)}
      </div>

      {session.status === 'EXPIRED_WAITING_CONFIRM' && (
        <button
          onClick={() => onConfirm(session.id)}
          className="mt-4 w-full sm:w-auto text-sm px-4 py-2 font-bold rounded border border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100"
        >
          Confirmar
        </button>
      )}
    </div>
  )
}
