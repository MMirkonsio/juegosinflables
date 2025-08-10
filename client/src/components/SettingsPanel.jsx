import { useEffect, useState } from 'react'
import api from '../api.js'
import { Card, CardBody, CardHeader } from './ui/Card.jsx'
import { toast } from 'sonner'

export default function SettingsPanel(){
  const [settings, setSettings] = useState({ defaultDurationMinutes: 15 })
  const [saving, setSaving] = useState(false)

  const load = async ()=>{
    const { data } = await api.get('/settings', { params: { _ts: Date.now() } })
    setSettings(data)
  }

  useEffect(()=>{ load() },[])

  const save = async ()=>{
    try{
      setSaving(true)
      const { data } = await api.patch('/settings', {
        defaultDurationMinutes: parseInt(settings.defaultDurationMinutes, 10)
      })
      setSettings(data)
      // avisa al resto de la app (AdminPanel) que cambió la config
      window.dispatchEvent(new CustomEvent('settings:updated', { detail: data }))
      toast.success('Ajustes guardados')
    }catch{
      toast.error('No se pudo guardar')
    }finally{
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader title="Ajustes" />
      <CardBody>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-600">Duración por defecto (min):</label>
          <input
            type="number" min="1"
            className="w-24 px-3 py-2 rounded-xl border border-slate-300"
            value={settings.defaultDurationMinutes}
            onChange={e=>setSettings(s=>({ ...s, defaultDurationMinutes: parseInt(e.target.value||'0',10) }))}
          />
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </CardBody>
    </Card>
  )
}
