// src/index.js
import express from 'express'
import http from 'http'
import { Server as IOServer } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs';

import authRouter from './routes/auth.js'
import sessionsRouter from './routes/sessions.js'
import usersRouter from './routes/users.js'
import settingsRouter from './routes/settings.js'
import { authorize } from './middleware/auth.js'
import { prisma } from './lib/db.js'

dotenv.config()

/* --------------------------- CORS helpers --------------------------- */
const normalize = (u) => (u || '').trim().toLowerCase().replace(/\/+$/, '')
const splitList = (s) => (s || '').split(',').map(x => normalize(x)).filter(Boolean)
const escapeRx = (s) => s.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&')

// Lista exacta (prod, localhost) y patrones (previews vercel)
const exactList = splitList(process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL)
const patternList = splitList(process.env.ALLOWED_ORIGIN_PATTERNS)
const patternRx = patternList.map(p => {
  const withScheme = p.startsWith('http') ? p : `https://${p}`
  const rx = '^' + escapeRx(withScheme).replace(/\\\*/g, '.*') + '$'
  return new RegExp(rx)
})

function isAllowed(origin) {
  if (!origin) return true // curl/SSR/etc.
  const o = normalize(origin)
  if (exactList.includes(o)) return true
  return patternRx.some(rx => rx.test(o))
}

/* ----------------------------- Express ----------------------------- */
const app = express()
app.use(express.json())

// No cache para evitar datos viejos
app.set('etag', false)
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  next()
})

// CORS dinámico (NO dupliques otro cors())
app.use(cors({
  origin(origin, cb) {
    return isAllowed(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS: ' + origin))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
}))
app.options('*', cors())

/* ------------------------------ HTTP ------------------------------- */
const server = http.createServer(app) // <- usar 'server' (no httpServer)

/* ---------------------------- Socket.IO ---------------------------- */
const io = new IOServer(server, {
  cors: {
    origin(origin, cb) {
      return isAllowed(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS'))
    },
    credentials: true,
    methods: ['GET', 'POST'],
  },
  // transports: ['websocket'], // opcional si quieres evitar polling
})

// Rooms y eventos
io.on('connection', (socket) => {
  socket.join('sessions')
  socket.on('disconnect', () => {})
})

// helper para emitir a todos los dashboards
export function emitToDashboards(event, payload) {
  io.to('sessions').emit(event, payload)
}

/* ------------------------------ Rutas ------------------------------ */
app.get('/health', (_req, res) => res.json({ ok: true }))
app.get('/time', (_req, res) => res.json({ serverTime: Date.now() }))

app.use('/auth', authRouter)
app.use('/sessions', authorize(), sessionsRouter)
app.use('/users', authorize('ADMIN'), usersRouter)
app.use('/settings', authorize('ADMIN'), settingsRouter)

/* ----------------------- Job de expiración ------------------------- */
setInterval(async () => {
  const now = new Date()
  const expired = await prisma.session.findMany({
    where: { status: 'RUNNING', endTime: { lte: now } },
  })
  for (const s of expired) {
    const updated = await prisma.session.update({
      where: { id: s.id },
      data: { status: 'EXPIRED_WAITING_CONFIRM' },
    })
    emitToDashboards('session:statusChanged', updated)
    await prisma.auditLog.create({ data: { action: 'SESSION_EXPIRED', sessionId: s.id } })
  }
}, 5000)



/* ----------------------------- Start ------------------------------- */
const PORT = process.env.PORT || 4000
server.listen(PORT, () => {
  console.log(`Servidor escuchando en ${PORT}`)
})
