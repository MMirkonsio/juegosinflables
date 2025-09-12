import React, { useEffect, useState } from 'react'
import api from '../api.js'
import { socket } from '../socket.js'
import TimerCard from './TimerCard.jsx'
import useServerTimeOffset from '../hooks/useServerTimeOffset.js'
import { Card, CardBody, CardHeader } from './ui/Card.jsx'
import { LuPlus } from "react-icons/lu"

export default function EmployeePanel(){
  const [sessions, setSessions] = useState([])
  const offset = useServerTimeOffset()

  // === Formulario (mismo patrón que AdminPanel) ===
 const DEFAULT_DURATION = 15
  const [childName, setChildName] = useState('')
  const [duration, setDuration] = useState(String(DEFAULT_DURATION)) // "15"
  const [notes, setNotes] = useState('')


    // load: solo sesiones (sin /settings y sin listener extra)
    useEffect(() => {
      const load = async () => {
        const { data } = await api.get('/sessions', { params: { _ts: Date.now() } })
        setSessions(data)
      }
      load()

      socket.on('session:created', s=>setSessions(p=>[s,...p]))
      socket.on('session:updated', s=>setSessions(p=>p.map(x=>x.id===s.id?s:x)))
      socket.on('session:statusChanged', s=>setSessions(p=>p.map(x=>x.id===s.id?s:x)))
      socket.on('session:deleted', s=>setSessions(p=>p.filter(x=>x.id!==s.id)))

      return ()=>{
        socket.off('session:created'); socket.off('session:updated')
        socket.off('session:statusChanged'); socket.off('session:deleted')
      }
    }, [])

    // crear: arma payload SIN durationMinutes si no es válido
   const createSession = async () => {
  if (!childName.trim()) return
  let d = parseInt(duration, 10)
  if (!Number.isFinite(d) || d <= 0) d = DEFAULT_DURATION   // fallback a 15

  await api.post('/sessions', {
    childName: childName.trim(),
    durationMinutes: d,
    notes
  })

  setChildName('')
  setNotes('')
  setDuration(String(DEFAULT_DURATION)) // volver a 15 tras crear
}


  const confirmExit = async (id) => { await api.post(`/sessions/${id}/confirm-exit`) }
  const pauseSession  = async (id) => { await api.post(`/sessions/${id}/pause`) }
  const resumeSession = async (id) => { await api.post(`/sessions/${id}/resume`) }
  const deleteSession = async (id) => { await api.delete(`/sessions/${id}`) }

  // === Listas (incluye PAUSED como en AdminPanel) ===
  const running = sessions.filter(s =>
    s.status === 'RUNNING' || s.status === 'PAUSED' ||
    (new Date(s.endTime).getTime() - (Date.now()+offset))>0
  )
  const waiting = sessions.filter(s => s.status==='EXPIRED_WAITING_CONFIRM')

  return (
    <div className="space-y-8">
      {/* Formulario con el mismo layout/estilo que AdminPanel */}
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
            onChange={e => setDuration(e.target.value)}
            onBlur={() => { if (!duration) setDuration(String(DEFAULT_DURATION)) }} // <- vuelve a 15 si quedó vacío
            placeholder="(por defecto 15)"
          />


            <input
              className="px-3 py-2 rounded-xl border border-slate-300"
              placeholder="Notas (opcional)"
              value={notes}
              onChange={e=>setNotes(e.target.value)}
            />
            <button
              onClick={createSession}
              className="px-4 py-2 flex items-center justify-center gap-2 rounded-xl font-bold bg-neutral-100 hover:bg-slate-100"
            >
              <LuPlus /> Agregar
            </button>
          </div>
        </CardBody>
      </Card>

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
              <TimerCard
                key={s.id}
                session={s}
                serverOffset={offset}
                onConfirm={confirmExit}
                onPause={pauseSession}
                onResume={resumeSession}
                onDelete={deleteSession}
              />
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
