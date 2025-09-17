import { useEffect, useState, useMemo } from 'react'
import api from '../api.js'
import { socket } from '../socket.js'
import SessionCard from './SessionCard.jsx'
import TimerCard from './TimerCard.jsx'
import useServerTimeOffset from '../hooks/useServerTimeOffset.js'
import { Card, CardBody, CardHeader } from './ui/Card.jsx'
import { LuPlus } from "react-icons/lu"

export default function AdminPanel(){
  const [sessions, setSessions] = useState([])
  const [childName, setChildName] = useState('')
  const DEFAULT_DURATION = 15
  const [duration, setDuration] = useState(DEFAULT_DURATION)
  const [notes, setNotes] = useState('')
  const [settings, setSettings] = useState({ defaultDurationMinutes: DEFAULT_DURATION })
  const offset = useServerTimeOffset()

  // --- cargar sesiones + settings ---
  const load = async () => {
    const { data } = await api.get('/sessions', { params: { _ts: Date.now() } })
    setSessions(data)

    const s = await api.get('/settings', { params: { _ts: Date.now() } })
    setSettings(s.data)
    setDuration(s.data?.defaultDurationMinutes || DEFAULT_DURATION)
  }

  useEffect(()=>{
    load()
    const upsert = s => setSessions(prev => {
      const i = prev.findIndex(p => p.id === s.id)
      if (i === -1) return [s, ...prev]
      const copy = [...prev]; copy[i] = s; return copy
    })
    socket.on('session:created', upsert)
    socket.on('session:updated', upsert)
    socket.on('session:statusChanged', upsert)
    socket.on('session:deleted', ({id}) => setSessions(prev => prev.filter(p=>p.id!==id)))

    const onSettingsUpdated = (e)=> {
      const cfg = e.detail
      setSettings(cfg)
      if (cfg?.defaultDurationMinutes) setDuration(cfg.defaultDurationMinutes)
    }
    window.addEventListener('settings:updated', onSettingsUpdated)

    return ()=>{
      socket.off('session:created', upsert)
      socket.off('session:updated', upsert)
      socket.off('session:statusChanged', upsert)
      socket.off('session:deleted')
      window.removeEventListener('settings:updated', onSettingsUpdated)
    }
  },[])

  // --- acciones ---
  const createSession = async () => {
    if(!childName.trim()) return
    const d = Number(duration)
    const payload = { childName, notes }
    if (Number.isFinite(d) && d > 0) payload.durationMinutes = d
    await api.post('/sessions', payload)
    setChildName(''); setNotes('')
  }
  const updateSession = async (id, payload) => { await api.patch(`/sessions/${id}`, payload) }
  const deleteSession = async (id) => { await api.delete(`/sessions/${id}`) }
  const confirmExit = async (id) => { await api.post(`/sessions/${id}/confirm-exit`) }
  const pauseSession  = async (id) => { await api.post(`/sessions/${id}/pause`) }
  const resumeSession = async (id) => { await api.post(`/sessions/${id}/resume`) }

  // --- listas ---
  const running = sessions.filter(s =>
    s.status === 'RUNNING' || s.status === 'PAUSED' ||
    (new Date(s.endTime).getTime() - (Date.now()+offset))>0
  )
  const waiting = sessions.filter(s => s.status==='EXPIRED_WAITING_CONFIRM')
  const finished = sessions.filter(s => s.status==='CONFIRMED_EXIT' || s.status==='CANCELLED')

  // ---- helpers de fecha ----
  function dateKeyFromISO(iso, _offset) {
    const ts = new Date(iso).getTime() + _offset
    const d  = new Date(ts)
    return d.toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })
  }
  function dayStamp(iso, _offset) {
    const d = new Date(new Date(iso).getTime() + _offset)
    d.setHours(0,0,0,0)
    return d.getTime()
  }

  // ================== GANANCIAS (en tiempo real) ==================
  const FEE_PER_BLOCK = 2000
  const BLOCK_MINUTES = 10
  const fmtCLP = useMemo(
    () => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }),
    []
  )

  // Reglas: se cobra por cada bloque o fracción de 10 min; se suma al crearse.
  const earningsByDay = useMemo(() => {
    const map = new Map()
    for (const s of sessions) {
      const blocks = Math.max(1, Math.ceil((s?.durationMinutes ?? 0) / BLOCK_MINUTES))
      const amount = blocks * FEE_PER_BLOCK
      const stamp = dayStamp(s.startTime, offset)               // cuenta por día de inicio
      const label = dateKeyFromISO(s.startTime, offset)
      const prev = map.get(stamp) || { label, amount: 0 }
      prev.amount += amount
      map.set(stamp, prev)
    }
    return Array.from(map.entries())
      .sort((a,b) => b[0]-a[0])
      .map(([,v]) => v)
  }, [sessions, offset])

  // ================== HISTORIAL (20 por página) ==================
  const PAGE_SIZE = 20
  const [page, setPage] = useState(1)

  const finishedSorted = useMemo(() => {
    return [...finished].sort(
      (a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
    )
  }, [finished])

  const countsByDateAll = useMemo(() => {
    return finishedSorted.reduce((acc, s) => {
      const key = dateKeyFromISO(s.endTime, offset)
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  }, [finishedSorted, offset])

  const totalPages = Math.max(1, Math.ceil(finishedSorted.length / PAGE_SIZE))
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])

  const startIdx = (page - 1) * PAGE_SIZE
  const endIdx   = startIdx + PAGE_SIZE
  const finishedPage = finishedSorted.slice(startIdx, endIdx)

  const finishedByDate = useMemo(() => {
    return finishedPage.reduce((acc, s) => {
      const key = dateKeyFromISO(s.endTime, offset)
      ;(acc[key] ||= []).push(s)
      return acc
    }, {})
  }, [finishedPage, offset])
  const finishedDates = Object.keys(finishedByDate)

  const canPrev = page > 1
  const canNext = page < totalPages
  const goPrev = () => canPrev && setPage(p => p - 1)
  const goNext = () => canNext && setPage(p => p + 1)

  return (
    <div className="space-y-8">
      {/* Nuevo registro */}
      <Card>
        <CardHeader title="Nuevo Registro" />
        <CardBody>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-[1fr_140px_1fr_auto]">
            <input
              className="px-3 py-2 rounded-xl border border-slate-300"
              placeholder="Nombre del niño"
              value={childName}
              onChange={e=>setChildName(e.target.value)}
            />
            <input
              type="number"
              min="1"
              className="px-3 py-2 rounded-xl border border-slate-300"
              value={duration}
              onChange={e=>setDuration(parseInt(e.target.value||'0',10))}
            />
            <input
              className="px-3 py-2 rounded-xl border border-slate-300"
              placeholder="Notas (opcional)"
              value={notes}
              onChange={e=>setNotes(e.target.value)}
            />
            <button
              onClick={createSession}
              className="px-4 py-2 flex items-center justify-center rounded-xl font-bold bg-neutral-100 hover:bg-slate-100"
            >
              <LuPlus />Agregar
            </button>
          </div>
        </CardBody>
      </Card>

      {/* Ganancias (en vivo) */}
      <Card>
        <CardHeader title="Ganancias" />
        <CardBody>
          {earningsByDay.length === 0 ? (
            <div className="text-sm text-slate-500">Sin registros</div>
          ) : (
            <div className="space-y-2">
              {earningsByDay.map(({ label, amount }) => (
                <div key={label} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                  <span className="text-base font-semibold">{fmtCLP.format(amount)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 text-xs text-slate-500">
            * $2.000 por cada bloque o fracción de 10 minutos por niño.
          </div>
        </CardBody>
      </Card>

      {/* En curso / Finalizados */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="En curso" />
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {running.map(s => (
                <TimerCard
                  key={s.id}
                  session={s}
                  serverOffset={offset}
                  onConfirm={confirmExit}
                  isAdmin
                  onPause={pauseSession}
                  onResume={resumeSession}
                  onDelete={deleteSession}
                />
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Finalizados" />
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {waiting.map(s => (
                <TimerCard key={s.id} session={s} serverOffset={offset} onConfirm={confirmExit} />
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Historial con paginación */}
      <Card>
        <CardHeader title={`Historial (pág. ${page} de ${totalPages})`} />
        <CardBody>
          <div className="space-y-6">
            {finishedPage.length === 0 && (
              <div className="text-sm text-slate-500">Sin registros</div>
            )}

            {finishedDates.map(dateLabel => {
              const totalForDay = countsByDateAll[dateLabel] ?? finishedByDate[dateLabel]?.length ?? 0
              return (
                <div key={dateLabel}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-700">{dateLabel}</h3>
                    <span className="text-xs text-slate-500">
                      {totalForDay} {totalForDay === 1 ? 'registro' : 'registros'}
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {finishedByDate[dateLabel].map(s => (
                      <SessionCard
                        key={s.id}
                        session={s}
                        onEdit={updateSession}
                        onDelete={deleteSession}
                        isAdmin
                      />
                    ))}
                  </div>
                </div>
              )
            })}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={goPrev}
                disabled={!canPrev}
                className="px-3 py-1.5 rounded-lg border disabled:opacity-50 hover:bg-slate-50"
              >
                ← Anterior
              </button>

              <div className="text-sm text-slate-600">
                Mostrando {finishedPage.length} de {finishedSorted.length} registros · Página {page} / {totalPages}
              </div>

              <button
                onClick={goNext}
                disabled={!canNext}
                className="px-3 py-1.5 rounded-lg border disabled:opacity-50 hover:bg-slate-50"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
