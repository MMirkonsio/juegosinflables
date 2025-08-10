// src/routes/users.js
import express from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/db.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(users);
});

router.post("/", async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) return res.status(400).json({ error: "username/password/role requeridos" });
  const hash = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({
      data: { username, passwordHash: hash, role, isActive: true },
      select: { id: true, username: true, role: true, isActive: true, createdAt: true },
    });
    res.status(201).json(user);
  } catch (e) {
    res.status(400).json({ error: "No se pudo crear (usuario duplicado?)" });
  }
});

router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { username, password, role, isActive } = req.body;
  const data = {};
  if (typeof username === "string" && username.trim()) data.username = username.trim();
  if (typeof role === "string") data.role = role;
  if (typeof isActive === "boolean") data.isActive = isActive;
  if (typeof password === "string" && password) data.passwordHash = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, role: true, isActive: true, createdAt: true },
    });
    res.json(user);
  } catch (e) {
    res.status(400).json({ error: "No se pudo actualizar" });
  }
});

export default router;
