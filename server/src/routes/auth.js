// src/routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/db.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Faltan credenciales" });

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.isActive) return res.status(401).json({ error: "Usuario inválido o inactivo" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET || "dev_secret",
    { expiresIn: "12h" }
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role }
  });
});

export default router;
