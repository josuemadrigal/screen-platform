-- Sound on/off per screen, toggled from the panel.
ALTER TABLE "screens" ADD COLUMN IF NOT EXISTS "muted" BOOLEAN NOT NULL DEFAULT false;
