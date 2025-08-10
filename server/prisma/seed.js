// prisma/seed.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Upsert default setting
  await prisma.setting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      defaultDurationMinutes: 15,
    },
  });

  const adminPass = await bcrypt.hash("Admin123!", 10);
  const empPass = await bcrypt.hash("Empleado123!", 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: adminPass,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { username: "empleado" },
    update: {},
    create: {
      username: "empleado",
      passwordHash: empPass,
      role: "EMPLOYEE",
    },
  });

  console.log("Seed listo: usuarios admin/empleado y setting por defecto.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
