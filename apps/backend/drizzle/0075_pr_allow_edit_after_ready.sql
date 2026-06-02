ALTER TABLE "partner_requests"
ADD COLUMN IF NOT EXISTS "allow_edit_after_ready" jsonb;
