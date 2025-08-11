# Inflables App — Gestión de tiempos (React + Node + PostgreSQL + Prisma + Socket.IO)

Sistema para administrar turnos de niños en juegos inflables con conteo regresivo, roles (Admin / Empleado) y actualizaciones en tiempo real.

## Stack
- **Frontend**: React (Vite) + JavaScript + React Router + Socket.IO Client + Axios
- **Backend**: Node.js + Express + Socket.IO + JWT + bcryptjs + Prisma ORM
- **DB**: PostgreSQL
- **Tiempo real**: Socket.IO
- **Zona horaria**: America/Santiago (servidor opera en UTC y expone `/time` para sincronizar)

## Requisitos
- Node 18+
- PostgreSQL 13+

## Configuración rápida

### 1) Backend
```bash
cd server
cp .env.example .env
# Edita .env con tus credenciales de PostgreSQL
npm install
npx prisma generate
npx prisma migrate dev --name init
node prisma/seed.js
npm run dev
```
El backend inicia en `http://localhost:4000/` por defecto.

### 2) Frontend
```bash
cd client
cp .env.example .env
npm install
npm run dev
```
El frontend inicia en `http://localhost:5173/` por defecto.


## Scripts disponibles
- Backend:
  - `npm run dev` → inicia servidor con recarga (nodemon)
  - `npm start` → inicia servidor con node
- Frontend:
  - `npm run dev` → Vite dev server
  - `npm run build` → build de producción
  - `npm run preview` → previsualiza build

## Notas de arquitectura
- El **servidor** define `startTime` y `endTime` y emite eventos Socket.IO tras cada operación (crear/editar/eliminar/confirmar).
- Un pequeño **job** en el backend revisa cada 5s sesiones vencidas y cambia su estado a `EXPIRED_WAITING_CONFIRM`.
- El **cliente** sincroniza la hora con `/time` para un conteo confiable y escucha eventos de tiempo real.

## Seguridad
- Login con usuario/contraseña (creados por Admin). Respuestas contienen JWT.
- Rutas protegidas requieren `Authorization: Bearer <token>`.
- Acciones de Admin validadas por middleware de roles.
