import { useEffect, useState } from 'react'
import api from '../api.js'
import { socket } from '../socket.js'
import SessionCard from './SessionCard.jsx'
import TimerCard from './TimerCard.jsx'
import useServerTimeOffset from '../hooks/useServerTimeOffset.js'
import { Card, CardBody, CardHeader } from './ui/Card.jsx'
import { LuPlus } from "react-icons/lu";


export default function AdminPanel(){
  const [sessions, setSessions] = useState([])
  const [childName, setChildName] = useState('')
  const DEFAULT_DURATION = 15
  const [duration, setDuration] = useState(DEFAULT_DURATION)
  const [notes, setNotes] = useState('')
  const [settings, setSettings] = useState({ defaultDurationMinutes: DEFAULT_DURATION })
  const offset = useServerTimeOffset()

  const load = async () => {
    const { data } = await api.get('/sessions', { params: { _ts: Date.now() } })
    setSessions(data)

    const s = await api.get('/settings', { params: { _ts: Date.now() } })
    setSettings(s.data)
    setDuration(s.data?.defaultDurationMinutes || DEFAULT_DURATION)
  }

  useEffect(()=>{
    load()
    socket.on('session:created', s=>setSessions(prev=>[s, ...prev]))
    socket.on('session:updated', s=>setSessions(prev=>prev.map(p=>p.id===s.id?s:p)))
    socket.on('session:statusChanged', s=>setSessions(prev=>prev.map(p=>p.id===s.id?s:p)))
    socket.on('session:deleted', s=>setSessions(prev=>prev.filter(p=>p.id!==s.id)))

    // ⬅️ si se guardan ajustes en la otra pestaña, refresca defaultDuration
    const onSettingsUpdated = (e)=> {
      const cfg = e.detail
      setSettings(cfg)
      if (cfg?.defaultDurationMinutes) setDuration(cfg.defaultDurationMinutes)
    }
    window.addEventListener('settings:updated', onSettingsUpdated)

    return ()=>{
      socket.off('session:created'); socket.off('session:updated')
      socket.off('session:statusChanged'); socket.off('session:deleted')
      window.removeEventListener('settings:updated', onSettingsUpdated)
    }
  },[])

  const createSession = async () => {
    if(!childName.trim()) return
    await api.post('/sessions', { childName, durationMinutes: duration, notes })
    setChildName(''); setNotes('')
  }
  const updateSession = async (id, payload) => { await api.patch(`/sessions/${id}`, payload) }
  const deleteSession = async (id) => { await api.delete(`/sessions/${id}`) }
  const confirmExit = async (id) => { await api.post(`/sessions/${id}/confirm-exit`) }
  const pauseSession  = async (id) => { await api.post(`/sessions/${id}/pause`) }
  const resumeSession = async (id) => { await api.post(`/sessions/${id}/resume`) }

  const running = sessions.filter(s =>
    s.status === 'RUNNING' || s.status === 'PAUSED' ||
    (new Date(s.endTime).getTime() - (Date.now()+offset))>0
  )
  const waiting = sessions.filter(s => s.status==='EXPIRED_WAITING_CONFIRM')
  const finished = sessions.filter(s => s.status==='CONFIRMED_EXIT' || s.status==='CANCELLED')

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader title="Nuevo Registro" />
        <CardBody>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-[1fr_140px_1fr_auto]">
            <input className="px-3 py-2 rounded-xl border border-slate-300" placeholder="Nombre del niño" value={childName} onChange={e=>setChildName(e.target.value)} />
            <input type="number" min="1" className="px-3 py-2 rounded-xl border border-slate-300" value={duration} onChange={e=>setDuration(parseInt(e.target.value||'0',10))} />
            <input className="px-3 py-2 rounded-xl border border-slate-300" placeholder="Notas (opcional)" value={notes} onChange={e=>setNotes(e.target.value)} />
            <button onClick={createSession} className="px-4 py-2 flex items-center justify-center rounded-xl font-bold bg-neutral-100 hover:bg-slate-100"><LuPlus />Agregar</button>
          </div>
        </CardBody>
      </Card>

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

      <Card>
        <CardHeader title="Historial reciente" />
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {finished.map(s => (
              <SessionCard key={s.id} session={s} onEdit={updateSession} onDelete={deleteSession} isAdmin />
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
