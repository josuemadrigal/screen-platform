-- Add the "user" (username) column declared in schema.prisma but missing from the init migration.
-- Additive and idempotent: safe to run on databases that already have the column.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "user" TEXT;

-- Backfill existing rows with the email so the NOT NULL constraint can be satisfied without losing data.
UPDATE "users" SET "user" = "email" WHERE "user" IS NULL;

ALTER TABLE "users" ALTER COLUMN "user" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "users_user_key" ON "users"("user");
