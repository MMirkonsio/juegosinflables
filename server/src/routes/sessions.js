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

// Create session (ADMIN only)
router.post("/", async (req, res) => {
  const user = req.user;
  if (user.role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });

  const { childName, durationMinutes, notes } = req.body;
  if (!childName) return res.status(400).json({ error: "childName requerido" });

  let duration = parseInt(durationMinutes ?? 0, 10);
  if (!duration || duration <= 0) {
    const setting = await prisma.setting.findUnique({ where: { id: 1 } });
    duration = setting?.defaultDurationMinutes ?? 15;
  }

  const startTime = nowUtc();
  const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

  const created = await prisma.session.create({
    data: {
      childName,
      durationMinutes: duration,
      startTime,
      endTime,
      notes: notes || null,
      createdById: user.id,
    },
  });

  await prisma.auditLog.create({
    data: { action: "SESSION_CREATED", userId: user.id, sessionId: created.id },
  });

  emitToDashboards("session:created", created);
  res.status(201).json(created);
});

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
  if (user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' })

  const { id } = req.params
  const existing = await prisma.session.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'No existe' })

  await prisma.session.delete({ where: { id } })
  emitToDashboards('session:deleted', { id })
  res.json({ ok: true, id })
})


// POST /sessions/:id/pause
router.post('/:id/pause', async (req, res) => {
  const user = req.user
  if (user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' })

  const { id } = req.params
  const now = new Date()
  const s = await prisma.session.findUnique({ where: { id } })
  if (!s) return res.status(404).json({ error: 'No existe' })
  if (s.status !== 'RUNNING') return res.status(400).json({ error: 'Solo se puede pausar si está RUNNING' })

  const remaining = Math.max(0, Math.ceil((s.endTime.getTime() - now.getTime()) / 1000)) // seg
  const updated = await prisma.session.update({
    where: { id },
    data: {
      status: 'PAUSED',
      remainingSeconds: remaining,
    },
  })

  emitToDashboards('session:updated', updated)
  res.json(updated)
})


// POST /sessions/:id/resume
router.post('/:id/resume', async (req, res) => {
  const user = req.user
  if (user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' })

  const { id } = req.params
  const s = await prisma.session.findUnique({ where: { id } })
  if (!s) return res.status(404).json({ error: 'No existe' })
  if (s.status !== 'PAUSED' || !s.remainingSeconds) {
    return res.status(400).json({ error: 'Solo se puede reanudar si está PAUSED' })
  }

  const now = Date.now()
  const newEnd = new Date(now + s.remainingSeconds * 1000)

  const updated = await prisma.session.update({
    where: { id },
    data: {
      status: 'RUNNING',
      endTime: newEnd,
      remainingSeconds: null,
    },
  })

  emitToDashboards('session:updated', updated)
  res.json(updated)
})


export default router;
