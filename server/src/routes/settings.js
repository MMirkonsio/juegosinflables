// src/routes/settings.js
import express from "express";
import { prisma } from "../lib/db.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  const setting = await prisma.setting.findUnique({ where: { id: 1 } });
  res.json(setting || { id: 1, defaultDurationMinutes: 15 });
});

router.patch("/", async (req, res) => {
  const { defaultDurationMinutes } = req.body;
  if (!defaultDurationMinutes || !Number.isFinite(defaultDurationMinutes) || defaultDurationMinutes <= 0) {
    return res.status(400).json({ error: "defaultDurationMinutes inválido" });
  }
  const updated = await prisma.setting.upsert({
    where: { id: 1 },
    update: { defaultDurationMinutes },
    create: { id: 1, defaultDurationMinutes },
  });
  res.json(updated);
});

export default router;
