-- Videos being re-encoded for TV playback are hidden from screens until done.
ALTER TABLE "storages" ADD COLUMN IF NOT EXISTS "processing" BOOLEAN NOT NULL DEFAULT false;
