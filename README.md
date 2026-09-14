# Screen Platform

Digital signage platform with three apps:

| Folder | What it is | Stack | Dev URL |
|---|---|---|---|
| `screen-api` | REST + WebSocket API | NestJS, Prisma, PostgreSQL | http://localhost:4006 (docs at `/api/docs`) |
| `screenManager` | Admin panel | React, Vite, TanStack Router, Tailwind | http://localhost:5175 |
| `screen-tv-client` | Player that runs on the TVs (web + Android via Capacitor) | React, Vite, Socket.IO | http://localhost:3500 |

## First run

### 1. Database and API

```bash
cd screen-api
cp .env.example .env          # then edit JWT_SECRET, POSTGRES_PASSWORD, BOT_* if needed
docker compose up -d postgres  # PostgreSQL on localhost:5437
npm install
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

Register the first user through Swagger (`POST /auth/register`) or from the panel's "Usuarios" page.

### 2. Admin panel

```bash
cd screenManager
cp .env.example .env
npm install --legacy-peer-deps   # material-table pins an old @mui/styles peer
npm run dev -- --port 5175
```

### 3. TV client

```bash
cd screen-tv-client
cp .env.example .env
npm install
npm run dev
```

Open the client, type the screen code you created in the panel, and it links itself.
For Android, see `screen-tv-client/BUILD.md`.

## How the pieces talk

- The panel and the TV clients call the API over HTTP and keep a Socket.IO connection to it.
- Each TV client joins with its screen code. The panel's "Monitor de Estado" shows who is online and can send play, pause and reload commands.
- Saving a screen, a playlist or a video in the panel makes the API send a reload to every TV client affected, so changes show up without touching the TVs.

## Database changes

All schema changes go through versioned Prisma migrations in `screen-api/prisma/migrations`, applied with `npx prisma migrate deploy`. Do not use `migrate dev` against a database with data.
