-- Roles and permissions for panel users, plus last-login/last-seen tracking.
-- Additive and idempotent: no drops, no renames, safe on databases with data.

CREATE TABLE IF NOT EXISTS "roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "roles_name_key" ON "roles"("name");

CREATE TABLE IF NOT EXISTS "permissions" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "permissions_key_key" ON "permissions"("key");

CREATE TABLE IF NOT EXISTS "role_permissions" (
    "roleId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,
    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId", "permissionId")
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'role_permissions_roleId_fkey') THEN
        ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey"
            FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'role_permissions_permissionId_fkey') THEN
        ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey"
            FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "roleId" INTEGER;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_roleId_fkey') THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey"
            FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Permission catalogue
INSERT INTO "permissions" ("key", "description") VALUES
    ('users.view',      'Ver la lista de usuarios y roles'),
    ('users.manage',    'Crear, editar y eliminar usuarios; cambiar contraseñas; gestionar roles'),
    ('content.manage',  'Crear, editar y eliminar pantallas, playlists y videos'),
    ('screens.control', 'Enviar comandos a las pantallas desde el monitor (play, pausa, recarga)'),
    ('history.view',    'Ver el historial de actividad')
ON CONFLICT ("key") DO NOTHING;

-- Default roles
INSERT INTO "roles" ("name", "description", "isSystem", "updatedAt") VALUES
    ('admin',  'Acceso total, incluida la gestión de usuarios y roles', true, CURRENT_TIMESTAMP),
    ('editor', 'Gestiona contenido y controla pantallas; no gestiona usuarios', false, CURRENT_TIMESTAMP),
    ('viewer', 'Solo lectura: ve pantallas, playlists y videos', false, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id" FROM "roles" r, "permissions" p
WHERE r."name" = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id" FROM "roles" r, "permissions" p
WHERE r."name" = 'editor' AND p."key" IN ('content.manage', 'screens.control', 'history.view')
ON CONFLICT DO NOTHING;

-- Users that existed before roles were introduced keep full access.
UPDATE "users" SET "roleId" = (SELECT "id" FROM "roles" WHERE "name" = 'admin') WHERE "roleId" IS NULL;
