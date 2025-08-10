import React, { useState } from 'react'
import { getUser, logout } from '../auth.js'
import AdminPanel from '../components/AdminPanel.jsx'
import EmployeePanel from '../components/EmployeePanel.jsx'
import UsersPanel from '../components/UsersPanel.jsx'
import SettingsPanel from '../components/SettingsPanel.jsx'    // ⬅️ nuevo
import { LuCircleUser, LuUserPlus, LuNotebookText, LuSettings, LuLogOut } from "react-icons/lu";

export default function Dashboard() {
  const user = getUser()
  const [tab, setTab] = useState('sesiones')
  const isAdmin = user?.role === 'ADMIN'

  function Topbar() {
    return (
      <header className="border-b bg-white">
        <div className="container-page py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-sm text-slate-500">INFLABLES</div>
              <div className="h1 leading-tight">MIRALENY</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="text-slate-600 flex justify-center items-center">
              <LuCircleUser className="mr-1 w-5 h-5" />
              <b>{user?.username}</b>
              <span className="ml-1 badge bg-yellow-100 text-yellow-800 border border-yellow-200">{user?.role}</span>
            </div>
            <button onClick={() => { logout(); location.href='/login' }} className="px-3 py-1.5 flex items-center rounded-lg bg-slate-900 text-white text-xs hover:bg-slate-700"><LuLogOut className="w-4 h-4" />Salir</button>
          </div>
        </div>
      </header>
    )
  }

  function Tabs() {
    return (
      <div className="container-page mt-6">
        <div className="flex items-center gap-2 bg-white rounded-xl p-1 border border-slate-200 w-fit">
          <button onClick={() => setTab('sesiones')} className={`px-4 py-2 rounded-lg text-sm flex items-center ${tab==='sesiones'?'bg-brand-500 text-black':'text-slate-700 hover:bg-slate-100'}`}>
            <LuNotebookText className="mr-1"/>Registro
          </button>
          {isAdmin && (
            <>
              <button onClick={() => setTab('usuarios')} className={`px-4 py-2 rounded-lg text-sm flex items-center ${tab==='usuarios'?'bg-brand-500 text-black':'text-slate-700 hover:bg-slate-100'}`}>
                <LuUserPlus className="mr-1"/>Usuarios
              </button>
              <button onClick={() => setTab('ajustes')} className={`px-4 py-2 rounded-lg text-sm flex items-center ${tab==='ajustes'?'bg-brand-500 text-black':'text-slate-700 hover:bg-slate-100'}`}>
                <LuSettings className="mr-1"/>Ajustes
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full">
      <Topbar />
      <Tabs />
      <main className="container-page py-6">
        {tab === 'sesiones' && (isAdmin ? <AdminPanel /> : <EmployeePanel />)}
        {tab === 'usuarios' && isAdmin && <UsersPanel />}
        {tab === 'ajustes' && isAdmin && <SettingsPanel />}{/* ⬅️ nuevo */}
      </main>
    </div>
  )
}
