import { useEffect, useMemo, useState } from 'react'
import api from '../api'
import { socket } from '../socket'
import useServerTimeOffset from '../hooks/useServerTimeOffset'
import { Card, CardBody, CardHeader } from './ui/Card'

// $2.000 por cada bloque (o fracción) de 10 minutos
const FEE_PER_BLOCK = 2000
const BLOCK_MIN = 10

function dayStamp(iso, offset) {
  const d = new Date(new Date(iso).getTime() + offset)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function dayLabel(iso, offset) {
  const d = new Date(new Date(iso).getTime() + offset)
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function EarningsPanel() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStamp, setSelectedStamp] = useState(null)
  const offset = useServerTimeOffset()

  const load = async () => {
    setLoading(true)
    // solo las finalizadas (CONFIRMED_EXIT) — si quieres incluir CANCELLED, añade ese estado también
    const { data } = await api.get('/sessions', { params: { status: 'CONFIRMED_EXIT', _ts: Date.now() } })
    setSessions(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const refresh = () => load()
    socket.on('session:created', refresh)
    socket.on('session:updated', refresh)
    socket.on('session:statusChanged', refresh)
    socket.on('session:deleted', refresh)
    return () => {
      socket.off('session:created', refresh)
      socket.off('session:updated', refresh)
      socket.off('session:statusChanged', refresh)
      socket.off('session:deleted', refresh)
    }
  }, [])

  // Fechas disponibles en el historial (desc)
  const days = useMemo(() => {
    const map = new Map()
    for (const s of sessions) {
      const stamp = dayStamp(s.endTime ?? s.startTime, offset)
      if (!map.has(stamp)) {
        map.set(stamp, dayLabel(s.endTime ?? s.startTime, offset))
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([stamp, label]) => ({ stamp, label }))
  }, [sessions, offset])

  // Preseleccionar el día más reciente
  useEffect(() => {
    if (days.length && selectedStamp == null) {
      setSelectedStamp(days[0].stamp)
    }
  }, [days, selectedStamp])

  // Ganancias del día seleccionado
  const { total, count } = useMemo(() => {
    if (!selectedStamp) return { total: 0, count: 0 }
    let sum = 0
    let n = 0
    for (const s of sessions) {
      const stamp = dayStamp(s.endTime ?? s.startTime, offset)
      if (stamp === selectedStamp) {
        const blocks = Math.max(1, Math.ceil((s.durationMinutes ?? 0) / BLOCK_MIN))
        sum += blocks * FEE_PER_BLOCK
        n++
      }
    }
    return { total: sum, count: n }
  }, [sessions, selectedStamp, offset])

  const fmtCLP = useMemo(
    () => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }),
    []
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Ganancias" />
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div>
              <label className="text-sm text-slate-600 block mb-1">Selecciona el día</label>
              <select
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
                value={selectedStamp ?? ''}
                onChange={e => setSelectedStamp(Number(e.target.value) || null)}
              >
                {days.length === 0 && <option value="">Sin fechas disponibles</option>}
                {days.map(d => (
                  <option key={d.stamp} value={d.stamp}>{d.label}</option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border px-4 py-3 flex items-center justify-between">
              <div className="text-sm text-slate-600">Total del día</div>
              <div className="text-xl font-bold">{fmtCLP.format(total)}</div>
            </div>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            * Se cobran <b>$2.000</b> por cada <b>10 minutos</b> (o fracción) por niño.
            {selectedStamp && <> — {count} {count === 1 ? 'registro' : 'registros'} en el día seleccionado.</>}
          </div>

          {loading && <div className="mt-3 text-sm text-slate-500">Cargando…</div>}
        </CardBody>
      </Card>
    </div>
  )
}
