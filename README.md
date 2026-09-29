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

Register the first user through Swagger (`POST /auth/register`) or from the panel's login page: the very first account becomes **admin**. After that, only users whose role has `users.manage` can create accounts (panel → Usuarios).

**Roles and permissions.** Every user has one role; a role is a set of permission keys:

| Key | Grants |
|---|---|
| `users.view` | see the users list and roles |
| `users.manage` | create/edit/delete users, reset passwords, manage roles |
| `content.manage` | create/edit/delete screens, playlists and videos |
| `screens.control` | send commands to TVs (play, pause, reload) |
| `history.view` | see the activity history |

The migration seeds three roles (`admin` = everything, `editor` = content + screens + history, `viewer` = read-only) and assigns `admin` to every pre-existing user. Custom roles can be created in the panel (Roles). Users can always change their own password from Ajustes; the users list shows who is online and each user's last login.

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
- The Android app downloads the playlist videos to the device and plays them from disk, so screens keep running without Internet; the web TV client relies on the browser cache instead.

## Database changes

All schema changes go through versioned Prisma migrations in `screen-api/prisma/migrations`, applied with `npx prisma migrate deploy`. Do not use `migrate dev` against a database with data.

## Deploying

### API (Docker)

```bash
cd screen-api
cp .env.example .env   # set JWT_SECRET, POSTGRES_PASSWORD, CORS_ORIGIN (panel + TV client URLs), NODE_ENV=production
docker compose up -d --build
```

The container applies pending Prisma migrations on start, serves uploaded media from the `./storage` bind mount, and exposes `GET /health` for the Docker health check. Swagger is disabled when `NODE_ENV=production`.

Every API route requires a Bearer JWT except `POST /auth/login`, `GET /screens/code/:code` (used by TV clients), `GET /health` and the static media files. `POST /auth/register` works without a token only while the users table is empty, so the first admin can be created on a fresh install; after that it requires a logged-in user.

### Panel and TV client (static builds)

Both are static sites. Set `VITE_API_URL` (and optionally `VITE_SOCKET_URL`) to the public API URL in each project's `.env` **before** building, then serve the `dist/` folder from any web server or CDN:

```bash
cd screenManager && npm run build
cd screen-tv-client && npm run build   # for Android: see BUILD.md
```
