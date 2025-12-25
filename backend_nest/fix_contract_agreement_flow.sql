-- Migration script to fix contract agreement flow
-- This script updates the contracts table schema to support proper state flow
-- Run this in Supabase SQL editor

-- Step 1: Allow NULL values for counterparty_id (for purchased templates without assigned party)
ALTER TABLE contracts 
  ALTER COLUMN counterparty_id DROP NOT NULL;

-- Step 2: Update existing contracts with null counterparty_id to 'purchased' status if they came from templates
UPDATE contracts 
SET status = 'purchased'
WHERE counterparty_id IS NULL 
  AND template_id IS NOT NULL 
  AND status = 'draft';

-- Step 3: Update comments to reflect the new state flow
COMMENT ON COLUMN contracts.counterparty_id IS 'ID de la contrepartie (NULL jusqu''à assignation)';
COMMENT ON COLUMN contracts.status IS 'Statut: draft (création), purchased (achat template), pending_counterparty (contrepartie assignée), pending_acceptance (en attente acceptation), fully_signed (signé par les deux), archived (archivé)';
COMMENT ON COLUMN contracts.initiator_agreed IS 'Accord de l''initiateur (false jusqu''à acceptation explicite)';
COMMENT ON COLUMN contracts.counterparty_agreed IS 'Accord de la contrepartie (false jusqu''à acceptation explicite)';

-- Step 4: Ensure all existing contracts have correct default values for agreement fields
UPDATE contracts 
SET initiator_agreed = COALESCE(initiator_agreed, false),
    counterparty_agreed = COALESCE(counterparty_agreed, false)
WHERE initiator_agreed IS NULL OR counterparty_agreed IS NULL;

-- Step 5: Update contracts that have counterparty_id but are in wrong status
UPDATE contracts
SET status = 'pending_counterparty'
WHERE counterparty_id IS NOT NULL
  AND status = 'draft'
  AND (initiator_agreed = false OR counterparty_agreed = false);

-- Step 6: Update contracts where one party has agreed to 'pending_acceptance'
UPDATE contracts
SET status = 'pending_acceptance'
WHERE counterparty_id IS NOT NULL
  AND (
    (initiator_agreed = true AND counterparty_agreed = false)
    OR 
    (initiator_agreed = false AND counterparty_agreed = true)
  )
  AND status NOT IN ('fully_signed', 'archived');

-- Verification queries (run these to check the migration)
-- SELECT status, COUNT(*) FROM contracts GROUP BY status;
-- SELECT counterparty_id IS NULL as no_counterparty, status, COUNT(*) FROM contracts GROUP BY counterparty_id IS NULL, status;
