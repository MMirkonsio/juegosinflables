import React, { useEffect, useState } from 'react'
import api from '../api.js'
import { socket } from '../socket.js'
import TimerCard from './TimerCard.jsx'
import useServerTimeOffset from '../hooks/useServerTimeOffset.js'
import { Card, CardBody, CardHeader } from './ui/Card.jsx'

export default function EmployeePanel(){
  const [sessions, setSessions] = useState([])
  const offset = useServerTimeOffset()

  const load = async ()=>{ const { data } = await api.get('/sessions'); setSessions(data) }
  useEffect(()=>{
    load()
    socket.on('session:created', s=>setSessions(p=>[s,...p]))
    socket.on('session:updated', s=>setSessions(p=>p.map(x=>x.id===s.id?s:x)))
    socket.on('session:statusChanged', s=>setSessions(p=>p.map(x=>x.id===s.id?s:x)))
    socket.on('session:deleted', s=>setSessions(p=>p.filter(x=>x.id!==s.id)))
    return ()=>{ socket.off('session:created'); socket.off('session:updated'); socket.off('session:statusChanged'); socket.off('session:deleted') }
  },[])

  const confirmExit = async (id) => { await api.post(`/sessions/${id}/confirm-exit`) }
  const running = sessions.filter(s => s.status==='RUNNING' || (new Date(s.endTime).getTime() - (Date.now()+offset))>0)
  const waiting = sessions.filter(s => s.status==='EXPIRED_WAITING_CONFIRM')

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader title="En curso" />
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {running.map(s => (
              <TimerCard key={s.id} session={s} serverOffset={offset} onConfirm={confirmExit} />
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
  )
}