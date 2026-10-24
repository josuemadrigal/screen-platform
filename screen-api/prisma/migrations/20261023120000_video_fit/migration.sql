-- Per-video fit on the TV: auto | cover | contain.
ALTER TABLE "storages" ADD COLUMN IF NOT EXISTS "fit" TEXT NOT NULL DEFAULT 'auto';
