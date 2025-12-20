-- Fix for contracts schema to allow Drafts without designated counterparty
-- This is needed for "Work from Template" flow where the user buys a template 
-- and then invites a counterparty later.

BEGIN;

-- 1. Alter contracts table to make counterparty_id nullable
ALTER TABLE contracts ALTER COLUMN counterparty_id DROP NOT NULL;

-- 2. Add comment
COMMENT ON COLUMN contracts.counterparty_id IS 'ID of the counterparty (can be NULL for drafts/templates)';

COMMIT;
