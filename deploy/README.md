# Deploying Screen Platform

Everything runs in Docker on one server. Caddy terminates HTTPS with Let's Encrypt, serves the
two static frontends, and proxies the API (HTTP, Socket.IO and uploaded media).

```
Internet ──443──> Caddy ──┬── panel.DOMAIN  (static admin panel)
                          ├── tv.DOMAIN     (static TV client)
                          └── api.DOMAIN ──> api:4006 ──> postgres
```

## Server

- Ubuntu 22.04/24.04, 2 vCPU, 4 GB RAM, 40 GB SSD (see the root README for sizing).
- Docker Engine + Compose v2: `curl -fsSL https://get.docker.com | sh`
- Ports 80 and 443 open in the firewall. Nothing else is published.
- DNS: `A` records for `panel.DOMAIN`, `tv.DOMAIN` and `api.DOMAIN` pointing to the server.
  Let's Encrypt validates them over port 80, so DNS must be live **before** the first start.

## First deployment

```bash
sudo mkdir -p /opt/screen-platform && cd /opt/screen-platform
git clone https://github.com/josuemadrigal/screen-platform.git .
cp deploy/.env.example deploy/.env
nano deploy/.env        # DOMAIN, ACME_EMAIL, POSTGRES_PASSWORD, JWT_SECRET (openssl rand -base64 48)
mkdir -p storage
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build
```

Watch it come up:

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env logs -f
```

The API applies database migrations on start. Caddy requests the certificates on the first
HTTPS hit; give it a minute. Then:

1. Open `https://api.DOMAIN/health` → `{"status":"ok"}`.
2. Create the first admin (only works while the users table is empty):
   ```bash
   curl -X POST https://api.DOMAIN/auth/register -H 'Content-Type: application/json' \
     -d '{"name":"Admin","user":"admin","email":"you@example.com","password":"a-strong-password"}'
   ```
3. Log in at `https://panel.DOMAIN`, create a screen, upload a video, build a playlist.
4. On each TV open `https://tv.DOMAIN` (or install the Android app) and enter the screen code.

## Updating

```bash
cd /opt/screen-platform
git pull
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build
```

Frontends are rebuilt with the API URL baked in; TVs pick the new version up on their next reload.

## Backups

Two things hold state: the database volume and the `storage/` folder with the videos.

```bash
# Database dump
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env exec postgres \
  pg_dump -U screen_user screen_db | gzip > backup-$(date +%F).sql.gz
# Media
tar czf storage-$(date +%F).tar.gz storage/
```

## Android TV app

The APK also needs the public API URL at build time. In `screen-tv-client/.env` set
`VITE_API_URL=https://api.DOMAIN` and `VITE_SOCKET_URL=https://api.DOMAIN`, then follow
`screen-tv-client/BUILD.md`. Because the API is served over HTTPS, no cleartext exception is needed.

## Using Nginx instead of Caddy

If the server already runs Nginx, skip the `web` service and:

1. Start only the database and the API, publishing the API on localhost:
   ```bash
   docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build postgres api
   ```
   and add `ports: ['127.0.0.1:4006:4006']` to the `api` service (or an override file).
2. Build the frontends with the public API URL and copy them to `/var/www/screen-platform/{panel,tv}`:
   ```bash
   cd screenManager && VITE_API_URL=https://api.DOMAIN npm run build && sudo cp -r dist /var/www/screen-platform/panel
   cd ../screen-tv-client && VITE_API_URL=https://api.DOMAIN VITE_SOCKET_URL=https://api.DOMAIN npm run build && sudo cp -r dist /var/www/screen-platform/tv
   ```
3. Install `deploy/nginx/screen-platform.conf` into `/etc/nginx/sites-available/`, replace
   `example.com` with your domain, enable it, and get certificates:
   ```bash
   sudo ln -s /etc/nginx/sites-available/screen-platform.conf /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d panel.DOMAIN -d tv.DOMAIN -d api.DOMAIN
   ```

The Nginx config already carries the WebSocket upgrade headers Socket.IO needs and a
1 GB upload limit for videos.
