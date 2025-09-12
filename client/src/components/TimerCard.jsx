import { useEffect, useMemo, useRef, useState } from 'react'
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
  // Memoiza fechas y timestamps (¡no objetos Date en deps!)
  const startTs = useMemo(() => new Date(session.startTime).getTime(), [session.startTime])
  const endTs   = useMemo(() => new Date(session.endTime).getTime(),   [session.endTime])
  const startDate = useMemo(() => new Date(startTs), [startTs])
  const endDate   = useMemo(() => new Date(endTs),   [endTs])

  // Reloj
  const [now, setNow] = useState(() => Date.now() + serverOffset)
  const tickRef = useRef(null)

  // Restante congelado en pausa
  const [pausedRemainingMs, setPausedRemainingMs] = useState(null)

  // Cuando entra/sale de PAUSED, congela/limpia restante.
  useEffect(() => {
    if (session.status === 'PAUSED') {
      if (typeof session.remainingSeconds === 'number') {
        setPausedRemainingMs(Math.max(0, session.remainingSeconds * 1000))
      } else {
        const ms = Math.max(0, endTs - (Date.now() + serverOffset))
        setPausedRemainingMs(ms)
      }
    } else {
      setPausedRemainingMs(null)
      // Al salir de pausa o cambiar estado, sincroniza una vez
      setNow(Date.now() + serverOffset)
    }
    // DEPENDENCIAS: evita objetos Date; usa números y valores estables
  }, [session.status, session.remainingSeconds, endTs, serverOffset])

  // Intervalo: corre solo si NO está en pausa
  useEffect(() => {
    if (session.status === 'PAUSED') return
    // Limpia previo (por seguridad)
    if (tickRef.current) clearInterval(tickRef.current)

    tickRef.current = setInterval(() => {
      setNow(Date.now() + serverOffset)
    }, 1000)

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current)
        tickRef.current = null
      }
    }
  }, [serverOffset, session.status])

  // Restante (usa congelado si está en pausa)
  const remainingMs = useMemo(() => {
    if (session.status === 'PAUSED') {
      return pausedRemainingMs ?? Math.max(0, endTs - (Date.now() + serverOffset))
    }
    return Math.max(0, endTs - now)
  }, [pausedRemainingMs, endTs, now, session.status, serverOffset])

  const isExpired = (session.status !== 'RUNNING' && session.status !== 'PAUSED') ||
                    (session.status !== 'PAUSED' && remainingMs <= 0)

  const stateBadge =
    session.status === 'CONFIRMED_EXIT' ? <Badge color="green">TERMINADO</Badge> :
    session.status === 'CANCELLED'      ? <Badge color="slate">CANCELADO</Badge> :
    isExpired                            ? <Badge color="amber">Tiempo cumplido</Badge> :
                                           <Badge color="blue">En curso</Badge>

  const timeOpts = { hour: "2-digit", minute: "2-digit", hour12: false };

  // Menú
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
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#0f172a',
      focusCancel: true,
    })
    if (!result.isConfirmed) return

    try {
      setDeleting(true)
      await onDelete(session.id)
      toast.success('Sesión eliminada')
    } catch {
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
        {format(remainingMs)}
      </div>

      {session.status === 'EXPIRED_WAITING_CONFIRM' && onConfirm && (
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
