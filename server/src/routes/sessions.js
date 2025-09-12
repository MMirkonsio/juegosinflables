// src/routes/sessions.js
import express from "express";
import { prisma } from "../lib/db.js";
import { emitToDashboards } from "../index.js";

const router = express.Router();

function nowUtc() {
  return new Date(); // Node stores as UTC by default
}

// List sessions by optional status
router.get("/", async (req, res) => {
  const { status } = req.query;
  const where = status ? { status } : {};
  const sessions = await prisma.session.findMany({
    where,
    orderBy: [{ status: "asc" }, { endTime: "asc" }],
  });
  res.json(sessions);
});

// Create session (employees + admin)
router.post('/', async (req, res) => {
  const user = req.user
  const { childName, durationMinutes, notes } = req.body

  if (!childName || !childName.trim()) {
    return res.status(400).json({ error: 'Faltan datos' })
  }

  // Normaliza duración: body -> settings -> 15
  let duration = parseInt(durationMinutes ?? '', 10)
  if (!Number.isFinite(duration) || duration <= 0) {
    const setting = await prisma.setting.findUnique({ where: { id: 1 } })
    duration = setting?.defaultDurationMinutes ?? 15
  }

  const start = new Date()
  const end = new Date(start.getTime() + duration * 60 * 1000)  // <-- usa duration

  const created = await prisma.session.create({
    data: {
      childName: childName.trim(),
      durationMinutes: duration,                                  // <-- usa duration
      notes: notes || null,
      status: 'RUNNING',
      startTime: start,
      endTime: end,
      createdById: user.id,
    },
  })

  emitToDashboards('session:created', created)
  res.json(created)
})



// Update session (ADMIN)
router.patch("/:id", async (req, res) => {
  const user = req.user;
  if (user.role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });

  const { id } = req.params;
  const { childName, durationMinutes, notes } = req.body;

  const existing = await prisma.session.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "No existe" });

  let data = {};
  if (typeof childName === "string" && childName.trim()) data.childName = childName.trim();
  if (typeof notes === "string") data.notes = notes;

  if (durationMinutes && Number.isFinite(durationMinutes)) {
    const newEnd = new Date(existing.startTime.getTime() + durationMinutes * 60 * 1000);
    data.durationMinutes = durationMinutes;
    data.endTime = newEnd;
  }

  const updated = await prisma.session.update({ where: { id }, data });
  await prisma.auditLog.create({
    data: { action: "SESSION_UPDATED", userId: user.id, sessionId: id, payload: data },
  });
  emitToDashboards("session:updated", updated);
  res.json(updated);
});

// Confirm exit (EMPLOYEE or ADMIN)
router.post("/:id/confirm-exit", async (req, res) => {
  const user = req.user;
  const { id } = req.params;

  const existing = await prisma.session.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "No existe" });
  if (existing.status === "CONFIRMED_EXIT") return res.json(existing);

  const updated = await prisma.session.update({
    where: { id },
    data: {
      status: "CONFIRMED_EXIT",
      confirmedExitById: user.id,
    },
  });

  await prisma.auditLog.create({
    data: { action: "SESSION_CONFIRMED_EXIT", userId: user.id, sessionId: id },
  });

  emitToDashboards("session:statusChanged", updated);
  res.json(updated);
});

// DELETE /sessions/:id  (hard delete en BD, cualquier estado)
router.delete('/:id', async (req, res) => {
  const user = req.user
  if (!user?.id) return res.status(401).json({ error: 'Unauthorized' })

  const { id } = req.params
  const existing = await prisma.session.findUnique({
    where: { id },
    select: { id: true }
  })
  if (!existing) return res.status(404).json({ error: 'No existe' })

  // Permitir a ADMIN y EMPLOYEE borrar cualquier registro
  if (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE') {
    return res.status(403).json({ error: 'Forbidden' })
  }

  await prisma.session.delete({ where: { id: existing.id } })

  // (Opcional) auditoría
  // await prisma.auditLog.create({ data: { action: 'SESSION_DELETED', userId: user.id, sessionId: existing.id } })

  emitToDashboards('session:deleted', { id: existing.id })
  return res.json({ ok: true, id: existing.id })
})


// POST /sessions/:id/pause
router.post('/:id/pause', async (req, res) => {
  const user = req.user
  const { id } = req.params

  const existing = await prisma.session.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'No existe' })

  const isOwner = existing.createdById === user.id
  if (user.role !== 'ADMIN' && !isOwner) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (existing.status !== 'RUNNING') {
    return res.status(400).json({ error: 'Solo se puede pausar una sesión en curso' })
  }

  const now = new Date()
  const remaining = Math.max(0, Math.floor((new Date(existing.endTime) - now) / 1000))

  const updated = await prisma.session.update({
    where: { id },
    data: { status: 'PAUSED', remainingSeconds: remaining }
  })

  emitToDashboards('session:updated', updated)
  res.json(updated)
})


// POST /sessions/:id/resume
router.post('/:id/resume', async (req, res) => {
  const user = req.user
  const { id } = req.params

  const existing = await prisma.session.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'No existe' })

  const isOwner = existing.createdById === user.id
  if (user.role !== 'ADMIN' && !isOwner) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (existing.status !== 'PAUSED' || !Number.isFinite(existing.remainingSeconds)) {
    return res.status(400).json({ error: 'La sesión no está en pausa' })
  }

  const newEnd = new Date(Date.now() + existing.remainingSeconds * 1000)

  const updated = await prisma.session.update({
    where: { id },
    data: { status: 'RUNNING', endTime: newEnd, remainingSeconds: null }
  })

  emitToDashboards('session:updated', updated)
  res.json(updated)
})


export default router;
