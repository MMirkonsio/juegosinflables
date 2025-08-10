// src/index.js
import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./routes/auth.js";
import sessionsRouter from "./routes/sessions.js";
import usersRouter from "./routes/users.js";
import settingsRouter from "./routes/settings.js";
import { authorize } from "./middleware/auth.js";
import { prisma } from "./lib/db.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PATCH", "DELETE"],
  },
});

// Socket.IO setup
io.on("connection", (socket) => {
  // Join a common room to simplify broadcasts
  socket.join("sessions");
  socket.on("disconnect", () => {});
});

// helper to emit to all dashboards
export function emitToDashboards(event, payload) {
  io.to("sessions").emit(event, payload);
}

// Routes
app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/sessions", authorize(), sessionsRouter);
app.use("/users", authorize("ADMIN"), usersRouter);
app.use("/settings", authorize("ADMIN"), settingsRouter);
// ❌ desactiva ETag por si acaso
app.set('etag', false);

// ❌ desactiva caché del navegador para todas las respuestas de API
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// ✅ endpoint para sincronizar reloj (ms desde epoch)
app.get('/time', (req, res) => {
  res.json({ serverTime: Date.now() });
});


// Expiration job: every 5s mark RUNNING sessions that expired
setInterval(async () => {
  const now = new Date();
  const expired = await prisma.session.findMany({
    where: {
      status: "RUNNING",
      endTime: { lte: now },
    },
  });
  for (const s of expired) {
    const updated = await prisma.session.update({
      where: { id: s.id },
      data: { status: "EXPIRED_WAITING_CONFIRM" },
    });
    emitToDashboards("session:statusChanged", updated);
    await prisma.auditLog.create({
      data: { action: "SESSION_EXPIRED", sessionId: s.id },
    });
  }
}, 5000);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
