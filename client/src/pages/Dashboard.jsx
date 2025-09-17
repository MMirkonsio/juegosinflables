import React, { useState, useEffect } from 'react'
import { getUser, logout } from '../auth.js'
import AdminPanel from '../components/AdminPanel.jsx'
import EmployeePanel from '../components/EmployeePanel.jsx'
import UsersPanel from '../components/UsersPanel.jsx'
import SettingsPanel from '../components/SettingsPanel.jsx'
import EarningsPanel from '../components/EarningsPanel.jsx'
import {
  LuCircleUser, LuUsers, LuNotebook, LuSettings, LuLogOut,
  LuWallet, LuMenu, LuX
} from "react-icons/lu"

export default function Dashboard() {
  const user = getUser()
  const isAdmin = user?.role === 'ADMIN'
  const [tab, setTab] = useState('sesiones')

  // drawer (móvil)
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  const openDrawer = () => setOpen(true)

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function Topbar() {
    return (
      <header className="border-b bg-white sticky top-0 z-30">
        <div className="container-page py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 rounded-lg hover:bg-slate-100"
              onClick={openDrawer}
            >
              <LuMenu className="w-6 h-6" />
            </button>
            <div>
              <div className="text-sm text-slate-500">INFLABLES</div>
              <div className="h1 leading-tight">MIRALENY</div>
            </div>
          </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="text-slate-600 flex justify-center items-center">
                <LuCircleUser className="mr-1 w-5 h-5" />
                <b>{user?.username}</b>
                <span className="ml-1 badge bg-yellow-100 text-yellow-800 border border-yellow-200">
                  {user?.role}
                </span>
              </div>

              {/* Botón visible solo en desktop */}
              <button
                onClick={() => { logout(); location.href = '/login' }}
                className="hidden md:inline-flex px-3 py-1.5 items-center gap-1 rounded-lg bg-slate-900 text-white text-xs hover:bg-slate-700"
              >
                <LuLogOut className="w-4 h-4" />
                Salir
              </button>
            </div>

        </div>
      </header>
    )
  }

  function TabsDesktop() {
    return (
      <div className="container-page mt-6 hidden md:block">
        <div className="flex items-center gap-2 bg-white rounded-xl p-1 border border-slate-200 w-fit">
          <button onClick={() => setTab('sesiones')} className={`px-4 py-2 rounded-lg text-sm flex items-center ${tab==='sesiones'?'bg-brand-500 text-black':'text-slate-700 hover:bg-slate-100'}`}>
            <LuNotebook className="mr-1"/>Registro
          </button>

          {isAdmin && (
            <>
              <button onClick={() => setTab('usuarios')} className={`px-4 py-2 rounded-lg text-sm flex items-center ${tab==='usuarios'?'bg-brand-500 text-black':'text-slate-700 hover:bg-slate-100'}`}>
                <LuUsers className="mr-1"/>Usuarios
              </button>
              <button onClick={() => setTab('ganancias')} className={`px-4 py-2 rounded-lg text-sm flex items-center ${tab==='ganancias'?'bg-brand-500 text-black':'text-slate-700 hover:bg-slate-100'}`}>
                <LuWallet className="mr-1"/>Ganancias
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

  function DrawerMobile() {
    return (
      <>
        {/* backdrop */}
        <div
          className={`fixed inset-0 bg-black/30 transition-opacity md:hidden ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          onClick={close}
        />
        {/* panel */}
        <aside
          className={`fixed inset-y-0 left-0 w-72 bg-white border-r shadow-lg md:hidden z-40 transform transition-transform ${open ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="p-4 border-b flex items-center justify-between">
            <div className="font-semibold">Menú</div>
            <button className="p-2 rounded-lg hover:bg-slate-100" onClick={close}>
              <LuX className="w-5 h-5" />
            </button>
          </div>

          <nav className="p-2">
            <MenuItem active={tab==='sesiones'} icon={<LuNotebook className="w-5 h-5" />} label="Registro" onClick={() => { setTab('sesiones'); close() }} />
            {isAdmin && (
              <>
                <MenuItem active={tab==='usuarios'} icon={<LuUsers className="w-5 h-5" />} label="Usuarios" onClick={() => { setTab('usuarios'); close() }} />
                <MenuItem active={tab==='ganancias'} icon={<LuWallet className="w-5 h-5" />} label="Ganancias" onClick={() => { setTab('ganancias'); close() }} />
                <MenuItem active={tab==='ajustes'} icon={<LuSettings className="w-5 h-5" />} label="Ajustes" onClick={() => { setTab('ajustes'); close() }} />
              </>
            )}

            {/* separador */}
            <div className="h-px bg-slate-200 my-2" />

            {/* Salir en el drawer */}
            <button
              onClick={() => { logout(); location.href='/login' }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-rose-700 hover:bg-rose-50"
            >
              <LuLogOut className="w-5 h-5" />
              <span className="text-sm">Salir</span>
            </button>
          </nav>
        </aside>
      </>
    )
  }

  function MenuItem({ active, icon, label, onClick }) {
    return (
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left mb-1
        ${active ? 'bg-brand-500 text-black' : 'text-slate-700 hover:bg-slate-100'}`}
      >
        {icon}
        <span className="text-sm">{label}</span>
      </button>
    )
  }

  return (
    <div className="min-h-full">
      <Topbar />
      <DrawerMobile />
      <TabsDesktop />

      <main className="container-page py-6">
        {tab === 'sesiones' && (isAdmin ? <AdminPanel /> : <EmployeePanel />)}
        {tab === 'usuarios' && isAdmin && <UsersPanel />}
        {tab === 'ajustes' && isAdmin && <SettingsPanel />}
        {tab === 'ganancias' && isAdmin && <EarningsPanel />}
      </main>
    </div>
  )
}
